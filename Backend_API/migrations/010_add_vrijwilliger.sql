ALTER TABLE users
  MODIFY COLUMN role ENUM('deelnemer', 'admin', 'vrijwilliger') NOT NULL;

ALTER TABLE builder_items
  MODIFY COLUMN category ENUM('clienten', 'begeleiders', 'locaties', 'spellen', 'vrijwilligers') NOT NULL;
