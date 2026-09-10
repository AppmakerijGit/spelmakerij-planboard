CREATE TABLE IF NOT EXISTS user_exclusivities (
  user_id_a INT NOT NULL,
  user_id_b INT NOT NULL,
  PRIMARY KEY (user_id_a, user_id_b),
  CONSTRAINT chk_exclusivity_order CHECK (user_id_a < user_id_b),
  FOREIGN KEY (user_id_a) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id_b) REFERENCES users(id) ON DELETE CASCADE
);
