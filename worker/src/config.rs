use anyhow::Result;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_host: String,
    pub database_port: u16,
    pub database_name: String,
    pub database_user: String,
    pub database_password: String,
    pub worker_interval: u64,
    pub max_retries: u32,
    pub retry_delay: u64,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Config {
            database_host: env::var("DATABASE_HOST").unwrap_or_else(|_| "mysql".to_string()),
            database_port: env::var("DATABASE_PORT")
                .unwrap_or_else(|_| "3306".to_string())
                .parse()?,
            database_name: env::var("DATABASE_NAME")
                .unwrap_or_else(|_| "featherpanel".to_string()),
            database_user: env::var("DATABASE_USER")
                .unwrap_or_else(|_| "featherpanel".to_string()),
            database_password: env::var("DATABASE_PASSWORD")
                .unwrap_or_else(|_| "featherpanel_password".to_string()),
            worker_interval: env::var("WORKER_INTERVAL")
                .unwrap_or_else(|_| "60".to_string())
                .parse()
                .unwrap_or(60),
            max_retries: env::var("WORKER_MAX_RETRIES")
                .unwrap_or_else(|_| "3".to_string())
                .parse()
                .unwrap_or(3),
            retry_delay: env::var("WORKER_RETRY_DELAY")
                .unwrap_or_else(|_| "2".to_string())
                .parse()
                .unwrap_or(2),
        })
    }

    pub fn database_url(&self) -> String {
        format!(
            "mysql://{}:{}@{}:{}/{}",
            self.database_user,
            self.database_password,
            self.database_host,
            self.database_port,
            self.database_name
        )
    }
}

