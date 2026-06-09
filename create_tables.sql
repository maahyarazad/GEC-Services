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
  metadata_json TEXT,
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


CREATE TABLE IF NOT EXISTS twilio_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source VARCHAR(100) NOT NULL,          -- e.g. 'twilio', 'stripe', etc.
  event_type VARCHAR(100) DEFAULT NULL, -- e.g. 'message.received', 'delivery.status'
  payload TEXT NOT NULL,                 -- full raw JSON/text response
  received_at DATETIME DEFAULT (datetime('now')),  -- when you saved it
  processed BOOLEAN DEFAULT 0            -- flag if you've processed this record
);

CREATE TABLE IF NOT EXISTS twilio_delivery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  response TEXT,
    metadata_createdAt DATETIME DEFAULT (datetime('now'))
);





CREATE TABLE IF NOT EXISTS contact_book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(10),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  gender VARCHAR(8),
  phone VARCHAR(50) NOT NULL,
  language VARCHAR(2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('club_member', 'club_partner', 'expert', 'gec_staff', 'difa', 'expert_guest', 'only_guest', 'medical_society', 'Wüstenkinder')),
  club_partner_name VARCHAR(255),
  blacklist BOOLEAN DEFAULT FALSE,
  contentSid VARCHAR(255)
);

CREATE TABLE contact_book_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_book_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  contentSid VARCHAR(100) NOT NULL,
  FOREIGN KEY (contact_book_id) REFERENCES contact_book(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE ON UPDATE CASCADE
);




CREATE TABLE IF NOT EXISTS twilio_template_message_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  messageSid VARCHAR(100) NOT NULL,
  contentSid VARCHAR(100) NOT NULL,
  event_id INTEGER
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
, surveyForm BOOLEAN NOT NULL DEFAULT 0, gic BOOLEAN, recordFee REAL DEFAULT 0.0, loginRequired BOOLEAN, currency VARCHAR(3), use_member_card BOOLEAN, vatEnabled BOOLEAN default false, consultationEnabled BOOLEAN default false, metadata_json TEXT DEFAULT '', archived BOOLEAN default 'false');

CREATE TABLE IF NOT EXISTS news_letter_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email VARCHAR(255) NOT NULL,
  request_source VARCHAR(500) NOT NULL
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
  phoneNumber VARCHAR(20) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  avatar TEXT,

  language VARCHAR(10) CHECK(language IN ('en', 'de', 'ar')),

  uniqueIdentifier VARCHAR(64),
  active_member BOOLEAN,  
  createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
  modifiedAt DATETIME DEFAULT NULL
);


CREATE TABLE IF NOT EXISTS Company (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partnerBrand VARCHAR(300),
    partnerName VARCHAR(300),
    cityCountry VARCHAR(300),
    phone VARCHAR(300),
    mobile VARCHAR(300),
    email VARCHAR(300),
    website VARCHAR(300),
    employeeCount VARCHAR(300),
    industry VARCHAR(300),

    ceoOwnerGm VARCHAR(300),
    ceoOwnerGm_contactNumber VARCHAR(300),
    ceoOwnerGm_landline VARCHAR(300),
    ceoOwnerGm_email VARCHAR(300),

    hrHead VARCHAR(300),
    hrHead_contactNumber VARCHAR(300),
    hrHead_landline VARCHAR(300),
    hrHead_email VARCHAR(300),

    accountingHead VARCHAR(300),
    accountingHead_contactNumber VARCHAR(300),
    accountingHead_landline VARCHAR(300),
    accountingHead_email VARCHAR(300),

    marketingHead VARCHAR(300),
    marketingHead_contactNumber VARCHAR(300),
    marketingHead_landline VARCHAR(300),
    marketingHead_email VARCHAR(300),

    pa VARCHAR(300),
    pa_contactNumber VARCHAR(300),
    pa_landline VARCHAR(300),
    pa_email VARCHAR(300),

    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedAt DATETIME DEFAULT NULL,
    event VARCHAR(100),
    event_id VARCHAR(100)
);


CREATE Table IF NOT EXISTS event_proforma_invoice (
    id VARCHAR(50) PRIMARY KEY,                -- "GEC-EC-GUEST-19052025-006"
    firstName VARCHAR(100) NOT NULL,           -- "Lars"
    lastName VARCHAR(100) NOT NULL,            -- "Jordan"
    phoneNumber VARCHAR(20) NOT NULL,          -- "+971509893374"
    whatsapp VARCHAR(20),                      -- "+971509893374"
    email VARCHAR(150) NOT NULL,               -- "lars-jordan@hotmail.de"
    registeredForEvent VARCHAR(255) NOT NULL,  -- "Expert Circle Meeting/ec-45492450" data.title/
    registrationDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,        -- "2025-05-19T17:57:53.957Z"
    status BOOLEAN DEFAULT FALSE,              -- false
    userId VARCHAR(50) NOT NULL,               -- "gec00ecg47677474"
    sourceId VARCHAR(100),                     -- "this will be the registration config Id"
    recordType VARCHAR(100) NOT NULL,          -- "Event Participation Fee"
    recordFee DECIMAL(10,2) DEFAULT 0,         -- 60.00
    vat DECIMAL(4,2) DEFAULT 0.00              -- 0.05 (5%)
);



CREATE TABLE IF NOT EXISTS GIC_Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Base user fields
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('user', 'admin')) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Extra fields
    firstName TEXT,
    lastName TEXT,
    phone TEXT,
    mobile TEXT,
    gender TEXT CHECK(gender IN ('Male', 'Female')),
    industry TEXT,
    company TEXT,
    website TEXT,
    address_street TEXT,
    address_area TEXT,
    address_city TEXT,
    address_emirate TEXT,
    address_country TEXT,
    change_password_required BOOLEAN
);

INSERT INTO Member (
  firstName,lastName,email,phoneNumber,whatsapp,
  avatar,language,uniqueIdentifier,createdAt,modifiedAt,active_member
)
SELECT *
FROM (
  SELECT 'Abusufean','Ali','abusufean@falkenherz.com','00971-564003932','00971-564003932',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
  UNION ALL SELECT 'Amina','Darmandeh','amina.darmandeh@falcrealestate.com','00971-521022278','00971-521022278',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
  UNION ALL SELECT 'Andreas','Simon','Simon.consulting@outlook.com','00971-547604760','00971-547604760',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
  UNION ALL SELECT 'Angela','Thomas','dubai@angela-thomas.de','00971-503670592','00971-503670592',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
  UNION ALL SELECT 'Basel','Khalifa','basel.khalifa@khalifapartners.com','00971-503550204','00971-503550204',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
  UNION ALL SELECT 'David F.','Raetz','david.raetz@prodvant.com','00971-567146057','00971-567146057',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
  UNION ALL SELECT 'Diana','Marks','dianamarks@gmx.net','0049-15229144155','0049-15229144155',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
  UNION ALL SELECT 'Dr. Maximilian','Riewer','drmaxriewer@gmail.com','00971-504692572','00971-504692572',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
  UNION ALL SELECT 'Elisabeth','Müllner','funnelfairy@lisa-muellner.com','00971-585822040','00971-585822040',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
  UNION ALL SELECT 'Isabel','Kellerhals','isabel@ambienzahomedesign.com','00971-542644555','00971-542644555',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
  UNION ALL SELECT 'Johannes','Schoenborn','Johannes@xplt.com','00971-585648976','00971-585648976',NULL,NULL,NULL,'2025-07-07 07:58:24',NULL,TRUE
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM Member);





CREATE TABLE IF NOT EXISTS member_card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memberId INTEGER, 
    paid BOOLEAN,
    Type INTEGER,
    card_number INTEGER,
    username VARCHAR(150),
    title VARCHAR(150), 
    firstname VARCHAR(150),
    lastname VARCHAR(150),
    gender TEXT CHECK(gender IN ('Herr', 'Frau')),
    mobile_number VARCHAR(150),
    email VARCHAR(150),
    card_expiry_date DATETIME,
    last_login DATETIME,
    metadata_createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata_modifiedAt DATETIME,
    google_pass_token TEXT ,
    serial_number TEXT,
    partner TEXT,
    birthday datetime,
    active BOOLEAN,
    remarks TEXT
);


CREATE TABLE IF NOT EXISTS partner_onboarding_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT CHECK(title IN ('Mr.', 'Ms.', 'Mrs.', 'Dr.', '')),
    firstname VARCHAR(150),
    lastname VARCHAR(150),
    gender TEXT CHECK(gender IN ('', 'm', 'f')),
    mobile_number VARCHAR(150),
    email VARCHAR(150),
    metadata_createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    partner TEXT,
    birthday DATETIME,
    language TEXT CHECK(language IN ('en', 'de')),
    action_type VARCHAR(10) CHECK (action_type IN ('add', 'update', 'delete'));
    synchronized INTEGER DEFAULT 0
);


CREATE TABLE IF NOT EXISTS partner_delivery_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner TEXT UNIQUE,
    delivery_address TEXT,
    contact_person TEXT,
    phone_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS  account_deletion_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    member_id TEXT,
    phone TEXT,
    country TEXT,
    reason TEXT,
    request_source TEXT DEFAULT 'app',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS event_guest_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_book_id INTEGER,
  event_id INTEGER,
  complete_attendance BOOLEAN DEFAULT 0,
  FOREIGN KEY (contact_book_id) REFERENCES contact_book(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(500), 
  description TEXT, 
metadata_createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
metadata_modifiedAt DATETIME,
  event_date DATETIME,
  active_event BOOLEAN,
  auto_response_general_de TEXT,
  auto_response_general_en TEXT,
  auto_response_guest_de TEXT,
  auto_response_guest_de TEXT,
);


CREATE TABLE IF NOT EXISTS contact_book_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_book_id INTEGER,
    note_body TEXT,
    FOREIGN KEY (contact_book_id) REFERENCES contact_book(id)
);


 CREATE TABLE IF NOT EXISTS support_tickets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT    UNIQUE NOT NULL,
    full_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL,
    subject       TEXT    NOT NULL,
    category      TEXT    NOT NULL,
    priority      TEXT    NOT NULL,
    description   TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'Open',
    assigned_to   INTEGER,
    created_at    DATETIME DEFAULT (datetime('now')),
    updated_at    DATETIME DEFAULT (datetime('now')),
    resolved_at   DATETIME
  );

  CREATE TABLE IF NOT EXISTS support_ticket_attachments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id     INTEGER NOT NULL,
    original_name TEXT    NOT NULL,
    file_name     TEXT    NOT NULL,
    mime_type     TEXT    NOT NULL,
    file_size     INTEGER NOT NULL,
    created_at    DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
  );

  CREATE TABLE IF NOT EXISTS support_ticket_comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id  INTEGER NOT NULL,
    admin_id   INTEGER,
    comment    TEXT    NOT NULL,
    is_public  INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
  );

  CREATE TABLE IF NOT EXISTS support_ticket_activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id  INTEGER NOT NULL,
    admin_id   INTEGER,
    action     TEXT NOT NULL,
    old_value  TEXT,
    new_value  TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
  );