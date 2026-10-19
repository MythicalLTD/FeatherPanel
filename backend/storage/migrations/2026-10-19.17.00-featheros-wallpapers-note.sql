CREATE TABLE IF NOT EXISTS `featherpanel_featheros_meta` (
    `k` VARCHAR(64) NOT NULL,
    `v` TEXT NULL,
    PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `featherpanel_featheros_meta` (`k`, `v`) VALUES ('feature_wallpapers', '1');
