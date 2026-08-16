import { useState, useRef } from 'react';
import { AlertTriangle, X, Upload, Camera, Trash2, Send, ChevronDown } from 'lucide-react';
import { useProblemReports, type CreateProblemReportData } from '@/hooks/useProblemReports';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { consoleCapture } from '@/utils/consoleCapture';
import { supabase } from '@/integrations/supabase/client';

const PRIORITY_OPTIONS = [
{ value: 'low', label: 'Niedrig', color: 'bg-gray-100 text-gray-700' },
{ value: 'medium', label: 'Mittel', color: 'bg-yellow-100 text-yellow-700' },
{ value: 'high', label: 'Hoch', color: 'bg-orange-100 text-orange-700' },
{ value: 'critical', label: 'Kritisch', color: 'bg-red-100 text-red-700' }] as
const;

export function ProblemReportButton() {
  const { user } = useAuth();
  const { effectiveIsAdmin, effectiveIsKommandant } = useSimulation();
  const isAdmin = effectiveIsAdmin;
  const isKommandant = effectiveIsKommandant;
  const { createReport } = useProblemReports();
  const { problemReportEnabled } = useSettings();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [includeConsoleLogs, setIncludeConsoleLogs] = useState(true);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Don't show if disabled (unless admin/kommandant)
  if (!problemReportEnabled && !isAdmin && !isKommandant) {
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Datei zu groß. Maximal 5MB erlaubt.');
        return;
      }
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshotPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadScreenshot = async (): Promise<string | null> => {
    if (!screenshotFile || !supabase) return null;

    setUploading(true);
    try {
      const fileExt = screenshotFile.name.split('.').pop();
      const fileName = `problem-report-${Date.now()}.${fileExt}`;
      const filePath = `problem-reports/${fileName}`;

      const { error: uploadError } = await supabase.storage.
      from('uploads').
      upload(filePath, screenshotFile);

      if (uploadError) {
        console.error('Screenshot upload error:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage.
      from('uploads').
      getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Error uploading screenshot:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);

    try {
      // Upload screenshot if present
      let screenshotUrl: string | undefined;
      if (screenshotFile) {
        const url = await uploadScreenshot();
        if (url) screenshotUrl = url;
      }

      // Get console logs if enabled
      let consoleLogs: string | undefined;
      if (includeConsoleLogs) {
        consoleLogs = consoleCapture.getLogsAsString();
      }

      const reportData: CreateProblemReportData = {
        title: title.trim(),
        description: description.trim(),
        priority,
        screenshot_url: screenshotUrl,
        console_logs: consoleLogs
      };

      const result = await createReport(reportData);

      if (result.success) {
        // Send notification to admins and create task
        await notifyAdmins(title.trim(), priority);
        await createTaskForProblem(title.trim(), description.trim(), priority);

        setSuccess(true);
        setTimeout(() => {
          resetForm();
          setShowModal(false);
          setSuccess(false);
        }, 2000);
      } else {
        alert(result.error || 'Fehler beim Senden');
      }
    } catch (err) {
      console.error('Error submitting problem report:', err);
      alert('Fehler beim Senden der Meldung');
    } finally {
      setSubmitting(false);
    }
  };

  const notifyAdmins = async (reportTitle: string, reportPriority: string) => {
    if (!supabase) return;

    try {
      // Get all admins and kommandants
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'kommandant']);

      if (!admins || admins.length === 0) return;

      // Create notification for each admin
      const priorityLabel = PRIORITY_OPTIONS.find((p) => p.value === reportPriority)?.label || reportPriority;

      for (const admin of admins) {
        await supabase
          .from('notifications')
          .insert({
            user_id: admin.id,
            message: `Neue Problemmeldung (${priorityLabel}): ${reportTitle}`,
            notification_type: 'problem_report',
            is_read: false,
          });
      }
    } catch (err) {
      console.error('Error notifying admins:', err);
    }
  };

  // Erstellt automatisch eine Aufgabe für das gemeldete Problem
  // Speichert jetzt in todo_tasks statt tasks, damit es auf der Aufgaben-Seite erscheint
  const createTaskForProblem = async (reportTitle: string, reportDescription: string, reportPriority: string) => {
    if (!supabase || !user) return;

    try {
      // Finde ALLE Admins/Kommandanten
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['admin', 'kommandant']);

      if (adminsError) {
        console.error('Error fetching admins for task:', adminsError);
        return;
      }

      if (!admins || admins.length === 0) {
        console.warn('No admins found to assign problem task');
        return;
      }

      // Ersten Admin als Hauptzuständigen wählen
      const assignee = admins[0]?.id || null;
      
      // Fälligkeitsdatum basierend auf Priorität
      const dueDate = new Date();
      if (reportPriority === 'critical') {
        dueDate.setDate(dueDate.getDate() + 1); // 1 Tag
      } else if (reportPriority === 'high') {
        dueDate.setDate(dueDate.getDate() + 3); // 3 Tage
      } else {
        dueDate.setDate(dueDate.getDate() + 7); // 1 Woche
      }

      // Finde oder erstelle eine "Problemmeldungen" Liste für den ersten Admin
      let listId: string | null = null;
      
      // Suche zuerst nach einer existierenden Problemmeldungen-Liste des Admins
      const { data: existingList } = await supabase
        .from('todo_lists')
        .select('id')
        .eq('name', '🐛 Problemmeldungen')
        .eq('created_by', assignee)
        .single();
      
      if (existingList) {
        listId = existingList.id;
      } else if (assignee) {
        // Erstelle eine neue Liste für Problemmeldungen
        const { data: newList, error: listError } = await supabase
          .from('todo_lists')
          .insert({
            name: '🐛 Problemmeldungen',
            icon: 'bug',
            color: '#ef4444',
            created_by: assignee,
            sort_order: 999
          })
          .select('id')
          .single();
        
        if (listError) {
          console.error('[ProblemReport] Error creating list:', listError);
          // Fallback: Nutze irgendeine existierende Liste des Admins
          const { data: anyList } = await supabase
            .from('todo_lists')
            .select('id')
            .eq('created_by', assignee)
            .limit(1)
            .single();
          listId = anyList?.id || null;
        } else {
          listId = newList.id;
        }
      }
      
      if (!listId) {
        console.error('[ProblemReport] No list available for task creation');
        return;
      }
      
      console.log('[ProblemReport] Creating todo_task with:', {
        title: `🐛 Problem: ${reportTitle}`,
        assignee,
        listId,
        dueDate: dueDate.toISOString().split('T')[0]
      });

      // Aufgabe in todo_tasks erstellen (neues System - erscheint auf Aufgaben-Seite)
      const { data: taskData, error: taskError } = await supabase
        .from('todo_tasks')
        .insert({
          title: `🐛 Problem: ${reportTitle}`,
          notes: `**Gemeldetes Problem**\n\n${reportDescription}\n\n---\n_Gemeldet von einem Benutzer über die Problem-Melden Funktion_`,
          list_id: listId,
          created_by: user.id,
          assigned_to: assignee,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
          due_date: dueDate.toISOString().split('T')[0],
          is_important: reportPriority === 'critical' || reportPriority === 'high',
          is_completed: false,
          is_in_my_day: reportPriority === 'critical', // Kritische Probleme direkt in "Mein Tag"
          my_day_date: reportPriority === 'critical' ? new Date().toISOString().split('T')[0] : null,
          sort_order: 0
        })
        .select()
        .single();

      if (taskError) {
        console.error('[ProblemReport] Error creating todo_task:', taskError);
      } else {
        console.log('[ProblemReport] Todo task created successfully:', taskData);
        
        // Push-Benachrichtigung an alle Admins/Kommandanten
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          subject: 'Neue Aufgabe: Problemmeldung',
          message: `Eine neue Problemmeldung wurde als Aufgabe erstellt: "${reportTitle}". Bitte bearbeiten.`,
          notification_type: 'task'
        }));

        await supabase.from('notifications').insert(notifications);
        console.log(`[ProblemReport] Notifications sent to ${admins.length} admins`);
      }
    } catch (err) {
      console.error('[ProblemReport] Error creating task for problem:', err);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setIncludeConsoleLogs(true);
    removeScreenshot();
  };

  const openModal = () => {
    setShowModal(true);
    setSuccess(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button data-ev-id="ev_69457baeec"
      onClick={openModal}
      className="fixed bottom-4 left-4 z-50 p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all hover:scale-105 group"
      title="Problem melden">

        <AlertTriangle className="w-5 h-5" />
        <span data-ev-id="ev_6ba7a780c6" className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Problem melden
        </span>
      </button>

      {/* Modal */}
      {showModal &&
      <div data-ev-id="ev_872408532b" className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div data-ev-id="ev_c0c98e731b" className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div data-ev-id="ev_d7303334c9" className="px-6 py-4 border-b border-border flex items-center justify-between bg-red-50">
              <div data-ev-id="ev_29291a411a" className="flex items-center gap-3">
                <div data-ev-id="ev_4645bd3603" className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div data-ev-id="ev_8de8483427">
                  <h2 data-ev-id="ev_4d10088dfe" className="font-semibold text-foreground">Problem melden</h2>
                  <p data-ev-id="ev_4ce9def68d" className="text-xs text-muted-foreground">Hilf uns, die App zu verbessern</p>
                </div>
              </div>
              <button data-ev-id="ev_fbdd19e209"
            onClick={() => setShowModal(false)}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors">

                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            {success ?
          <div data-ev-id="ev_8181a750f9" className="p-8 text-center">
                <div data-ev-id="ev_5c6e66b2e5" className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                <h3 data-ev-id="ev_1293c01a5f" className="text-lg font-semibold text-foreground mb-2">Vielen Dank!</h3>
                <p data-ev-id="ev_ca2f0990bd" className="text-muted-foreground">Deine Meldung wurde erfolgreich gesendet.</p>
              </div> :

          <form data-ev-id="ev_0221b74f13" onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                {/* Title */}
                <div data-ev-id="ev_71bc5282d0">
                  <label data-ev-id="ev_a720581f79" className="block text-sm font-medium text-foreground mb-1">
                    Titel *
                  </label>
                  <input data-ev-id="ev_fcda85ff3b"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kurze Beschreibung des Problems"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required />

                </div>

                {/* Description */}
                <div data-ev-id="ev_8503d49cef">
                  <label data-ev-id="ev_6bf2a12ac4" className="block text-sm font-medium text-foreground mb-1">
                    Beschreibung *
                  </label>
                  <textarea data-ev-id="ev_08ace65f75"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Was ist passiert? Was hast du erwartet? Wie kann man das Problem nachstellen?"
              rows={4}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              required />

                </div>

                {/* Priority */}
                <div data-ev-id="ev_605870ab0c">
                  <label data-ev-id="ev_15b8c971b4" className="block text-sm font-medium text-foreground mb-1">
                    Priorität
                  </label>
                  <div data-ev-id="ev_252a869425" className="flex flex-wrap gap-2">
                    {PRIORITY_OPTIONS.map((option) =>
                <button data-ev-id="ev_3fbe2dbc30"
                key={option.value}
                type="button"
                onClick={() => setPriority(option.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                priority === option.value ?
                `${option.color} ring-2 ring-offset-1 ring-primary` :
                'bg-muted text-muted-foreground hover:bg-muted/80'}`
                }>

                        {option.label}
                      </button>
                )}
                  </div>
                </div>

                {/* Screenshot */}
                <div data-ev-id="ev_5ac7a2572b">
                  <label data-ev-id="ev_232c2b173a" className="block text-sm font-medium text-foreground mb-1">
                    Screenshot (optional)
                  </label>
                  {screenshotPreview ?
              <div data-ev-id="ev_13d5b06e01" className="relative">
                      <img data-ev-id="ev_410fd329d3"
                src={screenshotPreview}
                alt="Screenshot Vorschau"
                className="w-full h-32 object-cover rounded-lg border border-border" />

                      <button data-ev-id="ev_418cc89c07"
                type="button"
                onClick={removeScreenshot}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600">

                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div> :

              <label data-ev-id="ev_c1cb9fa6c4" className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <span data-ev-id="ev_70d31628e7" className="text-sm text-muted-foreground">Screenshot hochladen</span>
                      <input data-ev-id="ev_d38d3d2b96"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden" />

                    </label>
              }
                </div>

                {/* Console Logs */}
                <div data-ev-id="ev_35132763e1" className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <input data-ev-id="ev_0ae9d3c488"
              type="checkbox"
              id="includeConsoleLogs"
              checked={includeConsoleLogs}
              onChange={(e) => setIncludeConsoleLogs(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />

                  <label data-ev-id="ev_af38cdc566" htmlFor="includeConsoleLogs" className="text-sm text-foreground cursor-pointer">
                    Technische Logs mitsenden
                    <span data-ev-id="ev_7131f3aba8" className="block text-xs text-muted-foreground">
                      Hilft bei der Fehlersuche (empfohlen)
                    </span>
                  </label>
                </div>

                {/* Auto-captured info note */}
                <p data-ev-id="ev_62f089b461" className="text-xs text-muted-foreground bg-blue-50 p-2 rounded-lg">
                  ℹ️ Aktuelle Seite und Browser-Info werden automatisch erfasst.
                </p>

                {/* Submit */}
                <div data-ev-id="ev_b40fd1c95b" className="flex gap-3 pt-2">
                  <button data-ev-id="ev_9f3454f97b"
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors">

                    Abbrechen
                  </button>
                  <button data-ev-id="ev_1f0f44f892"
              type="submit"
              disabled={submitting || uploading || !title.trim() || !description.trim()}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">

                    {submitting || uploading ?
                <>
                        <div data-ev-id="ev_654bfd4936" className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {uploading ? 'Hochladen...' : 'Senden...'}
                      </> :

                <>
                        <Send className="w-4 h-4" />
                        Meldung senden
                      </>
                }
                  </button>
                </div>
              </form>
          }
          </div>
        </div>
      }
    </>);

}