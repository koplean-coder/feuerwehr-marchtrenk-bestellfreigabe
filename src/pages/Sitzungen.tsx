import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Layout } from '@/components/Layout';
import { useMeetings, type MeetingType, type Meeting } from '@/hooks/useMeetings';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Calendar,
  MapPin,
  Clock,
  Plus,
  ChevronRight,
  Shield,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
  X } from
'lucide-react';
import { formatDate } from '@/utils/formatters';

type Tab = 'kommandositzung' | 'erweitertes_kommando';

export default function Sitzungen() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { meetings, loading, canManage, canAccess, hasRoleAccess, invitedMeetings, createMeeting, generateMeetingNumber } = useMeetings();
  const [activeTab, setActiveTab] = useState<Tab>('kommandositzung');
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [newMeetingType, setNewMeetingType] = useState<MeetingType>('kommandositzung');
  const [newMeetingForm, setNewMeetingForm] = useState({
    scheduled_date: '',
    scheduled_time: '19:00',
    location: 'FF-Haus Marchtrenk',
    title: ''
  });
  const [creating, setCreating] = useState(false);

  const kommandoMeetings = meetings.filter((m) => m.meeting_type === 'kommandositzung');
  const erweitertesMeetings = meetings.filter((m) => m.meeting_type === 'erweitertes_kommando');

  const canAccessKommando = canAccess('kommandositzung');
  const canAccessErweitert = canAccess('erweitertes_kommando');
  
  // Check if user only has invitation-based access (not role-based)
  const isGuestOnlyKommando = canAccessKommando && !hasRoleAccess('kommandositzung');
  const isGuestOnlyErweitert = canAccessErweitert && !hasRoleAccess('erweitertes_kommando');

  const getStatusBadge = (status: Meeting['status']) => {
    switch (status) {
      case 'geplant':
        return (
          <span data-ev-id="ev_5e7fe05751" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Calendar className="w-3 h-3" />
            Geplant
          </span>);

      case 'laufend':
        return (
          <span data-ev-id="ev_32a4225d27" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            Laufend
          </span>);

      case 'abgeschlossen':
        return (
          <span data-ev-id="ev_e744b2081c" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Abgeschlossen
          </span>);

      case 'abgesagt':
        return (
          <span data-ev-id="ev_81cfd4152f" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <X className="w-3 h-3" />
            Abgesagt
          </span>);

      default:
        return null;
    }
  };

  const handleCreateMeeting = async () => {
    if (!newMeetingForm.scheduled_date) return;

    setCreating(true);
    try {
      const meetingNumber = await generateMeetingNumber(newMeetingType);
      const result = await createMeeting({
        meeting_type: newMeetingType,
        meeting_number: meetingNumber,
        scheduled_date: newMeetingForm.scheduled_date,
        scheduled_time: newMeetingForm.scheduled_time,
        location: newMeetingForm.location,
        title: newMeetingForm.title || undefined
      });

      if (result.data) {
        setShowNewMeetingModal(false);
        setNewMeetingForm({
          scheduled_date: '',
          scheduled_time: '19:00',
          location: 'FF-Haus Marchtrenk',
          title: ''
        });
        navigate(`/sitzungen/${result.data.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const openNewMeetingModal = (type: MeetingType) => {
    setNewMeetingType(type);
    setShowNewMeetingModal(true);
  };

  const renderMeetingCard = (meeting: Meeting) =>
  <Link
    key={meeting.id}
    to={`/sitzungen/${meeting.id}`}
    className="block bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all group">

      <div data-ev-id="ev_7d1f2915a2" className="flex items-start justify-between gap-4">
        <div data-ev-id="ev_d3c1f54baf" className="flex-1 min-w-0">
          <div data-ev-id="ev_28d0081005" className="flex items-center gap-2 mb-1">
            <span data-ev-id="ev_af0f89cfa7" className="text-sm font-mono text-muted-foreground">
              {meeting.meeting_number}
            </span>
            {getStatusBadge(meeting.status)}
          </div>
          <h3 data-ev-id="ev_44fb66939c" className="font-medium text-foreground truncate">
            {meeting.title || (meeting.meeting_type === 'kommandositzung' ? 'Kommandositzung' : 'Erweiterte Kommandositzung')}
          </h3>
          <div data-ev-id="ev_9f5c95c8ac" className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span data-ev-id="ev_d10cd7a0b7" className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(meeting.scheduled_date)}
            </span>
            <span data-ev-id="ev_d419bf1872" className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {meeting.scheduled_time.slice(0, 5)} Uhr
            </span>
            <span data-ev-id="ev_9ad981f9a9" className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {meeting.location}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </div>
    </Link>;


  const renderMeetingList = (meetingsList: Meeting[], type: MeetingType) => {
    const activeMeetings = meetingsList.filter((m) => m.status === 'geplant' || m.status === 'laufend');
    const pastMeetings = meetingsList.filter((m) => m.status === 'abgeschlossen' || m.status === 'abgesagt');

    return (
      <div data-ev-id="ev_f6a0d02695" className="space-y-6">
        {/* Active/Upcoming Meetings */}
        <div data-ev-id="ev_5887b87cc8">
          <div data-ev-id="ev_f4dc7af09e" className="flex items-center justify-between mb-3">
            <h3 data-ev-id="ev_16f34db1e1" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Aktuelle & Geplante
            </h3>
            {canManage &&
            <button data-ev-id="ev_0074438fc1"
            onClick={() => openNewMeetingModal(type)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">

                <Plus className="w-4 h-4" />
                Neue Sitzung
              </button>
            }
          </div>
          {activeMeetings.length > 0 ?
          <div data-ev-id="ev_04e1bd8c2e" className="space-y-3">
              {activeMeetings.map(renderMeetingCard)}
            </div> :

          <div data-ev-id="ev_b1f4ec72f6" className="bg-muted/30 border border-dashed border-border rounded-xl p-8 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p data-ev-id="ev_0a7fc8c221" className="text-muted-foreground">Keine geplanten Sitzungen</p>
              {canManage &&
            <button data-ev-id="ev_16bdd78493"
            onClick={() => openNewMeetingModal(type)}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">

                  <Plus className="w-4 h-4" />
                  Sitzung anlegen
                </button>
            }
            </div>
          }
        </div>

        {/* Past Meetings */}
        {pastMeetings.length > 0 &&
        <div data-ev-id="ev_154f71e132">
            <h3 data-ev-id="ev_8b3cad7847" className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Vergangene Sitzungen
            </h3>
            <div data-ev-id="ev_7dce060c4a" className="space-y-3">
              {pastMeetings.slice(0, 5).map(renderMeetingCard)}
            </div>
            {pastMeetings.length > 5 &&
          <button data-ev-id="ev_f91b0720ca" className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Alle {pastMeetings.length} anzeigen
              </button>
          }
          </div>
        }
      </div>);

  };

  if (!canAccessKommando && !canAccessErweitert) {
    return (
      <Layout>
        <div data-ev-id="ev_0bff4e20e0" className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div data-ev-id="ev_949c9f14e9" className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 data-ev-id="ev_8998903598" className="text-xl font-semibold mb-2">Kein Zugriff</h2>
          <p data-ev-id="ev_aab1a0a8da" className="text-muted-foreground max-w-md">
            Sie haben keine Berechtigung, auf das Sitzungsmodul zuzugreifen.
            Wenn Sie als Gast zu einer Sitzung eingeladen werden, erhalten Sie automatisch Zugriff auf diese Sitzung.
          </p>
        </div>
      </Layout>);

  }

  return (
    <Layout>
      <div data-ev-id="ev_5b1b608e06" className="max-w-5xl mx-auto">
        {/* Header */}
        <div data-ev-id="ev_ffe7230070" className="mb-6">
          <h1 data-ev-id="ev_eed3c9c0a0" className="text-2xl font-bold text-foreground">Sitzungen</h1>
          <p data-ev-id="ev_c4eae4f97a" className="text-muted-foreground mt-1">
            Kommando- und erweiterte Kommandositzungen verwalten
          </p>
        </div>

        {/* Tab Navigation */}
        <div data-ev-id="ev_aa3422d2ce" className="flex gap-2 mb-6 border-b border-border">
          {canAccessKommando &&
          <button data-ev-id="ev_546f40ff06"
          onClick={() => setActiveTab('kommandositzung')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'kommandositzung' ?
          'border-primary text-primary' :
          'border-transparent text-muted-foreground hover:text-foreground'}`
          }>

              <Shield className="w-4 h-4" />
              Kommandositzungen
              <span data-ev-id="ev_8aaa79c1c4" className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                {kommandoMeetings.length}
              </span>
            </button>
          }
          {canAccessErweitert &&
          <button data-ev-id="ev_18235ce976"
          onClick={() => setActiveTab('erweitertes_kommando')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'erweitertes_kommando' ?
          'border-primary text-primary' :
          'border-transparent text-muted-foreground hover:text-foreground'}`
          }>

              <Users className="w-4 h-4" />
              Erweitertes Kommando
              <span data-ev-id="ev_3d3c266ef0" className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                {erweitertesMeetings.length}
              </span>
            </button>
          }
        </div>

        {/* Guest Info Banner */}
        {(isGuestOnlyKommando || isGuestOnlyErweitert) &&
        <div data-ev-id="ev_guest_info" className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p data-ev-id="ev_guest_text" className="text-sm text-blue-700 dark:text-blue-300">
              <UserCheck className="w-4 h-4 inline-block mr-2" />
              Sie sehen hier nur Sitzungen, zu denen Sie als Gast eingeladen wurden.
            </p>
          </div>
        }

        {/* Content */}
        {loading ?
        <div data-ev-id="ev_1ce9adc303" className="flex items-center justify-center py-12">
            <div data-ev-id="ev_082f60ea95" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div> :

        <div data-ev-id="ev_36ac22393a">
            {activeTab === 'kommandositzung' && canAccessKommando &&
          renderMeetingList(kommandoMeetings, 'kommandositzung')
          }
            {activeTab === 'erweitertes_kommando' && canAccessErweitert &&
          renderMeetingList(erweitertesMeetings, 'erweitertes_kommando')
          }
          </div>
        }
      </div>

      {/* New Meeting Modal */}
      {showNewMeetingModal &&
      <div data-ev-id="ev_2f8c5a9a08" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div data-ev-id="ev_61f835e443" className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div data-ev-id="ev_e7ca2f172a" className="p-4 border-b border-border">
              <h2 data-ev-id="ev_a8aae9b7b1" className="text-lg font-semibold">
                Neue {newMeetingType === 'kommandositzung' ? 'Kommandositzung' : 'Erweiterte Kommandositzung'}
              </h2>
            </div>
            <div data-ev-id="ev_3c27bb9a48" className="p-4 space-y-4">
              <div data-ev-id="ev_cfac87dc03">
                <label data-ev-id="ev_119d5af232" className="block text-sm font-medium text-muted-foreground mb-1">
                  Datum *
                </label>
                <input data-ev-id="ev_16ca322a0a"
              type="date"
              value={newMeetingForm.scheduled_date}
              onChange={(e) => setNewMeetingForm({ ...newMeetingForm, scheduled_date: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />

              </div>
              <div data-ev-id="ev_662e8ed740">
                <label data-ev-id="ev_a7b6395040" className="block text-sm font-medium text-muted-foreground mb-1">
                  Uhrzeit
                </label>
                <input data-ev-id="ev_db4d523dc4"
              type="time"
              value={newMeetingForm.scheduled_time}
              onChange={(e) => setNewMeetingForm({ ...newMeetingForm, scheduled_time: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />

              </div>
              <div data-ev-id="ev_4a84baa23e">
                <label data-ev-id="ev_a439450bcf" className="block text-sm font-medium text-muted-foreground mb-1">
                  Ort
                </label>
                <input data-ev-id="ev_ebb74db57b"
              type="text"
              value={newMeetingForm.location}
              onChange={(e) => setNewMeetingForm({ ...newMeetingForm, location: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />

              </div>
              <div data-ev-id="ev_7078533291">
                <label data-ev-id="ev_1ff20c3407" className="block text-sm font-medium text-muted-foreground mb-1">
                  Titel (optional)
                </label>
                <input data-ev-id="ev_5ac28d38c1"
              type="text"
              value={newMeetingForm.title}
              onChange={(e) => setNewMeetingForm({ ...newMeetingForm, title: e.target.value })}
              placeholder="z.B. Jahresplanung 2026"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />

              </div>
            </div>
            <div data-ev-id="ev_e46a288d1c" className="p-4 border-t border-border flex justify-end gap-2">
              <button data-ev-id="ev_559b1e6796"
            onClick={() => setShowNewMeetingModal(false)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_352e21e884"
            onClick={handleCreateMeeting}
            disabled={!newMeetingForm.scheduled_date || creating}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">

                {creating ? 'Erstelle...' : 'Sitzung erstellen'}
              </button>
            </div>
          </div>
        </div>
      }
    </Layout>);

}