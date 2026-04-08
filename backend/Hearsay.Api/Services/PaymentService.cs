using Stripe;
using Stripe.Checkout;
using Hearsay.Api.Models;

namespace Hearsay.Api.Services;

public class PaymentService
{
    private readonly IConfiguration _config;
    private readonly DuckDbService _db;

    public PaymentService(IConfiguration config, DuckDbService db)
    {
        _config = config;
        _db = db;
        StripeConfiguration.ApiKey = _config["STRIPE_SECRET_KEY"];
    }

    public async Task<string> CreateCheckoutSession(string userId, string userEmail, string returnUrl)
    {
        var user = await _db.GetUserById(userId);
        if (user == null) throw new Exception("User not found");

        // Get or create subscription record
        var subscription = await _db.GetSubscriptionByUserId(userId);
        string customerId;

        if (subscription == null)
        {
            // Create Stripe customer
            var customerService = new CustomerService();
            var customer = await customerService.CreateAsync(new CustomerCreateOptions
            {
                Email = userEmail,
                Metadata = new Dictionary<string, string>
                {
                    { "user_id", userId }
                }
            });
            customerId = customer.Id;

            // Create subscription record (initially free)
            subscription = new Models.Subscription
            {
                Id = Guid.NewGuid().ToString(),
                UserId = userId,
                StripeCustomerId = customerId,
                Status = "free"
            };
            await _db.CreateSubscription(subscription);
        }
        else
        {
            customerId = subscription.StripeCustomerId;
        }

        // Create checkout session
        var priceId = _config["STRIPE_PRICE_ID"] ?? throw new Exception("STRIPE_PRICE_ID not configured");
        var sessionService = new SessionService();
        var session = await sessionService.CreateAsync(new SessionCreateOptions
        {
            Customer = customerId,
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    Price = priceId,
                    Quantity = 1
                }
            },
            Mode = "subscription",
            SuccessUrl = $"{returnUrl}?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{returnUrl}?canceled=true",
            Metadata = new Dictionary<string, string>
            {
                { "user_id", userId }
            }
        });

        return session.Url;
    }

    public async Task<bool> IsPremiumUser(string? userId)
    {
        if (string.IsNullOrEmpty(userId)) return false;

        var subscription = await _db.GetSubscriptionByUserId(userId);
        if (subscription == null) return false;

        return subscription.Status == "active" &&
               subscription.CurrentPeriodEnd.HasValue &&
               subscription.CurrentPeriodEnd.Value > DateTime.UtcNow;
    }

    public async Task<Models.Subscription?> GetUserSubscription(string userId)
    {
        return await _db.GetSubscriptionByUserId(userId);
    }

    public async Task HandleWebhookEvent(string json, string signature)
    {
        var webhookSecret = _config["STRIPE_WEBHOOK_SECRET"] ?? throw new Exception("STRIPE_WEBHOOK_SECRET not configured");

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, signature, webhookSecret);
        }
        catch (StripeException)
        {
            throw new Exception("Invalid signature");
        }

        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                await HandleCheckoutSessionCompleted(stripeEvent.Data.Object as Session);
                break;

            case "customer.subscription.created":
            case "customer.subscription.updated":
                await HandleSubscriptionUpdated(stripeEvent.Data.Object as Stripe.Subscription);
                break;

            case "customer.subscription.deleted":
                await HandleSubscriptionDeleted(stripeEvent.Data.Object as Stripe.Subscription);
                break;

            case "invoice.payment_succeeded":
                await HandleInvoicePaymentSucceeded(stripeEvent.Data.Object as Invoice);
                break;

            case "invoice.payment_failed":
                await HandleInvoicePaymentFailed(stripeEvent.Data.Object as Invoice);
                break;
        }
    }

    private async Task HandleCheckoutSessionCompleted(Session? session)
    {
        if (session == null) return;

        var userId = session.Metadata?["user_id"];
        if (string.IsNullOrEmpty(userId)) return;

        var subscription = await _db.GetSubscriptionByUserId(userId);
        if (subscription == null) return;

        // Subscription will be updated via subscription.updated event
    }

    private async Task HandleSubscriptionUpdated(Stripe.Subscription? stripeSubscription)
    {
        if (stripeSubscription == null) return;

        var subscription = await _db.GetSubscriptionByStripeCustomerId(stripeSubscription.CustomerId);
        if (subscription == null) return;

        var status = stripeSubscription.Status switch
        {
            "active" => "active",
            "canceled" => "canceled",
            "past_due" => "past_due",
            "incomplete" => "free",
            "incomplete_expired" => "free",
            "trialing" => "active",
            "unpaid" => "past_due",
            _ => "free"
        };

        // Get billing period dates from the subscription
        // Stripe SDK returns these as DateTime? properties
        DateTime? periodStart = null;
        DateTime? periodEnd = null;

        // Access properties via reflection to handle different Stripe.NET versions
        var startProp = stripeSubscription.GetType().GetProperty("CurrentPeriodStart");
        var endProp = stripeSubscription.GetType().GetProperty("CurrentPeriodEnd");

        if (startProp != null)
        {
            var startValue = startProp.GetValue(stripeSubscription);
            if (startValue is DateTime dt) periodStart = dt;
        }

        if (endProp != null)
        {
            var endValue = endProp.GetValue(stripeSubscription);
            if (endValue is DateTime dt) periodEnd = dt;
        }

        await _db.UpdateSubscriptionStatus(
            subscription.UserId,
            status,
            stripeSubscription.Id,
            periodStart,
            periodEnd
        );
    }

    private async Task HandleSubscriptionDeleted(Stripe.Subscription? stripeSubscription)
    {
        if (stripeSubscription == null) return;

        var subscription = await _db.GetSubscriptionByStripeCustomerId(stripeSubscription.CustomerId);
        if (subscription == null) return;

        await _db.UpdateSubscriptionStatus(subscription.UserId, "canceled", null, null, null);
    }

    private async Task HandleInvoicePaymentSucceeded(Invoice? invoice)
    {
        if (invoice == null || invoice.CustomerId == null) return;

        var subscription = await _db.GetSubscriptionByStripeCustomerId(invoice.CustomerId);
        if (subscription == null) return;

        // Payment succeeded - subscription should be active
        // This is already handled by subscription.updated event
    }

    private async Task HandleInvoicePaymentFailed(Invoice? invoice)
    {
        if (invoice == null || invoice.CustomerId == null) return;

        var subscription = await _db.GetSubscriptionByStripeCustomerId(invoice.CustomerId);
        if (subscription == null) return;

        // Payment failed - mark as past_due
        await _db.UpdateSubscriptionStatus(subscription.UserId, "past_due", subscription.StripeSubscriptionId, subscription.CurrentPeriodStart, subscription.CurrentPeriodEnd);
    }
}
