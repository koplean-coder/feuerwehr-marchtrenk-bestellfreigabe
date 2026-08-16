import { Layout } from '@/components/Layout';
import { ArrowLeft, Settings, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import schadensmeldungFormular from '@/assets/generated/schadensmeldung-formular-mockup.png';
import schadensmeldungListe from '@/assets/generated/schadensmeldung-liste-mockup.png';

export default function MockupPreview() {
  return (
    <Layout>
      <div data-ev-id="ev_1dda398417" className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div data-ev-id="ev_9938ab981f" className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div data-ev-id="ev_816a4e5bff">
            <h1 data-ev-id="ev_c8caaccb3b" className="text-2xl font-bold">Mockup Preview: Schadensmeldung</h1>
            <p data-ev-id="ev_a751e921ec" className="text-muted-foreground">Konzept-Entwürfe für das neue Modul</p>
          </div>
        </div>

        {/* Formular Mockup */}
        <div data-ev-id="ev_bb7c8e367f" className="bg-card border border-border rounded-xl p-6">
          <h2 data-ev-id="ev_8a9b89a907" className="text-lg font-semibold mb-4">1. Formular — Neue Schadensmeldung</h2>
          <div data-ev-id="ev_b0677bb541" className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 flex justify-center">
            <img data-ev-id="ev_aa6cc9ff8a"
            src={schadensmeldungFormular}
            alt="Mockup des Schadensmeldung-Formulars"
            className="max-w-full h-auto rounded-lg shadow-lg" />

          </div>
        </div>

        {/* Liste Mockup */}
        <div data-ev-id="ev_aaf62715c0" className="bg-card border border-border rounded-xl p-6">
          <h2 data-ev-id="ev_544112a4b5" className="text-lg font-semibold mb-4">2. Listenansicht — Übersicht aller Meldungen</h2>
          <div data-ev-id="ev_cc8fd14332" className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 flex justify-center">
            <img data-ev-id="ev_642c7d64a8"
            src={schadensmeldungListe}
            alt="Mockup der Schadensmeldung-Listenansicht"
            className="max-w-full h-auto rounded-lg shadow-lg" />

          </div>
        </div>

        {/* Info */}
        <div data-ev-id="ev_7ca8c55195" className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p data-ev-id="ev_a8d74d1eb8" className="text-blue-800 dark:text-blue-200 text-sm">
            💡 Dies sind Konzept-Mockups. Nach Freigabe kann das Modul vollständig implementiert werden.
          </p>
        </div>

        {/* Settings Mockup Link */}
        <Link
          to="/settings-mockup"
          className="flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors group">

          <div data-ev-id="ev_aee24a47e2" className="flex items-center gap-4">
            <div data-ev-id="ev_46f7cd846f" className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div data-ev-id="ev_f7ef306305">
              <h3 data-ev-id="ev_b4c3a1fa01" className="font-semibold">Einstellungen — Neues Design</h3>
              <p data-ev-id="ev_a024bc8b5e" className="text-sm text-muted-foreground">Interaktives Mockup der neuen Einstellungsseite</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </Layout>);

}