-- Neuen Status 'freigegeben_kommandant' zum order_status Enum hinzufügen
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'freigegeben_kommandant';