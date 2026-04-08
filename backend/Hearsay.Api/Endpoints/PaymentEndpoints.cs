using Microsoft.AspNetCore.Authorization;
using Hearsay.Api.Services;
using System.Security.Claims;
using Stripe;
using Stripe.BillingPortal;

namespace Hearsay.Api.Endpoints;

public static class PaymentEndpoints
{
    public static void MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/payments");

        group.MapPost("/create-checkout", CreateCheckout).RequireAuthorization();
        group.MapPost("/webhook", HandleWebhook).AllowAnonymous();
        group.MapGet("/subscription", GetSubscription).RequireAuthorization();
        group.MapPost("/portal", CreatePortal).RequireAuthorization();
    }

    private static async Task<IResult> CreateCheckout(
        HttpContext context,
        PaymentService paymentService,
        IConfiguration config)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userEmail = context.User.FindFirst(ClaimTypes.Email)?.Value;

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(userEmail))
        {
            return Results.Unauthorized();
        }

        try
        {
            var frontendUrl = config["VITE_API_BASE_URL"]?.Replace("/api", "") ?? "http://localhost:3000";
            var returnUrl = $"{frontendUrl}/premium";

            var checkoutUrl = await paymentService.CreateCheckoutSession(userId, userEmail, returnUrl);
            return Results.Ok(new { url = checkoutUrl });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> HandleWebhook(
        HttpContext context,
        PaymentService paymentService)
    {
        try
        {
            var json = await new StreamReader(context.Request.Body).ReadToEndAsync();
            var signature = context.Request.Headers["Stripe-Signature"].ToString();

            await paymentService.HandleWebhookEvent(json, signature);
            return Results.Ok();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> GetSubscription(
        HttpContext context,
        PaymentService paymentService)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Results.Unauthorized();
        }

        try
        {
            var subscription = await paymentService.GetUserSubscription(userId);
            var isPremium = await paymentService.IsPremiumUser(userId);

            return Results.Ok(new
            {
                isPremium,
                status = subscription?.Status ?? "free",
                currentPeriodEnd = subscription?.CurrentPeriodEnd
            });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> CreatePortal(
        HttpContext context,
        PaymentService paymentService,
        IConfiguration config)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Results.Unauthorized();
        }

        try
        {
            var subscription = await paymentService.GetUserSubscription(userId);
            if (subscription == null)
            {
                return Results.BadRequest(new { error = "No subscription found" });
            }

            var frontendUrl = config["VITE_API_BASE_URL"]?.Replace("/api", "") ?? "http://localhost:3000";
            var returnUrl = $"{frontendUrl}/premium";

            var sessionService = new Stripe.BillingPortal.SessionService();
            var session = await sessionService.CreateAsync(new Stripe.BillingPortal.SessionCreateOptions
            {
                Customer = subscription.StripeCustomerId,
                ReturnUrl = returnUrl
            });

            return Results.Ok(new { url = session.Url });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }
}
