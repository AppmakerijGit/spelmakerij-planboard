SET @published_at_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'day_plans'
    AND COLUMN_NAME = 'published_at'
);

SET @published_at_sql := IF(
  @published_at_exists = 0,
  'ALTER TABLE day_plans ADD COLUMN published_at TIMESTAMP NULL',
  'SELECT 1'
);

PREPARE published_at_stmt FROM @published_at_sql;
EXECUTE published_at_stmt;
DEALLOCATE PREPARE published_at_stmt;
