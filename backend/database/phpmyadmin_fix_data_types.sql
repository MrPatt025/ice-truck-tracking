-- Copy and paste this into phpMyAdmin SQL tab
-- Step 2: Fix data types

ALTER TABLE `alerts` 
MODIFY COLUMN `truck_id` INT NULL,
MODIFY COLUMN `driver_id` INT NULL;
