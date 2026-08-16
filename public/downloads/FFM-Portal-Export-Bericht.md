# BANF-System Projekt-Export für Zusammenführung

**Erstellt am:** 2024
**Projekt:** Bestellanforderungs-System (BANF)
**Organisation:** Freiwillige Feuerwehr Marchtrenk

---

## 1. PROJEKT-ÜBERSICHT

### Projektname
**BANF-System** (Bestellanforderungs-System)

### Kurzbeschreibung
Ein umfassendes Beschaffungs- und Verwaltungssystem für Feuerwehrorganisationen mit mehrstufigem Genehmigungsworkflow, Lieferantenverwaltung, Aufgaben-Management, Event-Teilnahme, Leihgeräteverwaltung und Ideenpool.

### Hauptfunktionen
1. **Bestellanforderungen (BANF)** - Mehrstufiger Genehmigungsworkflow (Mitglied → Bereichsleiter → Kommandant)
2. **Lieferantenverwaltung** - Lieferantendatenbank mit Kontakten, Dokumenten, Mindestbestellwerten
3. **Aufgaben-Management** - Kanban-Board, Task-Steps, Zuweisung, Wiederholende Aufgaben
4. **Antragsformulare** - Zahlungsanweisungen, Event-Teilnahmen, Formular-Generator
5. **Leihgeräte-Verwaltung** - Mietverträge mit PDF-Generierung
6. **Ideenpool** - Vorschlagswesen mit Abstimmungen und Genehmigungsprozess
7. **Kassier-Übersicht** - Bestellungsverarbeitung, Zahlungsabwicklung
8. **Benutzer-Simulation** - Admin kann als anderer Benutzer agieren

---

## 2. AUTHENTIFIZIERUNG

### Auth-Methode
**Cloud Backend (Supabase Auth)**

### Login-Komponenten
| Datei | Beschreibung |
|-------|--------------|
| `src/pages/Login.tsx` | Login-Seite mit E-Mail/Passwort |
| `src/contexts/AuthContext.tsx` | Zentrale Auth-Logik |

### Auth-Context/Hook
- **Pfad:** `src/contexts/AuthContext.tsx`
- **Hook:** `useAuth()`

```typescript
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createUser: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: Error | null }>;
  refetchProfile: () => Promise<void>;
  isAdmin: boolean;
  isBereichsleiter: boolean;
  isKommandant: boolean;
  canManageSuppliers: boolean;
  canEditOrderFields: boolean;
  canAccessSettings: boolean;
  canCreateUsers: boolean;
  canViewPdf: boolean;
  canViewAllOrders: boolean;
  canEditDiscountFields: boolean;
}
```

### Benutzerrollen
| Rolle | Enum-Wert | Beschreibung |
|-------|-----------|------------|
| Mitglied | `mitglied` | Normales Feuerwehr-Mitglied |
| Bereichsleiter | `bereichsleiter` | Kann Bestellungen bis zu einem Limit freigeben |
| Kommandant | `kommandant` | Höchste Freigabestufe |
| Admin | `admin` | Vollzugriff auf alle Einstellungen |

### Zusätzliche Funktionen (functions-Array im Profil)
| Funktion | Beschreibung |
|----------|-------------|
| `kassier` | Kann Bestellungen/Zahlungen verarbeiten |
| `kommandomitglied` | Kann bei Abstimmungen mitwirken |
| `schriftfuehrer` | Schriftführer-Rolle |
| `lieferanten_erfassen` | Kann Lieferanten anlegen |

### Geschützte Routen
**ALLE Routen außer `/login` sind geschützt** via `<ProtectedRoute>` Wrapper in `App.tsx`

### Simulations-Kontext
- **Pfad:** `src/contexts/SimulationContext.tsx`
- **Hook:** `useSimulation()`
- **Zweck:** Erlaubt Admins, die Ansicht eines anderen Benutzers zu simulieren

```typescript
interface SimulationContextType {
  simulatedUserId: string | null;
  simulatedProfile: SimulatedProfile | null;
  isSimulationActive: boolean;
  setSimulatedUserId: (userId: string | null) => void;
  resetSimulation: () => void;
  effectiveUserId: string | undefined;
  effectiveProfile: SimulatedProfile | null;
  effectiveIsAdmin: boolean;
  effectiveIsKommandant: boolean;
  effectiveIsBereichsleiter: boolean;
  effectiveIsMitglied: boolean;
  effectiveHasKassierFunction: boolean;
  effectiveHasKommandomitgliedFunction: boolean;
  effectiveHasSchriftfuehrerFunction: boolean;
  effectiveHasLieferantenErfassenFunction: boolean;
  effectiveFunctions: string[];
  canViewAllOrders: boolean;
  canApproveOrders: boolean;
  canApproveApplications: boolean;
  canProcessPayments: boolean;
  canManageUsers: boolean;
  canManageSuppliers: boolean;
  canAccessSettings: boolean;
  canDeleteOrders: boolean;
}
```

---

## 3. DATENBANK-SCHEMA

### Tabelle: `profiles`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK, FK → auth.users) | Benutzer-ID |
| email | TEXT NOT NULL | E-Mail Adresse |
| full_name | TEXT | Vollständiger Name |
| role | ENUM (user_role) | mitglied/bereichsleiter/kommandant/admin |
| functions | TEXT[] | Array von Funktionen |
| home_page | TEXT | Persönliche Startseite |
| substitute_id | UUID (FK → profiles) | Vertreter bei Abwesenheit |
| is_absent | BOOLEAN | Abwesenheitsstatus |
| absent_until | TIMESTAMPTZ | Abwesend bis |
| absence_reason | TEXT | Abwesenheitsgrund |
| default_bereichsleiter_id | UUID (FK → profiles) | Standard-Bereichsleiter |
| created_at | TIMESTAMPTZ | Erstellungsdatum |
| updated_at | TIMESTAMPTZ | Aktualisierungsdatum |

### Tabelle: `orders`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Bestell-ID |
| title | TEXT NOT NULL | Bestelltitel |
| description | TEXT | Beschreibung |
| amount | DECIMAL NOT NULL | Bestellsumme |
| status | ENUM (order_status) | Aktueller Status |
| created_by | UUID (FK → profiles) NOT NULL | Ersteller |
| supplier_id | UUID (FK → suppliers) | Lieferant |
| bereichsleiter_id | UUID (FK → profiles) | Zugewiesener Bereichsleiter |
| kommandant_id | UUID (FK → profiles) | Zugewiesener Kommandant |
| requires_kommandant_approval | BOOLEAN | Benötigt Kdt-Freigabe |
| requires_kommandomitglied_approval | BOOLEAN | Benötigt Kdo-Mitglied-Abstimmung |
| bereichsleiter_approved_at | TIMESTAMPTZ | BL-Freigabe-Zeitpunkt |
| kommandant_approved_at | TIMESTAMPTZ | Kdt-Freigabe-Zeitpunkt |
| kommandomitglied_approved_at | TIMESTAMPTZ | Kdo-Mitglied-Freigabe |
| rejected_at | TIMESTAMPTZ | Ablehnungs-Zeitpunkt |
| rejected_by | UUID (FK → profiles) | Abgelehnt von |
| rejection_reason | TEXT | Ablehnungsgrund |
| kassier_bestellt | BOOLEAN | Bestellung ausgeführt |
| kassier_bestellt_at | TIMESTAMPTZ | Bestellung ausgeführt am |
| kassier_bestellt_by | UUID (FK → profiles) | Bestellung ausgeführt von |
| order_executed | BOOLEAN | Bestellung abgeschlossen |
| order_executed_at | TIMESTAMPTZ | |
| order_executed_by | UUID | |
| order_received | BOOLEAN | Ware erhalten |
| order_received_at | TIMESTAMPTZ | |
| order_received_by | UUID | |
| invoice_to | TEXT | Rechnung an (gemeinde/feuerwehr) |
| escalation_extended_until | TIMESTAMPTZ | Eskalations-Verlängerung |
| escalation_extended_by | UUID | |
| escalation_extended_at | TIMESTAMPTZ | |
| escalation_extension_reason | TEXT | |
| kommandomitglied_override_by | UUID | |
| kommandomitglied_override_at | TIMESTAMPTZ | |
| kommandomitglied_override_reason | TEXT | |
| reset_at | TIMESTAMPTZ | Zurückgesetzt am |
| reset_by | UUID | |
| reset_reason | TEXT | |
| is_archived | BOOLEAN DEFAULT false | Archiviert |
| archived_at | TIMESTAMPTZ | |
| archived_by | UUID | |
| submitted_at | TIMESTAMPTZ | Eingereicht am |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Order-Status-Enum (`order_status`):**
```sql
'entwurf' | 'eingereicht' | 'ausstehend_bereichsleitung' | 'ausstehend_kommandant' | 
'ausstehend_kommandomitglieder' | 'freigegeben_bereichsleitung' | 'freigegeben_kommandant' | 
'genehmigt' | 'abgelehnt' | 'abgeschlossen'
```

### Tabelle: `order_history`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | |
| order_id | UUID (FK → orders) NOT NULL | |
| old_status | ENUM (order_status) | |
| new_status | ENUM (order_status) NOT NULL | |
| action | TEXT NOT NULL | Beschreibung der Aktion |
| comment | TEXT | Kommentar |
| performed_by | UUID (FK → profiles) NOT NULL | |
| email_status | ENUM (email_status) | |
| created_at | TIMESTAMPTZ | |

### Tabelle: `order_attachments`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| order_id | UUID (FK → orders) NOT NULL |
| file_name | TEXT NOT NULL |
| file_path | TEXT NOT NULL |
| file_size | INTEGER NOT NULL |
| mime_type | TEXT NOT NULL |
| uploaded_by | UUID NOT NULL |
| created_at | TIMESTAMPTZ |

### Tabelle: `order_votes`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| order_id | UUID (FK → orders) NOT NULL |
| user_id | UUID (FK → profiles) NOT NULL |
| vote | TEXT NOT NULL | (ja/nein/enthaltung) |
| reason | TEXT |
| created_at | TIMESTAMPTZ |

### Tabelle: `suppliers`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| name | TEXT NOT NULL |
| link | TEXT | Website-URL |
| customer_number | TEXT | Kundennummer |
| username | TEXT | Login-Benutzername |
| password | TEXT | Login-Passwort |
| order_email | TEXT | Bestell-E-Mail |
| order_phone | TEXT | Bestell-Telefon |
| order_days | TEXT[] | Bestelltage |
| order_methods | TEXT[] | Bestellmethoden |
| minimum_order_value | DECIMAL | Mindestbestellwert |
| offered_articles | TEXT | Angebotene Artikel |
| payment_terms | TEXT | Zahlungsbedingungen |
| special_conditions | TEXT | Sonderkonditionen |
| discount_percent | DECIMAL | Rabatt in % |
| assigned_bereichsleiter_id | UUID (FK → profiles) | Zuständiger BL |
| is_approved | BOOLEAN DEFAULT false | Freigegeben |
| approved_by | UUID (FK → profiles) | |
| approved_at | TIMESTAMPTZ | |
| created_by | UUID (FK → profiles) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### Tabelle: `supplier_contacts`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| supplier_id | UUID (FK → suppliers) NOT NULL |
| name | TEXT NOT NULL |
| position | TEXT |
| email | TEXT |
| phone | TEXT |
| notes | TEXT |
| created_at | TIMESTAMPTZ |

### Tabelle: `supplier_documents`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| supplier_id | UUID (FK → suppliers) NOT NULL |
| file_name | TEXT NOT NULL |
| file_path | TEXT NOT NULL |
| file_size | INTEGER NOT NULL |
| mime_type | TEXT NOT NULL |
| document_type | TEXT |
| description | TEXT |
| uploaded_by | UUID |
| created_at | TIMESTAMPTZ |

### Tabelle: `tasks`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| title | TEXT NOT NULL |
| description | TEXT |
| status | TEXT DEFAULT 'todo' | (todo/in_progress/completed/cancelled) |
| priority | TEXT DEFAULT 'medium' | (low/medium/high/urgent) |
| assigned_to | UUID (FK → profiles) |
| created_by | UUID NOT NULL |
| start_date | DATE NOT NULL |
| end_date | DATE NOT NULL |
| progress | INTEGER DEFAULT 0 |
| category | TEXT |
| is_recurring | BOOLEAN DEFAULT false |
| recurrence_type | ENUM (recurrence_type) |
| recurrence_interval | INTEGER |
| parent_task_id | UUID (FK → tasks) |
| depends_on | UUID (FK → tasks) |
| visible_to_all | BOOLEAN DEFAULT false |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

**Recurrence-Type-Enum:**
```sql
'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
```

### Tabelle: `task_steps`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| task_id | UUID (FK → tasks) NOT NULL |
| title | TEXT NOT NULL |
| assigned_to | UUID (FK → profiles) |
| completed | BOOLEAN DEFAULT false |
| completed_by | UUID |
| completed_at | TIMESTAMPTZ |
| sort_order | INTEGER DEFAULT 0 |
| created_at | TIMESTAMPTZ |

### Tabelle: `notifications`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| user_id | UUID (FK → profiles) NOT NULL |
| message | TEXT NOT NULL |
| subject | TEXT |
| is_read | BOOLEAN DEFAULT false |
| notification_type | TEXT | (order/task/step/message) |
| order_id | UUID (FK → orders) |
| task_id | UUID (FK → tasks) |
| step_id | UUID (FK → task_steps) |
| sender_id | UUID |
| is_reply | BOOLEAN |
| original_recipients | TEXT[] |
| created_at | TIMESTAMPTZ |

### Tabelle: `conversations`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| conversation_key | TEXT NOT NULL UNIQUE |
| subject | TEXT |
| created_by | UUID NOT NULL |
| is_closed | BOOLEAN DEFAULT false |
| closed_by | UUID |
| closed_at | TIMESTAMPTZ |
| created_at | TIMESTAMPTZ |

### Tabelle: `ideas`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| title | TEXT NOT NULL |
| description | TEXT |
| category | TEXT DEFAULT 'allgemein' |
| status | TEXT DEFAULT 'neu' | (neu/genehmigt/in_bearbeitung/umgesetzt/abgelehnt) |
| image_url | TEXT |
| created_by | UUID NOT NULL |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

### Tabelle: `idea_votes`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| idea_id | UUID (FK → ideas) NOT NULL |
| user_id | UUID NOT NULL |
| vote_type | TEXT NOT NULL | (up/down) |
| created_at | TIMESTAMPTZ |

### Tabelle: `idea_vote_logs`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| idea_id | UUID (FK → ideas) NOT NULL |
| user_id | UUID NOT NULL |
| action | TEXT NOT NULL |
| previous_vote | TEXT |
| new_vote | TEXT |
| created_at | TIMESTAMPTZ |

### Tabelle: `idea_comments`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| idea_id | UUID (FK → ideas) NOT NULL |
| user_id | UUID NOT NULL |
| content | TEXT NOT NULL |
| created_at | TIMESTAMPTZ |

### Tabelle: `idea_categories`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| name | TEXT NOT NULL |
| color | TEXT DEFAULT '#3b82f6' |
| created_at | TIMESTAMPTZ |

### Tabelle: `payment_orders`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| reference_number | TEXT NOT NULL UNIQUE |
| purpose | TEXT NOT NULL |
| recipient_name | TEXT NOT NULL |
| recipient_iban | TEXT |
| amount | DECIMAL NOT NULL |
| payment_method | TEXT NOT NULL | (cash/transfer/direct_to_organizer) |
| status | TEXT DEFAULT 'draft' |
| notes | TEXT |
| attachment_url | TEXT |
| attachment_name | TEXT |
| linked_event_participation_id | UUID (FK → event_participations) |
| is_direct_to_organizer | BOOLEAN |
| created_by | UUID NOT NULL |
| submitted_at | TIMESTAMPTZ |
| approved_by | UUID |
| approved_at | TIMESTAMPTZ |
| rejected_by | UUID |
| rejected_at | TIMESTAMPTZ |
| rejection_reason | TEXT |
| paid_by | UUID |
| paid_at | TIMESTAMPTZ |
| email_status | TEXT |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

### Tabelle: `event_participations`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| reference_number | TEXT NOT NULL UNIQUE |
| event_name | TEXT NOT NULL |
| event_date | DATE NOT NULL |
| event_location | TEXT |
| description | TEXT |
| max_participants | INTEGER DEFAULT 1 |
| estimated_costs | DECIMAL DEFAULT 0 |
| transport_type | TEXT |
| overnight_required | BOOLEAN |
| organizer | TEXT |
| payment_method | TEXT | (cash/transfer/direct_to_organizer) |
| organizer_iban | TEXT |
| organizer_bank_name | TEXT |
| status | TEXT DEFAULT 'draft' |
| notes | TEXT |
| attachment_url | TEXT |
| attachment_name | TEXT |
| confirmed_amount | DECIMAL |
| amount_confirmed | BOOLEAN |
| amount_confirmed_by | UUID |
| amount_confirmed_at | TIMESTAMPTZ |
| amount_change_reason | TEXT |
| requires_reapproval | BOOLEAN |
| payment_details_accepted | BOOLEAN |
| created_by | UUID NOT NULL |
| submitted_at | TIMESTAMPTZ |
| approved_by | UUID |
| approved_at | TIMESTAMPTZ |
| rejected_by | UUID |
| rejected_at | TIMESTAMPTZ |
| rejection_reason | TEXT |
| reapproved_by | UUID |
| reapproved_at | TIMESTAMPTZ |
| email_status | TEXT |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

### Tabelle: `event_participation_amount_history`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| event_participation_id | UUID (FK → event_participations) NOT NULL |
| original_amount | DECIMAL NOT NULL |
| new_amount | DECIMAL NOT NULL |
| change_reason | TEXT |
| changed_by | UUID NOT NULL |
| changed_at | TIMESTAMPTZ |
| requires_approval | BOOLEAN |
| approved_by | UUID |
| approved_at | TIMESTAMPTZ |
| notification_sent | BOOLEAN |
| notification_sent_at | TIMESTAMPTZ |

### Tabelle: `event_form_templates`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| name | TEXT NOT NULL |
| event_name | TEXT NOT NULL |
| location | TEXT NOT NULL |
| date_time | TEXT NOT NULL |
| registration_deadline | TEXT NOT NULL |
| adjustment | TEXT NOT NULL |
| adjustment_note | TEXT |
| vehicles | TEXT |
| categories | JSON |
| created_by | UUID NOT NULL |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

### Tabelle: `rental_items`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| name | TEXT NOT NULL |
| description | TEXT |
| price_short | DECIMAL | Preis kurz |
| price_day | DECIMAL | Tagespreis |
| price_week | DECIMAL | Wochenpreis |
| image_url | TEXT |
| is_active | BOOLEAN DEFAULT true |
| is_single_item | BOOLEAN DEFAULT false |
| condition_notes | TEXT |
| sort_order | INTEGER DEFAULT 0 |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

### Tabelle: `rental_contracts`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| contract_number | TEXT NOT NULL UNIQUE |
| customer_name | TEXT NOT NULL |
| customer_address | TEXT NOT NULL |
| customer_phone | TEXT |
| customer_email | TEXT |
| rental_start | DATE NOT NULL |
| rental_end | DATE NOT NULL |
| items | JSON NOT NULL |
| subtotal | DECIMAL NOT NULL |
| delivery_cost | DECIMAL DEFAULT 0 |
| total_amount | DECIMAL NOT NULL |
| includes_delivery | BOOLEAN DEFAULT false |
| is_sponsor | BOOLEAN DEFAULT false |
| has_custom_price | BOOLEAN |
| custom_price | DECIMAL |
| status | TEXT DEFAULT 'aktiv' |
| condition_pickup | TEXT |
| condition_return | TEXT |
| damage_notes | TEXT |
| additional_costs | DECIMAL |
| additional_costs_reason | TEXT |
| returned_at | TIMESTAMPTZ |
| pdf_url | TEXT |
| created_by | UUID |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

### Tabelle: `min_order_value_requests`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| supplier_id | UUID (FK → suppliers) NOT NULL |
| requested_by | UUID (FK → profiles) NOT NULL |
| reason | TEXT NOT NULL |
| status | TEXT DEFAULT 'pending' |
| decided_by | UUID (FK → profiles) |
| decided_at | TIMESTAMPTZ |
| rejection_reason | TEXT |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

### Tabelle: `problem_reports`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| title | TEXT NOT NULL |
| description | TEXT NOT NULL |
| priority | TEXT DEFAULT 'medium' |
| status | TEXT DEFAULT 'open' |
| page_url | TEXT |
| browser_info | TEXT |
| console_logs | TEXT |
| screenshot_url | TEXT |
| admin_notes | TEXT |
| created_by | UUID |
| resolved_by | UUID |
| resolved_at | TIMESTAMPTZ |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

### Tabelle: `settings`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| key | TEXT NOT NULL UNIQUE |
| value | TEXT NOT NULL |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

### Tabelle: `functions`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| name | TEXT NOT NULL UNIQUE |
| label | TEXT NOT NULL |
| created_at | TIMESTAMPTZ |

### Tabelle: `user_presence`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| user_id | UUID NOT NULL UNIQUE |
| last_seen | TIMESTAMPTZ NOT NULL |
| created_at | TIMESTAMPTZ |

### Tabelle: `push_subscriptions`
| Spalte | Typ |
|--------|-----|
| id | UUID (PK) |
| user_id | UUID NOT NULL |
| endpoint | TEXT NOT NULL |
| p256dh | TEXT NOT NULL |
| auth | TEXT NOT NULL |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

### Datenbank-Funktionen
| Funktion | Parameter | Returns |
|----------|-----------|--------|
| `check_and_escalate_orders` | - | {escalated_count, escalated_orders[]} |
| `generate_rental_contract_number` | - | TEXT |
| `user_has_step_in_task` | p_task_id UUID, p_user_id UUID | BOOLEAN |

### Enums
```sql
CREATE TYPE user_role AS ENUM ('mitglied', 'admin', 'bereichsleiter', 'kommandant');

CREATE TYPE order_status AS ENUM (
  'entwurf', 'eingereicht', 'ausstehend_bereichsleitung', 'ausstehend_kommandant',
  'freigegeben_bereichsleitung', 'genehmigt', 'abgelehnt', 'abgeschlossen',
  'ausstehend_kommandomitglieder', 'freigegeben_kommandant'
);

CREATE TYPE email_status AS ENUM ('none', 'sent', 'failed', 'partial');

CREATE TYPE recurrence_type AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom');
```

---

## 4. ROUTEN-STRUKTUR

| Route | Komponente | Beschreibung | Schutz |
|-------|------------|--------------|--------|
| `/login` | `Login` | Anmeldeseite | Öffentlich |
| `/` | `Index` | Dashboard mit Tabs | Geschützt |
| `/bestellungen` | `Orders` | Bestellungsliste | Geschützt |
| `/bestellungen/neu` | `NewOrder` | Neue Bestellung anlegen | Geschützt |
| `/bestellungen/:id` | `OrderDetail` | Bestellungsdetails | Geschützt |
| `/order/:id` | Redirect → `/bestellungen/:id` | Legacy-Redirect | - |
| `/lieferanten` | `Suppliers` | Lieferantenverwaltung | Geschützt |
| `/aufgaben` | `Tasks` | Aufgaben-Kanban | Geschützt |
| `/einstellungen` | `SettingsNew` | Neue Einstellungen | Geschützt |
| `/einstellungen-alt` | `Settings` | Alte Einstellungen | Geschützt |
| `/benachrichtigungen` | `Notifications` | Benachrichtigungen | Geschützt |
| `/benutzer` | `UserManagement` | Benutzerverwaltung | Geschützt |
| `/online-benutzer` | `OnlineUsers` | Online-Benutzer | Geschützt |
| `/kassier` | `KassierOverview` | Kassier-Dashboard | Geschützt |
| `/antragsformulare` | `Antragsformulare` | Formulare/Anträge | Geschützt |
| `/ideen` | `IdeasPool` | Ideenpool | Geschützt |
| `/anleitung` | `Anleitung` | Hilfe/Dokumentation | Geschützt |
| `/voting-demo` | `VotingDemo` | Demo-Seite | Geschützt |
| `/menu-demo` | `MenuDemo` | Demo-Seite | Geschützt |
| `/dashboard-demo` | `DashboardDemo` | Demo-Seite | Geschützt |

---

## 5. KOMPONENTEN-INVENTAR

### Seiten (Pages)
| Pfad | Zeilen | Zweck |
|------|--------|-------|
| `src/pages/Index.tsx` | ~3500 | Haupt-Dashboard mit allen Tabs |
| `src/pages/Settings.tsx` | ~3500 | Umfangreiche Einstellungsseite |
| `src/pages/Tasks.tsx` | ~1280 | Aufgaben-Management mit Kanban |
| `src/pages/OrderDetail.tsx` | ~1500 | Bestellungsdetails & Freigaben |
| `src/pages/Suppliers.tsx` | ~1220 | Lieferantenverwaltung |
| `src/pages/Antragsformulare.tsx` | ~1580 | Antragsformulare-Modul |
| `src/pages/Anleitung.tsx` | ~1130 | Hilfe-/Dokumentationsseite |
| `src/pages/IdeasPool.tsx` | ~1040 | Ideenpool mit Abstimmungen |
| `src/pages/KassierOverview.tsx` | ~1030 | Kassier-Ansicht |
| `src/pages/UserManagement.tsx` | ~900 | Benutzerverwaltung |
| `src/pages/Login.tsx` | ~140 | Login-Seite |
| `src/pages/Orders.tsx` | ~480 | Bestellungsliste |
| `src/pages/NewOrder.tsx` | ~380 | Neue Bestellung |
| `src/pages/Notifications.tsx` | ~290 | Benachrichtigungen |
| `src/pages/OnlineUsers.tsx` | ~280 | Online-Benutzer |
| `src/pages/SettingsNew.tsx` | ~260 | Neue Einstellungen |

### Komponenten
| Pfad | Zeilen | Zweck |
|------|--------|-------|
| `src/components/Layout.tsx` | ~610 | Haupt-Layout mit Navigation |
| `src/components/CompactDashboard.tsx` | ~540 | Dashboard-Zusammenfassung |
| `src/components/EmailTemplateEditor.tsx` | ~910 | E-Mail-Vorlagen-Editor |
| `src/components/EventParticipationsSection.tsx` | ~1740 | Event-Verwaltung |
| `src/components/RentalContractsSection.tsx` | ~2100 | Mietverträge |
| `src/components/FormGeneratorSection.tsx` | ~1050 | Formular-Generator |
| `src/components/CrewListSection.tsx` | ~510 | Mannschaftslisten |
| `src/components/KommandomitgliedVoting.tsx` | ~780 | Abstimmungs-Komponente |
| `src/components/TaskSteps.tsx` | ~280 | Task-Schritte |
| `src/components/WysiwygEditor.tsx` | ~280 | Rich-Text-Editor |
| `src/components/FileUpload.tsx` | ~350 | Datei-Upload |
| `src/components/AttachmentList.tsx` | ~250 | Anhang-Liste |
| `src/components/SupplierSelect.tsx` | ~250 | Lieferanten-Auswahl |
| `src/components/StatusBadge.tsx` | ~100 | Status-Anzeige |
| `src/components/OrderCard.tsx` | ~160 | Bestell-Karte |
| `src/components/EscalationCountdown.tsx` | ~200 | Countdown-Anzeige |
| `src/components/GanttChart.tsx` | ~300 | Gantt-Diagramm |

### Hooks
| Pfad | Zeilen | Zweck |
|------|--------|-------|
| `src/hooks/useOrders.ts` | ~2500 | Bestellungs-Logik (größter Hook) |
| `src/hooks/useTasks.ts` | ~1010 | Aufgaben-Logik |
| `src/hooks/useSettings.ts` | ~920 | Einstellungen |
| `src/hooks/useEventParticipations.ts` | ~660 | Event-Teilnahmen |
| `src/hooks/usePaymentOrders.ts` | ~590 | Zahlungsanweisungen |
| `src/hooks/useIdeas.ts` | ~420 | Ideen-Verwaltung |
| `src/hooks/useSuppliers.ts` | ~320 | Lieferanten |
| `src/hooks/useRentalContracts.ts` | ~310 | Mietverträge |
| `src/hooks/useRentalItems.ts` | ~190 | Leih-Gegenstände |
| `src/hooks/useProfiles.ts` | ~180 | Benutzer-Profile |
| `src/hooks/useSupplierDocuments.ts` | ~170 | Lieferanten-Dokumente |
| `src/hooks/useNotifications.ts` | ~170 | Benachrichtigungen |
| `src/hooks/useProblemReports.ts` | ~170 | Problem-Meldungen |
| `src/hooks/useEventFormTemplates.ts` | ~160 | Event-Formular-Vorlagen |
| `src/hooks/usePresence.ts` | ~160 | Online-Status |
| `src/hooks/useOrderVotes.ts` | ~160 | Bestell-Abstimmungen |
| `src/hooks/useSupplierContacts.ts` | ~110 | Lieferanten-Kontakte |
| `src/hooks/useMinOrderRequests.ts` | ~280 | Mindestbestellwert-Anfragen |
| `src/hooks/useFunctions.ts` | ~80 | Funktionen-Liste |

### Contexts
| Pfad | Zweck |
|------|-------|
| `src/contexts/AuthContext.tsx` | Authentifizierung |
| `src/contexts/SimulationContext.tsx` | Benutzer-Simulation |
| `src/contexts/OrdersContext.tsx` | Order-State (Realtime) |
| `src/contexts/NotificationsContext.tsx` | Benachrichtigungs-State |

### Utils
| Pfad | Zweck |
|------|-------|
| `src/utils/generateOrderPdf.ts` | Bestellungs-PDF |
| `src/utils/generatePaymentOrderPdf.ts` | Zahlungsanweisungs-PDF |
| `src/utils/generateEventParticipationPdf.ts` | Event-Teilnahme-PDF |
| `src/utils/generateRentalContractPdf.ts` | Mietvertrags-PDF |
| `src/utils/generateIdeaApprovalPdf.ts` | Ideen-Genehmigungs-PDF |
| `src/utils/generateCrewListPdfPreview.ts` | Mannschaftslisten-PDF |
| `src/utils/generateEventSignupFormPdf.ts` | Event-Anmelde-Formular-PDF |
| `src/utils/exportSuppliers.ts` | Lieferanten-Export (PDF/Excel) |
| `src/utils/pdfBackground.ts` | PDF-Hintergrund-Utilities |
| `src/utils/fonts/roboto-font.ts` | Roboto-Font für PDFs |
| `src/utils/consoleCapture.ts` | Console-Log Erfassung |
| `src/lib/pushNotifications.ts` | Push-Benachrichtigungen |

---

## 6. DESIGN-SYSTEM

### Farbschema (theme.css)
```css
@theme {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'Fira Code', monospace;

  /* Feuerwehr Rot als Primärfarbe */
  --color-primary: #C8102E;
  --color-primary-foreground: #ffffff;
  
  /* Silber/Grau als Sekundärfarbe */
  --color-secondary: #6B7280;
  --color-secondary-foreground: #ffffff;
  
  /* Heller Hintergrund */
  --color-background: #fafafa;
  --color-foreground: #1f2937;
  
  /* Karten */
  --color-card: #ffffff;
  --color-card-foreground: #1f2937;
  
  /* Muted */
  --color-muted: #f3f4f6;
  --color-muted-foreground: #6b7280;
  
  /* Rahmen */
  --color-border: #e5e7eb;
  --color-input: #e5e7eb;
  --color-ring: #C8102E;
  
  /* Destruktiv */
  --color-destructive: #991b1b;
  --color-destructive-foreground: #ffffff;

  /* Status Farben */
  --color-status-eingereicht: #ea580c;
  --color-status-ausstehend-bl: #7c3aed;
  --color-status-ausstehend-kdt: #2563eb;
  --color-status-freigegeben-bl: #86efac;
  --color-status-genehmigt: #16a34a;
  --color-status-abgelehnt: #dc2626;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
}
```

### Schriftarten
- **Sans-Serif:** Inter, system-ui, sans-serif
- **Monospace:** Fira Code, monospace

### Icons
- **Library:** Lucide React (`lucide-react`)

### UI-Frameworks
- Keine UI-Library (custom Tailwind CSS)
- TipTap für WYSIWYG-Editor

---

## 7. EXTERNE ABHÄNGIGKEITEN

### Dependencies (package.json)
```json
{
  "@pdfme/common": "^6.1.8",
  "@supabase/supabase-js": "^2.47.3",
  "@tiptap/extension-link": "^3.22.4",
  "@tiptap/react": "^3.22.4",
  "@tiptap/starter-kit": "^3.22.4",
  "jspdf": "^4.2.1",
  "lucide-react": "^0.468.0",
  "pino": "^10.1.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router": "^7.1.0",
  "xlsx": "^0.18.5"
}
```

### Dev Dependencies
```json
{
  "@tailwindcss/vite": "^4.1.18",
  "tailwindcss": "^4.1.18",
  "typescript": "~5.6.2",
  "vite": "^6.4.2",
  "supabase": "^2.58.6"
}
```

### Edge Functions
| Funktion | Pfad | Zweck |
|----------|------|-------|
| `send-notification` | `supabase/functions/send-notification/` | E-Mail-Benachrichtigungen |
| `send-push` | `supabase/functions/send-push/` | Push-Benachrichtigungen |
| `send-approval-reminder` | `supabase/functions/send-approval-reminder/` | Freigabe-Erinnerungen |
| `send-credentials` | `supabase/functions/send-credentials/` | Login-Daten versenden |
| `check-escalation` | `supabase/functions/check-escalation/` | Eskalations-Prüfung |
| `delete-user` | `supabase/functions/delete-user/` | Benutzer löschen |
| `generate-vapid` | `supabase/functions/generate-vapid/` | VAPID-Keys |

---

## 8. ZUSAMMENFÜHRUNGS-HINWEISE

### Empfohlene Dateiumbenennungen

| Original | Neu (für Merge) |
|----------|----------------|
| `src/pages/Index.tsx` | `src/pages/banf/BanfDashboard.tsx` |
| `src/pages/Orders.tsx` | `src/pages/banf/BanfOrders.tsx` |
| `src/pages/NewOrder.tsx` | `src/pages/banf/BanfNewOrder.tsx` |
| `src/pages/OrderDetail.tsx` | `src/pages/banf/BanfOrderDetail.tsx` |
| `src/pages/Suppliers.tsx` | `src/pages/banf/BanfSuppliers.tsx` |
| `src/pages/Tasks.tsx` | `src/pages/banf/BanfTasks.tsx` |
| `src/pages/Settings.tsx` | `src/pages/banf/BanfSettings.tsx` |
| `src/pages/KassierOverview.tsx` | `src/pages/banf/BanfKassier.tsx` |
| `src/hooks/useOrders.ts` | `src/hooks/banf/useBanfOrders.ts` |
| `src/hooks/useSuppliers.ts` | `src/hooks/banf/useBanfSuppliers.ts` |
| `src/hooks/useTasks.ts` | `src/hooks/banf/useBanfTasks.ts` |

### Zu entfernende Dateien (zentral nutzen)
- `src/pages/Login.tsx` → Zentrale Login-Seite nutzen
- `src/contexts/AuthContext.tsx` → Zentralen Auth-Context nutzen

### Datenbank-Tabellen Präfix
Alle Tabellen mit `banf_` präfixieren:
- `orders` → `banf_orders`
- `order_history` → `banf_order_history`
- `order_attachments` → `banf_order_attachments`
- `order_votes` → `banf_order_votes`
- `suppliers` → `banf_suppliers`
- `supplier_contacts` → `banf_supplier_contacts`
- `supplier_documents` → `banf_supplier_documents`
- usw.

### Rollen-Mapping
| BANF-Rolle | Zentrale Rolle |
|------------|---------------|
| `mitglied` | `user` |
| `bereichsleiter` | `area_manager` |
| `kommandant` | `commander` |
| `admin` | `super_admin` |

### Wichtige Logik zu beachten

1. **Mehrstufiger Freigabe-Workflow:**
   - Bestellungen durchlaufen: Mitglied → Bereichsleiter → Kommandant → (optional) Kommandomitglieder
   - Abhängig vom Betrag und Einstellungen
   - Eskalation bei Nicht-Freigabe (Timer)

2. **Simulations-Kontext:**
   - Admin kann als anderer Benutzer agieren
   - `useSimulation()` Hook muss global verfügbar sein
   - Unterscheidung: `effectiveUserId` vs `user?.id`

3. **Vertretungsregelung:**
   - `substitute_id` und `is_absent` in profiles
   - Freigaben gehen an Vertreter wenn Benutzer abwesend

4. **PDF-Generierung:**
   - Eigene PDF-Funktionen in `src/utils/`
   - Roboto-Font-Einbettung erforderlich
   - Hintergrundbild-Support (Logo/Wasserzeichen)

5. **E-Mail-Templates:**
   - Anpassbare Vorlagen in Settings
   - Variablen-Ersetzung ({{name}}, {{order_title}}, etc.)

6. **Realtime-Updates:**
   - OrdersContext nutzt Supabase Realtime
   - NotificationsContext ebenso

### Empfohlener Navigationsbereich
- **Name:** `Bestellwesen` oder `BANF`
- **Icon:** `ShoppingCart` oder `Package` (Lucide)
- **Untermenü:**
  - Dashboard
  - Bestellungen
  - Lieferanten
  - Aufgaben
  - Antragsformulare
  - Ideenpool
  - Kassier (nur für Kassier/Admin)

### Edge Functions Migration
Alle Edge Functions müssen umbenannt werden:
- `send-notification` → `banf-send-notification`
- `send-approval-reminder` → `banf-send-approval-reminder`
- usw.

---

## 9. SETTINGS-KEYS

Wichtige Einstellungen aus der `settings`-Tabelle:

| Key | Beschreibung |
|-----|-------------|
| `approval_limit_bereichsleiter` | Freigabelimit Bereichsleiter (€) |
| `approval_limit_kommandant` | Ab diesem Betrag braucht Kdt Freigabe |
| `approval_limit_kommandomitglied` | Ab diesem Betrag Kdo-Abstimmung |
| `escalation_timeout_hours` | Stunden bis zur Eskalation |
| `pdf_background_url` | PDF-Hintergrundbild-URL |
| `pdf_background_opacity` | PDF-Hintergrund-Transparenz |
| `email_template_*` | E-Mail-Vorlagen |
| `email_design_*` | E-Mail-Design-Einstellungen |
| `rental_contract_*` | Mietvertrag-Einstellungen |

---

**Ende des Export-Berichts**
