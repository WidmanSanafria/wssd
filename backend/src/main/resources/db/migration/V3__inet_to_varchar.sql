-- Change inet columns to varchar to avoid Hibernate type mismatch
ALTER TABLE anon_sessions ALTER COLUMN ip_address TYPE VARCHAR(45) USING ip_address::text;
ALTER TABLE downloads     ALTER COLUMN ip_address TYPE VARCHAR(45) USING ip_address::text;
