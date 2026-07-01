/**
 * Authentication service. All business logic lives here; controllers stay thin.
 * Handles registration, login (with timing-attack mitigation), refresh rotation,
 * email verification, password reset.
 */
import crypto from "node:crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../../config/database";
import { redis } from "../../config/redis";
import { safeRedis, safeRedisWrite } from "../../lib/redisSafe";
import { emailQueue, type EmailJobData } from "../../config/queue";
import { env, isDev } from "../../config/env";
import { sendEmail } from "../../config/email";
import { logger } from "../../config/logger";
import {
  users,
  emailVerificationTokens,
  passwordResetTokens,
  refreshTokens,
  type User,
} from "../../../drizzle/schema/users";
import { signAccessToken } from "../../lib/jwt";
import {
  hashPassword,
  verifyPassword,
  validatePasswordComplexity,
} from "../../lib/password";
import { generateOpaqueToken, hashOpaqueToken } from "../../lib/tokens";
import { recordAudit } from "../../lib/auditLog";
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "../../lib/AppError";
import { LOGIN_FAILURE_LOCK, TOKEN_TTL } from "../../lib/constants";
import { hashIp } from "../../lib/ipAnonymize";

const REFRESH_TTL_DAYS = 7;
const ACCESS_TTL_SEC = 15 * 60;
const EMAIL_OTP_DIGITS = 6;

function generateEmailOtp(): string {
  const min = 10 ** (EMAIL_OTP_DIGITS - 1);
  const max = 10 ** EMAIL_OTP_DIGITS;
  return crypto.randomInt(min, max).toString();
}

function hashVerificationOtp(userId: string, otp: string): string {
  return hashOpaqueToken(`${userId}:${otp}`);
}

async function dispatchEmail(
  jobName: string,
  job: EmailJobData,
): Promise<void> {
  if (isDev) {
    await sendEmail({
      to: job.to,
      subject: job.subject,
      template: job.template,
      variables: job.variables,
    });
    logger.info(
      { to: job.to, template: job.template },
      "Email sent directly in development",
    );
    return;
  }

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("BullMQ queue.add timed out")), 2000),
    );
    await Promise.race([emailQueue.add(jobName, job), timeout]);
  } catch (err) {
    logger.error({ err, jobName, to: job.to }, "Failed to queue email job");
    // We don't throw here to ensure the user can still register.
    // They can request a new verification email later.
  }
}

export interface AuthSession {
  user: Pick<
    User,
    | "id"
    | "email"
    | "name"
    | "plan"
    | "emailVerified"
    | "isAdmin"
    | "isSuspended"
  >;
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

interface IssueSessionArgs {
  user: User;
  userAgent: string | null;
  ip: string | null;
}

async function issueSession({
  user,
  userAgent,
  ip,
}: IssueSessionArgs): Promise<AuthSession> {
  const refresh = generateOpaqueToken(48);
  const expiresAt = new Date(
    Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const [refreshRow] = await db
    .insert(refreshTokens)
    .values({
      userId: user.id,
      tokenHash: refresh.hash,
      userAgent: userAgent ?? null,
      ipAddress: ip ? hashIp(ip) : null,
      expiresAt,
    })
    .returning({ id: refreshTokens.id });

  if (!refreshRow) throw new Error("Failed to create refresh token");

  const accessToken = signAccessToken({
    sub: user.id,
    sid: refreshRow.id,
    plan: user.plan,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      emailVerified: user.emailVerified,
      isAdmin: user.isAdmin, 
      isSuspended: user.isSuspended,
    },
    accessToken,
    refreshToken: refresh.raw,
    expiresInSec: ACCESS_TTL_SEC,
  };
}

export const authService = {
  async register(params: {
    email: string;
    password: string;
    name: string;
    userAgent: string | null;
    ip: string | null;
  }): Promise<AuthSession> {
    const complexityError = validatePasswordComplexity(params.password);
    if (complexityError) throw new ValidationError(complexityError);

    const email = params.email.toLowerCase().trim();

    const passwordHash = await hashPassword(params.password);
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing?.emailVerified) {
      throw new ConflictError("An account with this email already exists");
    }

    if (existing) {
      const [user] = await db
        .update(users)
        .set({
          name: params.name.trim(),
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      if (!user) throw new Error("Failed to update unverified user");

      await this.revokeAllUserSessions(user.id);
      await this.sendVerificationEmail(user.id, user.email, user.name);

      await recordAudit({
        userId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "UPDATE",
        diff: { reason: "UNVERIFIED_SIGNUP_RETRY", email },
        ip: params.ip,
        userAgent: params.userAgent,
      });

      return issueSession({ user, userAgent: params.userAgent, ip: params.ip });
    }

    const [user] = await db
      .insert(users)
      .values({ email, name: params.name.trim(), passwordHash })
      .returning();
    if (!user) throw new Error("Failed to create user");

    // Send verification email (async via queue)
    await this.sendVerificationEmail(user.id, user.email, user.name);

    await recordAudit({
      userId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "CREATE",
      ip: params.ip,
      userAgent: params.userAgent,
    });

    return issueSession({ user, userAgent: params.userAgent, ip: params.ip });
  },

  async login(params: {
    email: string;
    password: string;
    userAgent: string | null;
    ip: string | null;
  }): Promise<AuthSession> {
    const email = params.email.toLowerCase().trim();
    const ipKey = `login:fail:${hashIp(params.ip ?? "")}:${crypto.createHash("sha256").update(email).digest("hex").slice(0, 16)}`;

    const fails = Number(
      (await safeRedis("login-fail:get", () => redis.get(ipKey))) ?? "0",
    );
    if (fails >= LOGIN_FAILURE_LOCK.maxAttempts) {
      throw new UnauthorizedError(
        "Too many failed attempts. Try again later.",
        "RATE_LIMIT_EXCEEDED",
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Constant-time-ish: always run bcrypt to avoid timing leak when user not found
    const dummyHash =
      "$2b$12$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUVWX.";
    const hashToCompare = user?.passwordHash ?? dummyHash;
    const passwordOk = await verifyPassword(params.password, hashToCompare);

    if (!user || !passwordOk) {
      await safeRedisWrite("login-fail:incr", () => redis.incr(ipKey));
      await safeRedisWrite("login-fail:expire", () =>
        redis.expire(ipKey, LOGIN_FAILURE_LOCK.windowSec),
      );
      throw new UnauthorizedError(
        "Invalid email or password",
        "INVALID_CREDENTIALS",
      );
    }

    if (user.isSuspended) {
      throw new ForbiddenError(
        "This account has been suspended",
        "ACCOUNT_SUSPENDED",
      );
    }

    await safeRedisWrite("login-fail:del", () => redis.del(ipKey));

    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: params.ip ? hashIp(params.ip) : null,
      })
      .where(eq(users.id, user.id));

    await recordAudit({
      userId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "LOGIN",
      ip: params.ip,
      userAgent: params.userAgent,
    });

    return issueSession({ user, userAgent: params.userAgent, ip: params.ip });
  },

  async refresh(params: {
    refreshToken: string;
    userAgent: string | null;
    ip: string | null;
  }): Promise<AuthSession> {
    const tokenHash = hashOpaqueToken(params.refreshToken);

    const [existing] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!existing)
      throw new UnauthorizedError(
        "Invalid or expired refresh token",
        "TOKEN_INVALID",
      );

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existing.userId))
      .limit(1);
    if (!user) throw new UnauthorizedError("User not found");
    if (user.isSuspended)
      throw new ForbiddenError("Account suspended", "ACCOUNT_SUSPENDED");

    // Revoke the old token (rotation)
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, existing.id));

    return issueSession({ user, userAgent: params.userAgent, ip: params.ip });
  },

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashOpaqueToken(refreshToken);
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      );
  },

  async revokeAllUserSessions(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  },

  async sendVerificationEmail(
    userId: string,
    email: string,
    name: string,
  ): Promise<void> {
    let verificationOtp = "";
    let tokenHash = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      verificationOtp = generateEmailOtp();
      tokenHash = hashVerificationOtp(userId, verificationOtp);
      const [existing] = await db
        .select({ id: emailVerificationTokens.id })
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.tokenHash, tokenHash))
        .limit(1);
      if (!existing) break;
      verificationOtp = "";
      tokenHash = "";
    }
    if (!verificationOtp || !tokenHash)
      throw new Error("Failed to generate verification OTP");

    const expiresAt = new Date(
      Date.now() + TOKEN_TTL.EMAIL_VERIFICATION_SEC * 1000,
    );

    await db.transaction(async (tx) => {
      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(emailVerificationTokens.userId, userId),
            isNull(emailVerificationTokens.usedAt),
          ),
        );

      await tx
        .insert(emailVerificationTokens)
        .values({ userId, tokenHash, expiresAt });
    });

    await dispatchEmail("verify-email", {
      to: email,
      subject: "Your FormNest verification code",
      template: "verifyEmail",
      variables: { name, verificationOtp, expiresIn: "24 hours" },
    });
    logger.info({ userId }, "Verification email dispatched");
  },

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = hashOpaqueToken(rawToken);
    const [row] = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row)
      throw new ValidationError("Invalid or expired verification token");

    await db.transaction(async (tx) => {
      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokens.id, row.id));
      await tx
        .update(users)
        .set({ emailVerified: true, emailVerifiedAt: new Date() })
        .where(eq(users.id, row.userId));
    });
  },

  async verifyEmailOtp(email: string, otp: string): Promise<void> {
    const lower = email.toLowerCase().trim();
    const normalizedOtp = otp.trim();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, lower))
      .limit(1);

    if (!user)
      throw new ValidationError("Invalid or expired verification code");
    if (user.emailVerified) return;

    const tokenHash = hashVerificationOtp(user.id, normalizedOtp);
    const [row] = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.userId, user.id),
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row) throw new ValidationError("Invalid or expired verification code");

    await db.transaction(async (tx) => {
      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokens.id, row.id));
      await tx
        .update(users)
        .set({ emailVerified: true, emailVerifiedAt: new Date() })
        .where(eq(users.id, user.id));
    });
  },

  async resendVerification(email: string): Promise<void> {
    const lower = email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, lower))
      .limit(1);
    // Always succeed silently — don't leak account existence
    if (!user || user.emailVerified) return;
    await this.sendVerificationEmail(user.id, user.email, user.name);
  },

  async forgotPassword(email: string): Promise<void> {
    const lower = email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, lower))
      .limit(1);
    // Don't leak existence
    if (!user) return;

    const token = generateOpaqueToken(32);
    const expiresAt = new Date(
      Date.now() + TOKEN_TTL.PASSWORD_RESET_SEC * 1000,
    );
    await db
      .insert(passwordResetTokens)
      .values({ userId: user.id, tokenHash: token.hash, expiresAt });

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token.raw}`;
    await dispatchEmail("password-reset", {
      to: user.email,
      subject: "Reset your FormNest password",
      template: "resetPassword",
      variables: { name: user.name, resetUrl },
    });
  },

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const complexityError = validatePasswordComplexity(newPassword);
    if (complexityError) throw new ValidationError(complexityError);

    const tokenHash = hashOpaqueToken(rawToken);
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row) throw new ValidationError("Invalid or expired reset token");

    const passwordHash = await hashPassword(newPassword);

    await db.transaction(async (tx) => {
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id));
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, row.userId));
      // Revoke all refresh tokens
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, row.userId),
            isNull(refreshTokens.revokedAt),
          ),
        );
    });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);
    if (user) {
      await dispatchEmail("password-changed", {
        to: user.email,
        subject: "Your FormNest password was changed",
        template: "passwordChanged",
        variables: { name: user.name },
      });
    }
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const complexityError = validatePasswordComplexity(newPassword);
    if (complexityError) throw new ValidationError(complexityError);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundError("User not found");

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok)
      throw new UnauthorizedError(
        "Current password is incorrect",
        "INVALID_CREDENTIALS",
      );

    const passwordHash = await hashPassword(newPassword);
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, userId));
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, userId),
            isNull(refreshTokens.revokedAt),
          ),
        );
    });

    await dispatchEmail("password-changed", {
      to: user.email,
      subject: "Your FormNest password was changed",
      template: "passwordChanged",
      variables: { name: user.name },
    });
  },
};
