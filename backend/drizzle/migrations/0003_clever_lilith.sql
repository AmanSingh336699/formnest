ALTER TYPE "audit_action" ADD VALUE 'ADMIN_VERIFY_EMAIL';--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE 'ADMIN_UNVERIFY_EMAIL';--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE 'ADMIN_SUSPEND';--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE 'ADMIN_UNSUSPEND';--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE 'ADMIN_CHANGE_PLAN';--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE 'ADMIN_REVOKE_SESSIONS';--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE 'ADMIN_RESEND_VERIFICATION';--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE 'ADMIN_REVOKE_API_KEY';--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE 'ADMIN_DISABLE_WEBHOOK';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;