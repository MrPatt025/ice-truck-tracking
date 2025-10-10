-- Copy and paste this into phpMyAdmin SQL tab
-- Step 4: Update existing data with default values

UPDATE `alerts` SET `type` = 'manual' WHERE `type` IS NULL;
UPDATE `alerts` SET `priority` = 'medium' WHERE `priority` IS NULL;
UPDATE `alerts` SET `is_read` = 0 WHERE `is_read` IS NULL;
