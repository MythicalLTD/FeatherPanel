ALTER TABLE `featherpanel_vm_templates`
    ADD COLUMN IF NOT EXISTS `lxc_root_password` TEXT NULL
        COMMENT 'Default root password for LXC templates (informational only)';

