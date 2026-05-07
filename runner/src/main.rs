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

    // Start Redis listener with retries
    info!("📡 Starting Redis listener...");
    redis::listen(&config.redis_url, pool, config.encryption_key).await?;

    Ok(())
}
