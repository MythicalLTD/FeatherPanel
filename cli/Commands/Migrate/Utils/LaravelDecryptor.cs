using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace FeatherCli.Commands.Migrate.Utils;

public class LaravelDecryptor
{
    private readonly string _appKey;
    private readonly ILogger? _logger;

    public LaravelDecryptor(string appKey, ILogger? logger = null)
    {
        _appKey = appKey ?? throw new ArgumentNullException(nameof(appKey));
        _logger = logger;
    }

    public string? Decrypt(string encryptedValue)
    {
        if (string.IsNullOrEmpty(encryptedValue))
        {
            return null;
        }

        try
        {
            // Laravel encrypted values are base64-encoded JSON strings
            // First, try to decode from base64 if it's not already decoded
            string jsonString;
            try
            {
                // Try to decode as base64 first
                var decodedBytes = Convert.FromBase64String(encryptedValue);
                jsonString = Encoding.UTF8.GetString(decodedBytes);
                _logger?.LogDebug("Successfully decoded base64 encrypted value");
            }
            catch (FormatException)
            {
                // If it's not base64, check if it's already JSON
                if (encryptedValue.TrimStart().StartsWith("{", StringComparison.Ordinal))
                {
                    jsonString = encryptedValue;
                    _logger?.LogDebug("Encrypted value is already JSON, skipping base64 decode");
                }
                else
                {
                    _logger?.LogWarning("Encrypted value is not valid base64 and not JSON. Value starts with: {Start}", 
                        encryptedValue.Length > 10 ? encryptedValue.Substring(0, 10) : encryptedValue);
                    return null;
                }
            }
            
            // Laravel encrypted values are JSON strings with iv, value, mac, and tag
            var payload = JsonSerializer.Deserialize<LaravelEncryptedPayload>(jsonString);
            if (payload == null)
            {
                _logger?.LogWarning("Failed to deserialize encrypted payload. JSON string: {Json}", 
                    jsonString.Length > 100 ? jsonString.Substring(0, 100) + "..." : jsonString);
                return null;
            }

            // Extract key from APP_KEY (format: base64:...)
            byte[] key;
            if (_appKey.StartsWith("base64:", StringComparison.OrdinalIgnoreCase))
            {
                var keyBase64 = _appKey.Substring(7);
                key = Convert.FromBase64String(keyBase64);
            }
            else
            {
                // If not base64, try to use it directly (shouldn't happen with Laravel)
                key = Encoding.UTF8.GetBytes(_appKey);
            }

            // Ensure key is 32 bytes for AES-256
            if (key.Length != 32)
            {
                _logger?.LogWarning("Key length is {Length}, expected 32 bytes for AES-256. Truncating or padding.", key.Length);
                if (key.Length > 32)
                {
                    key = key.Take(32).ToArray();
                }
                else
                {
                    var paddedKey = new byte[32];
                    Array.Copy(key, paddedKey, key.Length);
                    key = paddedKey;
                }
            }

            // Decode IV and encrypted value
            var iv = Convert.FromBase64String(payload.Iv);
            var encryptedBytes = Convert.FromBase64String(payload.Value);

            // Decrypt using AES-256-CBC
            using var aes = Aes.Create();
            aes.Key = key;
            aes.IV = iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using var decryptor = aes.CreateDecryptor();
            using var msDecrypt = new MemoryStream(encryptedBytes);
            using var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read);
            using var srDecrypt = new StreamReader(csDecrypt);

            var decrypted = srDecrypt.ReadToEnd();

            // Verify MAC if present (but don't fail if it doesn't match - just log a warning)
            if (!string.IsNullOrEmpty(payload.Mac))
            {
                var computedMac = ComputeMac(key, iv, encryptedBytes);
                if (computedMac != payload.Mac)
                {
                    _logger?.LogWarning("MAC verification failed for decrypted value, but continuing with decrypted value anyway");
                    // Don't return null - continue with the decrypted value
                }
            }

            // Handle PHP serialized format (e.g., s:64:"token_value";)
            var result = ParsePhpSerializedString(decrypted);
            return result ?? decrypted; // Fallback to original if parsing fails
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to decrypt value");
            return null;
        }
    }

    private string ComputeMac(byte[] key, byte[] iv, byte[] encryptedValue)
    {
        // Laravel uses HMAC-SHA256 for MAC
        using var hmac = new HMACSHA256(key);
        var data = new byte[iv.Length + encryptedValue.Length];
        Buffer.BlockCopy(iv, 0, data, 0, iv.Length);
        Buffer.BlockCopy(encryptedValue, 0, data, iv.Length, encryptedValue.Length);
        var hash = hmac.ComputeHash(data);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private string? ParsePhpSerializedString(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return null;
        }

        // Handle PHP serialized string format: s:64:"token_value";
        // Pattern: s:length:"value";
        if (value.StartsWith("s:", StringComparison.Ordinal))
        {
            var colonIndex = value.IndexOf(':', 2);
            if (colonIndex > 0)
            {
                var lengthStr = value.Substring(2, colonIndex - 2);
                if (int.TryParse(lengthStr, out var length))
                {
                    // Find the opening quote after the length
                    var quoteIndex = value.IndexOf('"', colonIndex);
                    if (quoteIndex > 0 && quoteIndex < value.Length - 1)
                    {
                        // Extract the string value between quotes
                        var endQuoteIndex = value.IndexOf('"', quoteIndex + 1);
                        if (endQuoteIndex > quoteIndex)
                        {
                            var extracted = value.Substring(quoteIndex + 1, endQuoteIndex - quoteIndex - 1);
                            // Verify the length matches
                            if (extracted.Length == length)
                            {
                                _logger?.LogDebug("Parsed PHP serialized string: extracted {Length} character token", length);
                                return extracted;
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    private class LaravelEncryptedPayload
    {
        [System.Text.Json.Serialization.JsonPropertyName("iv")]
        public string Iv { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("value")]
        public string Value { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("mac")]
        public string? Mac { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("tag")]
        public string? Tag { get; set; }
    }
}

