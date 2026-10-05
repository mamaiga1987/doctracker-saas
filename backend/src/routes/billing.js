const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const PLANS = {
  pro:      { name: 'Pro',      price_id: process.env.STRIPE_PRICE_PRO      || '' },
  business: { name: 'Business', price_id: process.env.STRIPE_PRICE_BUSINESS || '' },
};

// ── GET /api/billing/plans ────────────────────────────────────
router.get('/plans', async (req, res) => {
  const { rows } = await query('SELECT * FROM plan_limits ORDER BY price_monthly ASC');
  res.json({ plans: rows });
});

// ── POST /api/billing/checkout ────────────────────────────────
// Crée une session Stripe Checkout
router.post('/checkout', requireAuth, requireRole('owner'), async (req, res) => {
  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: 'Plan invalide' });

  try {
    const orgId  = req.user.organization_id;
    const appUrl = process.env.APP_URL || 'https://doctracker.monairbyte.eu';

    // Récupérer ou créer le customer Stripe
    let customerId = null;
    const { rows } = await query(
      'SELECT stripe_customer_id FROM organizations WHERE id = $1', [orgId]
    );
    customerId = rows[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    req.user.email,
        name:     req.user.org_name,
        metadata: { organization_id: orgId }
      });
      customerId = customer.id;
      await query(
        'UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, orgId]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price:    PLANS[plan].price_id,
        quantity: 1,
      }],
      success_url: `${appUrl}/settings/billing?success=1`,
      cancel_url:  `${appUrl}/settings/billing?canceled=1`,
      metadata:    { organization_id: orgId, plan },
    });

    res.json({ checkout_url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/billing/portal ──────────────────────────────────
// Portail client Stripe (gérer abonnement, factures)
router.post('/portal', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT stripe_customer_id FROM organizations WHERE id = $1',
      [req.user.organization_id]
    );
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'Aucun abonnement actif' });

    const appUrl = process.env.APP_URL || 'https://doctracker.monairbyte.eu';
    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${appUrl}/settings/billing`,
    });

    res.json({ portal_url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/billing/webhook ─────────────────────────────────
// Webhook Stripe (raw body requis)
router.post('/webhook',
  require('express').raw({ type: 'application/json' }),
  async (req, res) => {
    const sig    = req.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const { organization_id, plan } = session.metadata;
          if (organization_id && plan) {
            await query(
              `UPDATE organizations
               SET plan = $1, stripe_sub_id = $2,
                   plan_expires_at = NOW() + INTERVAL '1 month'
               WHERE id = $3`,
              [plan, session.subscription, organization_id]
            );
            console.log(`✅ Upgrade plan ${plan} → org ${organization_id}`);
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          // Renouveler l'expiry
          await query(
            `UPDATE organizations SET plan_expires_at = NOW() + INTERVAL '1 month'
             WHERE stripe_sub_id = $1`,
            [invoice.subscription]
          );
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          await query(
            `UPDATE organizations SET plan = 'free', stripe_sub_id = NULL, plan_expires_at = NULL
             WHERE stripe_sub_id = $1`,
            [sub.id]
          );
          console.log(`⬇️ Downgrade vers free → sub ${sub.id}`);
          break;
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error('Webhook handler error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
