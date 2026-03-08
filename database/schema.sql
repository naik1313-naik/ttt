-- SmartSpend MySQL Schema
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','user') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DOUBLE NOT NULL,
  category INT NOT NULL,
  type ENUM('income','expense') NOT NULL,
  date DATE NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_category (category),
  CONSTRAINT fk_txn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_txn_category FOREIGN KEY (category) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category INT NOT NULL,
  budget_amount DOUBLE NOT NULL,
  month CHAR(7) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_budget_user_cat_month (user_id, category, month),
  INDEX idx_budget_user (user_id),
  INDEX idx_budget_category (category),
  CONSTRAINT fk_budget_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_budget_category FOREIGN KEY (category) REFERENCES categories(id)
);

INSERT INTO categories (category_name) VALUES
('Food & Dining'),
('Transportation'),
('Housing'),
('Bills & Utilities'),
('Shopping'),
('Entertainment'),
('Health & Medical'),
('Education'),
('Savings & Investments'),
('Miscellaneous')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

