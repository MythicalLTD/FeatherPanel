-- Add sort_order column to knowledgebase articles for custom positioning
ALTER TABLE `featherpanel_knowledgebase_articles` 
ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `pinned`;

-- Create index for efficient sorting
CREATE INDEX `knowledgebase_articles_sort_order_index` ON `featherpanel_knowledgebase_articles` (`sort_order`);

-- Create index for category + sort order queries
CREATE INDEX `knowledgebase_articles_category_sort_index` ON `featherpanel_knowledgebase_articles` (`category_id`, `sort_order`);
