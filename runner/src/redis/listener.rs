use anyhow::Result;
use futures_util::StreamExt;
use redis::aio::PubSub;
use sqlx::MySqlPool;
use std::time::Duration;
use tracing::{error, info, warn};

use crate::processor;
use crate::types::MailNotification;

pub async fn listen(redis_url: &str, pool: MySqlPool) -> Result<()> {
    let retry_delay = Duration::from_secs(5);

    loop {
        info!("📡 Connecting to Redis...");
        
        match connect_and_listen(redis_url, pool.clone()).await {
            Ok(_) => {
                warn!("⚠️  Redis connection closed unexpectedly, reconnecting in {:?}...", retry_delay);
            }
            Err(e) => {
                error!("❌ Redis connection failed: {}. Reconnecting in {:?}...", e, retry_delay);
            }
        }
        
        tokio::time::sleep(retry_delay).await;
    }
}

async fn connect_and_listen(redis_url: &str, pool: MySqlPool) -> Result<()> {
    let client = redis::Client::open(redis_url)?;
    let mut pubsub: PubSub = client.get_async_pubsub().await?;

    pubsub.subscribe("featherpanel:mail:pending").await?;
    info!("✅ Redis connected");
    info!("👂 Listening on channel: featherpanel:mail:pending");

    let mut stream = pubsub.on_message();

    while let Some(msg) = stream.next().await {
        let payload: String = msg.get_payload()?;
        info!("📬 Received notification: {}", payload);

        match serde_json::from_str::<MailNotification>(&payload) {
            Ok(notification) => {
                tokio::spawn({
                    let pool = pool.clone();
                    async move {
                        if let Err(e) = processor::process_mail(&pool, &notification.queue_id).await
                        {
                            error!(
                                "❌ Failed to process mail {}: {}",
                                notification.queue_id, e
                            );
                        }
                    }
                });
            }
            Err(e) => {
                warn!("⚠️  Invalid notification payload: {}", e);
            }
        }
    }

    Ok(())
}
