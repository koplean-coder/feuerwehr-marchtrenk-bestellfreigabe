-- Füge 'entwurf' zum order_status ENUM hinzu
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'entwurf' BEFORE 'eingereicht';