import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  File,
  Image,
  FileSpreadsheet,
  X,
  Loader2,
  ChevronDown,
  AlertCircle } from
'lucide-react';
import {
  useSupplierDocuments,
  type SupplierDocument,
  DOCUMENT_TYPE_OPTIONS } from
'@/hooks/useSupplierDocuments';

interface SupplierDocumentsSectionProps {
  supplierId: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
'application/pdf',
'image/jpeg',
'image/png',
'image/gif',
'image/webp',
'application/msword',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/vnd.ms-excel',
'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
'text/plain'];


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
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  }
  return <File className="w-5 h-5 text-gray-500" />;
}

export function SupplierDocumentsSection({ supplierId }: SupplierDocumentsSectionProps) {
  const {
    documents,
    loading,
    uploading,
    uploadDocument,
    downloadDocument,
    deleteDocument
  } = useSupplierDocuments(supplierId);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('other');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Dateityp nicht erlaubt. Erlaubt: PDF, Bilder, Word, Excel, Text.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`Datei zu groß (${formatFileSize(file.size)}). Maximum: 5 MB.`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const { error: uploadError } = await uploadDocument(
      selectedFile,
      documentType,
      description || undefined
    );

    if (uploadError) {
      setError(uploadError.message);
    } else {
      setSelectedFile(null);
      setDocumentType('other');
      setDescription('');
      setShowUploadForm(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;
    setDeletingId(id);
    await deleteDocument(id);
    setDeletingId(null);
  };

  const handleDownload = async (doc: SupplierDocument) => {
    setDownloadingId(doc.id);
    await downloadDocument(doc);
    setDownloadingId(null);
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setDocumentType('other');
    setDescription('');
    setError(null);
    setShowUploadForm(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <section data-ev-id="ev_2f68d2fda0" className="border-2 border-rose-300 rounded-xl p-2">
      <div data-ev-id="ev_20e0af871a" className="flex items-center justify-between mb-3">
        <div data-ev-id="ev_964cd08e9d" className="flex items-center gap-2">
          <div data-ev-id="ev_66c4d3cb62" className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <FileText className="w-4 h-4 text-rose-600" />
          </div>
          <h4 data-ev-id="ev_adfef4ffa2" className="font-bold text-foreground">Dokumente</h4>
          <span data-ev-id="ev_d95073b968" className="text-xs text-muted-foreground">({documents.length})</span>
        </div>
        {!showUploadForm &&
        <button data-ev-id="ev_e3e3f696a7"
        onClick={() => setShowUploadForm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">

            <Upload className="w-4 h-4" />
            Hochladen
          </button>
        }
      </div>

      <div data-ev-id="ev_b5d44c1f53" className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-100">
        {loading ?
        <div data-ev-id="ev_8a7bfa720f" className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
          </div> :

        <div data-ev-id="ev_07310d4842" className="flex flex-col gap-3">
            {/* Upload Form */}
            {showUploadForm &&
          <div data-ev-id="ev_ecb4c573e4" className="bg-white rounded-xl p-4 border border-rose-200 shadow-sm">
                <div data-ev-id="ev_19c5b5b17c" className="flex items-center justify-between mb-4">
                  <h5 data-ev-id="ev_0ab374a412" className="font-semibold text-foreground">Dokument hochladen</h5>
                  <button data-ev-id="ev_5f743fe5b1"
              onClick={cancelUpload}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">

                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {error &&
            <div data-ev-id="ev_1b160ad812" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p data-ev-id="ev_ca47b88716" className="text-sm text-red-700">{error}</p>
                  </div>
            }

                <div data-ev-id="ev_9b60f844e1" className="flex flex-col gap-3">
                  {/* File Input */}
                  <div data-ev-id="ev_eebdf91f8b">
                    <label data-ev-id="ev_f62ed3b3c8" className="block text-xs font-medium text-muted-foreground mb-1">
                      Datei auswählen *
                    </label>
                    <input data-ev-id="ev_028ca533e4"
                ref={inputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-rose-100 file:text-rose-700 file:font-medium hover:file:bg-rose-200 file:cursor-pointer cursor-pointer" />

                    {selectedFile &&
                <p data-ev-id="ev_9ffe7a5776" className="mt-1 text-xs text-muted-foreground">
                        Ausgewählt: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                }
                  </div>

                  {/* Document Type */}
                  <div data-ev-id="ev_98c0ae28ce">
                    <label data-ev-id="ev_74b844c84d" className="block text-xs font-medium text-muted-foreground mb-1">
                      Dokumententyp
                    </label>
                    <div data-ev-id="ev_722a4c45ec" className="relative">
                      <select data-ev-id="ev_2c5b75a82b"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer">

                        {DOCUMENT_TYPE_OPTIONS.map((opt) =>
                    <option data-ev-id="ev_5d97fa8567" key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                    )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Description */}
                  <div data-ev-id="ev_890992378b">
                    <label data-ev-id="ev_8af91468d7" className="block text-xs font-medium text-muted-foreground mb-1">
                      Beschreibung (optional)
                    </label>
                    <input data-ev-id="ev_aa9ab70a4a"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Gültig bis 2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />

                  </div>
                </div>

                <div data-ev-id="ev_f564f2d235" className="flex justify-end gap-2 mt-4">
                  <button data-ev-id="ev_f1516476d0"
              onClick={cancelUpload}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-slate-100 rounded-lg transition-colors">

                    Abbrechen
                  </button>
                  <button data-ev-id="ev_48ba582ac7"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">

                    {uploading ?
                <Loader2 className="w-4 h-4 animate-spin" /> :

                <Upload className="w-4 h-4" />
                }
                    Hochladen
                  </button>
                </div>
              </div>
          }

            {/* Document List */}
            {documents.length === 0 && !showUploadForm ?
          <p data-ev-id="ev_529f48e223" className="text-sm text-muted-foreground italic text-center py-4">
                Keine Dokumente hinterlegt
              </p> :

          documents.map((doc) => {
            const typeOption = DOCUMENT_TYPE_OPTIONS.find(
              (t) => t.id === doc.document_type
            );
            return (
              <div data-ev-id="ev_a5e13b10c2"
              key={doc.id}
              className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">

                    <div data-ev-id="ev_2e45716cbd" className="flex items-start justify-between">
                      <div data-ev-id="ev_fa99cb1921" className="flex items-start gap-3">
                        <div data-ev-id="ev_66e515fd22" className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {getFileIcon(doc.mime_type)}
                        </div>
                        <div data-ev-id="ev_793ad834f7" className="min-w-0">
                          <h5 data-ev-id="ev_13fd2ba6f7" className="font-medium text-foreground truncate max-w-[200px]">
                            {doc.file_name}
                          </h5>
                          <div data-ev-id="ev_6c9c20ecbc" className="flex flex-wrap items-center gap-2 mt-1">
                            {typeOption &&
                        <span data-ev-id="ev_2f94de22bd"
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeOption.color}`}>

                                {typeOption.label}
                              </span>
                        }
                            <span data-ev-id="ev_2456db7270" className="text-xs text-muted-foreground">
                              {formatFileSize(doc.file_size)}
                            </span>
                            <span data-ev-id="ev_7bf04a5f3d" className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                          {doc.description &&
                      <p data-ev-id="ev_6cd3355ea5" className="text-sm text-muted-foreground mt-1">
                              {doc.description}
                            </p>
                      }
                        </div>
                      </div>
                      <div data-ev-id="ev_25d82a1b4f" className="flex items-center gap-1">
                        <button data-ev-id="ev_996c78bf25"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="p-2 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Herunterladen">

                          {downloadingId === doc.id ?
                      <Loader2 className="w-4 h-4 text-rose-500 animate-spin" /> :

                      <Download className="w-4 h-4 text-rose-600" />
                      }
                        </button>
                        <button data-ev-id="ev_0af6d122e3"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Löschen">

                          {deletingId === doc.id ?
                      <Loader2 className="w-4 h-4 text-red-500 animate-spin" /> :

                      <Trash2 className="w-4 h-4 text-red-500" />
                      }
                        </button>
                      </div>
                    </div>
                  </div>);

          })
          }
          </div>
        }
      </div>
    </section>);

}