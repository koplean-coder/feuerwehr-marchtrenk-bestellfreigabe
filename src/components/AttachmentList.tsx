import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { File, FileText, Image, Download, ExternalLink, Loader2, Trash2, AlertTriangle } from 'lucide-react';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  uploaded_by: string;
}

interface AttachmentListProps {
  orderId: string;
  canDelete?: boolean;
  onDelete?: (attachmentId: string, filePath: string) => Promise<{error: Error | null;}>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <Image className="w-5 h-5 text-blue-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  return <File className="w-5 h-5 text-gray-500" />;
}

export function AttachmentList({ orderId, canDelete = false, onDelete }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAttachments() {
      if (!supabase) return;

      const { data } = await supabase
        .from('order_attachments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      setAttachments(data as Attachment[] ?? []);
      setLoading(false);
    }
    
    fetchAttachments();
  }, [orderId]);

  async function handleDownload(attachment: Attachment) {
    if (!supabase) return;

    setDownloading(attachment.id);

    try {
      const { data, error } = await supabase.storage.
      from('order-attachments').
      download(attachment.file_path);

      if (error) {
        console.error('Download error:', error);
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  async function handleOpenInTab(attachment: Attachment) {
    if (!supabase) return;

    setDownloading(attachment.id);

    try {
      const { data, error } = await supabase.storage.
      from('order-attachments').
      createSignedUrl(attachment.file_path, 3600); // 1 hour

      if (error || !data?.signedUrl) {
        console.error('Signed URL error:', error);
        return;
      }

      window.open(data.signedUrl, '_blank');
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(attachment: Attachment) {
    if (!onDelete) return;

    setDeleting(attachment.id);
    setConfirmDelete(null);

    try {
      const { error } = await onDelete(attachment.id, attachment.file_path);

      if (!error) {
        // Entferne den Anhang aus der lokalen Liste
        setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      }
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div data-ev-id="ev_22a80da518" className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>);

  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div data-ev-id="ev_e524689bce" className="mt-6 pt-6 border-t border-border">
      <h3 data-ev-id="ev_b8242ec4f4" className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <File className="w-5 h-5" />
        Anhänge ({attachments.length})
      </h3>
      
      <div data-ev-id="ev_7bd4cf0da8" className="flex flex-col gap-2">
        {attachments.map((attachment) =>
        <div
          data-ev-id="ev_9858ca5dae"
          key={attachment.id}
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
          confirmDelete === attachment.id ?
          'bg-red-50 border border-red-200' :
          'bg-muted'}`
          }>

            {/* Icon */}
            <div data-ev-id="ev_ac08c99a55" className="w-10 h-10 flex items-center justify-center bg-background rounded flex-shrink-0">
              {getFileIcon(attachment.mime_type)}
            </div>
            
            {/* File Info */}
            <div data-ev-id="ev_2a03b4b8ad" className="flex-1 min-w-0">
              <p data-ev-id="ev_e2be4626d4" className="text-sm font-medium text-foreground truncate">
                {attachment.file_name}
              </p>
              <p data-ev-id="ev_3447e68513" className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file_size)}
              </p>
            </div>
            
            {/* Bestätigungsdialog */}
            {confirmDelete === attachment.id &&
          <div data-ev-id="ev_confirm_delete" className="flex items-center gap-2 mr-2">
                <span data-ev-id="ev_f56735498d" className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Löschen?
                </span>
                <button data-ev-id="ev_65761f07b0"
            onClick={() => handleDelete(attachment)}
            disabled={deleting === attachment.id}
            className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50">

                  {deleting === attachment.id ?
              <Loader2 className="w-3 h-3 animate-spin" /> :

              'Ja'
              }
                </button>
                <button data-ev-id="ev_c2cb51d6af"
            onClick={() => setConfirmDelete(null)}
            disabled={deleting === attachment.id}
            className="px-2 py-1 text-xs font-medium bg-muted text-foreground rounded hover:bg-muted/80 transition-colors disabled:opacity-50">

                  Nein
                </button>
              </div>
          }
            
            {/* Actions */}
            {confirmDelete !== attachment.id &&
          <div data-ev-id="ev_908dc791e6" className="flex items-center gap-1">
                <button
              data-ev-id="ev_a1837580d4"
              onClick={() => handleOpenInTab(attachment)}
              disabled={downloading === attachment.id || deleting === attachment.id}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded transition-colors disabled:opacity-50"
              title="In neuem Tab öffnen">

                  {downloading === attachment.id ?
              <Loader2 className="w-4 h-4 animate-spin" /> :

              <ExternalLink className="w-4 h-4" />
              }
                </button>
                <button
              data-ev-id="ev_dfd7d73db3"
              onClick={() => handleDownload(attachment)}
              disabled={downloading === attachment.id || deleting === attachment.id}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded transition-colors disabled:opacity-50"
              title="Herunterladen">

                  <Download className="w-4 h-4" />
                </button>
                {canDelete && onDelete &&
            <button
              data-ev-id="ev_delete_attachment"
              onClick={() => setConfirmDelete(attachment.id)}
              disabled={deleting === attachment.id}
              className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              title="Anhang löschen">

                    {deleting === attachment.id ?
              <Loader2 className="w-4 h-4 animate-spin" /> :

              <Trash2 className="w-4 h-4" />
              }
                  </button>
            }
              </div>
          }
          </div>
        )}
      </div>
    </div>);

}