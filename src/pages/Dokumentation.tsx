import { useState } from 'react';
import { Layout } from '@/components/Layout';
import {
  FileText, Download, Package, CreditCard, Calendar, Users, Vote,
  Lightbulb, ClipboardList, Settings, ArrowRight, CheckCircle, Clock,
  Send, UserCheck, Banknote, AlertTriangle, Shield, ChevronDown, ChevronUp,
  Truck, FileCheck, Mail, Bell, Smartphone } from
'lucide-react';
import jsPDF from 'jspdf';

interface WorkflowStep {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface Module {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

export default function Dokumentation() {
  const [expandedSection, setExpandedSection] = useState<string | null>('module');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const modules: Module[] = [
  {
    id: 'bestellungen',
    name: 'Bestellungen',
    description: 'Bestellanforderungen mit mehrstufigem Genehmigungsworkflow',
    icon: <Package className="w-5 h-5" />,
    color: 'bg-blue-500',
    features: [
    'Bestellung erstellen mit Lieferant, Menge, Preis',
    'Automatische Weiterleitung an Bereichsleiter',
    'Kommandant-Genehmigung bei hohen Beträgen',
    'Status-Tracking von Entwurf bis Geliefert',
    'Dateianhänge (Angebote, Rechnungen)',
    'Sammelbestellungen bei gleichem Lieferant']

  },
  {
    id: 'auszahlungen',
    name: 'Auszahlungsanweisungen',
    description: 'Kostenerstattungen, Rechnungen und Direktzahlungen',
    icon: <CreditCard className="w-5 h-5" />,
    color: 'bg-purple-500',
    features: [
    'Verschiedene Zahlungsarten (Bar, Überweisung, Rechnung)',
    'Automatische Erstellung bei genehmigten Veranstaltungen',
    'PDF-Generierung mit Unterschrift & Stempel',
    'Kassier-Dashboard mit offenen Anweisungen',
    'Entwurf-Modus zum späteren Bearbeiten']

  },
  {
    id: 'veranstaltungen',
    name: 'Veranstaltungsteilnahmen',
    description: 'Anträge für Kurse, Seminare und Veranstaltungen',
    icon: <Calendar className="w-5 h-5" />,
    color: 'bg-green-500',
    features: [
    'Antrag mit Veranstaltungsdetails und Kosten',
    'Genehmigung durch Kommandant',
    'Automatische Auszahlungsanweisung bei Genehmigung',
    'Kostenbestätigung durch Kassier nach Veranstaltung',
    'PDF-Export für Dokumentation']

  },
  {
    id: 'leihgeraete',
    name: 'Leihgeräte & Mietverträge',
    description: 'Geräteverleih mit digitalem Vertragsmanagement',
    icon: <Truck className="w-5 h-5" />,
    color: 'bg-amber-500',
    features: [
    'Gerätekatalog mit Tagessätzen',
    'Digitale Mietverträge mit Unterschrift',
    'Verfügbarkeitsprüfung',
    'Automatische Kostenberechnung',
    'Schadensdokumentation']

  },
  {
    id: 'beschluesse',
    name: 'Kommandobeschlüsse',
    description: 'Umlaufbeschlüsse mit digitaler Abstimmung',
    icon: <Vote className="w-5 h-5" />,
    color: 'bg-indigo-500',
    features: [
    'Umlaufbeschlüsse ohne physische Sitzung',
    'Digitale Abstimmung (Dafür/Dagegen/Enthaltung)',
    'Automatische Fristüberwachung',
    'PDF-Protokoll nach Bestätigung',
    'Bestätigung in Kommandositzung']

  },
  {
    id: 'aufgaben',
    name: 'Aufgabenverwaltung',
    description: 'Aufgaben mit Schritten, Zuweisung und Fälligkeiten',
    icon: <ClipboardList className="w-5 h-5" />,
    color: 'bg-teal-500',
    features: [
    'Aufgaben mit Teilschritten',
    'Zuweisung an Mitglieder',
    'Prioritäten und Fälligkeitsdaten',
    'Fortschrittsanzeige',
    'Benachrichtigungen bei Änderungen']

  },
  {
    id: 'ideen',
    name: 'Ideenpool',
    description: 'Vorschläge sammeln und bewerten',
    icon: <Lightbulb className="w-5 h-5" />,
    color: 'bg-yellow-500',
    features: [
    'Ideen einreichen',
    'Bewertung durch Mitglieder',
    'Diskussion in Kommentaren',
    'Status-Tracking (Neu, In Prüfung, Umgesetzt)']

  }];


  const bestellungWorkflow: WorkflowStep[] = [
  { label: 'Entwurf', description: 'Bestellung wird erstellt', icon: <FileText className="w-4 h-4" />, color: 'bg-gray-400' },
  { label: 'Eingereicht', description: 'Wartet auf Bereichsleiter', icon: <Send className="w-4 h-4" />, color: 'bg-blue-500' },
  { label: 'BL Freigabe', description: 'Bereichsleiter genehmigt', icon: <UserCheck className="w-4 h-4" />, color: 'bg-amber-500' },
  { label: 'Kdt Freigabe', description: 'Kommandant genehmigt (>500€)', icon: <Shield className="w-4 h-4" />, color: 'bg-red-500' },
  { label: 'Freigegeben', description: 'Bereit zur Bestellung', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-500' },
  { label: 'Bestellt', description: 'Beim Lieferanten bestellt', icon: <Package className="w-4 h-4" />, color: 'bg-purple-500' },
  { label: 'Geliefert', description: 'Ware eingetroffen', icon: <Truck className="w-4 h-4" />, color: 'bg-emerald-600' }];


  const auszahlungWorkflow: WorkflowStep[] = [
  { label: 'Entwurf', description: 'Anweisung wird erstellt', icon: <FileText className="w-4 h-4" />, color: 'bg-gray-400' },
  { label: 'Eingereicht', description: 'Wartet auf Genehmigung', icon: <Send className="w-4 h-4" />, color: 'bg-blue-500' },
  { label: 'Genehmigt', description: 'Kommandant hat genehmigt', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-500' },
  { label: 'Ausgezahlt', description: 'Kassier hat ausgezahlt', icon: <Banknote className="w-4 h-4" />, color: 'bg-purple-500' }];


  const roles = [
  { name: 'Admin', description: 'Voller Zugriff auf alle Funktionen und Einstellungen', color: 'bg-red-500' },
  { name: 'Kommandant', description: 'Genehmigt Bestellungen, Auszahlungen, Veranstaltungen', color: 'bg-amber-500' },
  { name: 'Kassier', description: 'Verwaltet Auszahlungen, markiert als bezahlt', color: 'bg-purple-500' },
  { name: 'Bereichsleiter', description: 'Genehmigt Bestellungen im eigenen Bereich', color: 'bg-blue-500' },
  { name: 'Kommandomitglied', description: 'Stimmt bei Umlaufbeschlüssen ab', color: 'bg-indigo-500' },
  { name: 'Nutzer', description: 'Erstellt Bestellungen, Auszahlungsanweisungen, Veranstaltungsteilnahmen; kann eigene Anträge bearbeiten, Ideen einreichen und an Abstimmungen teilnehmen', color: 'bg-gray-500' },
  { name: 'Schriftführer', description: 'Erhält Protokolle und Beschluss-PDFs per E-Mail, dokumentiert Sitzungsergebnisse', color: 'bg-cyan-500' }];


  const automations = [
  { icon: <Mail className="w-5 h-5" />, title: 'E-Mail-Benachrichtigungen', description: 'Automatische E-Mails bei neuen Aufgaben, Genehmigungen, Ablehnungen' },
  { icon: <Bell className="w-5 h-5" />, title: 'In-App-Benachrichtigungen', description: 'Sofortige Benachrichtigungen im Portal' },
  { icon: <Smartphone className="w-5 h-5" />, title: 'Push-Benachrichtigungen', description: 'Mobile Push-Nachrichten (wenn aktiviert)' },
  { icon: <CreditCard className="w-5 h-5" />, title: 'Auto-Auszahlung', description: 'Automatische Auszahlungsanweisung bei genehmigten Veranstaltungen mit Kosten' },
  { icon: <AlertTriangle className="w-5 h-5" />, title: 'Eskalation', description: 'Automatische Erinnerung bei überfälligen Genehmigungen' },
  { icon: <FileCheck className="w-5 h-5" />, title: 'PDF-Generierung', description: 'Automatische PDF-Erstellung bei Beschlüssen und Auszahlungen' }];


  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - 40; // margin 20 auf jeder Seite
      const margin = 20;
      let y = 20;

      // Hilfsfunktion für Seitenumbruch
      const checkPageBreak = (neededSpace: number) => {
        if (y + neededSpace > 275) {
          doc.addPage();
          y = 25;
          return true;
        }
        return false;
      };

      // Hilfsfunktion für Abschnitts-Header
      const drawSectionHeader = (title: string) => {
        checkPageBreak(20);
        doc.setFillColor(220, 38, 38);
        doc.rect(margin, y, 3, 10, 'F');
        doc.setFontSize(14);
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 8, y + 7);
        y += 15;
      };

      // === TITELSEITE ===
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, pageWidth, 60, 'F');
      
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('FFM-Portal', margin, 35);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Dokumentation', margin, 48);

      y = 75;
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text('Verwaltungssystem der Freiwilligen Feuerwehr Marchtrenk', margin, y);
      y += 8;
      doc.text(`Version 1.0 | Stand: ${new Date().toLocaleDateString('de-AT')}`, margin, y);
      y += 20;

      // Kurzbeschreibung
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const introText = 'Das FFM-Portal ist das zentrale Verwaltungssystem der FF Marchtrenk. Es dient der digitalen Verwaltung von Bestellungen, Auszahlungsanweisungen, Veranstaltungsteilnahmen, Leihverträgen, Kommandobeschlüssen, Aufgaben und dem Ideenpool.';
      const introLines = doc.splitTextToSize(introText, contentWidth);
      doc.text(introLines, margin, y);
      y += introLines.length * 5 + 15;

      // Inhaltsverzeichnis
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text('Inhaltsverzeichnis', margin, y);
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const tocItems = ['1. Module im Überblick', '2. Bestellungs-Workflow', '3. Auszahlungs-Workflow', '4. Rollen & Berechtigungen', '5. Automatisierungen'];
      tocItems.forEach(item => {
        doc.text(item, margin + 5, y);
        y += 6;
      });

      // === SEITE 2: MODULE ===
      doc.addPage();
      y = 25;
      drawSectionHeader('1. Module im Überblick');
      y += 5;

      modules.forEach((mod) => {
        // Prüfe ob genug Platz für Modul (Name + Beschreibung + min. 3 Features)
        const estimatedHeight = 25 + mod.features.length * 5;
        checkPageBreak(estimatedHeight);

        // Modul-Name
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(mod.name, margin, y);
        y += 5;

        // Modul-Beschreibung
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(mod.description, margin, y);
        y += 7;

        // Features
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(70, 70, 70);
        mod.features.forEach((feature) => {
          checkPageBreak(6);
          doc.text(`  ✓ ${feature}`, margin + 3, y);
          y += 5;
        });
        y += 8;
      });

      // === SEITE: WORKFLOWS ===
      doc.addPage();
      y = 25;
      drawSectionHeader('2. Bestellungs-Workflow');
      y += 3;

      // Workflow-Erklärung
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      const workflowIntro = 'Bestellungen durchlaufen einen mehrstufigen Genehmigungsprozess. Bei Beträgen über 500€ ist zusätzlich die Kommandant-Freigabe erforderlich. Bei Abstimmungspflicht wird das Kommando eingebunden.';
      const wfLines = doc.splitTextToSize(workflowIntro, contentWidth);
      doc.text(wfLines, margin, y);
      y += wfLines.length * 5 + 8;

      // Workflow-Schritte
      bestellungWorkflow.forEach((step, i) => {
        checkPageBreak(12);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(`${i + 1}. ${step.label}`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(step.description, margin + 40, y);
        y += 8;
      });

      y += 15;
      drawSectionHeader('3. Auszahlungs-Workflow');
      y += 3;

      // Auszahlungs-Erklärung
      const auszahlungIntro = 'Auszahlungsanweisungen werden nach Genehmigung durch den Kommandant vom Kassier ausbezahlt. Bei genehmigten Veranstaltungen mit Kosten wird automatisch eine Auszahlungsanweisung erstellt.';
      const azLines = doc.splitTextToSize(auszahlungIntro, contentWidth);
      doc.text(azLines, margin, y);
      y += azLines.length * 5 + 8;

      auszahlungWorkflow.forEach((step, i) => {
        checkPageBreak(12);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(`${i + 1}. ${step.label}`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(step.description, margin + 40, y);
        y += 8;
      });

      // === SEITE: ROLLEN ===
      doc.addPage();
      y = 25;
      drawSectionHeader('4. Rollen & Berechtigungen');
      y += 5;

      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const rollenIntro = 'Das System verwendet ein rollenbasiertes Berechtigungssystem. Jeder Benutzer hat genau eine Rolle, kann aber zusätzliche Funktionen zugewiesen bekommen.';
      const rollenLines = doc.splitTextToSize(rollenIntro, contentWidth);
      doc.text(rollenLines, margin, y);
      y += rollenLines.length * 5 + 10;

      roles.forEach((role) => {
        checkPageBreak(18);
        
        // Rollen-Name
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(role.name, margin, y);
        y += 5;

        // Rollen-Beschreibung (mehrzeilig)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(role.description, contentWidth - 10);
        doc.text(descLines, margin + 5, y);
        y += descLines.length * 5 + 8;
      });

      // === SEITE: AUTOMATISIERUNGEN ===
      checkPageBreak(80);
      if (y > 40) {
        doc.addPage();
        y = 25;
      }
      drawSectionHeader('5. Automatisierungen');
      y += 5;

      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const autoIntro = 'Das System führt verschiedene Aktionen automatisch aus, um den Verwaltungsaufwand zu minimieren.';
      doc.text(autoIntro, margin, y);
      y += 12;

      automations.forEach((auto) => {
        checkPageBreak(18);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(auto.title, margin, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const autoLines = doc.splitTextToSize(auto.description, contentWidth - 10);
        doc.text(autoLines, margin + 5, y);
        y += autoLines.length * 5 + 8;
      });

      // === FOOTER AUF JEDER SEITE ===
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        // Trennlinie
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, 285, pageWidth - margin, 285);
        // Footer-Text
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(
          `© Anton-Leo Kopler ${new Date().getFullYear()} – FFM-Portal | FF Marchtrenk`,
          margin,
          291
        );
        doc.text(
          `Seite ${i} von ${pageCount}`,
          pageWidth - margin,
          291,
          { align: 'right' }
        );
      }

      doc.save('FFM-Portal-Dokumentation.pdf');
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Fehler beim Erstellen des PDFs');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderWorkflow = (steps: WorkflowStep[]) =>
  <div data-ev-id="ev_7b4885a445" className="flex flex-wrap items-center gap-2 py-4">
      {steps.map((step, index) =>
    <div data-ev-id="ev_ceab7e23b0" key={step.label} className="flex items-center gap-2">
          <div data-ev-id="ev_329a9db15e" className="flex flex-col items-center">
            <div data-ev-id="ev_308075cd02" className={`w-10 h-10 ${step.color} rounded-full flex items-center justify-center text-white`}>
              {step.icon}
            </div>
            <span data-ev-id="ev_3cb5d54055" className="text-xs font-medium mt-1 text-center max-w-[80px]">{step.label}</span>
          </div>
          {index < steps.length - 1 &&
      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      }
        </div>
    )}
    </div>;


  return (
    <Layout>
      <div data-ev-id="ev_649957edf8" className="max-w-5xl mx-auto">
        {/* Header */}
        <div data-ev-id="ev_ffefdd5359" className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 text-primary-foreground mb-6">
          <div data-ev-id="ev_30ee1e07dc" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div data-ev-id="ev_f02fc5ce01">
              <h1 data-ev-id="ev_1dab225878" className="text-2xl font-bold">FFM-Portal Dokumentation</h1>
              <p data-ev-id="ev_d341c92e46" className="text-primary-foreground/80 mt-1">
                Verwaltungssystem der FF Marchtrenk • Version 1.0
              </p>
            </div>
            <button data-ev-id="ev_6abac80ccf"
            onClick={generatePdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg hover:bg-white/90 transition-colors font-medium disabled:opacity-50">

              {generatingPdf ?
              <><Clock className="w-4 h-4 animate-spin" /> Wird erstellt...</> :

              <><Download className="w-4 h-4" /> Als PDF herunterladen</>
              }
            </button>
          </div>
        </div>

        {/* Module Section */}
        <div data-ev-id="ev_bb3638be9c" className="bg-card border border-border rounded-xl mb-4 overflow-hidden">
          <button data-ev-id="ev_5a8ba42fc5"
          onClick={() => toggleSection('module')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">

            <div data-ev-id="ev_d5e484e071" className="flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              <span data-ev-id="ev_9702b42518" className="font-semibold text-lg">Module im Überblick</span>
            </div>
            {expandedSection === 'module' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {expandedSection === 'module' &&
          <div data-ev-id="ev_746c2b8993" className="px-6 pb-6 grid gap-4 sm:grid-cols-2">
              {modules.map((mod) =>
            <div data-ev-id="ev_ba37b3e465" key={mod.id} className="bg-muted/30 rounded-lg p-4 border border-border">
                  <div data-ev-id="ev_9e6981857f" className="flex items-center gap-3 mb-3">
                    <div data-ev-id="ev_cca195a641" className={`w-10 h-10 ${mod.color} rounded-lg flex items-center justify-center text-white`}>
                      {mod.icon}
                    </div>
                    <div data-ev-id="ev_d7e1887d14">
                      <h3 data-ev-id="ev_dd5b701fed" className="font-semibold">{mod.name}</h3>
                      <p data-ev-id="ev_ba108d134b" className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                  </div>
                  <ul data-ev-id="ev_9cabbbe0cc" className="space-y-1">
                    {mod.features.map((feature, i) =>
                <li data-ev-id="ev_1412c0c662" key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                        {feature}
                      </li>
                )}
                  </ul>
                </div>
            )}
            </div>
          }
        </div>

        {/* Workflows Section */}
        <div data-ev-id="ev_284409cc9d" className="bg-card border border-border rounded-xl mb-4 overflow-hidden">
          <button data-ev-id="ev_25edd1bd2d"
          onClick={() => toggleSection('workflows')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">

            <div data-ev-id="ev_8bfded5c25" className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-primary" />
              <span data-ev-id="ev_2404bca8a5" className="font-semibold text-lg">Workflows & Genehmigungen</span>
            </div>
            {expandedSection === 'workflows' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {expandedSection === 'workflows' &&
          <div data-ev-id="ev_dde22d4fe8" className="px-6 pb-6 space-y-6">
              <div data-ev-id="ev_3152ceef5d">
                <h3 data-ev-id="ev_148c4e0695" className="font-semibold mb-2">Bestellungs-Workflow</h3>
                <p data-ev-id="ev_b245792b3e" className="text-sm text-muted-foreground mb-2">
                  Bestellungen durchlaufen einen mehrstufigen Genehmigungsprozess. Bei Beträgen über 500€ 
                  ist zusätzlich die Kommandant-Freigabe erforderlich.
                </p>
                <div data-ev-id="ev_63f036cc96" className="overflow-x-auto">
                  {renderWorkflow(bestellungWorkflow)}
                </div>
              </div>
              <div data-ev-id="ev_c94cfd0ead">
                <h3 data-ev-id="ev_657d4561ea" className="font-semibold mb-2">Auszahlungs-Workflow</h3>
                <p data-ev-id="ev_81075edd39" className="text-sm text-muted-foreground mb-2">
                  Auszahlungsanweisungen werden nach Genehmigung durch den Kassier ausgezahlt.
                </p>
                <div data-ev-id="ev_d1fa3d50ff" className="overflow-x-auto">
                  {renderWorkflow(auszahlungWorkflow)}
                </div>
              </div>
            </div>
          }
        </div>

        {/* Rollen Section */}
        <div data-ev-id="ev_9ec95c7dee" className="bg-card border border-border rounded-xl mb-4 overflow-hidden">
          <button data-ev-id="ev_7a9254dc1b"
          onClick={() => toggleSection('rollen')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">

            <div data-ev-id="ev_c59e65a5da" className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <span data-ev-id="ev_ed0436139b" className="font-semibold text-lg">Rollen & Berechtigungen</span>
            </div>
            {expandedSection === 'rollen' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {expandedSection === 'rollen' &&
          <div data-ev-id="ev_9c65cfdef9" className="px-6 pb-6">
              <div data-ev-id="ev_ea99ffd4c0" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) =>
              <div data-ev-id="ev_b2a59fce8b" key={role.name} className="bg-muted/30 rounded-lg p-4 border border-border">
                    <div data-ev-id="ev_64da9ebb0d" className="flex items-center gap-2 mb-2">
                      <div data-ev-id="ev_6997877fbf" className={`w-3 h-3 ${role.color} rounded-full`} />
                      <span data-ev-id="ev_e8b0aa26e8" className="font-semibold">{role.name}</span>
                    </div>
                    <p data-ev-id="ev_4fe43f8d80" className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
              )}
              </div>
            </div>
          }
        </div>

        {/* Automatisierungen Section */}
        <div data-ev-id="ev_d0bc1bc110" className="bg-card border border-border rounded-xl mb-4 overflow-hidden">
          <button data-ev-id="ev_c91dba5714"
          onClick={() => toggleSection('auto')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">

            <div data-ev-id="ev_008bcc6318" className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-primary" />
              <span data-ev-id="ev_727218fa43" className="font-semibold text-lg">Automatisierungen</span>
            </div>
            {expandedSection === 'auto' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {expandedSection === 'auto' &&
          <div data-ev-id="ev_73378c54fd" className="px-6 pb-6">
              <div data-ev-id="ev_9e81628166" className="grid gap-3 sm:grid-cols-2">
                {automations.map((auto) =>
              <div data-ev-id="ev_6863d832d5" key={auto.title} className="flex items-start gap-3 bg-muted/30 rounded-lg p-4 border border-border">
                    <div data-ev-id="ev_e8b6fc15a7" className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                      {auto.icon}
                    </div>
                    <div data-ev-id="ev_b7bf425808">
                      <h4 data-ev-id="ev_de1612d162" className="font-medium">{auto.title}</h4>
                      <p data-ev-id="ev_132edff724" className="text-sm text-muted-foreground">{auto.description}</p>
                    </div>
                  </div>
              )}
              </div>
            </div>
          }
        </div>

        {/* Footer */}
        <div data-ev-id="ev_1653691df0" className="text-center text-sm text-muted-foreground py-6 border-t border-border">
          © Anton-Leo Kopler {new Date().getFullYear()} FFM-Portal – FF Marchtrenk
        </div>
      </div>
    </Layout>);

}