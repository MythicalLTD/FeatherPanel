using Newtonsoft.Json;

namespace FeatherCli.Core.Api.Models;

/// <summary>
/// OAuth2 authorization request parameters
/// </summary>
public class OAuth2AuthorizationRequest
{
    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("callbackurl")]
    public string CallbackUrl { get; set; } = string.Empty;

    [JsonProperty("appName")]
    public string? AppName { get; set; }

    [JsonProperty("appLogo")]
    public string? AppLogo { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("mode")]
    public string Mode { get; set; } = "user"; // "user" or "server"

    [JsonProperty("allowedips")]
    public string? AllowedIps { get; set; }

    [JsonProperty("alertCors")]
    public bool AlertCors { get; set; } = false;
}

/// <summary>
/// OAuth2 metadata validation response
/// </summary>
public class OAuth2MetadataResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("error")]
    public string? Error { get; set; }

    [JsonProperty("error_description")]
    public string? ErrorDescription { get; set; }
}

/// <summary>
/// OAuth2 callback response for user mode (received in URL fragment)
/// </summary>
public class OAuth2UserModeCallback
{
    public string? PublicKey { get; set; }
    public string? PrivateKey { get; set; }
    public string? TokenType { get; set; }
    public string? IssuedAt { get; set; }
    public string? AuthorizationCode { get; set; }
    public string? Error { get; set; }
    public string? ErrorDescription { get; set; }
}

/// <summary>
/// OAuth2 callback response for server mode (received as JSON)
/// </summary>
public class OAuth2ServerModeCallback
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("token_type")]
    public string? TokenType { get; set; }

    [JsonProperty("public_key")]
    public string? PublicKey { get; set; }

    [JsonProperty("private_key")]
    public string? PrivateKey { get; set; }

    [JsonProperty("authorization_code")]
    public string? AuthorizationCode { get; set; }

    [JsonProperty("issued_at")]
    public string? IssuedAt { get; set; }

    [JsonProperty("error")]
    public string? Error { get; set; }

    [JsonProperty("error_description")]
    public string? ErrorDescription { get; set; }
}

/// <summary>
/// OAuth2 token exchange request
/// </summary>
public class OAuth2TokenExchangeRequest
{
    [JsonProperty("code")]
    public string AuthorizationCode { get; set; } = string.Empty;
}

/// <summary>
/// OAuth2 token exchange response
/// </summary>
public class OAuth2TokenExchangeResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("token_type")]
    public string? TokenType { get; set; }

    [JsonProperty("public_key")]
    public string? PublicKey { get; set; }

    [JsonProperty("private_key")]
    public string? PrivateKey { get; set; }

    [JsonProperty("issued_at")]
    public string? IssuedAt { get; set; }

    [JsonProperty("error")]
    public string? Error { get; set; }

    [JsonProperty("error_description")]
    public string? ErrorDescription { get; set; }
}

/// <summary>
/// API client validation request
/// </summary>
public class ApiClientValidationRequest
{
    [JsonProperty("public_key")]
    public string PublicKey { get; set; } = string.Empty;
}

/// <summary>
/// API client validation response
/// </summary>
public class ApiClientValidationResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("valid")]
    public bool Valid { get; set; }

    [JsonProperty("error")]
    public string? Error { get; set; }
}
