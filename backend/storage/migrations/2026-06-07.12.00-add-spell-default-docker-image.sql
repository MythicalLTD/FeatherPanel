ALTER TABLE `featherpanel_spells`
ADD COLUMN `default_docker_image` VARCHAR(191) DEFAULT NULL AFTER `docker_images`;
