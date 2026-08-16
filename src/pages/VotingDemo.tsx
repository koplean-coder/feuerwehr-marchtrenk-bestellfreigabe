import {
  ThumbsUp,
  ThumbsDown,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Crown,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  ArrowLeft } from
'lucide-react';
import { Link } from 'react-router';
import { Layout } from '@/components/Layout';

export default function VotingDemo() {
  // Demo data for different scenarios
  const scenarios = [
  {
    title: 'Einstimmige Zustimmung',
    description: 'Alle 5 Kommandomitglieder haben zugestimmt',
    approveCount: 5,
    rejectCount: 0,
    totalVoters: 5,
    votes: [
    { name: 'Max Mustermann', vote: 'approve', date: '15.01.2025, 14:30 Uhr' },
    { name: 'Anna Schmidt', vote: 'approve', date: '15.01.2025, 15:00 Uhr' },
    { name: 'Peter Weber', vote: 'approve', date: '15.01.2025, 15:30 Uhr' },
    { name: 'Lisa Müller', vote: 'approve', date: '15.01.2025, 16:00 Uhr' },
    { name: 'Thomas Braun', vote: 'approve', date: '15.01.2025, 16:30 Uhr' }]

  },
  {
    title: 'Einstimmige Ablehnung',
    description: 'Alle 5 Kommandomitglieder haben abgelehnt',
    approveCount: 0,
    rejectCount: 5,
    totalVoters: 5,
    votes: [
    { name: 'Max Mustermann', vote: 'reject', date: '15.01.2025, 14:30 Uhr' },
    { name: 'Anna Schmidt', vote: 'reject', date: '15.01.2025, 15:00 Uhr' },
    { name: 'Peter Weber', vote: 'reject', date: '15.01.2025, 15:30 Uhr' },
    { name: 'Lisa Müller', vote: 'reject', date: '15.01.2025, 16:00 Uhr' },
    { name: 'Thomas Braun', vote: 'reject', date: '15.01.2025, 16:30 Uhr' }]

  },
  {
    title: 'Mehrheit für Freigabe',
    description: '4 von 5 haben zugestimmt (Mehrheit: 3 benötigt)',
    approveCount: 4,
    rejectCount: 1,
    totalVoters: 5,
    votes: [
    { name: 'Max Mustermann', vote: 'approve', date: '15.01.2025, 14:30 Uhr' },
    { name: 'Anna Schmidt', vote: 'approve', date: '15.01.2025, 15:00 Uhr' },
    { name: 'Peter Weber', vote: 'reject', date: '15.01.2025, 15:30 Uhr', reason: 'Zu teuer' },
    { name: 'Lisa Müller', vote: 'approve', date: '15.01.2025, 16:00 Uhr' },
    { name: 'Thomas Braun', vote: 'approve', date: '15.01.2025, 16:30 Uhr' }]

  },
  {
    title: 'Mehrheit für Ablehnung',
    description: '4 von 5 haben abgelehnt (Mehrheit: 3 benötigt)',
    approveCount: 1,
    rejectCount: 4,
    totalVoters: 5,
    votes: [
    { name: 'Max Mustermann', vote: 'reject', date: '15.01.2025, 14:30 Uhr' },
    { name: 'Anna Schmidt', vote: 'reject', date: '15.01.2025, 15:00 Uhr' },
    { name: 'Peter Weber', vote: 'approve', date: '15.01.2025, 15:30 Uhr' },
    { name: 'Lisa Müller', vote: 'reject', date: '15.01.2025, 16:00 Uhr' },
    { name: 'Thomas Braun', vote: 'reject', date: '15.01.2025, 16:30 Uhr' }]

  },
  {
    title: 'Gleichstand',
    description: '2 Zustimmungen, 2 Ablehnungen - 1 Stimme ausstehend',
    approveCount: 2,
    rejectCount: 2,
    totalVoters: 5,
    votes: [
    { name: 'Max Mustermann', vote: 'approve', date: '15.01.2025, 14:30 Uhr' },
    { name: 'Anna Schmidt', vote: 'reject', date: '15.01.2025, 15:00 Uhr' },
    { name: 'Peter Weber', vote: 'approve', date: '15.01.2025, 15:30 Uhr' },
    { name: 'Lisa Müller', vote: 'reject', date: '15.01.2025, 16:00 Uhr' }]

  },
  {
    title: 'Tendenz: Freigabe',
    description: '2 Zustimmungen, 1 Ablehnung - noch keine Mehrheit',
    approveCount: 2,
    rejectCount: 1,
    totalVoters: 5,
    votes: [
    { name: 'Max Mustermann', vote: 'approve', date: '15.01.2025, 14:30 Uhr' },
    { name: 'Anna Schmidt', vote: 'reject', date: '15.01.2025, 15:00 Uhr' },
    { name: 'Peter Weber', vote: 'approve', date: '15.01.2025, 15:30 Uhr' }]

  },
  {
    title: 'Tendenz: Ablehnung',
    description: '1 Zustimmung, 2 Ablehnungen - noch keine Mehrheit',
    approveCount: 1,
    rejectCount: 2,
    totalVoters: 5,
    votes: [
    { name: 'Max Mustermann', vote: 'reject', date: '15.01.2025, 14:30 Uhr' },
    { name: 'Anna Schmidt', vote: 'approve', date: '15.01.2025, 15:00 Uhr' },
    { name: 'Peter Weber', vote: 'reject', date: '15.01.2025, 15:30 Uhr' }]

  }];


  const requiredVotes = 3; // Mehrheit bei 5 Mitgliedern

  function getStatusBadge(approveCount: number, rejectCount: number, totalVotes: number, totalVoters: number) {
    const allVoted = totalVotes === totalVoters;
    const isUnanimousApprove = allVoted && approveCount === totalVotes;
    const isUnanimousReject = allVoted && rejectCount === totalVotes;
    const hasApproveMajority = approveCount >= requiredVotes;
    const hasRejectMajority = rejectCount >= requiredVotes;
    const isTie = approveCount === rejectCount && totalVotes > 0;

    if (isUnanimousApprove) {
      return (
        <div data-ev-id="ev_eabcee49a2" className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span data-ev-id="ev_3281108b88" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Einstimmige Zustimmung
          </span>
        </div>);

    }

    if (isUnanimousReject) {
      return (
        <div data-ev-id="ev_caa8508345" className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <XCircle className="w-4 h-4 text-red-500" />
          <span data-ev-id="ev_4fb3be8953" className="text-sm font-medium text-red-700 dark:text-red-400">
            Einstimmige Ablehnung
          </span>
        </div>);

    }

    if (hasApproveMajority) {
      return (
        <div data-ev-id="ev_b529538221" className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          <ThumbsUp className="w-4 h-4 text-emerald-500" />
          <span data-ev-id="ev_1428811c5b" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Mehrheit für Freigabe ({approveCount} von {requiredVotes} benötigten Stimmen)
          </span>
        </div>);

    }

    if (hasRejectMajority) {
      return (
        <div data-ev-id="ev_a1b02e7222" className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <ThumbsDown className="w-4 h-4 text-red-500" />
          <span data-ev-id="ev_e0e630452f" className="text-sm font-medium text-red-700 dark:text-red-400">
            Mehrheit für Ablehnung ({rejectCount} von {requiredVotes} benötigten Stimmen)
          </span>
        </div>);

    }

    if (isTie) {
      return (
        <div data-ev-id="ev_2137968787" className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span data-ev-id="ev_88330b3398" className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Gleichstand ({approveCount} zu {rejectCount}) - Abstimmung offen
          </span>
        </div>);

    }

    if (approveCount > rejectCount) {
      return (
        <div data-ev-id="ev_e789721e7c" className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span data-ev-id="ev_2ca7339035" className="text-sm text-emerald-700 dark:text-emerald-400">
            Tendenz: Freigabe ({approveCount} zu {rejectCount}) - noch {requiredVotes - approveCount} Stimme(n) für Mehrheit
          </span>
        </div>);

    }

    return (
      <div data-ev-id="ev_8f3356a4b7" className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
        <TrendingDown className="w-4 h-4 text-red-500" />
        <span data-ev-id="ev_ae81b7db7b" className="text-sm text-red-700 dark:text-red-400">
          Tendenz: Ablehnung ({rejectCount} zu {approveCount}) - noch {requiredVotes - rejectCount} Stimme(n) für Mehrheit
        </span>
      </div>);

  }

  return (
    <Layout>
    <div data-ev-id="ev_b88865dc59" className="min-h-screen bg-background p-6">
      <div data-ev-id="ev_21048f5da7" className="max-w-4xl mx-auto">
        <div data-ev-id="ev_a1faa13cac" className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div data-ev-id="ev_296fb12b79">
            <h1 data-ev-id="ev_348e4d4faf" className="text-2xl font-bold text-foreground">Abstimmungs-Demo</h1>
            <p data-ev-id="ev_afa24944cd" className="text-muted-foreground">Alle möglichen Status-Anzeigen der Kommandomitglieder-Abstimmung</p>
          </div>
        </div>

        <div data-ev-id="ev_4481df2785" className="grid gap-6">
          {scenarios.map((scenario, index) =>
            <div data-ev-id="ev_2913578e70" key={index} className="bg-card rounded-xl border border-border p-6">
              <div data-ev-id="ev_3a3c0f74d9" className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <div data-ev-id="ev_80cc8e3b46">
                  <h3 data-ev-id="ev_aeeeb99b97" className="text-lg font-semibold text-foreground">{scenario.title}</h3>
                  <p data-ev-id="ev_274c28050f" className="text-sm text-muted-foreground">{scenario.description}</p>
                </div>
              </div>

              {/* Voting Status */}
              <div data-ev-id="ev_2412ca1cb0" className="bg-muted/50 rounded-lg p-4 mb-4">
                <div data-ev-id="ev_e8325de365" className="flex items-center justify-between mb-3">
                  <span data-ev-id="ev_668e0a981a" className="text-sm text-muted-foreground">Abstimmungsstatus</span>
                  <span data-ev-id="ev_351308ac57" className="text-sm font-medium">
                    {scenario.votes.length} von {scenario.totalVoters} Stimmen abgegeben
                  </span>
                </div>

                {/* Progress bars */}
                <div data-ev-id="ev_8b33f8aae8" className="flex flex-col gap-2">
                  <div data-ev-id="ev_f62875083d" className="flex items-center gap-3">
                    <ThumbsUp className="w-4 h-4 text-emerald-500" />
                    <div data-ev-id="ev_283ad3a487" className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div data-ev-id="ev_e4c398d836"
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${scenario.totalVoters > 0 ? scenario.approveCount / scenario.totalVoters * 100 : 0}%` }} />

                    </div>
                    <span data-ev-id="ev_e6ee38e07f" className="text-sm font-medium w-8 text-right">{scenario.approveCount}</span>
                  </div>
                  <div data-ev-id="ev_ac69451626" className="flex items-center gap-3">
                    <ThumbsDown className="w-4 h-4 text-red-500" />
                    <div data-ev-id="ev_a7e8a48315" className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div data-ev-id="ev_2897430b3a"
                      className="bg-red-500 h-full transition-all duration-300"
                      style={{ width: `${scenario.totalVoters > 0 ? scenario.rejectCount / scenario.totalVoters * 100 : 0}%` }} />

                    </div>
                    <span data-ev-id="ev_7e823e9d1a" className="text-sm font-medium w-8 text-right">{scenario.rejectCount}</span>
                  </div>
                </div>

                <p data-ev-id="ev_be67f49f30" className="text-xs text-muted-foreground mt-2">
                  Benötigte Mehrheit: {requiredVotes} Stimmen
                </p>

                {/* Status Badge */}
                <div data-ev-id="ev_6a1bc648c4" className="mt-3">
                  {getStatusBadge(scenario.approveCount, scenario.rejectCount, scenario.votes.length, scenario.totalVoters)}
                </div>
              </div>

              {/* Vote List */}
              <div data-ev-id="ev_c349c70e7c" className="mb-4">
                <h4 data-ev-id="ev_3510cdc9ec" className="text-sm font-medium text-foreground mb-2">Abgegebene Stimmen</h4>
                <div data-ev-id="ev_e62e00a692" className="flex flex-col gap-2">
                  {scenario.votes.map((vote, voteIndex) =>
                  <div data-ev-id="ev_268911f3de" key={voteIndex} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                      <div data-ev-id="ev_b0bb6ffb56" className="flex items-center gap-2">
                        {vote.vote === 'approve' ?
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> :

                      <XCircle className="w-4 h-4 text-red-500" />
                      }
                        <div data-ev-id="ev_1c3b87169b" className="flex flex-col">
                          <span data-ev-id="ev_ff94d9fa63" className="text-sm">{vote.name}</span>
                          <span data-ev-id="ev_631a83efc9" className="text-xs text-muted-foreground">{vote.date}</span>
                        </div>
                      </div>
                      {vote.reason &&
                    <span data-ev-id="ev_2f4512bbef" className="text-xs text-muted-foreground truncate max-w-[200px]" title={vote.reason}>
                          {vote.reason}
                        </span>
                    }
                    </div>
                  )}
                </div>
              </div>

              {/* Kommandant Actions Preview */}
              <div data-ev-id="ev_04d5a4c337" className="border-t border-border pt-4">
                <div data-ev-id="ev_103c5742fd" className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-primary" />
                  <span data-ev-id="ev_c4efa9c572" className="text-sm font-medium text-foreground">Kommandant-Aktionen</span>
                </div>
                <p data-ev-id="ev_5349c3f8b5" className="text-xs text-muted-foreground mb-3">
                  {scenario.approveCount > scenario.rejectCount ?
                  `Aktuell: ${scenario.approveCount} Zustimmungen, ${scenario.rejectCount} Ablehnungen → Freigabe` :
                  scenario.rejectCount > scenario.approveCount ?
                  `Aktuell: ${scenario.approveCount} Zustimmungen, ${scenario.rejectCount} Ablehnungen → Ablehnung` :
                  `Aktuell: Gleichstand (${scenario.approveCount} zu ${scenario.rejectCount}) → Ablehnung`
                  }
                </p>
                <button data-ev-id="ev_eea58c0489"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium opacity-75 cursor-not-allowed"
                disabled>

                  <CheckCircle className="w-4 h-4" />
                  Abstimmung beenden & Ergebnis übernehmen
                </button>
                
                {/* Email Info */}
                <div data-ev-id="ev_a7fafc0367" className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-3">
                  <p data-ev-id="ev_085d2a8c8e" className="text-sm text-blue-700 dark:text-blue-300">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Nach Beendigung werden automatisch E-Mails an den Antragsteller, Kassier und Schriftführer gesendet.
                  </p>
                </div>
              </div>
            </div>
            )}
        </div>
      </div>
    </div>
    </Layout>);

}