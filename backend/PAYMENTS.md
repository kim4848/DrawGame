# Payment Integration — Hearsay Premium

## Overview

Hearsay premium subscriptions (29 DKK/month) use Stripe for payment processing. The integration supports:

- Stripe Checkout for subscription sign-up
- Automatic subscription management via webhooks
- Customer portal for subscription management
- Premium feature flags

## Environment Variables

Add these to your `.env` or Docker configuration:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...           # Stripe secret key (test or live)
STRIPE_PUBLISHABLE_KEY=pk_test_...      # Stripe publishable key (for frontend)
STRIPE_PRICE_ID=price_...               # Stripe Price ID for 29 DKK/month subscription
STRIPE_WEBHOOK_SECRET=whsec_...         # Stripe webhook signing secret
```

## Stripe Setup

### 1. Create Product and Price

In Stripe Dashboard:
1. Create a Product: "Hearsay Premium"
2. Create a recurring Price: 29 DKK/month
3. Copy the Price ID → set as `STRIPE_PRICE_ID`

### 2. Configure Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.dk/api/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret → set as `STRIPE_WEBHOOK_SECRET`

### 3. Test Mode

For development, use test mode keys (`sk_test_...` and `pk_test_...`).

Test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## API Endpoints

### Create Checkout Session

```http
POST /api/payments/create-checkout
Authorization: Bearer {JWT_TOKEN}
```

Response:
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

Redirect user to this URL for payment.

### Get Subscription Status

```http
GET /api/payments/subscription
Authorization: Bearer {JWT_TOKEN}
```

Response:
```json
{
  "isPremium": true,
  "status": "active",
  "currentPeriodEnd": "2026-05-06T12:00:00Z"
}
```

### Create Customer Portal Session

```http
POST /api/payments/portal
Authorization: Bearer {JWT_TOKEN}
```

Response:
```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

Redirect user to this URL to manage their subscription (cancel, update payment method, etc.).

### Webhook Handler

```http
POST /api/payments/webhook
Stripe-Signature: t=...,v1=...
Content-Type: application/json

{Stripe event payload}
```

This endpoint is called by Stripe automatically. Must be publicly accessible.

## Premium Feature Checks

The `PaymentService.IsPremiumUser(userId)` method checks if a user has an active premium subscription.

Example usage in endpoints:

```csharp
var isPremium = await paymentService.IsPremiumUser(userId);
if (!isPremium)
{
    return Results.BadRequest(new { error = "Premium feature - upgrade required" });
}
```

## Database Schema

The `subscriptions` table stores subscription state:

```sql
CREATE TABLE subscriptions (
    id                      VARCHAR PRIMARY KEY,
    user_id                 VARCHAR NOT NULL UNIQUE,
    stripe_customer_id      VARCHAR NOT NULL,
    stripe_subscription_id  VARCHAR,
    status                  VARCHAR NOT NULL DEFAULT 'free',
    current_period_start    TIMESTAMP,
    current_period_end      TIMESTAMP,
    created_at              TIMESTAMP DEFAULT current_timestamp,
    updated_at              TIMESTAMP DEFAULT current_timestamp
);
```

Status values: `free`, `active`, `canceled`, `past_due`

## Webhook Event Flow

1. User clicks "Upgrade to Premium" in frontend
2. Frontend calls `POST /api/payments/create-checkout`
3. Backend creates Stripe Checkout Session and returns URL
4. Frontend redirects user to Stripe Checkout
5. User completes payment
6. Stripe sends `checkout.session.completed` webhook
7. Stripe sends `customer.subscription.created` webhook
8. Backend updates subscription status to `active`
9. User is now premium

## Testing Locally

### 1. Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
```

### 2. Login and Forward Webhooks

```bash
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhook
```

This will output a webhook secret (starts with `whsec_`). Set it as `STRIPE_WEBHOOK_SECRET`.

### 3. Trigger Test Events

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

## Security Notes

- Webhook signature validation prevents unauthorized webhook calls
- JWT authentication required for all user endpoints
- Stripe API keys must be kept secret (use environment variables, never commit)
- Use HTTPS in production (webhooks require it)

## MobilePay Integration (Future)

MobilePay integration for the Danish market will be added in a future iteration. Current implementation uses Stripe only, which supports Danish payment methods (Dankort via Stripe).

For MobilePay:
- Requires MobilePay Subscriptions API access
- Different webhook flow
- Will be integrated alongside Stripe as alternative payment method

## Revenue Model

- **Free tier**: Ads supported (AdSense integration planned)
- **Premium tier**: 29 DKK/month, no ads, premium features
- **Platform cut**: If scaled, potential platform fee for custom word packs marketplace

Target: Freemium → Ads → Premium → Platform revenue.
