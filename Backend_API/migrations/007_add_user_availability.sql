CREATE TABLE IF NOT EXISTS user_availability (
  user_id INT NOT NULL,
  monday BOOLEAN NOT NULL DEFAULT true,
  tuesday BOOLEAN NOT NULL DEFAULT true,
  wednesday BOOLEAN NOT NULL DEFAULT true,
  thursday BOOLEAN NOT NULL DEFAULT true,
  friday BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
