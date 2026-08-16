import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, File as FileIcon, FileText, Image, AlertCircle, ClipboardPaste } from 'lucide-react';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_FILES = 5;
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


const ALLOWED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt';

export interface UploadedFile {
  file: File;
  preview?: string;
  id: string;
}

interface FileUploadProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
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
  return <FileIcon className="w-5 h-5 text-gray-500" />;
}

export function FileUpload({ files, onChange, disabled = false }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Dateityp "${file.type || 'unbekannt'}" nicht erlaubt. Erlaubt: PDF, Bilder, Word, Excel, Text.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Datei "${file.name}" ist zu groß (${formatFileSize(file.size)}). Maximum: 2 MB.`;
    }
    return null;
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setError(null);
    
    // WICHTIG: Dateien sofort in ein neues Array kopieren
    const fileArray: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      fileArray.push(newFiles[i]);
    }

    // Check total count
    if (files.length + fileArray.length > MAX_FILES) {
      setError(`Maximal ${MAX_FILES} Dateien erlaubt. Sie haben bereits ${files.length} Datei(en).`);
      return;
    }

    const validFiles: UploadedFile[] = [];
    const baseTime = Date.now();
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Eindeutige ID mit Index für jede Datei
      const uploadedFile: UploadedFile = {
        file,
        id: `${baseTime}-${i}-${Math.random().toString(36).substring(2, 11)}`
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        uploadedFile.preview = URL.createObjectURL(file);
      }

      validFiles.push(uploadedFile);
    }

    onChange([...files, ...validFiles]);
  }, [files, onChange, validateFile]);

  const removeFile = useCallback((id: string) => {
    const file = files.find((f) => f.id === id);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    onChange(files.filter((f) => f.id !== id));
    setError(null);
  }, [files, onChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // WICHTIG: FileList sofort in ein Array kopieren, da die Referenz sich ändern kann
      const filesArray: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        filesArray.push(e.dataTransfer.files[i]);
      }
      addFiles(filesArray);
    }
  }, [disabled, addFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [addFiles]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  // Screenshot aus Zwischenablage einfügen
  const handlePasteFromClipboard = useCallback(async () => {
    if (disabled) return;
    setError(null);

    try {
      // Clipboard API verwenden
      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        // Nach Bild-Typen suchen
        const imageType = item.types.find((type) => type.startsWith('image/'));

        if (imageType) {
          const blob = await item.getType(imageType);

          // Dateiname mit Zeitstempel generieren
          const now = new Date();
          const timestamp = now.toISOString().
          replace(/T/, '_').
          replace(/:/g, '-').
          replace(/\..+/, '');
          const extension = imageType.split('/')[1] || 'png';
          const fileName = `Screenshot_${timestamp}.${extension}`;

          // Blob zu File konvertieren
          const file = new File([blob], fileName, { type: imageType });

          // Über existierende addFiles Funktion hinzufügen
          addFiles([file]);
          return;
        }
      }

      setError('Kein Bild in der Zwischenablage gefunden. Machen Sie zuerst einen Screenshot (z.B. mit Windows+Shift+S).');
    } catch (err) {
      console.error('Clipboard error:', err);
      // Fallback: Eventuell keine Berechtigung oder leere Zwischenablage
      setError('Konnte nicht auf die Zwischenablage zugreifen. Bitte erlauben Sie den Zugriff oder verwenden Sie Strg+V.');
    }
  }, [disabled, addFiles]);

  // Paste Event Handler für Strg+V
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (disabled) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          // Dateiname mit Zeitstempel generieren
          const now = new Date();
          const timestamp = now.toISOString().
          replace(/T/, '_').
          replace(/:/g, '-').
          replace(/\..+/, '');
          const extension = item.type.split('/')[1] || 'png';
          const fileName = `Screenshot_${timestamp}.${extension}`;

          // Blob zu File konvertieren mit neuem Namen
          const file = new File([blob], fileName, { type: item.type });
          addFiles([file]);
        }
        return;
      }
    }
  }, [disabled, addFiles]);

  return (
    <div data-ev-id="ev_8890dbcbaa" className="flex flex-col gap-3" onPaste={handlePaste}>
      <label data-ev-id="ev_6085d52a22" className="block text-sm font-medium text-foreground">
        Anhänge (optional)
      </label>
      
      {/* Drop Zone */}
      <div data-ev-id="ev_0446f779f8"
      onClick={handleClick}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      tabIndex={0}
      className={`
          relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${disabled ? 'bg-muted/50 cursor-not-allowed border-border' : ''}
          ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
        `}>

        <input data-ev-id="ev_3b5b90e92a"
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS}
        onChange={handleChange}
        disabled={disabled}
        className="hidden" />

        
        <Upload className={`w-8 h-8 mb-2 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
        <p data-ev-id="ev_e9928546a4" className="text-sm font-medium text-foreground">
          Dateien hierher ziehen oder klicken
        </p>
        <p data-ev-id="ev_29f2f68261" className="text-xs text-muted-foreground mt-1">
          PDF, Bilder, Word, Excel, Text • Max. 2 MB pro Datei • Max. {MAX_FILES} Dateien
        </p>
      </div>
      
      {/* Screenshot Button */}
      <button data-ev-id="ev_62bbf14ced"
      type="button"
      onClick={(e) => {
        e.preventDefault();
        handlePasteFromClipboard();
      }}
      disabled={disabled}
      className={`
          flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium transition-colors
          ${disabled ?
      'bg-muted/50 text-muted-foreground cursor-not-allowed' :
      'bg-card hover:bg-muted text-foreground hover:border-primary/50'}
        `
      }
      title="Screenshot aus Zwischenablage einfügen (oder Strg+V)">
        <ClipboardPaste className="w-4 h-4" />
        Screenshot einfügen
      </button>

      {/* Error Message */}
      {error &&
      <div data-ev-id="ev_86b10dc036" className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span data-ev-id="ev_819d216c5c">{error}</span>
        </div>
      }

      {/* File List */}
      {files.length > 0 &&
      <div data-ev-id="ev_90dc6c8df7" className="flex flex-col gap-2">
          {files.map((uploadedFile) =>
        <div data-ev-id="ev_baab021fad"
        key={uploadedFile.id}
        className="flex items-center gap-3 p-3 bg-muted rounded-lg group">

              {/* Preview or Icon */}
              {uploadedFile.preview ?
          <img data-ev-id="ev_bafe22dd84"
          src={uploadedFile.preview}
          alt={uploadedFile.file.name}
          className="w-10 h-10 object-cover rounded" /> :


          <div data-ev-id="ev_7f083c49b5" className="w-10 h-10 flex items-center justify-center bg-background rounded">
                  {getFileIcon(uploadedFile.file.type)}
                </div>
          }
              
              {/* File Info */}
              <div data-ev-id="ev_95a06b102e" className="flex-1 min-w-0">
                <p data-ev-id="ev_3daa27d354" className="text-sm font-medium text-foreground truncate">
                  {uploadedFile.file.name}
                </p>
                <p data-ev-id="ev_a8e1d60f84" className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.file.size)}
                </p>
              </div>
              
              {/* Remove Button */}
              {!disabled &&
          <button data-ev-id="ev_1d68448b07"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeFile(uploadedFile.id);
          }}
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
          title="Entfernen">

                  <X className="w-4 h-4" />
                </button>
          }
            </div>
        )}
          
          <p data-ev-id="ev_f806b0b208" className="text-xs text-muted-foreground">
            {files.length} von {MAX_FILES} Dateien ausgewählt
          </p>
        </div>
      }
    </div>);

}