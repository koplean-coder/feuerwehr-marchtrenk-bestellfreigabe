import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Link } from 'react-router';
import {
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  FileText,
  Package,
  ArrowRight,
  Bell,
  ListTodo,
  Euro,
  User,
  Calendar,
  TrendingUp } from
'lucide-react';

// Demo-Daten für Beispiel
const DEMO_ORDERS_MITGLIED = [
{ id: '1', title: 'Büromaterial', status: 'ausstehend', amount: 45.90, date: '2024-01-15' },
{ id: '2', title: 'Druckerpatronen', status: 'freigegeben_bereichsleiter', amount: 89.00, date: '2024-01-14' }];


const DEMO_TASKS_MITGLIED = [
{ id: '1', title: 'Rechnung für Büromaterial einreichen', priority: 'medium', due: '2024-01-20' }];


const DEMO_ORDERS_BL = [
{ id: '3', title: 'Werkzeugset', status: 'ausstehend', amount: 156.00, creator: 'Max Mustermann', date: '2024-01-15' },
{ id: '4', title: 'Schutzausrüstung', status: 'ausstehend', amount: 234.50, creator: 'Anna Schmidt', date: '2024-01-14' }];


export default function DashboardDemo() {
  const [activeView, setActiveView] = useState<'mitglied' | 'bereichsleiter'>('mitglied');

  return (
    <Layout>
      <div data-ev-id="ev_97c4893b19" className="flex flex-col gap-6">
        {/* Demo Header */}
        <div data-ev-id="ev_f9b1565b49" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-6">
          <h1 data-ev-id="ev_0b99b72280" className="text-2xl font-bold mb-2">🎨 Dashboard Redesign Demo</h1>
          <p data-ev-id="ev_bd78ecf891" className="text-blue-100">So könnte das neue, kompakte Dashboard aussehen</p>
          
          {/* View Switcher */}
          <div data-ev-id="ev_5e0f56b94a" className="flex gap-2 mt-4">
            <button data-ev-id="ev_80528e47f7"
            onClick={() => setActiveView('mitglied')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeView === 'mitglied' ?
            'bg-white text-blue-600' :
            'bg-white/20 text-white hover:bg-white/30'}`
            }>

              👤 Mitglied-Ansicht
            </button>
            <button data-ev-id="ev_bd8c91e6d5"
            onClick={() => setActiveView('bereichsleiter')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeView === 'bereichsleiter' ?
            'bg-white text-purple-600' :
            'bg-white/20 text-white hover:bg-white/30'}`
            }>

              👔 Bereichsleiter-Ansicht
            </button>
          </div>
        </div>

        {/* Mitglied View */}
        {activeView === 'mitglied' &&
        <div data-ev-id="ev_892f5a9a2f" className="flex flex-col gap-4">
            {/* Begrüßung + Quick Actions */}
            <div data-ev-id="ev_7d13a64777" className="bg-card border border-border rounded-xl p-5">
              <div data-ev-id="ev_9ce0f93db7" className="flex items-center justify-between">
                <div data-ev-id="ev_b6c6aa025d">
                  <h2 data-ev-id="ev_c97a5c3165" className="text-xl font-semibold text-foreground">Hallo Max! 👋</h2>
                  <p data-ev-id="ev_fc606791f4" className="text-muted-foreground text-sm mt-1">Du hast <span data-ev-id="ev_e70a5e8fe1" className="font-medium text-primary">2 offene Bestellungen</span> und <span data-ev-id="ev_50c29fd044" className="font-medium text-orange-600">1 Aufgabe</span></p>
                </div>
                <Link
                to="/bestellungen/neu"
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">

                  <Plus className="w-4 h-4" />
                  Neue Bestellung
                </Link>
              </div>
            </div>

            {/* Zwei-Spalten Layout */}
            <div data-ev-id="ev_9a0a93271d" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Meine Bestellungen */}
              <div data-ev-id="ev_6986894344" className="bg-card border border-border rounded-xl overflow-hidden">
                <div data-ev-id="ev_5911686c1c" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                  <div data-ev-id="ev_88b21156ff" className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span data-ev-id="ev_03ba858999" className="font-medium text-foreground">Meine Bestellungen</span>
                    <span data-ev-id="ev_69fc56a4e9" className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">2 offen</span>
                  </div>
                  <Link to="/bestellungen" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    Alle anzeigen <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div data-ev-id="ev_5008fee341" className="divide-y divide-border">
                  {DEMO_ORDERS_MITGLIED.map((order) =>
                <div data-ev-id="ev_4c581c6dd6" key={order.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div data-ev-id="ev_96b543fcc6" className="flex items-center justify-between">
                        <div data-ev-id="ev_56ac4a65c0" className="flex items-center gap-3">
                          <div data-ev-id="ev_c60d026f3e" className={`w-2 h-2 rounded-full ${
                      order.status === 'ausstehend' ? 'bg-yellow-500' : 'bg-blue-500'}`
                      } />
                          <div data-ev-id="ev_bb371a2647">
                            <p data-ev-id="ev_22ad719530" className="font-medium text-foreground text-sm">{order.title}</p>
                            <p data-ev-id="ev_071866852a" className="text-xs text-muted-foreground">
                              {order.status === 'ausstehend' ? 'Wartet auf Freigabe' : 'Freigegeben vom BL'}
                            </p>
                          </div>
                        </div>
                        <span data-ev-id="ev_81c108077e" className="font-medium text-foreground">€ {order.amount.toFixed(2)}</span>
                      </div>
                    </div>
                )}
                </div>
              </div>

              {/* Meine Aufgaben */}
              <div data-ev-id="ev_20ea960479" className="bg-card border border-border rounded-xl overflow-hidden">
                <div data-ev-id="ev_900ccc0611" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                  <div data-ev-id="ev_49cb15db81" className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-orange-500" />
                    <span data-ev-id="ev_db405d6654" className="font-medium text-foreground">Meine Aufgaben</span>
                    <span data-ev-id="ev_e86f511b04" className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">1 offen</span>
                  </div>
                  <Link to="/aufgaben" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    Alle anzeigen <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div data-ev-id="ev_3781a18533" className="divide-y divide-border">
                  {DEMO_TASKS_MITGLIED.map((task) =>
                <div data-ev-id="ev_d8f62139b4" key={task.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div data-ev-id="ev_52a78a2048" className="flex items-center justify-between">
                        <div data-ev-id="ev_b41898401f" className="flex items-center gap-3">
                          <div data-ev-id="ev_50058fb55a" className="w-5 h-5 rounded border-2 border-orange-400" />
                          <div data-ev-id="ev_9bb9f7a910">
                            <p data-ev-id="ev_6afd1e1a00" className="font-medium text-foreground text-sm">{task.title}</p>
                            <p data-ev-id="ev_6ace0ee366" className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Fällig: {task.due}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                )}
                  {DEMO_TASKS_MITGLIED.length === 0 &&
                <div data-ev-id="ev_36439360b1" className="px-4 py-6 text-center text-muted-foreground text-sm">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      Keine offenen Aufgaben! 🎉
                    </div>
                }
                </div>
              </div>
            </div>

            {/* Hinweis */}
            <div data-ev-id="ev_f9ca981c8d" className="text-center text-xs text-muted-foreground py-2">
              💡 Das ist alles! Keine überflüssigen Informationen.
            </div>
          </div>
        }

        {/* Bereichsleiter View */}
        {activeView === 'bereichsleiter' &&
        <div data-ev-id="ev_b6af9f2688" className="flex flex-col gap-4">
            {/* Begrüßung + Quick Stats */}
            <div data-ev-id="ev_d839c349fb" className="bg-card border border-border rounded-xl p-5">
              <div data-ev-id="ev_2744f5c424" className="flex items-center justify-between">
                <div data-ev-id="ev_ad455398a4">
                  <h2 data-ev-id="ev_0419597c2d" className="text-xl font-semibold text-foreground">Hallo Andreas! 👋</h2>
                  <p data-ev-id="ev_106953978f" className="text-muted-foreground text-sm mt-1">
                    <span data-ev-id="ev_829162815c" className="font-medium text-red-600">2 Bestellungen</span> warten auf deine Freigabe
                  </p>
                </div>
                <Link
                to="/bestellungen/neu"
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">

                  <Plus className="w-4 h-4" />
                  Neue Bestellung
                </Link>
              </div>
            </div>

            {/* ZU ERLEDIGEN - Prominent */}
            <div data-ev-id="ev_b262dea0d8" className="bg-red-50 border-2 border-red-200 rounded-xl overflow-hidden">
              <div data-ev-id="ev_3f4bb9b781" className="px-4 py-3 bg-red-100 border-b border-red-200 flex items-center justify-between">
                <div data-ev-id="ev_638015ce20" className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span data-ev-id="ev_bd594e3076" className="font-semibold text-red-800">Zu erledigen</span>
                  <span data-ev-id="ev_0421f8ab22" className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">2</span>
                </div>
              </div>
              <div data-ev-id="ev_84a8113aa3" className="divide-y divide-red-200">
                {DEMO_ORDERS_BL.map((order) =>
              <div data-ev-id="ev_9372caa450" key={order.id} className="px-4 py-3 hover:bg-red-100/50 transition-colors flex items-center justify-between">
                    <div data-ev-id="ev_c381c2aa1d" className="flex items-center gap-3">
                      <div data-ev-id="ev_789b0b0f5a" className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-red-600" />
                      </div>
                      <div data-ev-id="ev_68c7d701f6">
                        <p data-ev-id="ev_9fa018da30" className="font-medium text-foreground">{order.title}</p>
                        <p data-ev-id="ev_748a6cb1d5" className="text-xs text-muted-foreground">
                          von {order.creator} · € {order.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div data-ev-id="ev_c30194556f" className="flex items-center gap-2">
                      <button data-ev-id="ev_1ce354db8b" className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium">
                        Freigeben
                      </button>
                      <button data-ev-id="ev_0a6b121730" className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                        Details
                      </button>
                    </div>
                  </div>
              )}
              </div>
            </div>

            {/* Zwei-Spalten: Meine Bestellungen + Aufgaben */}
            <div data-ev-id="ev_0d0978ebf2" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Meine Bestellungen */}
              <div data-ev-id="ev_74bf9d9519" className="bg-card border border-border rounded-xl overflow-hidden">
                <div data-ev-id="ev_ab605b69c9" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                  <div data-ev-id="ev_d60a88050c" className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span data-ev-id="ev_b777830f2f" className="font-medium text-foreground">Meine Bestellungen</span>
                    <span data-ev-id="ev_4696dfb4c7" className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Alle erledigt</span>
                  </div>
                  <Link to="/bestellungen" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    Alle anzeigen <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div data-ev-id="ev_a677fa3b64" className="px-4 py-6 text-center text-muted-foreground text-sm">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  Keine offenen Bestellungen
                </div>
              </div>

              {/* Meine Aufgaben */}
              <div data-ev-id="ev_c6fa42f110" className="bg-card border border-border rounded-xl overflow-hidden">
                <div data-ev-id="ev_7c33c42327" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                  <div data-ev-id="ev_24df809129" className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-orange-500" />
                    <span data-ev-id="ev_e85e28e762" className="font-medium text-foreground">Meine Aufgaben</span>
                  </div>
                  <Link to="/aufgaben" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    Alle anzeigen <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div data-ev-id="ev_aaf4369f6f" className="px-4 py-6 text-center text-muted-foreground text-sm">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  Keine offenen Aufgaben! 🎉
                </div>
              </div>
            </div>

            {/* Hinweis */}
            <div data-ev-id="ev_219e2532e2" className="text-center text-xs text-muted-foreground py-2">
              💡 "Zu erledigen" zeigt nur Aktionen die JETZT Aufmerksamkeit brauchen.
            </div>
          </div>
        }

        {/* Vergleich Box */}
        <div data-ev-id="ev_300efebc75" className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5 mt-4">
          <h3 data-ev-id="ev_146df2507c" className="font-semibold text-foreground mb-3">📊 Vorteile des neuen Designs:</h3>
          <div data-ev-id="ev_601f258ef2" className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div data-ev-id="ev_ca50b0f75d" className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div data-ev-id="ev_35f696f026">
                <p data-ev-id="ev_95a41d7d77" className="font-medium">Fokussiert</p>
                <p data-ev-id="ev_a14bfc57ae" className="text-muted-foreground">Nur relevante Infos pro Rolle</p>
              </div>
            </div>
            <div data-ev-id="ev_92ea2838e2" className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div data-ev-id="ev_95d87bbe0d">
                <p data-ev-id="ev_3d5ba86001" className="font-medium">Actionable</p>
                <p data-ev-id="ev_01bd574b88" className="text-muted-foreground">"Zu erledigen" ganz oben</p>
              </div>
            </div>
            <div data-ev-id="ev_88e02d49c2" className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div data-ev-id="ev_96acac3dc1">
                <p data-ev-id="ev_1fa8d54438" className="font-medium">Kompakt</p>
                <p data-ev-id="ev_f97fc5fd5e" className="text-muted-foreground">Kein Scrollen nötig</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>);

}