import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';

export interface BeschlussRegister {
  id: string;
  beschluss_nummer: string;
  jahr: number;
  typ: 'umlauf' | 'sitzung' | 'banf';
  titel: string;
  beschreibung: string | null;
  betrag: number | null;
  status: 'offen' | 'in_abstimmung' | 'genehmigt' | 'abgelehnt' | 'ausstehend' | 'aufgehoben' | 'abgelaufen';
  abstimmung_ja: number | null;
  abstimmung_nein: number | null;
  abstimmung_enthaltung: number | null;
  meeting_id: string | null;
  meeting_decision_id: string | null;
  command_decision_id: string | null;
  command_decision_item_id: string | null;
  order_id: string | null;
  erstellt_von: string | null;
  erstellt_am: string;
  genehmigt_von: string | null;
  genehmigt_am: string | null;
  bestaetigt_in_sitzung_am: string | null;
  pdf_url: string | null;
  pdf_generated_at: string | null;
  created_at: string;
  updated_at: string;
  // Aufhebung und Ablauf
  gueltig_bis: string | null;
  aufgehoben_durch_id: string | null;
  hebt_auf_id: string | null;
  aufgehoben_am: string | null;
  aufhebung_notiz: string | null;
  // Sichtbarkeit
  nur_kommando: boolean;
  // Joined fields
  ersteller_name?: string;
  genehmiger_name?: string;
  meeting_title?: string;
  aufgehoben_durch_nummer?: string;
  hebt_auf_nummer?: string;
}

export interface BeschlussHistorie {
  id: string;
  beschluss_id: string;
  aktion: string;
  von_status: string | null;
  nach_status: string | null;
  durchgefuehrt_von: string | null;
  durchgefuehrt_am: string;
  notizen: string | null;
  zusatz_daten: Record<string, unknown> | null;
  // Joined
  durchgefuehrt_von_name?: string;
}

export interface BeschlussStats {
  gesamt: number;
  genehmigt: number;
  abgelehnt: number;
  inAbstimmung: number;
  ausstehend: number;
  aufgehoben: number;
  abgelaufen: number;
  baldAblaufend: number; // Innerhalb 30 Tagen
  finanzvolumen: number;
  gesamtJahr: number;
  genehmigtJahr: number;
}

export function useBeschlussRegister() {
  const { user } = useAuth();
  const { effectiveProfile, effectiveIsAdmin, effectiveIsKommandant, effectiveHasKommandomitgliedFunction } = useSimulation();
  const profile = effectiveProfile;
  const isAdmin = effectiveIsAdmin;
  const isKommandant = effectiveIsKommandant;
  const [beschluesse, setBeschluesse] = useState<BeschlussRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profileFunctionsLower = profile?.functions?.map(f => f.toLowerCase()) || [];
  const hasSchriftfuehrerFunction = profileFunctionsLower.includes('schriftfuehrer');
  const hasKommandomitgliedFunction = effectiveHasKommandomitgliedFunction || profileFunctionsLower.includes('kommandomitglied');
  const canManage = isAdmin || isKommandant || hasSchriftfuehrerFunction;
  const canCreate = canManage || hasKommandomitgliedFunction;
  
  // Ist Kommandomitglied (für nur_kommando Filter)
  const istKommandomitglied = isAdmin || isKommandant || hasSchriftfuehrerFunction || hasKommandomitgliedFunction ||
    ['kassier', 'bereichsleiter'].includes(profile?.role || '') ||
    profileFunctionsLower.includes('erweitertes_kommando');

  const fetchBeschluesse = useCallback(async () => {
    if (!supabase || !user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('beschluss_register')
        .select('*')
        .order('erstellt_am', { ascending: false });

      if (fetchError) throw fetchError;

      // Lade Profile für Namen
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p.full_name]));

      // Lade Meetings für Titel
      const meetingIds = (data || []).filter(d => d.meeting_id).map(d => d.meeting_id);
      let meetingsMap = new Map<string, string>();
      if (meetingIds.length > 0) {
        const { data: meetingsData } = await supabase
          .from('meetings')
          .select('id, title, meeting_number')
          .in('id', meetingIds);
        meetingsMap = new Map((meetingsData || []).map(m => [m.id, m.title || m.meeting_number]));
      }

      // Map für Beschlussnummern (für Aufhebungs-Verknüpfungen)
      const beschlussMap = new Map((data || []).map(b => [b.id, b.beschluss_nummer]));

      const formattedData: BeschlussRegister[] = (data || []).map((b) => ({
        ...b,
        ersteller_name: profilesMap.get(b.erstellt_von || '') || 'Unbekannt',
        genehmiger_name: b.genehmigt_von ? profilesMap.get(b.genehmigt_von) || undefined : undefined,
        meeting_title: b.meeting_id ? meetingsMap.get(b.meeting_id) || undefined : undefined,
        aufgehoben_durch_nummer: b.aufgehoben_durch_id ? beschlussMap.get(b.aufgehoben_durch_id) || undefined : undefined,
        hebt_auf_nummer: b.hebt_auf_id ? beschlussMap.get(b.hebt_auf_id) || undefined : undefined,
      }));

      setBeschluesse(formattedData);
    } catch (err) {
      console.error('Error fetching Beschlüsse:', err);
      setError('Fehler beim Laden der Beschlüsse');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Automatische Ablauf-Prüfung: Status aktualisieren und Erinnerungen senden
  const checkAndUpdateExpiredBeschluesse = useCallback(async () => {
    if (!supabase || !user || !canManage) return;

    try {
      const heute = new Date();
      heute.setHours(0, 0, 0, 0);
      const heuteStr = heute.toISOString().split('T')[0];

      // Finde abgelaufene Beschlüsse die noch Status 'genehmigt' haben
      const { data: abgelaufene, error: fetchError } = await supabase
        .from('beschluss_register')
        .select('id, beschluss_nummer, titel')
        .eq('status', 'genehmigt')
        .lt('gueltig_bis', heuteStr);

      if (fetchError) {
        console.error('Error checking expired Beschlüsse:', fetchError);
        return;
      }

      // Status auf 'abgelaufen' setzen
      for (const b of abgelaufene || []) {
        await supabase
          .from('beschluss_register')
          .update({ status: 'abgelaufen' })
          .eq('id', b.id);

        // Historie-Eintrag
        await supabase.from('beschluss_historie').insert({
          beschluss_id: b.id,
          aktion: 'abgelaufen',
          von_status: 'genehmigt',
          nach_status: 'abgelaufen',
          durchgefuehrt_von: user.id,
          notizen: 'Automatisch als abgelaufen markiert (Gültigkeitsdatum überschritten)',
        });
      }

      if ((abgelaufene || []).length > 0) {
        console.log(`${abgelaufene?.length} Beschlüsse automatisch als abgelaufen markiert`);
      }
    } catch (err) {
      console.error('Error in checkAndUpdateExpiredBeschluesse:', err);
    }
  }, [user, canManage]);

  useEffect(() => {
    fetchBeschluesse();
  }, [fetchBeschluesse]);

  // Ablauf-Prüfung nach dem Laden
  useEffect(() => {
    if (!loading && beschluesse.length > 0 && canManage) {
      checkAndUpdateExpiredBeschluesse();
    }
  }, [loading, beschluesse.length, canManage, checkAndUpdateExpiredBeschluesse]);

  // Funktion zum Senden von Erinnerungen für bald ablaufende Beschlüsse
  const sendAblaufErinnerungen = useCallback(async () => {
    if (!supabase || !user || !canManage) return { error: new Error('Keine Berechtigung') };

    try {
      // Prüfe ob heute schon Erinnerungen gesendet wurden
      const lastSent = localStorage.getItem('beschluss_ablauf_erinnerung_gesendet');
      const heute = new Date().toISOString().split('T')[0];
      if (lastSent === heute) {
        return { sent: 0, message: 'Erinnerungen wurden heute bereits gesendet' };
      }

      // Finde bald ablaufende Beschlüsse (30 Tage)
      const in30Tagen = new Date();
      in30Tagen.setDate(in30Tagen.getDate() + 30);

      const { data: baldAblaufend, error: fetchError } = await supabase
        .from('beschluss_register')
        .select('id, beschluss_nummer, titel, gueltig_bis')
        .eq('status', 'genehmigt')
        .gt('gueltig_bis', heute)
        .lte('gueltig_bis', in30Tagen.toISOString().split('T')[0]);

      if (fetchError) throw fetchError;
      if (!baldAblaufend || baldAblaufend.length === 0) {
        return { sent: 0, message: 'Keine bald ablaufenden Beschlüsse' };
      }

      // Hole Kommandomitglieder
      const { data: kommandomitglieder } = await supabase
        .from('profiles')
        .select('id, email, full_name, functions')
        .not('functions', 'is', null);

      const empfaenger = (kommandomitglieder || []).filter(p => 
        p.functions?.includes('kommandomitglied') || 
        p.functions?.includes('kommandant') ||
        p.functions?.includes('schriftfuehrer')
      );

      if (empfaenger.length === 0) {
        return { sent: 0, message: 'Keine Empfänger gefunden' };
      }

      // Erstelle E-Mail-Inhalt
      const beschlussListe = baldAblaufend.map(b => 
        `• ${b.beschluss_nummer}: ${b.titel} (läuft ab am ${new Date(b.gueltig_bis!).toLocaleDateString('de-AT')})`
      ).join('\n');

      // Sende E-Mails
      for (const p of empfaenger) {
        if (!p.email) continue;

        await supabase.functions.invoke('send-email', {
          body: {
            to: p.email,
            subject: `⚠️ ${baldAblaufend.length} Beschlüsse laufen bald ab`,
            html: `
              <h2>Erinnerung: Bald ablaufende Beschlüsse</h2>
              <p>Hallo ${p.full_name || 'Kommandomitglied'},</p>
              <p>Folgende Beschlüsse laufen in den nächsten 30 Tagen ab:</p>
              <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${beschlussListe}</pre>
              <p>Bitte prüfe, ob diese Beschlüsse verlängert oder durch neue ersetzt werden müssen.</p>
              <p>Mit kameradschaftlichen Grüßen,<br>Dein FFM-Portal</p>
            `
          }
        });
      }

      // Historie-Einträge
      for (const b of baldAblaufend) {
        await supabase.from('beschluss_historie').insert({
          beschluss_id: b.id,
          aktion: 'erinnerung_gesendet',
          durchgefuehrt_von: user.id,
          notizen: `Ablauf-Erinnerung an ${empfaenger.length} Kommandomitglied(er) gesendet`,
        });
      }

      localStorage.setItem('beschluss_ablauf_erinnerung_gesendet', heute);
      return { sent: empfaenger.length, beschluesse: baldAblaufend.length };
    } catch (err) {
      console.error('Error sending Ablauf-Erinnerungen:', err);
      return { error: err as Error };
    }
  }, [user, canManage]);

  // Hilfsfunktion: Prüft ob Beschluss bald abläuft (innerhalb 30 Tagen)
  const isBaldAblaufend = (b: BeschlussRegister): boolean => {
    if (!b.gueltig_bis || b.status === 'aufgehoben' || b.status === 'abgelaufen') return false;
    const ablaufDatum = new Date(b.gueltig_bis);
    const heute = new Date();
    const in30Tagen = new Date();
    in30Tagen.setDate(in30Tagen.getDate() + 30);
    return ablaufDatum > heute && ablaufDatum <= in30Tagen;
  };

  // Hilfsfunktion: Prüft ob Beschluss abgelaufen ist
  const isAbgelaufen = (b: BeschlussRegister): boolean => {
    if (!b.gueltig_bis || b.status === 'aufgehoben') return false;
    return new Date(b.gueltig_bis) < new Date();
  };

  // Statistiken berechnen - basierend auf tatsächlichen Stimmen
  const stats: BeschlussStats = {
    gesamt: beschluesse.length,
    genehmigt: beschluesse.filter(b => {
      const ja = b.abstimmung_ja || 0;
      const nein = b.abstimmung_nein || 0;
      return (b.status === 'genehmigt' || ja > nein) && !isAbgelaufen(b) && b.status !== 'aufgehoben';
    }).length,
    abgelehnt: beschluesse.filter(b => {
      const ja = b.abstimmung_ja || 0;
      const nein = b.abstimmung_nein || 0;
      return b.status === 'abgelehnt' || nein > ja;
    }).length,
    inAbstimmung: beschluesse.filter(b => b.status === 'in_abstimmung' || b.status === 'offen').length,
    ausstehend: beschluesse.filter(b => b.status === 'ausstehend').length,
    aufgehoben: beschluesse.filter(b => b.status === 'aufgehoben').length,
    abgelaufen: beschluesse.filter(b => b.status === 'abgelaufen' || isAbgelaufen(b)).length,
    baldAblaufend: beschluesse.filter(b => isBaldAblaufend(b)).length,
    finanzvolumen: beschluesse
      .filter(b => b.status === 'genehmigt' && b.betrag && !isAbgelaufen(b))
      .reduce((sum, b) => sum + (b.betrag || 0), 0),
    gesamtJahr: beschluesse.filter(b => b.jahr === new Date().getFullYear()).length,
    genehmigtJahr: beschluesse.filter(b => b.jahr === new Date().getFullYear() && b.status === 'genehmigt').length,
  };

  // Nächste Beschlussnummer generieren (für ein bestimmtes Jahr)
  const generateBeschlussNummerForYear = useCallback(async (year: number): Promise<string> => {
    if (!supabase) return '';

    const prefix = 'KB';

    // Hole alle existierenden Nummern für dieses Jahr
    // Aus beschluss_register
    const { data: registerData } = await supabase
      .from('beschluss_register')
      .select('beschluss_nummer')
      .ilike('beschluss_nummer', `${prefix}-${year}-%`);

    // Aus command_decisions (KA-Format)
    const { data: commandData } = await supabase
      .from('command_decisions')
      .select('reference_number')
      .ilike('reference_number', `KA-${year}-%`);

    // Sammle alle verwendeten Nummern
    const usedNumbers = new Set<number>();
    
    (registerData || []).forEach(r => {
      const match = r.beschluss_nummer.match(/-(\d{4})$/); // KB-2025-0001
      if (match) usedNumbers.add(parseInt(match[1], 10));
    });

    (commandData || []).forEach(c => {
      const match = c.reference_number.match(/-(\d{4})$/); // KA-2025-0001
      if (match) usedNumbers.add(parseInt(match[1], 10));
    });

    // Finde die nächste freie Nummer
    let nextNum = 1;
    while (usedNumbers.has(nextNum)) {
      nextNum++;
    }

    return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
  }, []);

  // Nächste Beschlussnummer generieren (aktuelles Jahr)
  const generateBeschlussNummer = useCallback(async (): Promise<string> => {
    if (!supabase) return '';

    const currentYear = new Date().getFullYear();
    const prefix = 'KB';

    // Hole alle existierenden Nummern für dieses Jahr
    // Aus beschluss_register
    const { data: registerData } = await supabase
      .from('beschluss_register')
      .select('beschluss_nummer')
      .ilike('beschluss_nummer', `${prefix}-${currentYear}-%`);

    // Aus command_decisions (KA-Format)
    const { data: commandData } = await supabase
      .from('command_decisions')
      .select('reference_number')
      .ilike('reference_number', `KA-${currentYear}-%`);

    // Sammle alle verwendeten Nummern
    const usedNumbers = new Set<number>();
    
    (registerData || []).forEach(r => {
      const match = r.beschluss_nummer.match(/-(\d{4})$/); // KB-2025-0001
      if (match) usedNumbers.add(parseInt(match[1], 10));
    });

    (commandData || []).forEach(c => {
      const match = c.reference_number.match(/-(\d{4})$/); // KA-2025-0001
      if (match) usedNumbers.add(parseInt(match[1], 10));
    });

    // Finde die nächste freie Nummer
    let nextNum = 1;
    while (usedNumbers.has(nextNum)) {
      nextNum++;
    }

    return `${prefix}-${currentYear}-${String(nextNum).padStart(4, '0')}`;
  }, []);

  // Beschluss erstellen
  const createBeschluss = useCallback(async (data: {
    typ: 'umlauf' | 'sitzung' | 'banf';
    titel: string;
    beschreibung?: string;
    betrag?: number;
    status?: BeschlussRegister['status'];
    meeting_id?: string;
    meeting_decision_id?: string;
    command_decision_id?: string;
    command_decision_item_id?: string;
    order_id?: string;
    abstimmung_ja?: number;
    abstimmung_nein?: number;
    abstimmung_enthaltung?: number;
    genehmigt_von?: string;
    genehmigt_am?: string;
    bestaetigt_in_sitzung_am?: string;
  }) => {
    if (!supabase || !user || !canCreate) {
      return { data: null, error: new Error('Keine Berechtigung') };
    }

    try {
      const beschlussNummer = await generateBeschlussNummer();

      const { data: newBeschluss, error: insertError } = await supabase
        .from('beschluss_register')
        .insert({
          beschluss_nummer: beschlussNummer,
          jahr: new Date().getFullYear(),
          typ: data.typ,
          titel: data.titel,
          beschreibung: data.beschreibung || null,
          betrag: data.betrag || null,
          status: data.status || 'offen',
          erstellt_von: user.id,
          meeting_id: data.meeting_id || null,
          meeting_decision_id: data.meeting_decision_id || null,
          command_decision_id: data.command_decision_id || null,
          command_decision_item_id: data.command_decision_item_id || null,
          order_id: data.order_id || null,
          abstimmung_ja: data.abstimmung_ja || 0,
          abstimmung_nein: data.abstimmung_nein || 0,
          abstimmung_enthaltung: data.abstimmung_enthaltung || 0,
          genehmigt_von: data.genehmigt_von || null,
          genehmigt_am: data.genehmigt_am || null,
          bestaetigt_in_sitzung_am: data.bestaetigt_in_sitzung_am || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Historie eintrag
      await supabase.from('beschluss_historie').insert({
        beschluss_id: newBeschluss.id,
        aktion: 'erstellt',
        nach_status: data.status || 'offen',
        durchgefuehrt_von: user.id,
      });

      await fetchBeschluesse();
      return { data: newBeschluss, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [user, canCreate, generateBeschlussNummer, fetchBeschluesse]);

  // Historischen Beschluss erstellen (für manuelle Nachträge)
  const createHistorischenBeschluss = useCallback(async (data: {
    jahr: number;
    typ: 'umlauf' | 'sitzung' | 'banf';
    titel: string;
    beschreibung?: string;
    betrag?: number;
    status: 'genehmigt' | 'abgelehnt';
    beschlussDatum: string; // ISO date string
    abstimmung_ja?: number;
    abstimmung_nein?: number;
    abstimmung_enthaltung?: number;
    gueltig_bis?: string;
    anmerkungen?: string;
  }) => {
    if (!supabase || !user || !canCreate) {
      return { data: null, error: new Error('Keine Berechtigung') };
    }

    try {
      // Generiere Nummer für das angegebene Jahr
      const beschlussNummer = await generateBeschlussNummerForYear(data.jahr);

      const { data: newBeschluss, error: insertError } = await supabase
        .from('beschluss_register')
        .insert({
          beschluss_nummer: beschlussNummer,
          jahr: data.jahr,
          typ: data.typ,
          titel: data.titel,
          beschreibung: data.beschreibung || null,
          betrag: data.betrag || null,
          status: data.status,
          erstellt_von: user.id,
          erstellt_am: data.beschlussDatum,
          genehmigt_am: data.status === 'genehmigt' ? data.beschlussDatum : null,
          abstimmung_ja: data.abstimmung_ja || 0,
          abstimmung_nein: data.abstimmung_nein || 0,
          abstimmung_enthaltung: data.abstimmung_enthaltung || 0,
          gueltig_bis: data.gueltig_bis || null,
          ist_historisch: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Historie-Eintrag
      await supabase.from('beschluss_historie').insert({
        beschluss_id: newBeschluss.id,
        aktion: 'erstellt',
        nach_status: data.status,
        durchgefuehrt_von: user.id,
        notizen: `Historischer Beschluss manuell nachgetragen${data.anmerkungen ? ': ' + data.anmerkungen : ''}`,
      });

      await fetchBeschluesse();
      return { data: newBeschluss, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [user, canCreate, generateBeschlussNummerForYear, fetchBeschluesse]);

  // Beschluss aktualisieren
  const updateBeschluss = useCallback(async (
    id: string,
    updates: Partial<BeschlussRegister>,
    historieDaten?: { aktion: string; notizen?: string }
  ) => {
    if (!supabase || !user || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const currentBeschluss = beschluesse.find(b => b.id === id);

      const { error: updateError } = await supabase
        .from('beschluss_register')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Historie eintrag wenn gewünscht
      if (historieDaten) {
        await supabase.from('beschluss_historie').insert({
          beschluss_id: id,
          aktion: historieDaten.aktion,
          von_status: currentBeschluss?.status,
          nach_status: updates.status || currentBeschluss?.status,
          durchgefuehrt_von: user.id,
          notizen: historieDaten.notizen,
        });
      }

      await fetchBeschluesse();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [user, canManage, beschluesse, fetchBeschluesse]);

  // Historie laden
  const fetchHistorie = useCallback(async (beschlussId: string): Promise<BeschlussHistorie[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('beschluss_historie')
      .select('*')
      .eq('beschluss_id', beschlussId)
      .order('durchgefuehrt_am', { ascending: false });

    if (error) {
      console.error('Error fetching historie:', error);
      return [];
    }

    // Lade Profile für Namen
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name');
    
    const profilesMap = new Map((profilesData || []).map(p => [p.id, p.full_name]));

    return (data || []).map(h => ({
      ...h,
      durchgefuehrt_von_name: h.durchgefuehrt_von ? profilesMap.get(h.durchgefuehrt_von) || 'Unbekannt' : undefined,
    }));
  }, []);

  // PDF URL setzen
  const setPdfUrl = useCallback(async (id: string, pdfUrl: string) => {
    if (!supabase || !user) return { error: new Error('Nicht angemeldet') };

    try {
      const { error } = await supabase
        .from('beschluss_register')
        .update({
          pdf_url: pdfUrl,
          pdf_generated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Historie
      await supabase.from('beschluss_historie').insert({
        beschluss_id: id,
        aktion: 'pdf_erstellt',
        durchgefuehrt_von: user.id,
      });

      await fetchBeschluesse();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [user, fetchBeschluesse]);

  // Beschluss aufheben (durch einen neuen Beschluss)
  const aufhebenBeschluss = useCallback(async (
    alterBeschlussId: string,
    neuerBeschlussId: string,
    notiz?: string
  ) => {
    if (!supabase || !user || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const aufgehobenAm = new Date().toISOString();

      // Alten Beschluss als aufgehoben markieren
      const { error: updateAlterError } = await supabase
        .from('beschluss_register')
        .update({
          status: 'aufgehoben',
          aufgehoben_durch_id: neuerBeschlussId,
          aufgehoben_am: aufgehobenAm,
          aufhebung_notiz: notiz || null,
        })
        .eq('id', alterBeschlussId);

      if (updateAlterError) throw updateAlterError;

      // Neuen Beschluss mit Referenz zum aufgehobenen verknüpfen
      const { error: updateNeuerError } = await supabase
        .from('beschluss_register')
        .update({
          hebt_auf_id: alterBeschlussId,
        })
        .eq('id', neuerBeschlussId);

      if (updateNeuerError) throw updateNeuerError;

      // Historie-Eintrag für alten Beschluss
      const neuerBeschluss = beschluesse.find(b => b.id === neuerBeschlussId);
      await supabase.from('beschluss_historie').insert({
        beschluss_id: alterBeschlussId,
        aktion: 'aufgehoben',
        von_status: 'genehmigt',
        nach_status: 'aufgehoben',
        durchgefuehrt_von: user.id,
        notizen: `Aufgehoben durch ${neuerBeschluss?.beschluss_nummer || 'neuen Beschluss'}${notiz ? ': ' + notiz : ''}`,
      });

      await fetchBeschluesse();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [user, canManage, beschluesse, fetchBeschluesse]);

  // Liste der gültigen Beschlüsse für Dropdown (zum Aufheben)
  const gueltigeBeschluesse = beschluesse.filter(b => 
    b.status === 'genehmigt' && 
    !b.aufgehoben_durch_id &&
    (!b.gueltig_bis || new Date(b.gueltig_bis) >= new Date())
  );

  // Gefilterte Beschlüsse (nur_kommando für Nicht-Kommandomitglieder ausblenden)
  const sichtbareBeschluesse = istKommandomitglied 
    ? beschluesse 
    : beschluesse.filter(b => !b.nur_kommando);

  // Funktion zum Aktualisieren von nur_kommando
  const updateNurKommando = useCallback(async (beschlussId: string, nurKommando: boolean) => {
    if (!supabase || !user) return { error: new Error('Nicht authentifiziert') };
    if (!isAdmin && !isKommandant) return { error: new Error('Keine Berechtigung') };

    try {
      const { error: updateError } = await supabase
        .from('beschluss_register')
        .update({ nur_kommando: nurKommando })
        .eq('id', beschlussId);

      if (updateError) throw updateError;

      // Lokalen State aktualisieren
      setBeschluesse(prev => prev.map(b => 
        b.id === beschlussId ? { ...b, nur_kommando: nurKommando } : b
      ));

      return { error: null };
    } catch (err) {
      console.error('Error updating nur_kommando:', err);
      return { error: err as Error };
    }
  }, [user, isAdmin, isKommandant]);

  // Prüfe ob Beschluss gültig ist
  const isBeschlussGueltig = useCallback((beschlussId: string): boolean => {
    const b = beschluesse.find(x => x.id === beschlussId);
    if (!b) return false;
    if (b.status === 'aufgehoben' || b.status === 'abgelaufen') return false;
    if (b.gueltig_bis && new Date(b.gueltig_bis) < new Date()) return false;
    return b.status === 'genehmigt';
  }, [beschluesse]);

  return {
    beschluesse: sichtbareBeschluesse,
    alleBeschluesse: beschluesse,
    gueltigeBeschluesse,
    loading,
    error,
    stats,
    canManage,
    canCreate,
    istKommandomitglied,
    isAdmin,
    isKommandant,
    fetchBeschluesse,
    generateBeschlussNummer,
    generateBeschlussNummerForYear,
    createBeschluss,
    createHistorischenBeschluss,
    updateBeschluss,
    updateNurKommando,
    fetchHistorie,
    setPdfUrl,
    aufhebenBeschluss,
    isBeschlussGueltig,
  };
}
