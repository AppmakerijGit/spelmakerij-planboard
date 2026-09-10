SET @visible_from_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'day_plans'
    AND COLUMN_NAME = 'visible_from'
);

SET @visible_from_sql := IF(
  @visible_from_exists = 0,
  'ALTER TABLE day_plans ADD COLUMN visible_from TIMESTAMP NULL',
  'SELECT 1'
);

PREPARE visible_from_stmt FROM @visible_from_sql;
EXECUTE visible_from_stmt;
DEALLOCATE PREPARE visible_from_stmt;
