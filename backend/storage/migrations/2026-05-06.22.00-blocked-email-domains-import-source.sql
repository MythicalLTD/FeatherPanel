ALTER TABLE `featherpanel_blocked_email_domains`
MODIFY COLUMN `source`
    ENUM('manual','preset','import')
    NOT NULL DEFAULT 'manual'
    COMMENT 'manual=admin row, preset=bundled file, import=URL or pasted list';
