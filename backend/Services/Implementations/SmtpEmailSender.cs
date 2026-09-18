using System.Net;
using System.Net.Mail;
using Daedala.Services.Interfaces;

namespace Daedala.Services.Implementations;

/// <summary>
/// Sends mail over SMTP using the settings under the <c>Email</c> configuration section
/// (host, port, credentials, from address). Credentials come from configuration/environment
/// and are never hard-coded.
///
/// When no host is configured the sender reports <see cref="IsConfigured"/> as false and
/// logs instead of throwing, so a local install without a mail server still starts and the
/// reset flow fails closed (no token is ever surfaced to the caller).
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(EmailOptions options, ILogger<SmtpEmailSender> logger)
    {
        _options = options;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.Host);

    public async Task SendAsync(
        string to, string subject, string body, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            // Fail closed: without a mail server the caller must not fall back to exposing the
            // message contents (for example a reset token).
            _logger.LogWarning(
                "Email is not configured; dropping message to {Recipient} with subject '{Subject}'.",
                to, subject);
            throw new InvalidOperationException("Email delivery is not configured.");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_options.From ?? _options.User ?? "no-reply@daedala.local"),
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };
        message.To.Add(to);

        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(_options.User))
        {
            client.UseDefaultCredentials = false;
            client.Credentials = new NetworkCredential(_options.User, _options.Password);
        }

        await client.SendMailAsync(message, cancellationToken);
    }
}

/// <summary>SMTP settings bound from the <c>Email</c> configuration section.</summary>
public class EmailOptions
{
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? User { get; set; }
    public string? Password { get; set; }
    public string? From { get; set; }
    public bool EnableSsl { get; set; } = true;
}
