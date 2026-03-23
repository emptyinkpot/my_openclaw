-- 每日计划表
CREATE TABLE IF NOT EXISTS daily_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_id INT NOT NULL,
  chapter_number INT NOT NULL,
  plan_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_plan (work_id, chapter_number, plan_date),
  INDEX idx_plan_date (plan_date),
  INDEX idx_work_id (work_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
