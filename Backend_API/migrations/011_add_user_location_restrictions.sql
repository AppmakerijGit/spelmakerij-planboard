CREATE TABLE IF NOT EXISTS user_location_restrictions (
  user_id     INT NOT NULL,
  location_id INT NOT NULL,
  PRIMARY KEY (user_id, location_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES builder_items(id) ON DELETE CASCADE
);
