-- Korrigiere created_by für Bestellungen die einem nicht-existierenden User zugeordnet sind
-- Ändere von 21f1b9d9-105b-4c2a-8592-2d8c95a552ba (existiert nicht) 
-- zu 60aedcf6-fa7e-4fca-9828-0092a69d5e77 (Denise Kloimstein)

UPDATE public.orders
SET created_by = '60aedcf6-fa7e-4fca-9828-0092a69d5e77'
WHERE created_by = '21f1b9d9-105b-4c2a-8592-2d8c95a552ba';