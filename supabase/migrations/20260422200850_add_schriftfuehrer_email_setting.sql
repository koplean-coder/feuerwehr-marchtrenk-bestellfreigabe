INSERT INTO settings (key, value) 
VALUES ('schriftfuehrer_email', '')
ON CONFLICT (key) DO NOTHING;