CREATE TABLE IF NOT EXISTS registration (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_target VARCHAR(100),
  event VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  message TEXT, 
  attachment_file TEXT,
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

CREATE TABLE IF NOT EXISTS registration_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_config_id INTEGER,
  key TEXT NOT NULL,
  tokenCount INTEGER NOT NULL DEFAULT 0,
  memberId INTEGER,
  createdAt DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (registration_config_id) REFERENCES registration_config(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registration_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page VARCHAR(100),
  paymentRequired BOOLEAN,
  birthdayRequired BOOLEAN,
  companyRequired BOOLEAN,
  lockRegistration BOOLEAN,
  IdentityConsent BOOLEAN,
  fileUpload BOOLEAN,
  countDown BOOLEAN,
  textarea BOOLEAN,
  fieldIcon BOOLEAN,
  title VARCHAR(255),
  send_button_text VARCHAR(255),
  event_date DATETIME, 
  event_time VARCHAR(255), 
  event_location VARCHAR(255), 
  event_location_name VARCHAR(255), 
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

CREATE TABLE IF NOT EXISTS Member (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phoneNumber VARCHAR(20) NOT NULL UNIQUE,
  whatsapp VARCHAR(20) NOT NULL,
  avatar TEXT,

  language VARCHAR(10) CHECK(language IN ('en', 'de', 'ar')),

  uniqueIdentifier VARCHAR(64),
  active_member BOOLEAN,  
  createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
  modifiedAt DATETIME DEFAULT NULL
);


INSERT INTO Member (
  firstName, lastName, email, phoneNumber, whatsapp,
  avatar, language, uniqueIdentifier, createdAt, modifiedAt, active_member
)
VALUES
( 'Abusufean', 'Ali', 'abusufean@falkenherz.com', '00971-564003932', '00971-564003932', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL, 'true'),
( 'Amina', 'Darmandeh', 'amina.darmandeh@falcrealestate.com', '00971-521022278', '00971-521022278', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL, 'true'),
( 'Andreas', 'Simon', 'Simon.consulting@outlook.com', '00971-547604760', '00971-547604760', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL, 'true'),
( 'Angela', 'Thomas', 'dubai@angela-thomas.de', '00971-503670592', '00971-503670592', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL, 'true'),
('Basel', 'Khalifa', 'basel.khalifa@khalifapartners.com', '00971-503550204', '00971-503550204', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL, 'true'),
( 'David F.', 'Raetz', 'david.raetz@prodvant.com', '00971-567146057', '00971-567146057', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL, 'true'),
('Diana', 'Marks', 'dianamarks@gmx.net', '0049-15229144155', '0049-15229144155', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL, 'true'),
( 'Dr. Maximilian', 'Riewer', 'drmaxriewer@gmail.com', '00971-504692572', '00971-504692572', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL, 'true'),
( 'Elisabeth', 'Müllner', 'funnelfairy@lisa-muellner.com', '00971-585822040', '00971-585822040', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL, 'true'),
( 'Isabel', 'Kellerhals', 'isabel@ambienzahomedesign.com', '00971-542644555', '00971-542644555', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL,'true'),
( 'Johannes', 'Schoenborn', 'Johannes@xplt.com', '00971-585648976', '00971-585648976', NULL, NULL, NULL, '2025-07-07 07:58:24', NULL, 'true');
