use anyhow::{Context, Result};
use base64::{engine::general_purpose, Engine as _};
use chacha20poly1305::{
    aead::{Aead, KeyInit, Payload},
    XChaCha20Poly1305,
};

pub struct Encryptor {
    cipher: XChaCha20Poly1305,
}

impl Encryptor {
    pub fn new(key: &str) -> Result<Self> {
        // Decode base64 key
        let key_bytes = general_purpose::STANDARD
            .decode(key)
            .context("Failed to decode encryption key")?;

        if key_bytes.len() != 32 {
            anyhow::bail!("Encryption key must be 32 bytes, got {}", key_bytes.len());
        }

        let cipher = XChaCha20Poly1305::new_from_slice(&key_bytes)
            .context("Failed to initialize XChaCha20Poly1305")?;

        Ok(Self { cipher })
    }

    pub fn decrypt(&self, encrypted_data: &str) -> Result<String> {
        // Decode base64 encrypted data
        let data = general_purpose::STANDARD
            .decode(encrypted_data)
            .context("Failed to decode encrypted data")?;

        // Extract nonce (first 24 bytes for XChaCha20)
        if data.len() < 24 {
            anyhow::bail!("Encrypted data too short");
        }

        let nonce = &data[..24];
        let ciphertext = &data[24..];

        // PHP uses: sodium_crypto_aead_xchacha20poly1305_ietf_decrypt($encrypted, $nonce, $nonce, $key)
        // The nonce is used as both the nonce AND the associated data
        let payload = Payload {
            msg: ciphertext,
            aad: nonce, // This is the key difference - PHP passes nonce as AD
        };

        // Decrypt
        let plaintext = self
            .cipher
            .decrypt(nonce.into(), payload)
            .map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext).context("Decrypted data is not valid UTF-8")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decrypt() {
        // This would need a real encrypted value from PHP to test properly
        // For now, just test that the encryptor can be created
        let key = general_purpose::STANDARD.encode(&[0u8; 32]);
        let encryptor = Encryptor::new(&key);
        assert!(encryptor.is_ok());
    }
}
