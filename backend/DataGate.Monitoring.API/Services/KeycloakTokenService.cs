using DataGate.Monitoring.API.Configuration;
using System.Text.Json;

namespace DataGate.Monitoring.API.Services;

public interface IKeycloakTokenService
{
    Task<string> GetAccessTokenAsync(CancellationToken ct = default);
}

public class KeycloakTokenService : IKeycloakTokenService
{
    private readonly HttpClient        _http;
    private readonly AirflowSettings   _settings;
    private readonly ILogger<KeycloakTokenService> _logger;

    private string?  _cachedToken;
    private DateTime _tokenExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public KeycloakTokenService(
        IHttpClientFactory factory,
        AirflowSettings settings,
        ILogger<KeycloakTokenService> logger)
    {
        _http     = factory.CreateClient("keycloak");
        _settings = settings;
        _logger   = logger;
    }

    public async Task<string> GetAccessTokenAsync(CancellationToken ct = default)
    {
        if (_cachedToken is not null && DateTime.UtcNow < _tokenExpiry)
            return _cachedToken;

        await _lock.WaitAsync(ct);
        try
        {
            // Double-check after acquiring lock
            if (_cachedToken is not null && DateTime.UtcNow < _tokenExpiry)
                return _cachedToken;

            var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"]    = "client_credentials",
                ["client_id"]     = _settings.ClientId,
                ["client_secret"] = _settings.ClientSecret
            });

            var response = await _http.PostAsync(_settings.KeycloakUrl, form, ct);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync(ct);
            var doc  = JsonDocument.Parse(json).RootElement;

            _cachedToken = doc.GetProperty("access_token").GetString()
                           ?? throw new InvalidOperationException("Empty access_token from Keycloak");

            var expiresIn = doc.GetProperty("expires_in").GetInt32();
            // Refresh 30s before actual expiry
            _tokenExpiry = DateTime.UtcNow.AddSeconds(expiresIn - 30);

            _logger.LogInformation("Keycloak token refreshed, expires in {Seconds}s", expiresIn);
            return _cachedToken;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to obtain Keycloak token");
            throw;
        }
        finally
        {
            _lock.Release();
        }
    }
}
