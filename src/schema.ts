// DDL for the lite analytics schema (MariaDB). Mirrors schema.sql.
// Used by the one-time GET /api/admin/migrate endpoint. Statements are
// idempotent (IF NOT EXISTS) so the endpoint is safe to call repeatedly.

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS website (
  website_id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(500) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS session (
  session_id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  browser VARCHAR(20) NULL,
  os VARCHAR(20) NULL,
  device VARCHAR(20) NULL,
  screen VARCHAR(11) NULL,
  language VARCHAR(35) NULL,
  country CHAR(2) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_website (website_id),
  INDEX idx_session_website_created (website_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS website_event (
  event_id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  visit_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  url_path VARCHAR(500) NOT NULL,
  url_query VARCHAR(500) NULL,
  referrer_domain VARCHAR(500) NULL,
  referrer_path VARCHAR(500) NULL,
  referrer_query VARCHAR(500) NULL,
  page_title VARCHAR(500) NULL,
  event_type INT NOT NULL DEFAULT 1,
  event_name VARCHAR(50) NULL,
  hostname VARCHAR(100) NULL,
  utm_source VARCHAR(255) NULL,
  utm_medium VARCHAR(255) NULL,
  utm_campaign VARCHAR(255) NULL,
  utm_content VARCHAR(255) NULL,
  utm_term VARCHAR(255) NULL,
  tag VARCHAR(50) NULL,
  INDEX idx_event_website (website_id),
  INDEX idx_event_website_created (website_id, created_at),
  INDEX idx_event_website_created_path (website_id, created_at, url_path),
  INDEX idx_event_website_created_ref (website_id, created_at, referrer_domain),
  INDEX idx_event_website_created_name (website_id, created_at, event_name),
  INDEX idx_event_session (website_id, session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS event_data (
  event_data_id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  website_event_id CHAR(36) NOT NULL,
  data_key VARCHAR(500) NOT NULL,
  string_value VARCHAR(500) NULL,
  number_value DECIMAL(19,4) NULL,
  data_type INT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_edata_event (website_event_id),
  INDEX idx_edata_website_created_key (website_id, created_at, data_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];
