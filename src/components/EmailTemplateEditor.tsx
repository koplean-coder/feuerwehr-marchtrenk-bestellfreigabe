/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import {
  Palette,
  Type,
  Layout,
  Save,
  RotateCcw,
  Eye,
  Smartphone,
  Monitor,
  Flame,
  Mail,
  CheckCircle2,
  AlertCircle,
  Image,
  Link } from
'lucide-react';

// Available icons for email header
export const HEADER_ICONS = [
{ id: 'flame', emoji: '🔥', label: 'Flamme' },
{ id: 'fire_truck', emoji: '🚒', label: 'Feuerwehrauto' },
{ id: 'firefighter', emoji: '🧑‍🚒', label: 'Feuerwehrmann' },
{ id: 'shield', emoji: '🛡️', label: 'Schild' },
{ id: 'siren_red', emoji: '🚨', label: 'Sirene (Rot)' },
{ id: 'siren_blue', emoji: '🚔', label: 'Blaulicht (Auto)' },
{ id: 'blue_light', emoji: '🔵', label: 'Blaulicht (Rund)' },
{ id: 'police', emoji: '👮', label: 'Polizei' },
{ id: 'ambulance', emoji: '🚑', label: 'Rettungswagen' },
{ id: 'helmet', emoji: '⛑️', label: 'Helm' },
{ id: 'star', emoji: '⭐', label: 'Stern' },
{ id: 'bell', emoji: '🔔', label: 'Glocke' },
{ id: 'alert', emoji: '⚠️', label: 'Warnung' },
{ id: 'megaphone', emoji: '📢', label: 'Megafon' },
{ id: 'check', emoji: '✅', label: 'Haken' },
{ id: 'mail', emoji: '📧', label: 'E-Mail' },
{ id: 'building', emoji: '🏢', label: 'Gebäude' },
{ id: 'rescue', emoji: '⚕️', label: 'Rettung' },
{ id: 'water', emoji: '💧', label: 'Wasser' },
{ id: 'lightning', emoji: '⚡', label: 'Blitz' }] as
const;

export interface EmailTemplateDesign {
  // Header
  headerGradientStart: string;
  headerGradientEnd: string;
  headerTitle: string;
  headerSubtitle: string;
  showHeaderIcon: boolean;
  headerIconType: 'emoji' | 'logo';
  headerIconEmoji: string;
  headerLogoUrl: string;

  // Content
  contentBgColor: string;
  contentTextColor: string;
  contentFontSize: number;
  contentPadding: number;

  // Signature
  greetingText: string;
  signatureText: string;

  // Button
  buttonGradientStart: string;
  buttonGradientEnd: string;
  buttonText: string;
  buttonTextColor: string;
  buttonBorderRadius: number;

  // Footer
  footerBgColor: string;
  footerTextColor: string;
  footerLine1: string;
  footerLine2: string;
  copyrightText: string;

  // General
  outerBgColor: string;
  cardBorderRadius: number;
  cardMaxWidth: number;
  cardShadow: boolean;
}

export const DEFAULT_EMAIL_DESIGN: EmailTemplateDesign = {
  // Header
  headerGradientStart: '#dc2626',
  headerGradientEnd: '#991b1b',
  headerTitle: 'Feuerwehr Bestellsystem',
  headerSubtitle: 'Automatische Benachrichtigung',
  showHeaderIcon: true,
  headerIconType: 'emoji',
  headerIconEmoji: '🔥',
  headerLogoUrl: '',

  // Content
  contentBgColor: '#ffffff',
  contentTextColor: '#374151',
  contentFontSize: 15,
  contentPadding: 32,

  // Signature
  greetingText: 'Mit freundlichen Grüßen,',
  signatureText: 'Ihr Feuerwehr-Team',

  // Button
  buttonGradientStart: '#dc2626',
  buttonGradientEnd: '#b91c1c',
  buttonText: 'Zum Bestellsystem',
  buttonTextColor: '#ffffff',
  buttonBorderRadius: 6,

  // Footer
  footerBgColor: '#f9fafb',
  footerTextColor: '#9ca3af',
  footerLine1: 'Diese E-Mail wurde automatisch generiert.',
  footerLine2: 'Bitte antworten Sie nicht direkt auf diese Nachricht.',
  copyrightText: '© Feuerwehr Bestellsystem',

  // General
  outerBgColor: '#f3f4f6',
  cardBorderRadius: 12,
  cardMaxWidth: 580,
  cardShadow: true
};

interface EmailTemplateEditorProps {
  design: EmailTemplateDesign;
  onChange: (design: EmailTemplateDesign) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
  saving?: boolean;
  hasChanges?: boolean;
}

type EditorSection = 'header' | 'content' | 'button' | 'footer' | 'general';

export function EmailTemplateEditor({
  design,
  onChange,
  onSave,
  onReset,
  saving = false,
  hasChanges = false
}: EmailTemplateEditorProps) {
  const [activeSection, setActiveSection] = useState<EditorSection>('header');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const handleSave = async () => {
    await onSave();
    setSaveSuccess(true);
  };

  const updateDesign = (updates: Partial<EmailTemplateDesign>) => {
    onChange({ ...design, ...updates });
  };

  const sections: {id: EditorSection;label: string;icon: React.ReactNode;}[] = [
  { id: 'header', label: 'Header', icon: <Layout className="w-4 h-4" /> },
  { id: 'content', label: 'Inhalt', icon: <Type className="w-4 h-4" /> },
  { id: 'button', label: 'Button', icon: <Mail className="w-4 h-4" /> },
  { id: 'footer', label: 'Footer', icon: <Layout className="w-4 h-4" /> },
  { id: 'general', label: 'Allgemein', icon: <Palette className="w-4 h-4" /> }];


  // Get the current icon display
  const getHeaderIconDisplay = () => {
    if (design.headerIconType === 'logo' && design.headerLogoUrl) {
      return (
        <img data-ev-id="ev_37387c58f4"
        src={design.headerLogoUrl}
        alt="Logo"
        className="w-6 h-6 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }} />);


    }
    return <span data-ev-id="ev_3c843b7cf8" className="text-xl">{design.headerIconEmoji}</span>;
  };

  return (
    <div data-ev-id="ev_74c88d7125" className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Editor Panel */}
      <div data-ev-id="ev_46415f44e7" className="lg:w-[420px] flex-shrink-0 flex flex-col gap-4">
        {/* Section Tabs */}
        <div data-ev-id="ev_95b01ded81" className="flex flex-wrap gap-2">
          {sections.map((section) =>
          <button data-ev-id="ev_dc2b617db7"
          key={section.id}
          onClick={() => setActiveSection(section.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
          activeSection === section.id ?
          'bg-primary text-primary-foreground shadow-sm' :
          'bg-muted text-muted-foreground hover:bg-muted/80'}`
          }>

              {section.icon}
              {section.label}
            </button>
          )}
        </div>

        {/* Editor Content */}
        <div data-ev-id="ev_796f05a4e0" className="bg-card border border-border rounded-xl p-4 flex-1 overflow-y-auto">
          {activeSection === 'header' &&
          <div data-ev-id="ev_773a0eedb7" className="flex flex-col gap-4">
              <h3 data-ev-id="ev_c4113f7582" className="font-medium text-sm flex items-center gap-2">
                <Layout className="w-4 h-4 text-primary" />
                Header Einstellungen
              </h3>
              
              <div data-ev-id="ev_c952e53309" className="grid grid-cols-2 gap-3">
                <div data-ev-id="ev_2f3ab9e1cf">
                  <label data-ev-id="ev_3c3771ef2b" className="block text-xs text-muted-foreground mb-1">Gradient Start</label>
                  <div data-ev-id="ev_5874609b34" className="flex gap-2">
                    <input data-ev-id="ev_f182d0e45d"
                  type="color"
                  value={design.headerGradientStart}
                  onChange={(e) => updateDesign({ headerGradientStart: e.target.value })}
                  className="w-10 h-9 rounded border border-input cursor-pointer" />

                    <input data-ev-id="ev_5349bd1079"
                  type="text"
                  value={design.headerGradientStart}
                  onChange={(e) => updateDesign({ headerGradientStart: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded-lg" />

                  </div>
                </div>
                <div data-ev-id="ev_543c623b8b">
                  <label data-ev-id="ev_c4a68c34bc" className="block text-xs text-muted-foreground mb-1">Gradient Ende</label>
                  <div data-ev-id="ev_5149fc3a3f" className="flex gap-2">
                    <input data-ev-id="ev_703a0a63c2"
                  type="color"
                  value={design.headerGradientEnd}
                  onChange={(e) => updateDesign({ headerGradientEnd: e.target.value })}
                  className="w-10 h-9 rounded border border-input cursor-pointer" />

                    <input data-ev-id="ev_bf0b79a268"
                  type="text"
                  value={design.headerGradientEnd}
                  onChange={(e) => updateDesign({ headerGradientEnd: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded-lg" />

                  </div>
                </div>
              </div>

              <div data-ev-id="ev_2346602ad2">
                <label data-ev-id="ev_0bee40675a" className="block text-xs text-muted-foreground mb-1">Titel</label>
                <input data-ev-id="ev_38934043d8"
              type="text"
              value={design.headerTitle}
              onChange={(e) => updateDesign({ headerTitle: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />

              </div>

              <div data-ev-id="ev_767389afe1">
                <label data-ev-id="ev_eb328aab1c" className="block text-xs text-muted-foreground mb-1">Untertitel</label>
                <input data-ev-id="ev_6a0b9970c3"
              type="text"
              value={design.headerSubtitle}
              onChange={(e) => updateDesign({ headerSubtitle: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />

              </div>

              <label data-ev-id="ev_60e0363f9c" className="flex items-center gap-2 cursor-pointer">
                <input data-ev-id="ev_b8cb76d529"
              type="checkbox"
              checked={design.showHeaderIcon}
              onChange={(e) => updateDesign({ showHeaderIcon: e.target.checked })}
              className="w-4 h-4 rounded border-input" />

                <span data-ev-id="ev_f9258a108a" className="text-sm">Icon/Logo anzeigen</span>
              </label>

              {design.showHeaderIcon &&
            <>
                  {/* Icon Type Selection */}
                  <div data-ev-id="ev_38da6b107f">
                    <label data-ev-id="ev_c0fc3d7759" className="block text-xs text-muted-foreground mb-2">Icon-Typ</label>
                    <div data-ev-id="ev_60649b0308" className="flex gap-2">
                      <button data-ev-id="ev_c1720270c0"
                  type="button"
                  onClick={() => updateDesign({ headerIconType: 'emoji' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
                  design.headerIconType === 'emoji' ?
                  'bg-primary/10 border-primary text-primary' :
                  'bg-background border-input hover:bg-muted'}`
                  }>

                        <span data-ev-id="ev_9501da0676" className="text-lg">🔥</span>
                        Icon
                      </button>
                      <button data-ev-id="ev_8968b538dc"
                  type="button"
                  onClick={() => updateDesign({ headerIconType: 'logo' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
                  design.headerIconType === 'logo' ?
                  'bg-primary/10 border-primary text-primary' :
                  'bg-background border-input hover:bg-muted'}`
                  }>

                        <Image className="w-4 h-4" />
                        Logo-URL
                      </button>
                    </div>
                  </div>

                  {design.headerIconType === 'emoji' ?
              <div data-ev-id="ev_0471fadc7b">
                      <label data-ev-id="ev_295bff70c7" className="block text-xs text-muted-foreground mb-2">Icon auswählen</label>
                      <div data-ev-id="ev_a804e42f60" className="grid grid-cols-6 gap-2">
                        {HEADER_ICONS.map((icon) =>
                  <button data-ev-id="ev_a5246a4a4f"
                  key={icon.id}
                  type="button"
                  onClick={() => updateDesign({ headerIconEmoji: icon.emoji })}
                  title={icon.label}
                  className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg border transition-all ${
                  design.headerIconEmoji === icon.emoji ?
                  'bg-primary/10 border-primary ring-2 ring-primary/20' :
                  'bg-background border-input hover:bg-muted hover:border-primary/50'}`
                  }>

                            {icon.emoji}
                          </button>
                  )}
                      </div>
                    </div> :

              <div data-ev-id="ev_5b24bd0d5c">
                      <label data-ev-id="ev_9635c78c48" className="block text-xs text-muted-foreground mb-1">
                        <Link className="w-3 h-3 inline mr-1" />
                        Logo URL (PNG, JPG, SVG)
                      </label>
                      <input data-ev-id="ev_287678056b"
                type="url"
                value={design.headerLogoUrl}
                onChange={(e) => updateDesign({ headerLogoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />

                      {design.headerLogoUrl &&
                <div data-ev-id="ev_a6687c4286" className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-3">
                          <div data-ev-id="ev_d7b8ed4389" className="w-10 h-10 bg-white rounded flex items-center justify-center border">
                            <img data-ev-id="ev_cbb624abf3"
                    src={design.headerLogoUrl}
                    alt="Logo Vorschau"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                    }} />

                          </div>
                          <span data-ev-id="ev_679dfb2a35" className="text-xs text-muted-foreground">Logo Vorschau</span>
                        </div>
                }
                    </div>
              }
                </>
            }
            </div>
          }

          {activeSection === 'content' &&
          <div data-ev-id="ev_7a94acedf7" className="flex flex-col gap-4">
              <h3 data-ev-id="ev_1f99a54785" className="font-medium text-sm flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                Inhaltsbereich
              </h3>

              <div data-ev-id="ev_a7c422e063" className="grid grid-cols-2 gap-3">
                <div data-ev-id="ev_1257fccfd6">
                  <label data-ev-id="ev_3bad9f6ba2" className="block text-xs text-muted-foreground mb-1">Hintergrund</label>
                  <div data-ev-id="ev_b88656eacb" className="flex gap-2">
                    <input data-ev-id="ev_fa3e471dae"
                  type="color"
                  value={design.contentBgColor}
                  onChange={(e) => updateDesign({ contentBgColor: e.target.value })}
                  className="w-10 h-9 rounded border border-input cursor-pointer" />

                    <input data-ev-id="ev_f67905ca78"
                  type="text"
                  value={design.contentBgColor}
                  onChange={(e) => updateDesign({ contentBgColor: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded-lg" />

                  </div>
                </div>
                <div data-ev-id="ev_0692af24df">
                  <label data-ev-id="ev_85d8e443d8" className="block text-xs text-muted-foreground mb-1">Textfarbe</label>
                  <div data-ev-id="ev_ee1ffdf8ef" className="flex gap-2">
                    <input data-ev-id="ev_830f5d20ac"
                  type="color"
                  value={design.contentTextColor}
                  onChange={(e) => updateDesign({ contentTextColor: e.target.value })}
                  className="w-10 h-9 rounded border border-input cursor-pointer" />

                    <input data-ev-id="ev_c82b75c464"
                  type="text"
                  value={design.contentTextColor}
                  onChange={(e) => updateDesign({ contentTextColor: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded-lg" />

                  </div>
                </div>
              </div>

              <div data-ev-id="ev_a7f47dedf5">
                <label data-ev-id="ev_aa421d197f" className="block text-xs text-muted-foreground mb-1">
                  Schriftgröße: {design.contentFontSize}px
                </label>
                <input data-ev-id="ev_8a5388bfd1"
              type="range"
              min="12"
              max="20"
              value={design.contentFontSize}
              onChange={(e) => updateDesign({ contentFontSize: parseInt(e.target.value) })}
              className="w-full" />

              </div>

              <div data-ev-id="ev_937238ea64">
                <label data-ev-id="ev_c08411c95c" className="block text-xs text-muted-foreground mb-1">
                  Innenabstand: {design.contentPadding}px
                </label>
                <input data-ev-id="ev_fbdb798a4e"
              type="range"
              min="16"
              max="48"
              value={design.contentPadding}
              onChange={(e) => updateDesign({ contentPadding: parseInt(e.target.value) })}
              className="w-full" />

              </div>

              {/* Signature Section */}
              <div data-ev-id="ev_eb3edc3aa9" className="pt-4 border-t border-border">
                <h4 data-ev-id="ev_2a7ea23ec8" className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Signatur
                </h4>
                
                <div data-ev-id="ev_0f6927cf92" className="flex flex-col gap-3">
                  <div data-ev-id="ev_d33d4c327a">
                    <label data-ev-id="ev_baf4e7f5bd" className="block text-xs text-muted-foreground mb-1">Grußformel</label>
                    <input data-ev-id="ev_75494926c3"
                  type="text"
                  value={design.greetingText}
                  onChange={(e) => updateDesign({ greetingText: e.target.value })}
                  placeholder="Mit freundlichen Grüßen,"
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />

                  </div>
                  <div data-ev-id="ev_182c4cb6e7">
                    <label data-ev-id="ev_422ce7c922" className="block text-xs text-muted-foreground mb-1">Team-Name</label>
                    <input data-ev-id="ev_d3637e8026"
                  type="text"
                  value={design.signatureText}
                  onChange={(e) => updateDesign({ signatureText: e.target.value })}
                  placeholder="Ihr Feuerwehr-Team"
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />

                  </div>
                </div>
              </div>
            </div>
          }

          {activeSection === 'button' &&
          <div data-ev-id="ev_ca3d7ffb8a" className="flex flex-col gap-4">
              <h3 data-ev-id="ev_7d01ba9604" className="font-medium text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Call-to-Action Button
              </h3>

              <div data-ev-id="ev_f0a2d0c49c">
                <label data-ev-id="ev_39c3557b2c" className="block text-xs text-muted-foreground mb-1">Button Text</label>
                <input data-ev-id="ev_b41c385871"
              type="text"
              value={design.buttonText}
              onChange={(e) => updateDesign({ buttonText: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />

              </div>

              <div data-ev-id="ev_3b46fd00a5" className="grid grid-cols-2 gap-3">
                <div data-ev-id="ev_dc30045ff8">
                  <label data-ev-id="ev_6a73ff0272" className="block text-xs text-muted-foreground mb-1">Button Start</label>
                  <div data-ev-id="ev_1a5131bea2" className="flex gap-2">
                    <input data-ev-id="ev_54685b4e34"
                  type="color"
                  value={design.buttonGradientStart}
                  onChange={(e) => updateDesign({ buttonGradientStart: e.target.value })}
                  className="w-10 h-9 rounded border border-input cursor-pointer" />

                    <input data-ev-id="ev_490ade94be"
                  type="text"
                  value={design.buttonGradientStart}
                  onChange={(e) => updateDesign({ buttonGradientStart: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded-lg" />

                  </div>
                </div>
                <div data-ev-id="ev_807e23acb6">
                  <label data-ev-id="ev_60ff6df8f5" className="block text-xs text-muted-foreground mb-1">Button Ende</label>
                  <div data-ev-id="ev_f455111fc2" className="flex gap-2">
                    <input data-ev-id="ev_97676c49dc"
                  type="color"
                  value={design.buttonGradientEnd}
                  onChange={(e) => updateDesign({ buttonGradientEnd: e.target.value })}
                  className="w-10 h-9 rounded border border-input cursor-pointer" />

                    <input data-ev-id="ev_2a7170e7a6"
                  type="text"
                  value={design.buttonGradientEnd}
                  onChange={(e) => updateDesign({ buttonGradientEnd: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded-lg" />

                  </div>
                </div>
              </div>

              <div data-ev-id="ev_34eef07c13">
                <label data-ev-id="ev_d424fe353f" className="block text-xs text-muted-foreground mb-1">Textfarbe</label>
                <div data-ev-id="ev_cc6fe4f7e5" className="flex gap-2">
                  <input data-ev-id="ev_629a67341a"
                type="color"
                value={design.buttonTextColor}
                onChange={(e) => updateDesign({ buttonTextColor: e.target.value })}
                className="w-10 h-9 rounded border border-input cursor-pointer" />

                  <input data-ev-id="ev_8ef6726043"
                type="text"
                value={design.buttonTextColor}
                onChange={(e) => updateDesign({ buttonTextColor: e.target.value })}
                className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded-lg" />

                </div>
              </div>

              <div data-ev-id="ev_51a42cd969">
                <label data-ev-id="ev_da9a289c3f" className="block text-xs text-muted-foreground mb-1">
                  Eckenradius: {design.buttonBorderRadius}px
                </label>
                <input data-ev-id="ev_8e85b85703"
              type="range"
              min="0"
              max="24"
              value={design.buttonBorderRadius}
              onChange={(e) => updateDesign({ buttonBorderRadius: parseInt(e.target.value) })}
              className="w-full" />

              </div>
            </div>
          }

          {activeSection === 'footer' &&
          <div data-ev-id="ev_afb3901e71" className="flex flex-col gap-4">
              <h3 data-ev-id="ev_f185d15910" className="font-medium text-sm flex items-center gap-2">
                <Layout className="w-4 h-4 text-primary" />
                Footer Einstellungen
              </h3>

              <div data-ev-id="ev_12348d6bee" className="grid grid-cols-2 gap-3">
                <div data-ev-id="ev_d016a396db">
                  <label data-ev-id="ev_246e94570e" className="block text-xs text-muted-foreground mb-1">Hintergrund</label>
                  <div data-ev-id="ev_a7711d8e6f" className="flex gap-2">
                    <input data-ev-id="ev_e5bf734e0d"
                  type="color"
                  value={design.footerBgColor}
                  onChange={(e) => updateDesign({ footerBgColor: e.target.value })}
                  className="w-10 h-9 rounded border border-input cursor-pointer" />

                    <input data-ev-id="ev_7d5f5b0bd2"
                  type="text"
                  value={design.footerBgColor}
                  onChange={(e) => updateDesign({ footerBgColor: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded-lg" />

                  </div>
                </div>
                <div data-ev-id="ev_1839666a58">
                  <label data-ev-id="ev_70e8b976a0" className="block text-xs text-muted-foreground mb-1">Textfarbe</label>
                  <div data-ev-id="ev_a0a99d3f67" className="flex gap-2">
                    <input data-ev-id="ev_b2bdb80a96"
                  type="color"
                  value={design.footerTextColor}
                  onChange={(e) => updateDesign({ footerTextColor: e.target.value })}
                  className="w-10 h-9 rounded border border-input cursor-pointer" />

                    <input data-ev-id="ev_c879b6d895"
                  type="text"
                  value={design.footerTextColor}
                  onChange={(e) => updateDesign({ footerTextColor: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded-lg" />

                  </div>
                </div>
              </div>

              <div data-ev-id="ev_c12ee52d05">
                <label data-ev-id="ev_2f0ba415e4" className="block text-xs text-muted-foreground mb-1">Hinweistext Zeile 1</label>
                <input data-ev-id="ev_9ee0ba9a28"
              type="text"
              value={design.footerLine1}
              onChange={(e) => updateDesign({ footerLine1: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />

              </div>

              <div data-ev-id="ev_57d091a105">
                <label data-ev-id="ev_bbb9ef66d6" className="block text-xs text-muted-foreground mb-1">Hinweistext Zeile 2</label>
                <input data-ev-id="ev_76ce0d543a"
              type="text"
              value={design.footerLine2}
              onChange={(e) => updateDesign({ footerLine2: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />

              </div>

              <div data-ev-id="ev_5b292dfcaa">
                <label data-ev-id="ev_b9a81065e2" className="block text-xs text-muted-foreground mb-1">Copyright Text</label>
                <input data-ev-id="ev_44696aa53d"
              type="text"
              value={design.copyrightText}
              onChange={(e) => updateDesign({ copyrightText: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />

              </div>
            </div>
          }

          {activeSection === 'general' &&
          <div data-ev-id="ev_857f0748fd" className="flex flex-col gap-4">
              <h3 data-ev-id="ev_c5191e534e" className="font-medium text-sm flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                Allgemeine Einstellungen
              </h3>

              <div data-ev-id="ev_62db954e94">
                <label data-ev-id="ev_3f353bc686" className="block text-xs text-muted-foreground mb-1">Äußerer Hintergrund</label>
                <div data-ev-id="ev_92bc5484cd" className="flex gap-2">
                  <input data-ev-id="ev_d689856c9c"
                type="color"
                value={design.outerBgColor}
                onChange={(e) => updateDesign({ outerBgColor: e.target.value })}
                className="w-10 h-9 rounded border border-input cursor-pointer" />

                  <input data-ev-id="ev_6258ecba08"
                type="text"
                value={design.outerBgColor}
                onChange={(e) => updateDesign({ outerBgColor: e.target.value })}
                className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded-lg" />

                </div>
              </div>

              <div data-ev-id="ev_aa27cce861">
                <label data-ev-id="ev_6790c07e4f" className="block text-xs text-muted-foreground mb-1">
                  Karten-Eckenradius: {design.cardBorderRadius}px
                </label>
                <input data-ev-id="ev_7961a8fdd7"
              type="range"
              min="0"
              max="24"
              value={design.cardBorderRadius}
              onChange={(e) => updateDesign({ cardBorderRadius: parseInt(e.target.value) })}
              className="w-full" />

              </div>

              <div data-ev-id="ev_6ccf168656">
                <label data-ev-id="ev_77fbd81d28" className="block text-xs text-muted-foreground mb-1">
                  Maximale Breite: {design.cardMaxWidth}px
                </label>
                <input data-ev-id="ev_bdc14f951c"
              type="range"
              min="400"
              max="700"
              step="20"
              value={design.cardMaxWidth}
              onChange={(e) => updateDesign({ cardMaxWidth: parseInt(e.target.value) })}
              className="w-full" />

              </div>

              <label data-ev-id="ev_787e54a8c9" className="flex items-center gap-2 cursor-pointer">
                <input data-ev-id="ev_7a706109d5"
              type="checkbox"
              checked={design.cardShadow}
              onChange={(e) => updateDesign({ cardShadow: e.target.checked })}
              className="w-4 h-4 rounded border-input" />

                <span data-ev-id="ev_fcc657b9f6" className="text-sm">Schatten anzeigen</span>
              </label>
            </div>
          }
        </div>

        {/* Action Buttons */}
        <div data-ev-id="ev_005e1cf362" className="flex gap-2">
          <button data-ev-id="ev_431afc4165"
          onClick={onReset}
          disabled={saving}
          className="flex-1 py-2.5 px-4 bg-muted text-foreground rounded-lg font-medium text-sm hover:bg-muted/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">

            <RotateCcw className="w-4 h-4" />
            Zurücksetzen
          </button>
          <button data-ev-id="ev_7e317099d9"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
          saveSuccess ?
          'bg-green-500 text-white' :
          'bg-primary text-primary-foreground hover:bg-primary/90'}`
          }>

            {saving ?
            <span data-ev-id="ev_f9568786ef" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
            saveSuccess ?
            <CheckCircle2 className="w-4 h-4" /> :

            <Save className="w-4 h-4" />
            }
            {saveSuccess ? 'Gespeichert!' : 'Speichern'}
          </button>
        </div>

        {hasChanges && !saveSuccess &&
        <div data-ev-id="ev_1e994ee7a4" className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5" />
            Ungespeicherte Änderungen
          </div>
        }
      </div>

      {/* Preview Panel */}
      <div data-ev-id="ev_39426e9ee6" className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Preview Controls */}
        <div data-ev-id="ev_dddc25191a" className="flex items-center justify-between">
          <div data-ev-id="ev_03f42b1a70" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Eye className="w-4 h-4" />
            Live-Vorschau
          </div>
          <div data-ev-id="ev_7a2b40f99c" className="flex gap-1 bg-muted rounded-lg p-1">
            <button data-ev-id="ev_f2a8f2d63e"
            onClick={() => setPreviewMode('desktop')}
            className={`p-1.5 rounded transition-colors ${
            previewMode === 'desktop' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`
            }>

              <Monitor className="w-4 h-4" />
            </button>
            <button data-ev-id="ev_e0c9572f7b"
            onClick={() => setPreviewMode('mobile')}
            className={`p-1.5 rounded transition-colors ${
            previewMode === 'mobile' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`
            }>

              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Email Preview */}
        <div data-ev-id="ev_23c8dd8361"
        className="flex-1 rounded-xl border border-border overflow-hidden"
        style={{ backgroundColor: design.outerBgColor }}>

          <div data-ev-id="ev_09c83e048d" className="h-full overflow-auto p-4 md:p-8">
            <div data-ev-id="ev_f68b8d19b8"
            className={`mx-auto transition-all duration-300 ${previewMode === 'mobile' ? 'max-w-[320px]' : ''}`}
            style={{ maxWidth: previewMode === 'desktop' ? design.cardMaxWidth : 320 }}>

              {/* Email Card */}
              <div data-ev-id="ev_ce65737da2"
              className="overflow-hidden"
              style={{
                backgroundColor: design.contentBgColor,
                borderRadius: design.cardBorderRadius,
                boxShadow: design.cardShadow ?
                '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' :
                'none'
              }}>

                {/* Header */}
                <div data-ev-id="ev_7ed402fbc4"
                style={{
                  background: `linear-gradient(135deg, ${design.headerGradientStart} 0%, ${design.headerGradientEnd} 100%)`,
                  padding: '24px 32px'
                }}>

                  <div data-ev-id="ev_1d1618a7be" className="flex items-center gap-3">
                    {design.showHeaderIcon &&
                    <div data-ev-id="ev_7baf0b6412"
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>

                        {design.headerIconType === 'logo' && design.headerLogoUrl ?
                      <img data-ev-id="ev_4993496630"
                      src={design.headerLogoUrl}
                      alt="Logo"
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }} /> :


                      <span data-ev-id="ev_1368d10265" className="text-xl">{design.headerIconEmoji}</span>
                      }
                      </div>
                    }
                    <div data-ev-id="ev_35af949b5b">
                      <p data-ev-id="ev_3659ca8543" className="text-white font-bold text-lg m-0">{design.headerTitle}</p>
                      <p data-ev-id="ev_3905bffa9a" className="text-white/80 text-sm m-0 mt-0.5">{design.headerSubtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div data-ev-id="ev_a7b9307629"
                style={{
                  padding: design.contentPadding,
                  color: design.contentTextColor,
                  fontSize: design.contentFontSize,
                  lineHeight: 1.6
                }}>

                  <p data-ev-id="ev_2f60f00b7e" className="m-0 mb-4">Hallo Max Mustermann,</p>
                  <p data-ev-id="ev_a5d688a3de" className="m-0 mb-4">
                    Eine neue Bestellung wurde eingereicht und wartet auf Ihre Freigabe:
                  </p>
                  <div data-ev-id="ev_0b9049f651"
                  className="p-4 rounded-lg mb-4"
                  style={{ backgroundColor: design.outerBgColor }}>

                    <p data-ev-id="ev_dd08eb75d3" className="m-0 font-semibold">Büromaterial für Verwaltung</p>
                    <p data-ev-id="ev_3e8b36548b" className="m-0 text-sm opacity-70">Erstellt von: Maria Muster</p>
                    <p data-ev-id="ev_606debdcf1" className="m-0 text-sm opacity-70">Betrag: € 245,00</p>
                  </div>

                  <div data-ev-id="ev_c1a75be0bf" className="pt-6 mt-6 border-t border-gray-200">
                    <p data-ev-id="ev_d80ff0481e" className="m-0 mb-4 text-sm opacity-80">
                      {design.greetingText}<br data-ev-id="ev_61562dec64" />
                      <strong data-ev-id="ev_32d4d10fad">{design.signatureText}</strong>
                    </p>
                    <a data-ev-id="ev_85799e4997"
                    href="#"
                    className="inline-block text-center font-semibold no-underline"
                    style={{
                      background: `linear-gradient(135deg, ${design.buttonGradientStart} 0%, ${design.buttonGradientEnd} 100%)`,
                      color: design.buttonTextColor,
                      padding: '12px 24px',
                      borderRadius: design.buttonBorderRadius,
                      fontSize: 14
                    }}>

                      {design.buttonText} →
                    </a>
                  </div>
                </div>

                {/* Footer */}
                <div data-ev-id="ev_72ca45f030"
                style={{
                  backgroundColor: design.footerBgColor,
                  padding: '20px 32px',
                  borderTop: '1px solid #e5e7eb'
                }}>

                  <div data-ev-id="ev_be96a270e3" className="flex justify-between items-start">
                    <div data-ev-id="ev_ba6b5d10e1" style={{ color: design.footerTextColor, fontSize: 12 }}>
                      <p data-ev-id="ev_40c4feb915" className="m-0">{design.footerLine1}</p>
                      <p data-ev-id="ev_f5556e8ba9" className="m-0 mt-1">{design.footerLine2}</p>
                    </div>
                    <p data-ev-id="ev_5a162ad995"
                    className="m-0 text-right"
                    style={{ color: design.footerTextColor, fontSize: 12 }}>

                      {design.copyrightText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

}