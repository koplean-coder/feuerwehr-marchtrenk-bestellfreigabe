import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useProblemReports, type ProblemReport } from '@/hooks/useProblemReports';
import { useSettings } from '@/hooks/useSettings';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  User,
  Calendar,
  Monitor,
  FileText,
  MessageSquare,
  Eye,
  ToggleLeft,
  ToggleRight } from
'lucide-react';

const STATUS_OPTIONS = [
{ value: 'open', label: 'Offen', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
{ value: 'in_progress', label: 'In Bearbeitung', color: 'bg-blue-100 text-blue-700', icon: Clock },
{ value: 'resolved', label: 'Behoben', color: 'bg-green-100 text-green-700', icon: CheckCircle },
{ value: 'wont_fix', label: 'Nicht behoben', color: 'bg-gray-100 text-gray-700', icon: XCircle }] as
const;

const PRIORITY_OPTIONS = [
{ value: 'low', label: 'Niedrig', color: 'bg-gray-100 text-gray-700' },
{ value: 'medium', label: 'Mittel', color: 'bg-yellow-100 text-yellow-700' },
{ value: 'high', label: 'Hoch', color: 'bg-orange-100 text-orange-700' },
{ value: 'critical', label: 'Kritisch', color: 'bg-red-100 text-red-700' }] as
const;

export function ProblemReportsAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { reports, loading, canManageReports, updateReport } = useProblemReports();
  const { problemReportEnabled, updateProblemReportEnabled } = useSettings();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // URL-Parameter für direktes Öffnen eines Problems
  useEffect(() => {
    const problemId = searchParams.get('problemId');
    if (problemId && reports.length > 0) {
      const problem = reports.find(r => r.id === problemId);
      if (problem) {
        setExpandedReport(problemId);
        // Filter zurücksetzen damit das Problem sichtbar ist
        if (statusFilter !== 'all' && problem.status !== statusFilter) {
          setStatusFilter('all');
        }
        // URL-Parameter entfernen nach dem Öffnen
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('problemId');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, reports, statusFilter, setSearchParams]);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  if (!canManageReports) {
    return (
      <div data-ev-id="ev_7d679ef3af" className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p data-ev-id="ev_75a2cba7e6" className="text-muted-foreground">Keine Berechtigung für diesen Bereich.</p>
      </div>);

  }

  // Sortierung: Offene/In Bearbeitung zuerst, dann nach Datum (neueste zuerst)
  const sortedReports = [...reports].sort((a, b) => {
    // Status-Priorität: open > in_progress > resolved > wont_fix
    const statusOrder: Record<string, number> = {
      'open': 0,
      'in_progress': 1,
      'resolved': 2,
      'wont_fix': 3
    };
    const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    
    // Innerhalb gleichen Status: nach Datum (neueste zuerst)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filteredReports = statusFilter === 'all' ?
  sortedReports :
  sortedReports.filter((r) => r.status === statusFilter);

  const handleStatusChange = async (reportId: string, newStatus: ProblemReport['status']) => {
    await updateReport(reportId, { status: newStatus });
  };

  const handlePriorityChange = async (reportId: string, newPriority: ProblemReport['priority']) => {
    await updateReport(reportId, { priority: newPriority });
  };

  const handleSaveNotes = async (reportId: string) => {
    setSavingNotes(true);
    await updateReport(reportId, { admin_notes: notesText });
    setSavingNotes(false);
    setEditingNotes(null);
  };

  const toggleEnabled = async () => {
    await updateProblemReportEnabled(!problemReportEnabled);
  };

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  };

  const getPriorityInfo = (priority: string) => {
    return PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1];
  };

  // Stats
  const openCount = reports.filter((r) => r.status === 'open').length;
  const inProgressCount = reports.filter((r) => r.status === 'in_progress').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

  return (
    <div data-ev-id="ev_96f416eab1" className="flex flex-col gap-6">
      {/* Header */}
      <div data-ev-id="ev_324f929768" className="flex items-center justify-between">
        <div data-ev-id="ev_2258539e1e">
          <h2 data-ev-id="ev_84b4f2a8bf" className="text-xl font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Problemmeldungen
          </h2>
          <p data-ev-id="ev_2d1efd8d86" className="text-sm text-muted-foreground mt-1">
            Verwalte gemeldete Probleme und Fehler
          </p>
        </div>
        
        {/* Toggle for enabling/disabling */}
        <button data-ev-id="ev_d26eafadc3"
        onClick={toggleEnabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        problemReportEnabled ?
        'bg-green-100 text-green-700 hover:bg-green-200' :
        'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
        }>

          {problemReportEnabled ?
          <>
              <ToggleRight className="w-5 h-5" />
              <span data-ev-id="ev_a61641e77f" className="text-sm font-medium">Aktiviert</span>
            </> :

          <>
              <ToggleLeft className="w-5 h-5" />
              <span data-ev-id="ev_7a89165e3f" className="text-sm font-medium">Deaktiviert</span>
            </>
          }
        </button>
      </div>

      {/* Stats */}
      <div data-ev-id="ev_8c702ccf78" className="grid grid-cols-3 gap-4">
        <div data-ev-id="ev_f7f38aa3ad" className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div data-ev-id="ev_78913580e3" className="text-2xl font-bold text-yellow-700">{openCount}</div>
          <div data-ev-id="ev_39f2f09dac" className="text-sm text-yellow-600">Offen</div>
        </div>
        <div data-ev-id="ev_30a25147e6" className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div data-ev-id="ev_3ad65f3e1e" className="text-2xl font-bold text-blue-700">{inProgressCount}</div>
          <div data-ev-id="ev_52467e5d67" className="text-sm text-blue-600">In Bearbeitung</div>
        </div>
        <div data-ev-id="ev_564fefe1c1" className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div data-ev-id="ev_b9ffff9ee4" className="text-2xl font-bold text-green-700">{resolvedCount}</div>
          <div data-ev-id="ev_aeae84d31b" className="text-sm text-green-600">Behoben</div>
        </div>
      </div>

      {/* Filters */}
      <div data-ev-id="ev_942b45a67a" className="flex items-center gap-2">
        <span data-ev-id="ev_2b5a189ad1" className="text-sm text-muted-foreground">Filter:</span>
        <button data-ev-id="ev_03870782d4"
        onClick={() => setStatusFilter('all')}
        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        statusFilter === 'all' ?
        'bg-primary text-primary-foreground' :
        'bg-muted text-muted-foreground hover:bg-muted/80'}`
        }>

          Alle ({reports.length})
        </button>
        {STATUS_OPTIONS.map((status) => {
          const count = reports.filter((r) => r.status === status.value).length;
          return (
            <button data-ev-id="ev_46d499bb78"
            key={status.value}
            onClick={() => setStatusFilter(status.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            statusFilter === status.value ?
            `${status.color} ring-2 ring-offset-1 ring-primary` :
            'bg-muted text-muted-foreground hover:bg-muted/80'}`
            }>

              {status.label} ({count})
            </button>);

        })}
      </div>

      {/* Reports List */}
      {loading ?
      <div data-ev-id="ev_a27d844db2" className="p-8 text-center">
          <div data-ev-id="ev_4de9f2c465" className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p data-ev-id="ev_af9a7362c1" className="text-muted-foreground">Laden...</p>
        </div> :
      filteredReports.length === 0 ?
      <div data-ev-id="ev_2c9d15ca28" className="p-8 text-center bg-muted/50 rounded-lg">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p data-ev-id="ev_7b7b5e73fe" className="text-muted-foreground">
            {statusFilter === 'all' ? 'Keine Problemmeldungen vorhanden.' : 'Keine Meldungen mit diesem Status.'}
          </p>
        </div> :

      <div data-ev-id="ev_abaa8d2fb1" className="flex flex-col gap-3">
          {filteredReports.map((report) => {
          const statusInfo = getStatusInfo(report.status);
          const priorityInfo = getPriorityInfo(report.priority);
          const isExpanded = expandedReport === report.id;
          const StatusIcon = statusInfo.icon;

          return (
            <div data-ev-id="ev_eff5d5ad47"
            key={report.id}
            className="border border-border rounded-lg bg-card overflow-hidden">

                {/* Header Row */}
                <div data-ev-id="ev_93c42a47a8"
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedReport(isExpanded ? null : report.id)}>

                  <div data-ev-id="ev_b2dc1264b9" className="flex items-start justify-between gap-4">
                    <div data-ev-id="ev_0f63a88df5" className="flex-1 min-w-0">
                      <div data-ev-id="ev_2ab9b1593e" className="flex items-center gap-2 mb-1">
                        <span data-ev-id="ev_774c01d7a7" className={`px-2 py-0.5 rounded text-xs font-medium ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                        <span data-ev-id="ev_3c665b340a" className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </div>
                      <h3 data-ev-id="ev_4b40235d50" className="font-medium text-foreground truncate">{report.title}</h3>
                      <p data-ev-id="ev_39196d715d" className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {report.description}
                      </p>
                    </div>
                    <div data-ev-id="ev_d18d0dbe07" className="flex items-center gap-3">
                      <div data-ev-id="ev_aef3f91b6d" className="text-right text-xs text-muted-foreground">
                        <div data-ev-id="ev_7df1bcb08f" className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {report.creator_name}
                        </div>
                        <div data-ev-id="ev_a8cf11edcd" className="flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.created_at).toLocaleDateString('de-AT')}
                        </div>
                      </div>
                      {isExpanded ?
                    <ChevronUp className="w-5 h-5 text-muted-foreground" /> :

                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    }
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded &&
              <div data-ev-id="ev_0065e534c2" className="border-t border-border p-4 bg-muted/30">
                    <div data-ev-id="ev_7965df107c" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div data-ev-id="ev_2376cd8670" className="flex flex-col gap-4">
                        {/* Description */}
                        <div data-ev-id="ev_73a3bd05f7">
                          <label data-ev-id="ev_e93086fa2e" className="text-xs font-medium text-muted-foreground mb-1 block">
                            Beschreibung
                          </label>
                          <p data-ev-id="ev_5993ccc0dd" className="text-sm text-foreground whitespace-pre-wrap bg-background p-3 rounded-lg border border-border">
                            {report.description}
                          </p>
                        </div>

                        {/* Screenshot */}
                        {report.screenshot_url &&
                    <div data-ev-id="ev_abb9edbe89">
                            <label data-ev-id="ev_ab92b43f78" className="text-xs font-medium text-muted-foreground mb-1 block">
                              Screenshot
                            </label>
                            <a data-ev-id="ev_4263fb8f7e"
                      href={report.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm">

                              <Eye className="w-4 h-4" />
                              Screenshot ansehen
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                    }

                        {/* Technical Info */}
                        <div data-ev-id="ev_2660f54751" className="flex flex-col gap-2">
                          {report.page_url &&
                      <div data-ev-id="ev_9146946c4a" className="flex items-start gap-2 text-xs">
                              <Monitor className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span data-ev-id="ev_ce1d0ce5d6" className="text-muted-foreground break-all">{report.page_url}</span>
                            </div>
                      }
                          {report.browser_info &&
                      <div data-ev-id="ev_c5a812dfc9" className="flex items-start gap-2 text-xs">
                              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span data-ev-id="ev_a7ffd4f3ee" className="text-muted-foreground whitespace-pre-wrap">{report.browser_info}</span>
                            </div>
                      }
                        </div>

                        {/* Console Logs */}
                        {report.console_logs &&
                    <div data-ev-id="ev_3c2a6adda0">
                            <label data-ev-id="ev_3a6241ae2c" className="text-xs font-medium text-muted-foreground mb-1 block">
                              Konsolen-Logs
                            </label>
                            <pre data-ev-id="ev_c12a129f4f" className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto max-h-48">
                              {report.console_logs}
                            </pre>
                          </div>
                    }
                      </div>

                      {/* Right Column - Admin Controls */}
                      <div data-ev-id="ev_775c70ea48" className="flex flex-col gap-4">
                        {/* Status Change */}
                        <div data-ev-id="ev_5b416ad5fa">
                          <label data-ev-id="ev_e19a361f75" className="text-xs font-medium text-muted-foreground mb-2 block">
                            Status ändern
                          </label>
                          <div data-ev-id="ev_1a4b5bcfac" className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map((status) =>
                        <button data-ev-id="ev_01676b7e66"
                        key={status.value}
                        onClick={() => handleStatusChange(report.id, status.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                        report.status === status.value ?
                        `${status.color} ring-2 ring-offset-1 ring-primary` :
                        'bg-muted text-muted-foreground hover:bg-muted/80'}`
                        }>

                                <status.icon className="w-3 h-3" />
                                {status.label}
                              </button>
                        )}
                          </div>
                        </div>

                        {/* Priority Change */}
                        <div data-ev-id="ev_043aacc350">
                          <label data-ev-id="ev_683d4e4d1e" className="text-xs font-medium text-muted-foreground mb-2 block">
                            Priorität ändern
                          </label>
                          <div data-ev-id="ev_b123cc7bf3" className="flex flex-wrap gap-2">
                            {PRIORITY_OPTIONS.map((priority) =>
                        <button data-ev-id="ev_c28f0b9885"
                        key={priority.value}
                        onClick={() => handlePriorityChange(report.id, priority.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        report.priority === priority.value ?
                        `${priority.color} ring-2 ring-offset-1 ring-primary` :
                        'bg-muted text-muted-foreground hover:bg-muted/80'}`
                        }>

                                {priority.label}
                              </button>
                        )}
                          </div>
                        </div>

                        {/* Admin Notes */}
                        <div data-ev-id="ev_5527e26f9c">
                          <label data-ev-id="ev_5d48d809bf" className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Admin-Notizen
                          </label>
                          {editingNotes === report.id ?
                      <div data-ev-id="ev_a209225468" className="flex flex-col gap-2">
                              <textarea data-ev-id="ev_6625bf1d2d"
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        placeholder="Notizen für interne Dokumentation..." />

                              <div data-ev-id="ev_f0d77fcf23" className="flex gap-2">
                                <button data-ev-id="ev_134a3ec7bb"
                          onClick={() => handleSaveNotes(report.id)}
                          disabled={savingNotes}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">

                                  {savingNotes ? 'Speichern...' : 'Speichern'}
                                </button>
                                <button data-ev-id="ev_701c3c9da3"
                          onClick={() => setEditingNotes(null)}
                          className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80">

                                  Abbrechen
                                </button>
                              </div>
                            </div> :

                      <div data-ev-id="ev_85056a09ac"
                      onClick={() => {
                        setEditingNotes(report.id);
                        setNotesText(report.admin_notes || '');
                      }}
                      className="p-3 bg-background border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors min-h-[60px]">

                              {report.admin_notes ?
                        <p data-ev-id="ev_e148c6a72f" className="text-sm text-foreground whitespace-pre-wrap">{report.admin_notes}</p> :

                        <p data-ev-id="ev_ad2bab93af" className="text-sm text-muted-foreground italic">Klicken um Notizen hinzuzufügen...</p>
                        }
                            </div>
                      }
                        </div>

                        {/* Resolved Info */}
                        {report.resolved_at && report.resolver_name &&
                    <div data-ev-id="ev_3c1ad55fe3" className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                            <p data-ev-id="ev_f1aa2eaef6" className="text-green-700">
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              Behoben von <strong data-ev-id="ev_3130759789">{report.resolver_name}</strong>
                            </p>
                            <p data-ev-id="ev_75ee46fe82" className="text-green-600 text-xs mt-1">
                              {new Date(report.resolved_at).toLocaleString('de-AT')}
                            </p>
                          </div>
                    }
                      </div>
                    </div>
                  </div>
              }
              </div>);

        })}
        </div>
      }
    </div>);

}