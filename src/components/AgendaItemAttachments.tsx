import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Paperclip, Upload, X, Trash2, FileText, Image, File, Maximize2, Minimize2, Download } from 'lucide-react';

interface Attachment {
  id: string;
  agenda_item_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface AgendaItemAttachmentsProps {
  agendaItemId: string;
  canUpload: boolean;
  canDelete: boolean;
  maxAttachments?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

export function AgendaItemAttachments({
  agendaItemId,
  canUpload,
  canDelete,
  maxAttachments = 5
}: AgendaItemAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.
      from('meeting_agenda_item_attachments').
      select('*').
      eq('agenda_item_id', agendaItemId).
      order('created_at', { ascending: true });

      if (error) throw error;
      setAttachments(data || []);
    } catch (err) {
      console.error('Error fetching attachments:', err);
    } finally {
      setLoading(false);
    }
  }, [agendaItemId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!supabase || !e.target.files?.length) return;

    if (attachments.length >= maxAttachments) {
      alert(`Maximal ${maxAttachments} Anhänge pro Eintrag erlaubt.`);
      return;
    }

    const file = e.target.files[0];
    const filePath = `${agendaItemId}/${Date.now()}_${file.name}`;

    setUploading(true);
    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage.
      from('agenda-attachments').
      upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create record
      const { error: insertError } = await supabase.
      from('meeting_agenda_item_attachments').
      insert({
        agenda_item_id: agendaItemId,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type
      });

      if (insertError) throw insertError;

      await fetchAttachments();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Fehler beim Hochladen der Datei.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!supabase || !confirm('Anhang wirklich löschen?')) return;

    try {
      // Delete from storage
      await supabase.storage.
      from('agenda-attachments').
      remove([attachment.file_path]);

      // Delete record
      await supabase.
      from('meeting_agenda_item_attachments').
      delete().
      eq('id', attachment.id);

      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Fehler beim Löschen.');
    }
  };

  const openPreview = async (attachment: Attachment) => {
    if (!supabase) return;

    try {
      const { data } = await supabase.storage.
      from('agenda-attachments').
      createSignedUrl(attachment.file_path, 3600); // 1 hour

      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
        setPreviewAttachment(attachment);
      }
    } catch (err) {
      console.error('Preview error:', err);
    }
  };

  const closePreview = () => {
    setPreviewAttachment(null);
    setPreviewUrl(null);
    setIsMaximized(false);
  };

  const downloadFile = async (attachment: Attachment) => {
    if (!supabase) return;

    try {
      const { data } = await supabase.storage.
      from('agenda-attachments').
      createSignedUrl(attachment.file_path, 60);

      if (data?.signedUrl) {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = attachment.file_name;
        a.click();
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (loading && attachments.length === 0) {
    return null;
  }

  const canAddMore = attachments.length < maxAttachments;
  const FileIcon = (mimeType: string) => getFileIcon(mimeType);

  return (
    <>
      {/* Attachment List */}
      {attachments.length > 0 &&
      <div data-ev-id="ev_2444abd735" className="flex flex-wrap gap-1 mt-1">
          {attachments.map((attachment) => {
          const Icon = FileIcon(attachment.mime_type);
          return (
            <div data-ev-id="ev_11ea7a13a6"
            key={attachment.id}
            className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-xs group cursor-pointer hover:bg-muted"
            onClick={() => openPreview(attachment)}
            title={`${attachment.file_name} (${formatFileSize(attachment.file_size)})`}>

                <Icon className="w-3 h-3 text-muted-foreground" />
                <span data-ev-id="ev_90e67880f6" className="max-w-[100px] truncate">{attachment.file_name}</span>
                {canDelete &&
              <button data-ev-id="ev_5710e2903b"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(attachment);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded text-red-500">

                    <X className="w-3 h-3" />
                  </button>
              }
              </div>);

        })}
        </div>
      }

      {/* Upload Button */}
      {canUpload && canAddMore &&
      <label data-ev-id="ev_d8b32e26de" className="inline-flex items-center gap-1 px-2 py-1 mt-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-pointer">
          <input data-ev-id="ev_176b59dd7e"
        type="file"
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" />

          {uploading ?
        <span data-ev-id="ev_a40d1092fe" className="animate-pulse">Hochladen...</span> :

        <>
              <Paperclip className="w-3 h-3" />
              <span data-ev-id="ev_c0aca89a56">Anhang ({attachments.length}/{maxAttachments})</span>
            </>
        }
        </label>
      }

      {/* Preview Modal */}
      {previewAttachment && previewUrl &&
      <div data-ev-id="ev_3e04ac1137"
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={closePreview}>

          <div data-ev-id="ev_386efeb73d"
        className={`bg-card rounded-xl shadow-2xl flex flex-col ${
        isMaximized ?
        'fixed inset-4' :
        'max-w-4xl max-h-[90vh] w-full mx-4'}`
        }
        onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div data-ev-id="ev_9cee73ab4d" className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div data-ev-id="ev_8a507175d1" className="flex items-center gap-2">
                {(() => {
                const Icon = FileIcon(previewAttachment.mime_type);
                return <Icon className="w-5 h-5 text-muted-foreground" />;
              })()}
                <span data-ev-id="ev_6ed8a7d6f5" className="font-medium truncate max-w-md">{previewAttachment.file_name}</span>
                <span data-ev-id="ev_a5aadbeb98" className="text-xs text-muted-foreground">
                  ({formatFileSize(previewAttachment.file_size)})
                </span>
              </div>
              <div data-ev-id="ev_6c9719bcaf" className="flex items-center gap-2">
                <button data-ev-id="ev_38cc8f38e7"
              onClick={() => downloadFile(previewAttachment)}
              className="p-2 hover:bg-muted rounded"
              title="Herunterladen">

                  <Download className="w-4 h-4" />
                </button>
                <button data-ev-id="ev_404722fa28"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 hover:bg-muted rounded"
              title={isMaximized ? 'Verkleinern' : 'Maximieren'}>

                  {isMaximized ?
                <Minimize2 className="w-4 h-4" /> :

                <Maximize2 className="w-4 h-4" />
                }
                </button>
                <button data-ev-id="ev_c59e8fd301"
              onClick={closePreview}
              className="p-2 hover:bg-muted rounded"
              title="Schließen">

                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div data-ev-id="ev_8f20878619" className="flex-1 overflow-auto p-4">
              {previewAttachment.mime_type.startsWith('image/') ?
            <img data-ev-id="ev_5ccc5b811c"
            src={previewUrl}
            alt={previewAttachment.file_name}
            className="max-w-full h-auto mx-auto" /> :

            previewAttachment.mime_type === 'application/pdf' ?
            <iframe data-ev-id="ev_24bf93a897"
            src={previewUrl}
            className="w-full h-full min-h-[600px]"
            title={previewAttachment.file_name} /> :


            <div data-ev-id="ev_6e7ace2f1e" className="flex flex-col items-center justify-center py-12 text-center">
                  <File className="w-16 h-16 text-muted-foreground mb-4" />
                  <p data-ev-id="ev_8d30f1a952" className="text-lg font-medium mb-2">{previewAttachment.file_name}</p>
                  <p data-ev-id="ev_ee55f8b067" className="text-muted-foreground mb-4">
                    Vorschau für diesen Dateityp nicht verfügbar
                  </p>
                  <button data-ev-id="ev_323a1c7252"
              onClick={() => downloadFile(previewAttachment)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">

                    <Download className="w-4 h-4" />
                    Herunterladen
                  </button>
                </div>
            }
            </div>
          </div>
        </div>
      }
    </>);

}