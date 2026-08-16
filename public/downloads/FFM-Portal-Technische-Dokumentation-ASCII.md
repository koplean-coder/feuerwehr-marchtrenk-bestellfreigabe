# Technische Zusammenfassung: BANF-/Bestellverwaltungs-App

**Dokumentversion:** 1.0  
**Erstellt:** Juni 2025  
**Hinweis:** ASCII-Version ohne Umlaute fuer maximale Kompatibilitaet

---

## 1. Zweck & Funktion

Diese App ist ein **Bestellanforderungs- und Freigabe-System (BANF)** fuer eine Feuerwehr-Organisation. Sie dient der digitalen Verwaltung von Bestellungen, Lieferanten, Aufgaben, Veranstaltungsteilnahmen, Auszahlungsanweisungen, Leihvertraegen und einem Ideen-Pool.

### Hauptfunktionen

- **Bestellverwaltung:** Erstellen, Einreichen und mehrstufige Genehmigung von Bestellanforderungen mit betragabhaengigen Freigabestufen
- **Lieferantenverwaltung:** Anlegen und Verwalten von Lieferanten mit Kontakten und Dokumenten
- **Aufgabenverwaltung:** Aufgaben mit Unterschritten und Zuweisung an Benutzer
- **Antragsformulare:** Veranstaltungsteilnahmen und Auszahlungsanweisungen mit Genehmigungsworkflow
- **Leihvertragsverwaltung:** Verwaltung von Leihgeraeten und -vertraegen mit PDF-Generierung
- **Ideen-Pool:** Vorschlagswesen mit Abstimmungsfunktion
- **Benutzerverwaltung:** Rollen- und Funktionsbasierte Berechtigungen
- **Benachrichtigungssystem:** E-Mail- und Push-Benachrichtigungen

---

## 2. Benutzerrollen & Berechtigungen

### 2.1 Hauptrollen (4 Stufen)

| Rolle | Beschreibung |
|-------|-------------|
| **mitglied** | Basis-Benutzer, kann eigene Bestellungen erstellen und einsehen |
| **bereichsleiter** | Kann zugewiesene Bestellungen freigeben, Lieferanten verwalten |
| **kommandant** | Volle Freigaberechte, Benutzerverwaltung, Einstellungszugriff |
| **admin** | Systemadministrator mit allen Rechten |

### 2.2 Funktionsbasierte Berechtigungen (zusaetzlich zur Rolle)

| Funktion | Berechtigungen |
|----------|---------------|
| **lieferanten_erfassen** | Darf Lieferanten anlegen/bearbeiten |
| **kassier** | PDF-Zugriff, Bestellfelder bearbeiten, Freigabenuebersicht, Rabattfelder |
| **schriftfuehrer** | PDF-Zugriff, PDF-Generierung fuer Veranstaltungen |
| **kommandomitglied** | Einsicht aller Bestellungen, Teilnahme an Kommando-Abstimmungen |

### 2.3 Berechtigungsmatrix

| Aktion | mitglied | bereichsleiter | kommandant | admin |
|--------|----------|----------------|------------|-------|
| Eigene Bestellungen erstellen | Ja | Ja | Ja | Ja |
| Alle Bestellungen sehen | Nein | nur zugewiesene | Ja | Ja |
| Bestellung freigeben | Nein | als zugewiesener BL | Ja | Ja |
| Bestellung ablehnen | Nein | als zugewiesener BL | Ja | Ja |
| Auf Entwurf zuruecksetzen | Nein | Nein | Ja | Ja |
| Lieferanten verwalten | Nein | Ja | Ja | Ja |
| Benutzer verwalten | Nein | Nein | Ja | Ja |
| Einstellungen | Nein | Nein | Ja | Ja |
| PDF herunterladen | Nein | Nein | Ja | Ja |

---

## 3. Workflow (BANF-Prozess)

### 3.1 Statusuebersicht

| Status | Bedeutung |
|--------|-----------|
| `entwurf` | Noch nicht eingereicht, nur Ersteller kann bearbeiten |
| `eingereicht` | Zur Pruefung eingereicht, wartet auf Bereichsleiter |
| `ausstehend_bereichsleitung` | Explizit auf Bereichsleiter-Freigabe wartend |
| `ausstehend_kommandant` | Bereichsleiter hat freigegeben, wartet auf Kommandant |
| `freigegeben_bereichsleitung` | Bereichsleiter hat freigegeben (unter KDT-Schwelle) |
| `freigegeben_kommandant` | Kommandant hat freigegeben |
| `ausstehend_kommandomitglieder` | Warte auf Kommando-Abstimmung |
| `genehmigt` | Vollstaendig genehmigt |
| `abgelehnt` | Abgelehnt |
| `abgeschlossen` | Bestellt und erhalten/archiviert |

### 3.2 Workflow-Ablauf

```
                      ENTWURF
                         |
                    Einreichen
                         v
                    EINGEREICHT
                         |
         +---------------+---------------+
         |               |               |
         v               v               v
    BL Freigabe    KDT Direkt-      Ablehnung
         |         Freigabe              |
         v               |               v
  Betrag < KDT?          |          ABGELEHNT
    |       |            |
   JA      NEIN          |
    |       |            |
    v       v            v
GENEHMIGT  AUSSTEHEND_KDT
                |        |
                v        v
           FREIGEGEBEN_KDT
                |
     (Optional: Kommando-Abstimmung)
                |
                v
            GENEHMIGT
                |
          Ware erhalten
                v
          ABGESCHLOSSEN
```

### 3.3 Freigabestufen (betragabhaengig)

- **Unter Bereichsleiter-Grenze:** Nur Bereichsleiter-Freigabe noetig
- **Ab Kommandant-Grenze (freigabebetragKdt):** Zusaetzliche Kommandant-Freigabe
- **Ab Kommandomitglieder-Grenze (freigabebetragKommandomitglied):** Optional Kommando-Abstimmung

### 3.4 Spezielle Workflow-Aktionen

- **Direkte Kommandant-Freigabe:** Kommandant kann Bestellungen direkt genehmigen ohne Bereichsleiter-Freigabe
- **Auf Entwurf zuruecksetzen:** Nur Kommandant, setzt Bestellung in Bearbeitungszustand zurueck
- **Kommando-Abstimmung:** Bei hohen Betraegen koennen Kommandomitglieder abstimmen
- **Eskalation:** Automatische Eskalation an Kommandant wenn Bereichsleiter nicht reagiert

---

## 4. Formularfelder (Bestellanforderung)

### 4.1 Pflichtfelder

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| **Titel** | Text | Bezeichnung der Bestellung |
| **Gesamtbetrag** | Zahl (EUR) | Geschaetzter oder tatsaechlicher Betrag |
| **Bereichsleiter** | Auswahl | Zustaendiger Freigeber (wird automatisch vorgeschlagen) |

### 4.2 Optionale Felder

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| **Lieferant** | Auswahl | Ausgewaehlter Lieferant aus der Lieferantenliste |
| **Beschreibung** | Textbereich | Zusaetzliche Details zur Bestellung |
| **Anhaenge** | Datei-Upload | Angebote, Spezifikationen etc. (mehrere moeglich) |

### 4.3 Systemfelder (automatisch)

- Erstellungsdatum
- Ersteller (User-ID)
- Status
- Einreichungszeitpunkt
- Genehmigungs-Zeitstempel (BL/KDT)
- Freigabe-Flags (requires_kommandant_approval, requires_kommandomitglied_approval)
- Eskalationsfristen

---

## 5. Datenbankstruktur

### 5.1 Haupttabellen

| Tabelle | Beschreibung | Wichtige Felder |
|---------|-------------|------------------|
| **orders** | Bestellungen | id, title, description, amount, status, supplier_id, bereichsleiter_id, created_by, submitted_at, requires_kommandant_approval, requires_kommandomitglied_approval, escalation_deadline, invoice_to |
| **profiles** | Benutzerprofile | id, email, full_name, role, functions[], home_page, substitute_id, is_absent, absent_until, approved, default_bereichsleiter_id |
| **suppliers** | Lieferanten | id, name, address, phone, email, website, assigned_bereichsleiter_id, is_approved, min_order_value, order_days[] |
| **supplier_contacts** | Lieferantenkontakte | id, supplier_id, name, email, phone, position |
| **supplier_documents** | Lieferantendokumente | id, supplier_id, name, file_path, file_type, file_size |
| **order_attachments** | Bestellanhaenge | id, order_id, file_name, file_path, file_type, file_size |
| **order_history** | Bestellverlauf | id, order_id, action, old_status, new_status, user_id, email_status, created_at |
| **order_votes** | Kommando-Abstimmungen | id, order_id, user_id, vote ('approve'/'reject'), comment, created_at |

### 5.2 Aufgaben-Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| **tasks** | Aufgaben mit Titel, Beschreibung, Prioritaet, Status, Deadline, Wiederholungen |
| **task_steps** | Unterschritte zu Aufgaben mit Zuweisung und Status |

### 5.3 Benachrichtigungs-Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| **notifications** | In-App-Benachrichtigungen |
| **push_subscriptions** | Web Push Abonnements pro Benutzer |

### 5.4 Ideen-Pool Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| **ideas** | Ideen-Pool Eintraege |
| **idea_votes** | Abstimmungen zu Ideen |
| **idea_vote_logs** | Abstimmungs-Protokoll |
| **idea_comments** | Kommentare zu Ideen |
| **idea_categories** | Ideen-Kategorien |

### 5.5 Antragsformular-Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| **event_participations** | Veranstaltungsteilnahmen |
| **event_participation_amount_history** | Aenderungshistorie fuer Betraege |
| **event_form_templates** | Vorlagen fuer Veranstaltungsformulare |
| **payment_orders** | Auszahlungsanweisungen |

### 5.6 Leihvertrags-Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| **rental_contracts** | Leihvertraege mit Kundeninfo, Zeitraum, Artikeln |
| **rental_items** | Leihgeraete mit Namen, Inventarnummer, Zustand |

### 5.7 System-Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| **settings** | Systemeinstellungen (Key-Value) |
| **functions** | Definierte Funktionen/Rollen |
| **user_presence** | Online-Status der Benutzer |
| **min_order_value_requests** | Antraege auf Unterschreitung Mindestbestellwert |
| **conversations** | Direkte Nachrichten |

### 5.8 Enums (Datenbank-Aufzaehlungen)

```typescript
order_status: 
  'entwurf' | 'eingereicht' | 'ausstehend_bereichsleitung' | 
  'ausstehend_kommandant' | 'freigegeben_bereichsleitung' | 
  'freigegeben_kommandant' | 'genehmigt' | 'abgelehnt' | 
  'abgeschlossen' | 'ausstehend_kommandomitglieder'

user_role: 
  'mitglied' | 'admin' | 'bereichsleiter' | 'kommandant'

email_status: 
  'none' | 'sent' | 'failed' | 'partial'

recurrence_type: 
  'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
```

---

## 6. Benachrichtigungen

### 6.1 E-Mail-Vorlagen (16 Templates)

| Template | Ausloeser |
|----------|----------|
| **new_order_bereichsleiter** | Neue Bestellung eingereicht -> an zugewiesenen BL |
| **new_order_kommandant** | Neue Bestellung ueber KDT-Grenze -> an Kommandant |
| **new_order_kommandomitglied** | Kommando-Abstimmung angefordert -> an alle Kommandomitglieder |
| **approval** | Bereichsleiter-Freigabe -> an Ersteller |
| **final_approval** | Endgueltige Genehmigung -> an Ersteller |
| **rejection** | Ablehnung -> an Ersteller |
| **rejection_schriftfuehrer** | Ablehnung -> an Schriftfuehrer |
| **kommando_decision_kassier** | Kommando-Entscheidung -> an Kassier |
| **reset_to_draft** | Zuruecksetzung auf Entwurf -> an Ersteller |
| **new_user** | Neuer Benutzer angelegt -> an den neuen Benutzer |
| **password_reset** | Passwort zurueckgesetzt -> an Benutzer |
| **new_supplier_pending** | Neuer Lieferant wartet auf Genehmigung -> an Admins/KDT |
| **supplier_approved** | Lieferant genehmigt -> an Ersteller |
| **supplier_rejected** | Lieferant abgelehnt -> an Ersteller |
| **task_assigned** | Aufgabe zugewiesen -> an zugewiesenen Benutzer |
| **step_assigned** | Unterschritt zugewiesen -> an zugewiesenen Benutzer |

### 6.2 Template-Variablen

Jedes Template unterstuetzt verschiedene Variablen:
- `{{orderTitle}}` - Titel der Bestellung
- `{{recipientName}}` - Name des Empfaengers
- `{{creatorName}}` - Name des Erstellers
- `{{orderAmount}}` - Betrag der Bestellung
- `{{approverName}}` - Name des Genehmigenden
- `{{approverRole}}` - Rolle des Genehmigenden
- `{{rejectionReason}}` - Ablehnungsgrund
- `{{homepageUrl}}` - Link zur App
- `{{votingResults}}` - Abstimmungsergebnisse

### 6.3 Push-Benachrichtigungen

- **Aktivierung:** Pro Benutzer ueber Einstellungen oder Layout-Modal
- **Technologie:** Web Push API mit VAPID-Schluesseln
- **Service Worker:** Hintergrund-Empfang moeglich
- **Trigger:**
  - Freigabe-Erinnerungen (automatisch bei offenen Genehmigungen)
  - Direkte Nachrichten zwischen Benutzern
  - Neue Bestellungen zur Freigabe

### 6.4 Automatische Hintergrund-Jobs

| Job | Funktion |
|-----|----------|
| **send-approval-reminder** | Regelmaessige Erinnerung bei offenen Genehmigungen |
| **check-escalation** | Automatische Eskalation an Kommandant wenn Frist ablaeuft |

---

## 7. UI-Uebersicht (Seiten/Screens)

### 7.1 Haupt-Navigation

| Route | Seite | Beschreibung |
|-------|-------|-------------|
| `/` | Dashboard | Uebersicht mit ausstehenden Bestellungen, eigene Aufgaben, schnelle Aktionen |
| `/login` | Login | Anmeldung mit E-Mail und Passwort |
| `/bestellungen` | Bestellliste | Uebersicht aller (sichtbaren) Bestellungen mit Filter und Sortierung |
| `/bestellungen/neu` | Neue Bestellung | Formular fuer neue Bestellanforderung |
| `/bestellungen/:id` | Bestelldetail | Detailansicht mit Freigabe-/Ablehnungsaktionen, Verlauf, Anhaenge |
| `/lieferanten` | Lieferanten | Liste und Verwaltung von Lieferanten mit Kontakten und Dokumenten |
| `/aufgaben` | Aufgaben | Aufgabenverwaltung mit Kanban-Board, Gantt-Chart, Unterschritten |

### 7.2 Administrative Seiten

| Route | Seite | Zugriff |
|-------|-------|--------|
| `/einstellungen` | Einstellungen | Admin/Kommandant |
| `/benutzer` | Benutzerverwaltung | Admin/Kommandant |
| `/online-benutzer` | Online-Benutzer | Alle (konfigurierbar) |

### 7.3 Spezial-Seiten

| Route | Seite | Beschreibung |
|-------|-------|-------------|
| `/kassier` | Freigabenuebersicht | Kassierspezifische Uebersicht aller Freigaben |
| `/antragsformulare` | Antragsformulare | Veranstaltungsteilnahmen, Auszahlungen, Leihvertraege, Formular-Generator |
| `/ideen` | Ideen-Pool | Vorschlagswesen mit Abstimmung und Kommentaren |
| `/anleitung` | Anleitung | Hilfe und Dokumentation (rollenspezifisch) |
| `/benachrichtigungen` | Benachrichtigungen | In-App Benachrichtigungsuebersicht |

### 7.4 Einstellungen-Tabs

- **Allgemein:** Freigabebetraege, Eskalationsfristen
- **Benutzer:** Funktionszuweisung, Stellvertreter
- **E-Mail-Vorlagen:** Anpassung aller Benachrichtigungstexte
- **Lieferanten:** Bestelltage, Mindestbestellwerte
- **Leihgeraete:** Geraeteverwaltung, Berechtigungen
- **PDF:** Hintergrundbilder, Stempel

---

## 8. Technologie-Stack

### 8.1 Frontend

| Komponente | Technologie |
|------------|-------------|
| **Framework** | React 18 mit TypeScript |
| **Build-Tool** | Vite 6 |
| **Routing** | React Router v7 |
| **Styling** | Tailwind CSS v4 |
| **Icons** | Lucide React |
| **State Management** | React Context (Auth, Orders, Notifications) |
| **Rich Text Editor** | TipTap |
| **PDF-Generierung** | jsPDF |
| **Excel-Export** | xlsx |

### 8.2 Backend (Cloud Backend / Supabase)

| Komponente | Technologie |
|------------|-------------|
| **Datenbank** | PostgreSQL mit Row Level Security (RLS) |
| **Auth** | Supabase Auth |
| **Edge Functions** | Deno-basierte serverlose Funktionen |
| **Realtime** | Supabase Realtime fuer Live-Updates |
| **Storage** | Supabase Storage fuer Datei-Uploads |

### 8.3 Edge Functions (Serverless)

| Funktion | Zweck |
|----------|-------|
| `send-notification` | E-Mail-Versand fuer alle Benachrichtigungstypen |
| `send-push` | Web Push Benachrichtigungen |
| `send-approval-reminder` | Automatische Freigabe-Erinnerungen |
| `check-escalation` | Automatische Bestellungs-Eskalation |
| `send-credentials` | Zugangsdaten-Versand |
| `delete-user` | Benutzer-Loeschung |
| `generate-vapid` | VAPID-Schluessel-Generierung |

### 8.4 Externe Services

- **E-Mail-Versand:** Via Edge Function (SMTP-Konfiguration erforderlich)
- **Web Push API:** VAPID-basiert fuer Browser-Benachrichtigungen

---

## 9. Bekannte Einschraenkungen & offene Punkte

### 9.1 Aktuelle Einschraenkungen

- **Kein Offline-Modus:** App erfordert aktive Internetverbindung
- **E-Mail-Konfiguration:** SMTP-Einrichtung erforderlich fuer E-Mail-Versand
- **Push-Benachrichtigungen:** Nur im Browser (keine native mobile App)
- **Clipboard-API:** Wegen Sandbox-Einschraenkungen nicht verfuegbar (Fallback implementiert)

### 9.2 Geplante/moegliche Erweiterungen

- Erweiterte Filterung nach Sponsor/Sonderpreis bei Leihvertraegen
- Maengel-Historie pro Artikel mit Zeitstempel
- Separates Maengel-Tracking pro Mietvorgang vs. global
- Erweiterte Rollenkonzepte fuer Leihvertrags-Freigabe
- Mobile App (PWA-Erweiterung)
- Erweiterte Reporting-Funktionen
- Dashboard-Widgets konfigurierbar

### 9.3 Technische Schulden

- Einige grosse Komponenten koennten in kleinere Einheiten aufgeteilt werden
- Einheitlichere Error-Handling-Strategie empfohlen
- Mehr Unit-Tests fuer kritische Workflows wuenschenswert
- Teilweise redundanter Code in PDF-Generierungsfunktionen

---

## 10. Anhang: Wichtige Dateipfade

### 10.1 Kernkomponenten

```
src/
+-- App.tsx                          # Routing-Definition
+-- main.tsx                         # App-Einstiegspunkt
+-- providers.tsx                    # Context Provider
+-- theme.css                        # Design-Tokens
|
+-- contexts/
|   +-- AuthContext.tsx              # Authentifizierung & Rollen
|   +-- OrdersContext.tsx            # Bestellungs-Typen & State
|   +-- NotificationsContext.tsx     # Benachrichtigungs-Context
|
+-- hooks/
|   +-- useOrders.ts                 # Bestellungs-Logik (2400+ Zeilen)
|   +-- useSettings.ts               # Einstellungen & E-Mail-Templates
|   +-- useProfiles.ts               # Benutzerprofil-Management
|   +-- useSuppliers.ts              # Lieferanten-Logik
|   +-- useTasks.ts                  # Aufgaben-Management
|   +-- useRentalContracts.ts        # Leihvertraege
|   +-- ...
|
+-- pages/
|   +-- Index.tsx                    # Dashboard (2900+ Zeilen)
|   +-- Orders.tsx                   # Bestelluebersicht
|   +-- OrderDetail.tsx              # Bestelldetails
|   +-- NewOrder.tsx                 # Neue Bestellung
|   +-- Settings.tsx                 # Einstellungen (3400+ Zeilen)
|   +-- ...
|
+-- utils/
    +-- generateOrderPdf.ts          # Bestell-PDF
    +-- generateRentalContractPdf.ts # Leihvertrags-PDF
    +-- ...
```

### 10.2 Edge Functions

```
supabase/functions/
+-- send-notification/index.ts       # E-Mail-Versand (1200+ Zeilen)
+-- send-push/index.ts               # Push-Benachrichtigungen
+-- send-approval-reminder/index.ts  # Automatische Erinnerungen
+-- check-escalation/index.ts        # Eskalations-Pruefung
+-- send-credentials/index.ts        # Zugangsdaten-Versand
+-- delete-user/index.ts             # Benutzer-Loeschung
+-- generate-vapid/index.ts          # VAPID-Schluessel
```

---

*Dokumentation erstellt mit Sticklight Coding Agent*
*ASCII-Version ohne Sonderzeichen fuer maximale Kompatibilitaet*
