namespace Daedala.Services.Interfaces;

/// <summary>
/// Sends transactional email. The password reset flow uses this to deliver a one-time link;
/// nothing else in the API needs mail.
/// </summary>
public interface IEmailSender
{
    /// <summary>Whether email delivery is configured. When false callers must not expose secrets.</summary>
    bool IsConfigured { get; }

    /// <summary>Sends a plain-text message. Throws when delivery fails.</summary>
    Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken = default);
}
