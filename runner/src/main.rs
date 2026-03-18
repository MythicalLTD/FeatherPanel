use anyhow::Result;
use tracing::info;

mod config;
mod database;
mod encryption;
mod mail;
mod processor;
mod proxmox;
mod redis;
mod settings;
mod types;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    info!("🚀 FeatherPanel Async Runner starting...");

    // Load configuration
    let config = config::load_config()?;
    info!("✅ Configuration loaded");

    // Connect to MySQL with retries
    let pool = database::connect(&config.database_url).await?;

    // Initialize settings with encryption
    settings::init_settings(&pool, &config.encryption_key).await?;

    let pool_clone = pool.clone();
    let enc_key = config.encryption_key.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
        loop {
            interval.tick().await;
            if let Ok(new_settings) = settings::load_settings(&pool_clone, &enc_key).await {
                settings::update_settings(new_settings).await;
            }
        }
    });

    // Start Redis listener with retries
    info!("📡 Starting Redis listener...");
    redis::listen(&config.redis_url, pool, config.encryption_key).await?;

    Ok(())
}
