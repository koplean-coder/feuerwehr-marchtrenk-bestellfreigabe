-- Add new email template settings for reset, new user, and password
INSERT INTO settings (key, value) VALUES
  ('email_template_reset_to_draft_subject', 'Bestellung zurückgesetzt: {{orderTitle}}'),
  ('email_template_reset_to_draft_body', '<h2 style="color: #f59e0b;">Bestellung auf Entwurf zurückgesetzt</h2><p>Hallo {{creatorName}},</p><p>Ihre Bestellung wurde auf Entwurf zurückgesetzt und muss erneut eingereicht werden.</p><div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Betrag:</strong> {{orderAmount}}</p><p><strong>Zurückgesetzt von:</strong> {{approverName}} ({{approverRole}})</p><p><strong>Grund:</strong> {{resetReason}}</p></div><p>Bitte überarbeiten Sie die Bestellung und reichen Sie sie erneut ein.</p>'),
  ('email_template_new_user_subject', 'Willkommen im BANF System'),
  ('email_template_new_user_body', '<h2 style="color: #16a34a;">Ihr Benutzerkonto wurde erstellt</h2><p>Hallo {{userName}},</p><p>Ein Benutzerkonto wurde für Sie im BANF System angelegt.</p><div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;"><p><strong>E-Mail:</strong> {{userEmail}}</p><p><strong>Passwort:</strong> {{userPassword}}</p></div><p style="color: #dc2626;"><strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach der ersten Anmeldung.</p>'),
  ('email_template_password_reset_subject', 'Neues Passwort für das BANF System'),
  ('email_template_password_reset_body', '<h2 style="color: #3b82f6;">Neues Passwort</h2><p>Hallo {{userName}},</p><p>Ihr Passwort wurde zurückgesetzt.</p><div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;"><p><strong>E-Mail:</strong> {{userEmail}}</p><p><strong>Neues Passwort:</strong> {{userPassword}}</p></div><p style="color: #dc2626;"><strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach der Anmeldung.</p>'),
  ('system_homepage_url', '')
ON CONFLICT (key) DO NOTHING;

-- Add reset tracking columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reset_by UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reset_reason TEXT;