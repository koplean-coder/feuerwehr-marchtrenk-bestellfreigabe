import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupplierDocument {
  id: string;
  supplier_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export const DOCUMENT_TYPE_OPTIONS = [
  { id: 'contract', label: 'Vertrag', color: 'text-blue-600 bg-blue-100' },
  { id: 'catalog', label: 'Katalog', color: 'text-purple-600 bg-purple-100' },
  { id: 'pricelist', label: 'Preisliste', color: 'text-green-600 bg-green-100' },
  { id: 'certificate', label: 'Zertifikat', color: 'text-amber-600 bg-amber-100' },
  { id: 'invoice', label: 'Rechnung', color: 'text-red-600 bg-red-100' },
  { id: 'other', label: 'Sonstiges', color: 'text-gray-600 bg-gray-100' }
];

export function useSupplierDocuments(supplierId: string | null) {
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const fetchDocuments = useCallback(async () => {
    if (!supabase || !supplierId) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('supplier_documents')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data as SupplierDocument[]);
    }
    setLoading(false);
  }, [supplierId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function uploadDocument(
    file: File,
    documentType: string = 'other',
    description?: string
  ): Promise<{ error: Error | null }> {
    if (!supabase || !supplierId || !user) {
      return { error: new Error('Nicht verbunden') };
    }

    setUploading(true);

    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${supplierId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('supplier-documents')
        .upload(fileName, file);

      if (uploadError) {
        setUploading(false);
        return { error: new Error(uploadError.message) };
      }

      // Create database record
      const { error: dbError } = await supabase
        .from('supplier_documents')
        .insert({
          supplier_id: supplierId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          document_type: documentType,
          description: description || null,
          uploaded_by: user.id
        });

      if (dbError) {
        // Try to clean up uploaded file
        await supabase.storage.from('supplier-documents').remove([fileName]);
        setUploading(false);
        return { error: new Error(dbError.message) };
      }

      await fetchDocuments();
      setUploading(false);
      return { error: null };
    } catch (err) {
      setUploading(false);
      return { error: err as Error };
    }
  }

  async function downloadDocument(doc: SupplierDocument): Promise<void> {
    if (!supabase) return;

    const { data, error } = await supabase.storage
      .from('supplier-documents')
      .download(doc.file_path);

    if (error) {
      console.error('Download error:', error);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function deleteDocument(id: string): Promise<{ error: Error | null }> {
    if (!supabase) return { error: new Error('Nicht verbunden') };

    // Find document to get file path
    const doc = documents.find((d) => d.id === id);
    if (!doc) return { error: new Error('Dokument nicht gefunden') };

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('supplier-documents')
      .remove([doc.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue anyway, database record should still be deleted
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from('supplier_documents')
      .delete()
      .eq('id', id);

    if (!dbError) {
      await fetchDocuments();
    }

    return { error: dbError ? new Error(dbError.message) : null };
  }

  return {
    documents,
    loading,
    uploading,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    refetch: fetchDocuments
  };
}
