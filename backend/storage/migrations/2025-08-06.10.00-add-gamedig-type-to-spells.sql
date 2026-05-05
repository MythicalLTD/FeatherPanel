-- Add gamedig_type column to spells table for explicit game type configuration
ALTER TABLE `featherpanel_spells` ADD COLUMN `gamedig_type` VARCHAR(64) DEFAULT NULL AFTER `description`;
