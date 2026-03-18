use anyhow::Result;
use once_cell::sync::OnceCell;
use sqlx::{MySqlPool, Row};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn};

use crate::encryption::Encryptor;

pub static SETTINGS: OnceCell<Arc<RwLock<Settings>>> = OnceCell::new();

#[derive(Clone)]
pub struct Settings {
    data: HashMap<String, String>,
}

impl Settings {
    pub fn new() -> Self {
        Self {
            data: HashMap::new(),
        }
    }

    pub fn get(&self, key: &str) -> Option<String> {
        self.data.get(key).cloned()
    }

    pub fn set(&mut self, key: String, value: String) {
        self.data.insert(key, value);
    }

    pub fn get_all(&self) -> &HashMap<String, String> {
        &self.data
    }
}

pub async fn load_settings(pool: &MySqlPool, encryption_key: &str) -> Result<Settings> {
    info!("🔐 Initializing XChaCha20 encryption bridge...");
    
    let encryptor = Encryptor::new(encryption_key)?;
    info!("✅ Encryption layer initialized successfully");

    info!("📊 Loading settings from database...");
    let rows = sqlx::query("SELECT `name`, `value` FROM featherpanel_settings")
        .fetch_all(pool)
        .await?;

    let mut settings = Settings::new();
    let mut decrypted_count = 0;

    for row in rows {
        let name: String = row.try_get("name")?;
        let encrypted_value: String = row.try_get("value")?;

        match encryptor.decrypt(&encrypted_value) {
            Ok(decrypted) => {
                settings.set(name, decrypted);
                decrypted_count += 1;
            }
            Err(e) => {
                warn!("⚠️  Failed to decrypt setting '{}': {}", name, e);
            }
        }
    }

    let app_name = settings.get("app_name").unwrap_or_else(|| "FeatherPanel".to_string());
    
    info!("✅ XChaCha20 bridge: Decrypted {} settings from table", decrypted_count);
    info!("🚀 Running for: {}", app_name);
    info!("💾 Settings loaded into memory");

    Ok(settings)
}

pub async fn get_setting(key: &str) -> Option<String> {
    if let Some(settings) = SETTINGS.get() {
        let settings = settings.read().await;
        settings.get(key)
    } else {
        None
    }
}

pub async fn init_settings(pool: &MySqlPool, encryption_key: &str) -> Result<()> {
    let settings = load_settings(pool, encryption_key).await?;
    SETTINGS
        .set(Arc::new(RwLock::new(settings)))
        .map_err(|_| anyhow::anyhow!("Settings already initialized"))?;
    Ok(())
}

pub async fn update_settings(new_settings: Settings) {
    if let Some(settings) = SETTINGS.get() {
        let mut lock = settings.write().await;
        *lock = new_settings;
    }
}
