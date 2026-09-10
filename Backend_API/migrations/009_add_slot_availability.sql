SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_availability' AND COLUMN_NAME = 'slot_availability'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE user_availability ADD COLUMN slot_availability JSON NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
