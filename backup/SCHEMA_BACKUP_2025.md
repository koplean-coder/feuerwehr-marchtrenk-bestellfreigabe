# FFM-Portal Datenbank Schema Backup

**Erstellt am:** 2025
**Anzahl Tabellen:** 57
**Anzahl Enums:** 8
**Anzahl Functions:** 14

---

## 📊 Tabellenübersicht nach Modulen

### 👥 Benutzer & Authentifizierung
| Tabelle | Beschreibung |
|---------|-------------|
| `profiles` | Benutzerprofile (Name, E-Mail, Rolle, Funktionen) |
| `user_presence` | Online-Status der Benutzer |
| `push_subscriptions` | Push-Benachrichtigungs-Abonnements |
| `registration_settings` | Registrierungseinstellungen (Domain, Auto-Approve) |

### 📦 Bestellwesen
| Tabelle | Beschreibung |
|---------|-------------|
| `orders` | Bestellungen (Haupttabelle) |
| `order_attachments` | Anhänge zu Bestellungen |
| `order_history` | Bestellverlauf / Statushistorie |
| `order_votes` | Abstimmungen zu Bestellungen |
| `order_vote_history` | Abstimmungsänderungen |
| `order_votes_missing` | Fehlende Abstimmungen |
| `suppliers` | Lieferanten |
| `supplier_contacts` | Ansprechpartner bei Lieferanten |
| `supplier_documents` | Dokumente zu Lieferanten |
| `min_order_value_requests` | Mindestbestellwert-Anfragen |

### 💰 Finanzen & Auszahlungen
| Tabelle | Beschreibung |
|---------|-------------|
| `payment_orders` | Auszahlungsanweisungen |
| `expense_reports` | Verrechnungen (Abrechnungen) |
| `expense_report_items` | Einzelpositionen der Verrechnungen |
| `expense_report_payment_orders` | Verknüpfung Verrechnung ↔ Auszahlung |
| `expense_categories` | Ausgabenkategorien |
| `event_participations` | Veranstaltungsteilnahmen |
| `event_participation_amount_history` | Betragsänderungen bei Teilnahmen |
| `event_form_templates` | Vorlagen für Veranstaltungsformulare |

### 📝 Kommandoabstimmungen & Beschlüsse
| Tabelle | Beschreibung |
|---------|-------------|
| `command_decisions` | Kommandobeschlüsse (Haupttabelle) |
| `command_decision_items` | Einzelne Abstimmungspunkte |
| `command_decision_votes` | Abstimmungen zu Beschlüssen |
| `command_decision_vote_history` | Abstimmungsänderungen |
| `command_decision_votes_missing` | Fehlende Abstimmungen |
| `command_decision_item_votes` | Abstimmungen zu Einzelpunkten |
| `command_decision_item_vote_history` | Historie zu Einzelpunkt-Abstimmungen |
| `command_decision_item_votes_missing` | Fehlende Abstimmungen (Einzelpunkte) |
| `beschluss_register` | Beschlussregister (alle gültigen Beschlüsse) |
| `beschluss_historie` | Historie zu Beschlüssen |

### 📅 Sitzungen
| Tabelle | Beschreibung |
|---------|-------------|
| `meetings` | Sitzungen (Haupttabelle) |
| `meeting_attendance` | Anwesenheit bei Sitzungen |
| `meeting_agenda_items` | Tagesordnungspunkte |
| `meeting_decisions` | Beschlüsse in Sitzungen |
| `meeting_decision_votes` | Abstimmungen zu Sitzungsbeschlüssen |
| `meeting_fixed_agenda_items` | Feste Tagesordnungspunkte (Vorlagen) |

### ✅ Aufgaben (Tasks)
| Tabelle | Beschreibung |
|---------|-------------|
| `tasks` | Aufgaben (Haupttabelle) |
| `task_steps` | Schritte/Teilaufgaben |

### 📝 Todo-Listen (Neues System)
| Tabelle | Beschreibung |
|---------|-------------|
| `todo_lists` | Todo-Listen |
| `todo_list_groups` | Gruppen von Listen |
| `todo_list_shares` | Freigaben für Listen |
| `todo_group_shares` | Freigaben für Gruppen |
| `todo_tasks` | Todo-Aufgaben |
| `todo_task_steps` | Schritte in Todos |
| `todo_task_shares` | Freigaben für Aufgaben |
| `todo_task_comments` | Kommentare zu Aufgaben |
| `todo_favorites` | Favoriten |

### 💡 Ideen-Pool
| Tabelle | Beschreibung |
|---------|-------------|
| `ideas` | Ideen (Haupttabelle) |
| `idea_categories` | Kategorien für Ideen |
| `idea_comments` | Kommentare zu Ideen |
| `idea_votes` | Abstimmungen zu Ideen |
| `idea_vote_logs` | Abstimmungs-Logs |
| `idea_images` | Bilder zu Ideen |
| `idea_image_votes` | Bewertungen von Bildern |
| `idea_polls` | Umfragen zu Ideen |
| `idea_poll_votes` | Abstimmungen in Umfragen |
| `idea_reads` | Gelesen-Markierungen |

### 📣 Benachrichtigungen & Kommunikation
| Tabelle | Beschreibung |
|---------|-------------|
| `notifications` | Benachrichtigungen |
| `conversations` | Gespräche/Threads |

### 🏠 Leihgeräte
| Tabelle | Beschreibung |
|---------|-------------|
| `rental_items` | Leihbare Artikel |
| `rental_contracts` | Leihverträge |

### ⚙️ System & Konfiguration
| Tabelle | Beschreibung |
|---------|-------------|
| `settings` | Systemeinstellungen (Key-Value) |
| `functions` | Verfügbare Funktionen (Kassier, etc.) |
| `module_permissions` | Modulberechtigungen pro Rolle |
| `problem_reports` | Problemberichte |

---

## 📊 Detaillierte Tabellenstruktur

### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'nutzer',
  functions TEXT[] DEFAULT NULL,
  access_level TEXT DEFAULT 'standard',
  home_page TEXT DEFAULT '/',
  menu_favorites TEXT[] DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  is_absent BOOLEAN DEFAULT false,
  absent_until TIMESTAMPTZ,
  absence_reason TEXT,
  substitute_id UUID REFERENCES profiles(id),
  default_bereichsleiter_id UUID REFERENCES profiles(id),
  todo_notifications JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  status order_status NOT NULL DEFAULT 'entwurf',
  created_by UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID REFERENCES suppliers(id),
  bereichsleiter_id UUID REFERENCES profiles(id),
  kommandant_id UUID REFERENCES profiles(id),
  invoice_to TEXT,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  
  -- Genehmigungen
  bereichsleiter_approved_at TIMESTAMPTZ,
  kommandant_approved_at TIMESTAMPTZ,
  kommandomitglied_approved_at TIMESTAMPTZ,
  requires_kommandant_approval BOOLEAN DEFAULT false,
  requires_kommandomitglied_approval BOOLEAN DEFAULT false,
  
  -- Abstimmung
  voting_status TEXT,
  voting_result TEXT,
  voting_opened_at TIMESTAMPTZ,
  voting_closed_at TIMESTAMPTZ,
  voting_closed_by UUID REFERENCES profiles(id),
  voting_reminder_count INT DEFAULT 0,
  voting_last_reminder_at TIMESTAMPTZ,
  
  -- Override
  kommandomitglied_override_at TIMESTAMPTZ,
  kommandomitglied_override_by UUID REFERENCES profiles(id),
  kommandomitglied_override_reason TEXT,
  
  -- Eskalation
  escalation_extended_at TIMESTAMPTZ,
  escalation_extended_by UUID,
  escalation_extended_until TIMESTAMPTZ,
  escalation_extension_reason TEXT,
  
  -- Bestellung/Lieferung
  kassier_bestellt BOOLEAN DEFAULT false,
  kassier_bestellt_at TIMESTAMPTZ,
  kassier_bestellt_by UUID,
  order_executed BOOLEAN DEFAULT false,
  order_executed_at TIMESTAMPTZ,
  order_executed_by UUID,
  order_received BOOLEAN DEFAULT false,
  order_received_at TIMESTAMPTZ,
  order_received_by UUID,
  
  -- Ablehnung
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  
  -- Reset
  reset_at TIMESTAMPTZ,
  reset_by UUID,
  reset_reason TEXT,
  
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### payment_orders
```sql
CREATE TABLE payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_iban TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'entwurf',
  
  -- Workflow
  created_by UUID NOT NULL,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID,
  rejection_reason TEXT,
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  
  -- Optionen
  no_expense_report_required BOOLEAN DEFAULT false,
  is_direct_to_organizer BOOLEAN DEFAULT false,
  
  -- Verknüpfungen
  order_id UUID REFERENCES orders(id),
  linked_event_participation_id UUID REFERENCES event_participations(id),
  
  -- Anhang
  attachment_url TEXT,
  attachment_name TEXT,
  email_status TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### meetings
```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_number TEXT NOT NULL UNIQUE,
  meeting_type meeting_type NOT NULL,
  title TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME DEFAULT '19:00',
  location TEXT DEFAULT 'Feuerwehrhaus',
  status meeting_status NOT NULL DEFAULT 'geplant',
  entry_deadline_hours INT DEFAULT 24,
  
  -- Protokoll
  is_quorate BOOLEAN,
  kdt_present BOOLEAN,
  voting_members_present INT,
  closed_at TIMESTAMPTZ,
  protocol_generated_at TIMESTAMPTZ,
  protocol_sent_at TIMESTAMPTZ,
  
  -- Nächste Sitzung
  next_meeting_date DATE,
  next_meeting_time TIME,
  next_meeting_location TEXT,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### settings
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🏷️ Enums

### user_role
```sql
CREATE TYPE user_role AS ENUM (
  'nutzer',
  'mitglied',
  'bereichsleiter',
  'kommandant',
  'admin'
);
```

### order_status
```sql
CREATE TYPE order_status AS ENUM (
  'entwurf',
  'eingereicht',
  'ausstehend_bereichsleitung',
  'ausstehend_kommandant',
  'ausstehend_kommandomitglieder',
  'freigegeben_bereichsleitung',
  'freigegeben_kommandant',
  'genehmigt',
  'abgelehnt',
  'abgeschlossen'
);
```

### meeting_type
```sql
CREATE TYPE meeting_type AS ENUM (
  'kommandositzung',
  'erweitertes_kommando'
);
```

### meeting_status
```sql
CREATE TYPE meeting_status AS ENUM (
  'geplant',
  'laufend',
  'abgeschlossen',
  'abgesagt'
);
```

### attendance_status
```sql
CREATE TYPE attendance_status AS ENUM (
  'offen',
  'anwesend',
  'remote',
  'entschuldigt',
  'unentschuldigt'
);
```

### agenda_item_status
```sql
CREATE TYPE agenda_item_status AS ENUM (
  'offen',
  'behandelt',
  'vertagt',
  'zurueckgestellt'
);
```

### email_status
```sql
CREATE TYPE email_status AS ENUM (
  'none',
  'sent',
  'failed',
  'partial'
);
```

### recurrence_type
```sql
CREATE TYPE recurrence_type AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom'
);
```

---

## 🔧 Functions

| Function | Parameter | Return | Beschreibung |
|----------|-----------|--------|-------------|
| `can_access_meeting` | `p_meeting_id: uuid` | `boolean` | Prüft Sitzungszugriff |
| `can_manage_meetings` | - | `boolean` | Prüft Sitzungsverwaltungsrecht |
| `can_view_meetings` | - | `boolean` | Prüft Sitzungs-Leserecht |
| `check_and_escalate_orders` | - | `record` | Eskaliert überfällige Bestellungen |
| `generate_expense_report_number` | - | `text` | Generiert Verrechnungsnummer |
| `generate_rental_contract_number` | - | `text` | Generiert Vertragsnummer |
| `is_group_member` | `_group_id: uuid` | `boolean` | Todo-Gruppen-Mitgliedschaft |
| `is_group_owner` | `_group_id: uuid` | `boolean` | Todo-Gruppen-Eigentümer |
| `is_list_member` | `_list_id: uuid` | `boolean` | Todo-Listen-Mitgliedschaft |
| `is_list_owner` | `_list_id: uuid` | `boolean` | Todo-Listen-Eigentümer |
| `is_list_group_member` | `_list_id: uuid` | `boolean` | Gruppen-Mitgliedschaft über Liste |
| `is_meeting_attendee` | `p_meeting_id: uuid` | `boolean` | Sitzungsteilnehmer |
| `is_task_member` | `_task_id: uuid` | `boolean` | Aufgaben-Mitgliedschaft |
| `is_task_owner` | `_task_id: uuid` | `boolean` | Aufgaben-Eigentümer |
| `user_has_meeting_invitations` | - | `boolean` | Hat Sitzungseinladungen |
| `user_has_step_in_task` | `p_task_id, p_user_id` | `boolean` | Hat Schritt in Aufgabe |

---

## 🔗 Wichtige Beziehungen (Foreign Keys)

### Benutzer-zentriert
- `orders.created_by` → `profiles.id`
- `orders.bereichsleiter_id` → `profiles.id`
- `orders.kommandant_id` → `profiles.id`
- `payment_orders.created_by` → `profiles.id`
- `meetings.created_by` → `profiles.id`
- `meeting_attendance.profile_id` → `profiles.id`
- `notifications.user_id` → `profiles.id`

### Bestellwesen
- `orders.supplier_id` → `suppliers.id`
- `order_attachments.order_id` → `orders.id`
- `order_history.order_id` → `orders.id`
- `order_votes.order_id` → `orders.id`

### Beschlüsse
- `command_decision_items.decision_id` → `command_decisions.id`
- `command_decision_votes.decision_id` → `command_decisions.id`
- `beschluss_register.command_decision_id` → `command_decisions.id`
- `beschluss_register.meeting_id` → `meetings.id`

### Sitzungen
- `meeting_attendance.meeting_id` → `meetings.id`
- `meeting_agenda_items.meeting_id` → `meetings.id`
- `meeting_decisions.meeting_id` → `meetings.id`

### Todo-System
- `todo_tasks.list_id` → `todo_lists.id`
- `todo_lists.group_id` → `todo_list_groups.id`
- `todo_task_steps.task_id` → `todo_tasks.id`
- `todo_list_shares.list_id` → `todo_lists.id`

---

## 🛡️ RLS-Policies (Wichtigste)

Die meisten Tabellen haben RLS aktiviert mit Policies wie:

- `authenticated` kann eigene Daten lesen/schreiben
- `admin` und `kommandant` haben erweiterte Rechte
- Spezielle Helper-Functions für komplexe Berechtigungen

---

## ⚠️ Hinweise für Migrationen

1. **Reihenfolge beachten:** Erst Enums, dann Tabellen ohne FK, dann mit FK
2. **RLS:** Immer `ENABLE ROW LEVEL SECURITY` nach Tabellenerstellung
3. **Trigger:** `updated_at`-Trigger für alle Tabellen mit `updated_at`
4. **Indizes:** Auf allen Foreign Keys und häufig gefilterten Spalten

---

*Dieses Dokument dient als Referenz. Für ein vollständiges Restore bitte das Supabase Dashboard verwenden.*
