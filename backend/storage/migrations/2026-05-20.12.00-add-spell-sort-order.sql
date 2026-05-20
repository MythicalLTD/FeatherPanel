-- Custom display order for spells within each realm
ALTER TABLE `featherpanel_spells`
ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `realm_id`;

CREATE INDEX `spells_realm_sort_order_index` ON `featherpanel_spells` (`realm_id`, `sort_order`);
