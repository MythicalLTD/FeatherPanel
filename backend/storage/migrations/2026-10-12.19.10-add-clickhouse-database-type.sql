-- Add 'clickhouse' to the database_type enum for remote database hosts
ALTER TABLE `featherpanel_databases`
    MODIFY COLUMN `database_type` ENUM ('mysql', 'postgresql', 'mariadb', 'mongodb', 'redis', 'clickhouse') NOT NULL DEFAULT 'mysql';
