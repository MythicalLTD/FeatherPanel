ALTER TABLE `featherpanel_nodes`
    ADD COLUMN `wings_check_install_exit_code` TINYINT(1) NOT NULL DEFAULT 0 AFTER `fastdl_port`,
    ADD COLUMN `wings_cpu_shares` INT(10) UNSIGNED NOT NULL DEFAULT 1024 AFTER `wings_check_install_exit_code`;
