import { useState } from 'react';
import { Link } from 'react-router';
import {
  Home,
  ShoppingCart,
  Truck,
  FileText,
  Bell,
  User,
  ListTodo,
  Users,
  ArrowLeft,
  BookOpen } from
'lucide-react';
import logoImage from '@/assets/uploads/logo.png';

const demoNavItems = [
{ path: '/', label: 'Dashboard', icon: Home },
{ path: '/bestellungen', label: 'Bestellungen', icon: ShoppingCart },
{ path: '/lieferanten', label: 'Lieferanten', icon: Truck },
{ path: '/antragsformulare', label: 'Formulare', icon: FileText },
{ path: '/aufgaben', label: 'Aufgaben', icon: ListTodo },
{ path: '/benutzer', label: 'Benutzer', icon: Users },
{ path: '/anleitung', label: 'Anleitung', icon: BookOpen }];


// Feuerwehr Farbschema
const COLORS = {
  primary: '#C8102E',
  primaryLight: '#E8354A',
  primaryDark: '#9A0C23'
};

export default function MenuDemo() {
  const [activeItem1, setActiveItem1] = useState('/');
  const [activeItem2, setActiveItem2] = useState('/');
  const [hoveredItem1, setHoveredItem1] = useState<string | null>(null);
  const [hoveredItem2, setHoveredItem2] = useState<string | null>(null);

  return (
    <div data-ev-id="ev_4e7ecf5864" className="min-h-screen bg-background">
      {/* Back Button */}
      <div data-ev-id="ev_0b0f4ff53e" className="fixed top-4 left-4 z-50">
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg shadow-lg hover:shadow-xl transition-all text-foreground border border-border hover:border-primary">

          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>
      </div>

      <div data-ev-id="ev_d54de7507a" className="max-w-6xl mx-auto px-4 py-16 space-y-16">
        {/* Title */}
        <div data-ev-id="ev_8f1ce0c992" className="text-center space-y-2">
          <h1 data-ev-id="ev_beda051e25" className="text-3xl font-bold text-foreground">Menü Design Vorschläge</h1>
          <p data-ev-id="ev_268c9c8da2" className="text-muted-foreground">Klicken Sie auf die Menüpunkte, um den aktiven Zustand zu sehen</p>
          <p data-ev-id="ev_8c42eef084" className="text-sm text-primary font-medium">🔥 Feuerwehr Farbschema</p>
        </div>

        {/* ============================================== */}
        {/* VORSCHLAG 1: Glassmorphism */}
        {/* ============================================== */}
        <section data-ev-id="ev_923eb3f9ad" className="space-y-6">
          <div data-ev-id="ev_563c8132f9" className="text-center">
            <span data-ev-id="ev_a77e58e49c" className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-2">
              Vorschlag 1
            </span>
            <h2 data-ev-id="ev_f7a625bc55" className="text-2xl font-bold text-foreground">Glassmorphism mit Blur-Effekt</h2>
            <p data-ev-id="ev_4c3fbdd153" className="text-muted-foreground mt-1">Modern, elegant, mit rotem Glow</p>
          </div>

          {/* Demo Container */}
          <div data-ev-id="ev_cc458a28de"
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
            minHeight: '220px'
          }}>

            {/* Glassmorphism Header */}
            <header data-ev-id="ev_08acc191ae" className="relative backdrop-blur-md bg-black/20 border-b border-white/20">
              <div data-ev-id="ev_00f9dcb507" className="max-w-7xl mx-auto px-6">
                <div data-ev-id="ev_14a2ba25a2" className="flex items-center justify-between h-16">
                  {/* Logo */}
                  <div data-ev-id="ev_bd939841a3" className="flex items-center gap-3">
                    <div data-ev-id="ev_bc2281a903" className="bg-white rounded p-1 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer hover:scale-105 transform duration-200">
                      <img data-ev-id="ev_2263300cd7" src={logoImage} alt="Logo" className="h-8 w-auto" />
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav data-ev-id="ev_0de37f7969" className="flex items-center gap-1">
                    {demoNavItems.map((item) => {
                      const isActive = activeItem1 === item.path;
                      const isHovered = hoveredItem1 === item.path;

                      return (
                        <button data-ev-id="ev_4b42d40b43"
                        key={item.path}
                        onClick={() => setActiveItem1(item.path)}
                        onMouseEnter={() => setHoveredItem1(item.path)}
                        onMouseLeave={() => setHoveredItem1(null)}
                        className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                        style={{
                          color: isActive ? '#fff' : isHovered ? '#fff' : 'rgba(255,255,255,0.7)',
                          background: isActive ?
                          'rgba(255,255,255,0.2)' :
                          isHovered ?
                          'rgba(255,255,255,0.1)' :
                          'transparent',
                          boxShadow: isActive ?
                          `0 0 20px ${COLORS.primaryLight}, inset 0 0 20px rgba(255,255,255,0.1)` :
                          'none',
                          transform: isActive ? 'scale(1.05)' : isHovered ? 'scale(1.02)' : 'scale(1)'
                        }}>

                          <item.icon
                            className="w-4 h-4 transition-all duration-300"
                            style={{
                              filter: isActive ? 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' : 'none',
                              transform: isHovered && !isActive ? 'rotate(-5deg)' : 'rotate(0deg)'
                            }} />

                          <span data-ev-id="ev_2164850c30" className="hidden lg:block">{item.label}</span>
                          
                          {/* Glowing underline for active item */}
                          {isActive &&
                          <span data-ev-id="ev_6763c2b04d"
                          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                          style={{
                            background: 'linear-gradient(90deg, transparent, #fff, transparent)',
                            boxShadow: '0 0 10px #fff, 0 0 20px rgba(255,255,255,0.5)'
                          }} />

                          }
                          
                          {/* Hover glow effect */}
                          {isHovered && !isActive &&
                          <span data-ev-id="ev_90fb592f3b"
                          className="absolute inset-0 rounded-lg opacity-50"
                          style={{
                            background: `radial-gradient(circle at center, ${COLORS.primaryLight}40 0%, transparent 70%)`
                          }} />

                          }
                        </button>);

                    })}
                  </nav>

                  {/* Right side */}
                  <div data-ev-id="ev_14cb236d4b" className="flex items-center gap-3">
                    <button data-ev-id="ev_50f0a55a3c"
                    className="relative p-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-110 hover:rotate-12"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.5))'
                    }}>

                      <Bell className="w-5 h-5 text-yellow-400 animate-pulse" />
                      <span data-ev-id="ev_1323d79164"
                      className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-yellow-900 text-xs rounded-full flex items-center justify-center font-bold animate-bounce"
                      style={{ boxShadow: '0 0 10px rgba(250, 204, 21, 0.8)' }}>

                        3
                      </span>
                    </button>
                    <div data-ev-id="ev_83cb6b16fe" className="flex items-center gap-2 pl-3 border-l border-white/20">
                      <div data-ev-id="ev_1a4e3a759b"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)',
                        boxShadow: '0 0 15px rgba(255,255,255,0.2), inset 0 0 10px rgba(255,255,255,0.1)'
                      }}>

                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div data-ev-id="ev_fc3eec8eed" className="hidden sm:block text-right">
                        <span data-ev-id="ev_a974032ef6" className="text-white text-sm block font-medium">Max Mustermann</span>
                        <span data-ev-id="ev_0541ae3c99"
                        className="inline-block px-2 py-0.5 text-xs rounded-full"
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          color: '#fff',
                          boxShadow: '0 0 10px rgba(255,255,255,0.1)'
                        }}>

                          Kommandant
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Demo Content */}
            <div data-ev-id="ev_b2af9935d6" className="p-8 text-white/80 text-center">
              <p data-ev-id="ev_ee03eb9aa8">Beispiel-Inhalt unter dem Header</p>
            </div>
          </div>

          {/* Features */}
          <div data-ev-id="ev_ec341f8102" className="flex flex-wrap justify-center gap-3">
            <span data-ev-id="ev_5d038f9f2f" className="px-3 py-1 bg-card rounded-full text-sm text-muted-foreground shadow border border-border">✨ Glow-Effekte</span>
            <span data-ev-id="ev_7c617f573c" className="px-3 py-1 bg-card rounded-full text-sm text-muted-foreground shadow border border-border">📍 Leuchtende Unterstreichung</span>
            <span data-ev-id="ev_e6c55b5225" className="px-3 py-1 bg-card rounded-full text-sm text-muted-foreground shadow border border-border">🔄 Icon-Rotation</span>
            <span data-ev-id="ev_f0b15500e3" className="px-3 py-1 bg-card rounded-full text-sm text-muted-foreground shadow border border-border">💫 Scale-Animation</span>
          </div>
        </section>

        {/* ============================================== */}
        {/* VORSCHLAG 2: Pill-Navigation */}
        {/* ============================================== */}
        <section data-ev-id="ev_e21a3f1016" className="space-y-6">
          <div data-ev-id="ev_3508c0a31a" className="text-center">
            <span data-ev-id="ev_7da8edb514" className="inline-block px-4 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-2">
              Vorschlag 2
            </span>
            <h2 data-ev-id="ev_27ffc7e7d7" className="text-2xl font-bold text-foreground">Pill-Navigation mit Farbakzenten</h2>
            <p data-ev-id="ev_cec8bc9ba5" className="text-muted-foreground mt-1">Dynamisch, mit roten Akzenten</p>
          </div>

          {/* Demo Container */}
          <div data-ev-id="ev_57e93fe041"
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
            minHeight: '220px'
          }}>

            {/* Pill-Style Header */}
            <header data-ev-id="ev_766267caff" style={{ background: 'rgba(0,0,0,0.35)' }} className="border-b border-white/10">
              <div data-ev-id="ev_c4a93d5bb3" className="max-w-7xl mx-auto px-6">
                <div data-ev-id="ev_6181e9646e" className="flex items-center justify-between h-16">
                  {/* Logo */}
                  <div data-ev-id="ev_6a16cef548" className="flex items-center gap-3">
                    <div data-ev-id="ev_df3415c338"
                    className="bg-white rounded p-1 flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer"
                    style={{
                      boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 30px ${COLORS.primary}50`
                    }}>

                      <img data-ev-id="ev_8685d70539" src={logoImage} alt="Logo" className="h-8 w-auto" />
                    </div>
                  </div>

                  {/* Navigation with Pills */}
                  <nav data-ev-id="ev_849ab15542" className="flex items-center gap-2">
                    {demoNavItems.map((item) => {
                      const isActive = activeItem2 === item.path;
                      const isHovered = hoveredItem2 === item.path;

                      return (
                        <button data-ev-id="ev_ff27edc8d9"
                        key={item.path}
                        onClick={() => setActiveItem2(item.path)}
                        onMouseEnter={() => setHoveredItem2(item.path)}
                        onMouseLeave={() => setHoveredItem2(null)}
                        className="relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 overflow-hidden"
                        style={{
                          background: isActive ?
                          '#fff' :
                          isHovered ?
                          'rgba(255,255,255,0.15)' :
                          'transparent',
                          color: isActive ? COLORS.primary : isHovered ? '#fff' : 'rgba(255,255,255,0.7)',
                          transform: isActive ? 'scale(1.08)' : isHovered ? 'scale(1.03)' : 'scale(1)',
                          boxShadow: isActive ?
                          `0 4px 20px rgba(255,255,255,0.4), 0 0 30px ${COLORS.primary}60` :
                          isHovered ?
                          `0 0 20px ${COLORS.primaryLight}40` :
                          'none'
                        }}>

                          {/* Ripple effect background for active */}
                          {isActive &&
                          <span data-ev-id="ev_8ba46428f6"
                          className="absolute inset-0 rounded-full opacity-20"
                          style={{
                            background: `radial-gradient(circle at 30% 50%, ${COLORS.primaryLight} 0%, transparent 60%)`
                          }} />

                          }
                          
                          <item.icon
                            className="w-4 h-4 transition-all duration-300 relative z-10"
                            style={{
                              transform: isActive ? 'scale(1.1)' : isHovered ? 'translateY(-2px)' : 'translateY(0)',
                              filter: isActive ? `drop-shadow(0 2px 4px ${COLORS.primary}80)` : 'none'
                            }} />

                          <span data-ev-id="ev_15e88eeabf" className="hidden lg:block relative z-10">{item.label}</span>
                          
                          {/* Shine effect on hover */}
                          {isHovered && !isActive &&
                          <span data-ev-id="ev_af698a66ed"
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                            animation: 'shine 0.6s ease-in-out'
                          }} />

                          }
                        </button>);

                    })}
                  </nav>

                  {/* Right side */}
                  <div data-ev-id="ev_84e89393fb" className="flex items-center gap-3">
                    <button data-ev-id="ev_6a9d1f5e74"
                    className="relative p-2.5 rounded-full transition-all duration-300 hover:scale-110"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      boxShadow: '0 0 20px rgba(250, 204, 21, 0.3)'
                    }}>

                      <Bell className="w-5 h-5 text-white" />
                      <span data-ev-id="ev_56e7312a79"
                      className="absolute -top-0.5 -right-0.5 w-5 h-5 text-xs rounded-full flex items-center justify-center font-bold"
                      style={{
                        background: `linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)`,
                        color: '#78350f',
                        boxShadow: '0 0 15px rgba(251, 191, 36, 0.6)',
                        animation: 'pulse 2s infinite'
                      }}>

                        3
                      </span>
                    </button>
                    <div data-ev-id="ev_12fd89d4fd" className="flex items-center gap-2 pl-3 border-l border-white/20">
                      <div data-ev-id="ev_f34f3b9467"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.primary} 100%)`,
                        boxShadow: `0 4px 15px ${COLORS.primary}60`
                      }}>

                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div data-ev-id="ev_8f19cdf01e" className="hidden sm:block text-right">
                        <p data-ev-id="ev_122e990134" className="text-white text-sm font-medium">Max Mustermann</p>
                        <span data-ev-id="ev_952af2baa8"
                        className="inline-block px-2 py-0.5 text-xs rounded-full font-medium"
                        style={{
                          background: `linear-gradient(135deg, ${COLORS.primaryLight}40 0%, ${COLORS.primary}40 100%)`,
                          color: '#fff',
                          border: `1px solid ${COLORS.primaryLight}60`
                        }}>

                          Kommandant
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Demo Content */}
            <div data-ev-id="ev_03ab734270" className="p-8 text-white/80 text-center">
              <p data-ev-id="ev_57e74fe467">Beispiel-Inhalt unter dem Header</p>
            </div>
          </div>

          {/* Features */}
          <div data-ev-id="ev_ff9a21297d" className="flex flex-wrap justify-center gap-3">
            <span data-ev-id="ev_0cbff9a4e3" className="px-3 py-1 bg-card rounded-full text-sm text-muted-foreground shadow border border-border">💊 Weiße Pill aktiv</span>
            <span data-ev-id="ev_c21f414721" className="px-3 py-1 bg-card rounded-full text-sm text-muted-foreground shadow border border-border">🔴 Roter Glow</span>
            <span data-ev-id="ev_e55c2f7b16" className="px-3 py-1 bg-card rounded-full text-sm text-muted-foreground shadow border border-border">⬆️ Icon-Lift</span>
            <span data-ev-id="ev_26980ce67f" className="px-3 py-1 bg-card rounded-full text-sm text-muted-foreground shadow border border-border">✨ Shine-Effekt</span>
          </div>
        </section>

        {/* Comparison */}
        <section data-ev-id="ev_f572935734" className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <h3 data-ev-id="ev_14b4a32b80" className="text-xl font-bold text-foreground mb-6 text-center">Vergleich</h3>
          <div data-ev-id="ev_d656034bd8" className="grid md:grid-cols-2 gap-8">
            <div data-ev-id="ev_a3bb33ce21" className="space-y-4">
              <h4 data-ev-id="ev_833cb2df40" className="font-semibold text-primary flex items-center gap-2">
                <span data-ev-id="ev_9b4f9f7dc9" className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">1</span>
                Glassmorphism
              </h4>
              <ul data-ev-id="ev_7b08f82412" className="space-y-2 text-muted-foreground">
                <li data-ev-id="ev_4a79d9a2a6" className="flex items-center gap-2">
                  <span data-ev-id="ev_11019ab84e" className="text-green-500">✓</span> Weißer Glow um aktives Element
                </li>
                <li data-ev-id="ev_571c22ed75" className="flex items-center gap-2">
                  <span data-ev-id="ev_0e1a9bcbc7" className="text-green-500">✓</span> Leuchtende Unterstreichung
                </li>
                <li data-ev-id="ev_55d25ad3ee" className="flex items-center gap-2">
                  <span data-ev-id="ev_affa09513d" className="text-green-500">✓</span> Icon-Rotation bei Hover
                </li>
                <li data-ev-id="ev_19bdd625b2" className="flex items-center gap-2">
                  <span data-ev-id="ev_3b5ce95058" className="text-green-500">✓</span> Subtile Scale-Animation
                </li>
              </ul>
            </div>
            <div data-ev-id="ev_0d2b628fb5" className="space-y-4">
              <h4 data-ev-id="ev_cdca1d08f4" className="font-semibold text-orange-600 flex items-center gap-2">
                <span data-ev-id="ev_f948756e5e" className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">2</span>
                Pill-Navigation
              </h4>
              <ul data-ev-id="ev_be5fedc3af" className="space-y-2 text-muted-foreground">
                <li data-ev-id="ev_5d59e680f0" className="flex items-center gap-2">
                  <span data-ev-id="ev_f83a0ff88d" className="text-green-500">✓</span> Roter Glow-Schatten
                </li>
                <li data-ev-id="ev_53283a0feb" className="flex items-center gap-2">
                  <span data-ev-id="ev_4933443c71" className="text-green-500">✓</span> Weiße Pill mit rotem Text
                </li>
                <li data-ev-id="ev_190b0d6f51" className="flex items-center gap-2">
                  <span data-ev-id="ev_0bfe1b2ba0" className="text-green-500">✓</span> Icon-Lift bei Hover
                </li>
                <li data-ev-id="ev_c69aaa4461" className="flex items-center gap-2">
                  <span data-ev-id="ev_edafe43895" className="text-green-500">✓</span> Shine-Effekt Animation
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div data-ev-id="ev_45e525baee" className="text-center space-y-4">
          <p data-ev-id="ev_eacdf52cd2" className="text-foreground font-medium">Welches Design gefällt Ihnen besser?</p>
          <p data-ev-id="ev_1f407067a5" className="text-muted-foreground text-sm">Sagen Sie mir einfach "Vorschlag 1" oder "Vorschlag 2" und ich implementiere es!</p>
        </div>
      </div>

      {/* CSS Animations */}
      <style data-ev-id="ev_0f2234233b">{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>);

}