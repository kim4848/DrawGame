namespace Hearsay.Api.Models;

public class Subscription
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string StripeCustomerId { get; set; } = "";
    public string? StripeSubscriptionId { get; set; }
    public string Status { get; set; } = "free"; // free, active, canceled, past_due
    public DateTime? CurrentPeriodStart { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
