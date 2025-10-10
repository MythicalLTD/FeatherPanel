use crate::config::Config;
use crate::models::{MailList, MailQueue, SmtpConfig, User};
use anyhow::{Context, Result};
use sqlx::mysql::MySqlPoolOptions;
use sqlx::{MySqlPool, Row};

pub async fn create_pool(config: &Config) -> Result<MySqlPool> {
    MySqlPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url())
        .await
        .context("Failed to create database pool")
}

pub async fn get_setting(pool: &MySqlPool, name: &str) -> Result<String> {
    let result = sqlx::query(
        "SELECT value FROM featherpanel_settings WHERE name = ? LIMIT 1"
    )
    .bind(name)
    .fetch_optional(pool)
    .await?;

    match result {
        Some(row) => Ok(row.try_get("value")?),
        None => Ok("false".to_string()),
    }
}

pub async fn get_pending_mails(pool: &MySqlPool) -> Result<Vec<MailQueue>> {
    let mails = sqlx::query_as::<_, MailQueue>(
        "SELECT * FROM featherpanel_mail_queue 
         WHERE status = 'pending' 
         AND locked = 'false' 
         AND deleted = 'false'"
    )
    .fetch_all(pool)
    .await?;

    Ok(mails)
}

pub async fn get_mail_info(pool: &MySqlPool, id: i32) -> Result<Option<MailList>> {
    let mail_info = sqlx::query_as::<_, MailList>(
        "SELECT * FROM featherpanel_mail_list WHERE id = ? LIMIT 1"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(mail_info)
}

pub async fn get_user_by_uuid(pool: &MySqlPool, uuid: &str) -> Result<Option<User>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, first_name, last_name, email, uuid 
         FROM featherpanel_users 
         WHERE uuid = ? LIMIT 1"
    )
    .bind(uuid)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

pub async fn update_mail_lock(pool: &MySqlPool, id: i32, locked: bool) -> Result<()> {
    let locked_str = if locked { "true" } else { "false" };
    
    sqlx::query("UPDATE featherpanel_mail_queue SET locked = ? WHERE id = ?")
        .bind(locked_str)
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn update_mail_status(
    pool: &MySqlPool,
    id: i32,
    status: &str,
    locked: bool,
) -> Result<()> {
    let locked_str = if locked { "true" } else { "false" };
    
    sqlx::query("UPDATE featherpanel_mail_queue SET status = ?, locked = ? WHERE id = ?")
        .bind(status)
        .bind(locked_str)
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn get_smtp_config(pool: &MySqlPool) -> Result<SmtpConfig> {
    Ok(SmtpConfig {
        host: get_setting(pool, "smtp_host").await?,
        port: get_setting(pool, "smtp_port")
            .await?
            .parse()
            .unwrap_or(587),
        user: get_setting(pool, "smtp_user").await?,
        password: get_setting(pool, "smtp_pass").await?,
        from: get_setting(pool, "smtp_from").await?,
        encryption: get_setting(pool, "smtp_encryption").await?,
        app_name: get_setting(pool, "app_name")
            .await
            .unwrap_or_else(|_| "FeatherPanel".to_string()),
    })
}

pub async fn mark_timed_task(
    pool: &MySqlPool,
    task_name: &str,
    success: bool,
    message: &str,
) -> Result<()> {
    let success_val = if success { 1 } else { 0 };
    
    sqlx::query(
        "INSERT INTO featherpanel_timed_tasks 
         (task_name, last_run_at, last_run_success, last_run_message, updated_at) 
         VALUES (?, NOW(), ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
         last_run_at = NOW(), 
         last_run_success = ?, 
         last_run_message = ?, 
         updated_at = NOW()"
    )
    .bind(task_name)
    .bind(success_val)
    .bind(message)
    .bind(success_val)
    .bind(message)
    .execute(pool)
    .await?;

    Ok(())
}

