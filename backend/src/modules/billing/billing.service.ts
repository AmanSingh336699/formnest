/**
 * Stripe billing. Checkout session creation + webhook handler.
 * Plan changes propagated to users.plan via webhook events.
 */
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env';
import { db } from '../../config/database';
import { users, type UserPlan } from '../../../drizzle/schema/users';
import { logger } from '../../config/logger';
import { ValidationError, NotFoundError, InternalError } from '../../lib/AppError';
import type { AuthenticatedUser } from '../../middleware/auth.middleware';

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new InternalError('Billing is not configured on this environment');
  }
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-09-30.acacia' as Stripe.LatestApiVersion });
}

function priceForPlan(plan: 'PRO' | 'ENTERPRISE', interval: 'monthly' | 'yearly'): string {
  const map: Record<string, string | undefined> = {
    'PRO:monthly': env.STRIPE_PRICE_PRO_MONTHLY,
    'PRO:yearly': env.STRIPE_PRICE_PRO_YEARLY,
    'ENTERPRISE:monthly': env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    'ENTERPRISE:yearly': env.STRIPE_PRICE_ENTERPRISE_YEARLY,
  };
  const key = `${plan}:${interval}`;
  const id = map[key];
  if (!id) throw new ValidationError(`No Stripe price configured for ${key}`);
  return id;
}

export const billingService = {
  async createCheckoutSession(
    user: AuthenticatedUser,
    plan: 'PRO' | 'ENTERPRISE',
    interval: 'monthly' | 'yearly',
  ): Promise<{ url: string }> {
    const stripe = getStripe();

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!dbUser) throw new NotFoundError('User not found');

    let customerId = dbUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email,
        name: dbUser.name,
        metadata: { userId: dbUser.id },
      });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, dbUser.id));
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceForPlan(plan, interval), quantity: 1 }],
      success_url: `${env.FRONTEND_URL}/account/billing?status=success`,
      cancel_url: `${env.FRONTEND_URL}/account/billing?status=cancelled`,
      metadata: { userId: dbUser.id, plan },
    });

    if (!session.url) throw new InternalError('Stripe did not return a checkout URL');
    return { url: session.url };
  },

  async createPortalSession(user: AuthenticatedUser): Promise<{ url: string }> {
    const stripe = getStripe();
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!dbUser?.stripeCustomerId) throw new ValidationError('No Stripe customer on file');

    const portal = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${env.FRONTEND_URL}/account/billing`,
    });
    return { url: portal.url };
  },

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const stripe = getStripe();
    if (!env.STRIPE_WEBHOOK_SECRET) throw new InternalError('Stripe webhook secret not configured');

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.warn({ err }, 'Stripe webhook signature verification failed');
      throw new ValidationError('Invalid Stripe signature');
    }

    logger.info({ type: event.type, id: event.id }, 'Stripe webhook received');

    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.type === 'checkout.session.completed'
          ? null
          : (event.data.object as Stripe.Subscription);

        const customerId = typeof event.data.object === 'object' && event.data.object !== null && 'customer' in event.data.object
          ? String((event.data.object as { customer?: string }).customer ?? '')
          : '';

        if (!customerId) break;
        const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
        if (!user) {
          logger.warn({ customerId }, 'Stripe webhook for unknown customer');
          break;
        }

        let plan: UserPlan = 'FREE';
        let validUntil: Date | null = null;
        if (sub) {
          const priceId = sub.items.data[0]?.price.id;
          if (priceId === env.STRIPE_PRICE_PRO_MONTHLY || priceId === env.STRIPE_PRICE_PRO_YEARLY) {
            plan = 'PRO';
          } else if (
            priceId === env.STRIPE_PRICE_ENTERPRISE_MONTHLY ||
            priceId === env.STRIPE_PRICE_ENTERPRISE_YEARLY
          ) {
            plan = 'ENTERPRISE';
          }
          validUntil = new Date(sub.current_period_end * 1000);
          if (sub.status === 'canceled' || sub.status === 'unpaid') {
            plan = 'FREE';
          }
        }
        await db.update(users).set({ plan, planValidUntil: validUntil }).where(eq(users.id, user.id));
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = String(sub.customer);
        await db
          .update(users)
          .set({ plan: 'FREE', planValidUntil: null })
          .where(eq(users.stripeCustomerId, customerId));
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        logger.warn({ customerId: inv.customer }, 'Invoice payment failed');
        // grace period handled via subscription.updated status changes
        break;
      }
      default:
        logger.debug({ type: event.type }, 'Unhandled Stripe event type');
    }
  },
};
