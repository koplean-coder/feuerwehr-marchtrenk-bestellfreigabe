# FF Marchtrenk – Veranstaltungsplaner

> **Status:** Geplant (noch nicht implementiert)  
> **Priorität:** Nächstes größeres Feature  
> **Erstellt:** 2025

---

## Übersicht

Web-App zur Planung und Nachverfolgung von Veranstaltungen der Freiwilligen Feuerwehr Marchtrenk (Weihnachtsfeiern, Übungsabende, Florianitag, Kommandositzungen usw.).

**Kernidee:** Veranstaltung anlegen, Checkliste (aus Vorlage oder leer) erstellen, Aufgaben mit Zuständigen versehen, Fortschritt und Zeitschiene im Blick behalten.

---

## 1. Nutzerrollen

| Rolle | Rechte |
|-------|--------|
| **Admin** | Volle Rechte. Verwaltet Mitglieder/Zugänge, Rollen, Vorlagen, sieht alles inkl. Archiv und Aktivitätsprotokoll. |
| **Organisator** | Kann Veranstaltungen und Checklisten anlegen/bearbeiten, Zuständigkeiten vergeben, Vorlagen nutzen (aber nicht verwalten). |
| **Mitglied** | Sieht alle Veranstaltungen (lesend), kann eigene zugewiesene Aufgaben abhaken/kommentieren, sieht "Meine Aufgaben". |

Login per bestehendes Auth-System. Konten werden ausschließlich vom Admin angelegt (keine Selbstregistrierung).

---

## 2. Architektur (Integration mit Todo-System)

```
┌─────────────────────────────────────────────────────────────┐
│                    VERANSTALTUNGSPLANER                      │
│                    (Neues Modul "events")                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐      ┌──────────────────────────────────┐ │
│   │   EVENTS    │      │     BESTEHENDE TODO-LISTE        │ │
│   │             │      │                                  │ │
│   │ - Titel     │      │  todo_tasks                      │ │
│   │ - Datum     │ ───► │  + event_id (NEU)                │ │
│   │ - Ort       │      │  + parent_task_id (NEU)          │ │
│   │ - Status    │      │                                  │ │
│   │ - Vorlage   │      │  Nutzt alles was schon da ist:   │ │
│   └─────────────┘      │  ✓ Zuweisungen (assigned_to)     │ │
│                        │  ✓ Tags                          │ │
│   ┌─────────────┐      │  ✓ Priorität                     │ │
│   │  VORLAGEN   │      │  ✓ Kommentare                    │ │
│   │             │      │  ✓ Anhänge                       │ │
│   │ Struktur    │      │  ✓ Fälligkeitsdaten              │ │
│   │ speichern   │      │  ✓ "Meine Aufgaben" View         │ │
│   └─────────────┘      └──────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Vorteile dieser Integration

- **"Meine Aufgaben"** — Event-Aufgaben erscheinen automatisch in der Todo-Liste
- **Keine Dopplung** — Keine parallele Infrastruktur für Aufgaben
- **Alle Features gratis** — Tags, Priorität, Kommentare, Anhänge bereits da
- **Unbegrenzte Verschachtelung** — Neu: `parent_task_id` statt nur Steps
- **Modul-Berechtigungen** — Administrierbar wie andere Module

---

## 3. Datenmodell

### Neue Tabellen

```sql
-- Veranstaltungen
planner_events (
  id UUID PRIMARY KEY,
  titel TEXT NOT NULL,
  typ TEXT, -- z.B. Weihnachtsfeier, Übung, Sitzung
  datum_start TIMESTAMPTZ,
  datum_ende TIMESTAMPTZ,
  ort TEXT,
  status TEXT DEFAULT 'geplant', -- geplant/läuft/abgeschlossen/archiviert
  wiederkehrend BOOLEAN DEFAULT false,
  wiederholungsintervall TEXT, -- z.B. 'jährlich'
  template_id UUID REFERENCES planner_templates,
  erstellt_von UUID REFERENCES profiles,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Vorlagen
planner_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  beschreibung TEXT,
  basiert_auf_event_id UUID REFERENCES planner_events,
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Vorlagen-Punkte (Struktur ohne Status/Zuweisungen)
planner_template_items (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES planner_templates ON DELETE CASCADE,
  parent_item_id UUID REFERENCES planner_template_items,
  titel TEXT NOT NULL,
  beschreibung TEXT,
  reihenfolge INTEGER DEFAULT 0,
  relative_tage_vor_event INTEGER, -- z.B. -14 = 2 Wochen vorher
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Aktivitätsprotokoll
planner_activity_log (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES planner_events ON DELETE CASCADE,
  user_id UUID REFERENCES profiles,
  aktion TEXT NOT NULL, -- z.B. "Status geändert", "Punkt hinzugefügt"
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### Erweiterung todo_tasks

```sql
ALTER TABLE todo_tasks ADD COLUMN event_id UUID REFERENCES planner_events;
ALTER TABLE todo_tasks ADD COLUMN parent_task_id UUID REFERENCES todo_tasks;
CREATE INDEX idx_todo_tasks_event_id ON todo_tasks(event_id);
CREATE INDEX idx_todo_tasks_parent_task_id ON todo_tasks(parent_task_id);
```

---

## 4. Kernfunktionen

### Phase 1 (MVP)

- [ ] Login/Rollen (nutzt bestehendes Auth)
- [ ] Veranstaltungen anlegen/bearbeiten/löschen
- [ ] Verschachtelte Checkliste mit mehreren Zuständigen
- [ ] Listenansicht (auf-/zuklappbar)
- [ ] "Meine Aufgaben" (gefiltert auf eigene Event-Aufgaben)
- [ ] Modul-Administration (aktivierbar in Einstellungen)

### Phase 2

- [ ] Vorlagen erstellen/bearbeiten/nutzen
- [ ] Gantt-Ansicht mit Kalenderwochen
- [ ] Admin-Bereich (Vorlagenverwaltung, Aktivitätsprotokoll)
- [ ] Dashboard mit Fortschrittsbalken

### Phase 3

- [ ] Kommentare pro Checklistenpunkt
- [ ] Dateianhänge pro Punkt
- [ ] Aktivitätsprotokoll anzeigen
- [ ] Archiv-Ansicht

### Phase 4

- [ ] E-Mail-Benachrichtigungen bei Zuweisung
- [ ] Erinnerungen X Tage vor Frist
- [ ] Wiederkehrende Veranstaltungen
- [ ] PDF-Export der Checkliste
- [ ] PWA-Optimierung

---

## 5. Ansichten

### Dashboard
- Kachelübersicht aller laufenden Veranstaltungen
- Fortschrittsbalken pro Event
- Quick-Links zu "Meine Aufgaben"

### Listenansicht (Checkliste)
- Klassische Checkliste mit auf-/zuklappbaren Unterpunkten
- Drag & Drop zum Sortieren
- Inline-Bearbeitung
- Status-Badges (Offen/In Arbeit/Erledigt/Überfällig)

### Gantt-Ansicht
- Balken pro Punkt über Zeitraum
- Kalenderwochen horizontal
- Heutiges Datum als Linie
- Farbe nach Status
- Hauptpunkte zusammengefasst/aufklappbar

### "Meine Aufgaben"
- Flache Liste aller zugewiesenen Punkte (alle Events)
- Sortiert nach Frist/Dringlichkeit
- Filter: nur offene, nur überfällige, nach Veranstaltung

---

## 6. Design/Branding

- **Farben FF Marchtrenk CI:** Rot `#dc2626`, Anthrazit `#2E2E32`
- **Statusfarben:**
  - Grün = erledigt
  - Gelb/Orange = in Arbeit  
  - Rot = überfällig
  - Grau = offen
- Klar, aufgeräumt, wenig Schnickschnack
- Responsive für Handy und Desktop

---

## 7. Neue Routen

```
/veranstaltungen              → Dashboard/Übersicht
/veranstaltungen/neu          → Neue Veranstaltung
/veranstaltungen/:id          → Event-Detail mit Checkliste
/veranstaltungen/:id/gantt    → Gantt-Ansicht
/veranstaltungen/vorlagen     → Vorlagenverwaltung (Admin)
/veranstaltungen/archiv       → Archivierte Events
```

---

## 8. Zusätzliche Ideen

- **Kalenderansicht** — Alle Events im Monatskalender
- **Quick-Actions** — Wisch-Gesten am Handy zum schnellen Abhaken
- **Erinnerungen pro Punkt** — Individuell einstellbar
- **Fortschritts-Historie** — Graph wie sich Fortschritt entwickelt
- **Delegation** — Zuständiger kann Aufgabe weitergeben
- **Abhängigkeiten** — "Punkt B kann erst starten wenn A erledigt ist"

---

## 9. Technische Notizen

### Bestehende Infrastruktur nutzen

- ✅ Auth-System (Supabase Auth)
- ✅ Profile/Rollen (`profiles.functions`)
- ✅ Push-Benachrichtigungen (`send-push` Edge Function)
- ✅ PWA (bereits konfiguriert)
- ✅ Datei-Upload (Storage-Pattern)
- ✅ Todo-System (`todo_tasks`, `todo_tags`, etc.)
- ✅ Modul-Berechtigungen (`useModulePermissions`)

### Hooks zu erstellen

- `usePlannerEvents` — CRUD für Events
- `usePlannerTemplates` — Vorlagenverwaltung
- `usePlannerActivityLog` — Aktivitätsprotokoll
- Erweiterung `useTodoTasks` — Filter nach `event_id`

---

**Zuletzt aktualisiert:** Bei Implementierung anpassen
