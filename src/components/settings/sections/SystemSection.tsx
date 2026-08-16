import { useState } from 'react';
import { Globe, Save, Check, ExternalLink } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

interface SystemSectionProps {
  systemHomepageUrl: string;
  updateSystemHomepageUrl: (url: string) => Promise<{error: Error | null;}>;
}

export function SystemSection({
  systemHomepageUrl,
  updateSystemHomepageUrl
}: SystemSectionProps) {
  const [url, setUrl] = useState(systemHomepageUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateSystemHomepageUrl(url);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div data-ev-id="ev_4a34092989">
      <SectionHeader
        icon={Globe}
        title="System"
        description="Allgemeine Systemeinstellungen." />


      <SectionCard
        title="Homepage URL"
        description="Link zur Feuerwehr-Homepage (wird im Dashboard angezeigt).">

        <div data-ev-id="ev_9081e37302" className="flex gap-2">
          <input data-ev-id="ev_f2be8122af"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.feuerwehr-beispiel.at"
          className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20" />

          <button data-ev-id="ev_d51fae353a"
          onClick={handleSave}
          disabled={saving || url === systemHomepageUrl}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Gespeichert' : 'Speichern'}
          </button>
        </div>
        {systemHomepageUrl &&
        <a data-ev-id="ev_7243d1156c"
        href={systemHomepageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline">

            <ExternalLink className="w-4 h-4" />
            Zur Homepage
          </a>
        }
      </SectionCard>
    </div>);

}