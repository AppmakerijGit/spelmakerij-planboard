SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'editor_enabled'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN editor_enabled BOOLEAN NOT NULL DEFAULT false',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
