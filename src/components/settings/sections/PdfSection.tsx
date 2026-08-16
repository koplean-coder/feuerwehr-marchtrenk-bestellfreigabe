import { useState } from 'react';
import { FileText, Upload, Save, Check, Image } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';
import { supabase } from '@/integrations/supabase/client';

interface PdfSectionProps {
  pdfBackgroundUrl: string;
  pdfBackgroundOpacity: number;
  commanderSignatureUrl: string;
  commanderStampUrl: string;
  updatePdfBackgroundUrl: (url: string) => Promise<{error: Error | null;}>;
  updatePdfBackgroundOpacity: (opacity: number) => Promise<{error: Error | null;}>;
  updateCommanderSignatureUrl: (url: string) => Promise<{error: Error | null;}>;
  updateCommanderStampUrl: (url: string) => Promise<{error: Error | null;}>;
}

export function PdfSection({
  pdfBackgroundUrl,
  pdfBackgroundOpacity,
  commanderSignatureUrl,
  commanderStampUrl,
  updatePdfBackgroundUrl,
  updatePdfBackgroundOpacity,
  updateCommanderSignatureUrl,
  updateCommanderStampUrl
}: PdfSectionProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(pdfBackgroundOpacity);

  const handleFileUpload = async (
  file: File,
  type: 'background' | 'signature' | 'stamp') =>
  {
    if (!supabase) return;
    setUploading(type);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `pdf-assets/${fileName}`;

      const { error: uploadError } = await supabase.storage.
      from('uploads').
      upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.
      from('uploads').
      getPublicUrl(filePath);

      const url = urlData?.publicUrl || '';

      switch (type) {
        case 'background':
          await updatePdfBackgroundUrl(url);
          break;
        case 'signature':
          await updateCommanderSignatureUrl(url);
          break;
        case 'stamp':
          await updateCommanderStampUrl(url);
          break;
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div data-ev-id="ev_19978477c0">
      <SectionHeader
        icon={FileText}
        title="PDF Einstellungen"
        description="Hintergrund, Unterschrift und Stempel für generierte PDFs." />


      <div data-ev-id="ev_eeb1b018fd" className="grid gap-4">
        {/* Hintergrund */}
        <SectionCard title="PDF Hintergrund">
          <div data-ev-id="ev_d351c0dbf8" className="flex items-start gap-4">
            {pdfBackgroundUrl &&
            <img data-ev-id="ev_730527ce8c"
            src={pdfBackgroundUrl}
            alt="Hintergrund"
            className="w-24 h-32 object-cover border rounded-lg" />

            }
            <div data-ev-id="ev_481608612a" className="flex-1">
              <label data-ev-id="ev_4b6ece11b8" className="block">
                <span data-ev-id="ev_32783f9b0c" className="sr-only">Hintergrund hochladen</span>
                <input data-ev-id="ev_95f2488448"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'background');
                }}
                disabled={uploading === 'background'}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />

              </label>
              <div data-ev-id="ev_3118416250" className="mt-4">
                <label data-ev-id="ev_21baf385a9" className="text-sm text-muted-foreground">Transparenz: {opacity}%</label>
                <input data-ev-id="ev_41c623acb4"
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                onMouseUp={() => updatePdfBackgroundOpacity(opacity)}
                className="w-full" />

              </div>
            </div>
          </div>
        </SectionCard>

        {/* Unterschrift & Stempel */}
        <div data-ev-id="ev_f783791481" className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Kommandant Unterschrift">
            {commanderSignatureUrl &&
            <img data-ev-id="ev_bac2f46f9f"
            src={commanderSignatureUrl}
            alt="Unterschrift"
            className="h-16 object-contain mb-3" />

            }
            <input data-ev-id="ev_4a5ab12208"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'signature');
            }}
            disabled={uploading === 'signature'}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground" />

          </SectionCard>

          <SectionCard title="Kommandant Stempel">
            {commanderStampUrl &&
            <img data-ev-id="ev_d8830bc1cf"
            src={commanderStampUrl}
            alt="Stempel"
            className="h-16 object-contain mb-3" />

            }
            <input data-ev-id="ev_642dcf595a"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'stamp');
            }}
            disabled={uploading === 'stamp'}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground" />

          </SectionCard>
        </div>
      </div>
    </div>);

}