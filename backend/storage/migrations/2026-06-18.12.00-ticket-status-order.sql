ALTER TABLE `featherpanel_ticket_statuses`
ADD COLUMN `sort_order` INT(11) NOT NULL DEFAULT 0 AFTER `color`,
ADD COLUMN `is_default` TINYINT(1) NOT NULL DEFAULT 0 AFTER `sort_order`;

UPDATE `featherpanel_ticket_statuses`
SET `sort_order` = `id` * 10;

UPDATE `featherpanel_ticket_statuses`
SET `is_default` = 1
WHERE LOWER(`name`) = 'open'
LIMIT 1;

UPDATE `featherpanel_ticket_statuses` AS s
INNER JOIN (
    SELECT `id`
    FROM `featherpanel_ticket_statuses`
    ORDER BY `sort_order` ASC, `id` ASC
    LIMIT 1
) AS first_status ON s.`id` = first_status.`id`
SET s.`is_default` = 1
WHERE NOT EXISTS (
    SELECT 1 FROM (
        SELECT `id` FROM `featherpanel_ticket_statuses` WHERE `is_default` = 1
    ) AS existing_default
);
