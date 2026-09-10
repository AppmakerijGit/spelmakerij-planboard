CREATE TABLE IF NOT EXISTS slot_times (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sort_order INT NOT NULL,
  time_range VARCHAR(20) NOT NULL,
  period_label VARCHAR(30) NOT NULL
);

INSERT IGNORE INTO slot_times (id, sort_order, time_range, period_label) VALUES
  (1, 0, '10:00 - 11:00', 'ochtend 1'),
  (2, 1, '11:30 - 12:15', 'ochtend 2'),
  (3, 2, '13:00 - 14:00', 'middag 1'),
  (4, 3, '14:30 - 15:30', 'middag 2');
