CREATE TABLE IF NOT EXISTS registration (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_target VARCHAR(100),
  event VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  gender VARCHAR(20),
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  companyName VARCHAR(255),
  birthday DATE,
  event_id VARCHAR(20),
  metadata_createdAt DATETIME DEFAULT (datetime('now')),
  metadata_modifiedAt DATETIME
);

CREATE TABLE IF NOT EXISTS registration_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page VARCHAR(100),
  paymentRequired BOOLEAN,
  birthdayRequired BOOLEAN,
  companyRequired BOOLEAN,
  lockRegistration BOOLEAN,
  title VARCHAR(255),
  event_date DATETIME, 
  description TEXT,
  Image TEXT,
  maxTokensPerGuest INT,
  registration_code VARCHAR(6),
  createdAt DATETIME DEFAULT (datetime('now')),
  modifiedAt DATETIME
);


CREATE TABLE IF NOT EXISTS registration_client_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userAgent TEXT,
  platform TEXT,
  language TEXT,
  registration_code TEXT,
  mobile_number TEXT,
  createdAt DATETIME DEFAULT (datetime('now'))
);