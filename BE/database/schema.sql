-- Tournament Database Schema

-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  phone VARCHAR(20),
  role ENUM('user', 'admin') DEFAULT 'user',
  status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Games table
CREATE TABLE games (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image VARCHAR(500),
  entryFee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  prizePool DECIMAL(10, 2) NOT NULL DEFAULT 0,
  maxPlayers INT NOT NULL DEFAULT 4,
  status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_name (name),
  INDEX idx_created_at (created_at)
);

-- Slots table
CREATE TABLE slots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slotId BIGINT UNIQUE NOT NULL,
  gameId INT NOT NULL,
  entryFee DECIMAL(10, 2) NOT NULL,
  prizePool DECIMAL(10, 2) NOT NULL,
  customId VARCHAR(50),
  customPassword VARCHAR(50),
  status ENUM('waiting', 'full', 'started', 'completed', 'cancelled') DEFAULT 'waiting',
  startedAt TIMESTAMP NULL,
  completedAt TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE,
  INDEX idx_game_id (gameId),
  INDEX idx_status (status),
  INDEX idx_slot_id (slotId),
  INDEX idx_created_at (created_at)
);

-- Players table
CREATE TABLE players (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slotId INT NOT NULL,
  userId INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  ffId VARCHAR(50) NOT NULL,
  position INT NULL,
  prizeWon DECIMAL(10, 2) DEFAULT 0,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (slotId) REFERENCES slots(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_slot (slotId, userId),
  INDEX idx_slot_id (slotId),
  INDEX idx_user_id (userId),
  INDEX idx_registered_at (registered_at)
);

-- Payment orders table
CREATE TABLE payment_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  orderId VARCHAR(100) UNIQUE NOT NULL,
  userId INT NOT NULL,
  gameId INT,
  slotId INT,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status ENUM('created', 'verified', 'failed') DEFAULT 'created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE SET NULL,
  FOREIGN KEY (slotId) REFERENCES slots(id) ON DELETE SET NULL,
  INDEX idx_order_id (orderId),
  INDEX idx_user_id (userId),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Payments table
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  orderId VARCHAR(100) NOT NULL,
  paymentId VARCHAR(100) UNIQUE NOT NULL,
  userId INT NOT NULL,
  gameId INT,
  slotId INT,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status ENUM('completed', 'failed', 'refunded', 'captured') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE SET NULL,
  FOREIGN KEY (slotId) REFERENCES slots(id) ON DELETE SET NULL,
  INDEX idx_payment_id (paymentId),
  INDEX idx_order_id (orderId),
  INDEX idx_user_id (userId),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Refunds table
CREATE TABLE refunds (
  id INT PRIMARY KEY AUTO_INCREMENT,
  paymentId INT NOT NULL,
  refundId VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE CASCADE,
  INDEX idx_refund_id (refundId),
  INDEX idx_payment_id (paymentId),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password, name, role) VALUES 
('admin@tournament.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlYqX2/FV8jLMny', 'Admin User', 'admin');

-- Insert sample games
INSERT INTO games (name, description, entryFee, prizePool, maxPlayers) VALUES 
('Free Fire Battle Royale', 'Classic Battle Royale mode with 4 players', 50.00, 180.00, 4),
('Free Fire Clash Squad', 'Team vs Team clash mode', 100.00, 360.00, 4),
('PUBG Mobile Classic', 'PUBG Mobile classic battle royale', 75.00, 270.00, 4);