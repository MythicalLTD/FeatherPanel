ALTER TABLE `featherpanel_ticket_priorities`
ADD COLUMN `sort_order` INT(11) NOT NULL DEFAULT 0 AFTER `color`;

CREATE INDEX `ticket_priorities_sort_order_index` ON `featherpanel_ticket_priorities` (`sort_order`);

-- Preserve insertion order as a baseline (default seed is Low, Medium, High).
UPDATE `featherpanel_ticket_priorities`
SET `sort_order` = `id` * 10;

-- Prefer severity order for common names even if rows were recreated out of order.
UPDATE `featherpanel_ticket_priorities`
SET `sort_order` = 10
WHERE LOWER(`name`) = 'low';

UPDATE `featherpanel_ticket_priorities`
SET `sort_order` = 20
WHERE LOWER(`name`) IN ('medium', 'normal');

UPDATE `featherpanel_ticket_priorities`
SET `sort_order` = 30
WHERE LOWER(`name`) = 'high';

UPDATE `featherpanel_ticket_priorities`
SET `sort_order` = 40
WHERE LOWER(`name`) IN ('urgent', 'critical');
