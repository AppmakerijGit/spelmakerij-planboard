-- Convert existing values before changing the ENUM
UPDATE users SET role = 'deelnemer' WHERE role = 'client';
UPDATE users SET role = 'admin'     WHERE role = 'editor';

-- Redefine the column with the new roles. 'vrijwilliger' is included here
-- (even though it's formally introduced in 010_add_vrijwilliger.sql) because
-- production data already contains that value and narrowing the ENUM
-- without it truncates those rows.
ALTER TABLE users
  MODIFY COLUMN role ENUM('deelnemer', 'admin', 'vrijwilliger') NOT NULL;
