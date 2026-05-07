use anyhow::Result;
use tracing::info;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt};

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
    // Initialize logging – file layer (no rotation) + stdout layer
    // LOG_DIR can be overridden via env var; Docker mounts the shared volume at /app/logs,
    // bare-metal dev falls back to the backend's storage/logs directory.
    let log_dir = std::env::var("LOG_DIR").unwrap_or_else(|_| {
        // Probe the Docker path first, then fall back to the dev-relative path
        if std::path::Path::new("/app/logs").exists() {
            "/app/logs".to_string()
        } else {
            "../backend/storage/logs".to_string()
        }
    });
    let file_appender = tracing_appender::rolling::never(&log_dir, "runner.fplog");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    tracing_subscriber::registry()
        .with(fmt::layer().with_ansi(false).with_writer(non_blocking))
        .with(fmt::layer().with_writer(std::io::stdout))
        .init();

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
