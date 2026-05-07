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
    // LOG_DIR can be overridden via env var. Docker Compose mounts the backend log volume at
    // `/var/www/html/storage/logs` so the panel log viewer reads `runner.fplog`; bare-metal
    // dev falls back to paths next to this crate.
    let log_dir = std::env::var("LOG_DIR").unwrap_or_else(|_| {
        if std::path::Path::new("/var/www/html/storage/logs").exists() {
            "/var/www/html/storage/logs".to_string()
        } else if std::path::Path::new("/app/logs").exists() {
            "/app/logs".to_string()
        } else {
            "../backend/storage/logs".to_string()
        }
    });
    // `tracing_appender::rolling::never` panics on permission errors.
    // Catch that so the service can still run with stdout logging instead of crash-looping.
    // WorkerGuard must outlive the process: dropping it stops the non-blocking writer thread.
    // See: https://docs.rs/tracing-appender/latest/tracing_appender/non_blocking/struct.WorkerGuard.html
    let file_layer = std::panic::catch_unwind(|| {
        let file_appender = tracing_appender::rolling::never(&log_dir, "runner.fplog");
        let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);
        std::mem::forget(guard);
        fmt::layer().with_ansi(false).with_writer(non_blocking)
    });

    match file_layer {
        Ok(layer) => {
            tracing_subscriber::registry()
                .with(layer)
                .with(fmt::layer().with_writer(std::io::stdout))
                .init();
        }
        Err(_) => {
            eprintln!(
                "failed to initialize file logging in LOG_DIR='{}'; continuing with stdout logging only",
                log_dir
            );
            tracing_subscriber::registry()
                .with(fmt::layer().with_writer(std::io::stdout))
                .init();
        }
    }

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
