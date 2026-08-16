import { useState } from 'react';
import { useMinOrderRequests, MinOrderRequest } from '@/hooks/useMinOrderRequests';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  User,
  Building2,
  MessageSquare,
  X,
  Send } from
'lucide-react';

export function MinOrderRequestsPanel() {
  const { effectiveProfile, effectiveIsAdmin, effectiveIsKommandant } = useSimulation();
  const profile = effectiveProfile;
  const { pendingRequests, approveRequest, rejectRequest, loading } = useMinOrderRequests();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<MinOrderRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionLoading, setRejectionLoading] = useState(false);

  // Nur Kommandant/Admin können diese Komponente sehen (mit Simulation)
  const canManageRequests = effectiveIsKommandant || effectiveIsAdmin;

  if (!canManageRequests) return null;
  if (loading) return null;
  if (pendingRequests.length === 0) return null;

  const handleApprove = async (request: MinOrderRequest) => {
    setProcessingId(request.id);
    await approveRequest(request.id);
    setProcessingId(null);
  };

  const handleRejectClick = (request: MinOrderRequest) => {
    setRejectingRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectingRequest || !rejectionReason.trim()) return;

    setRejectionLoading(true);
    await rejectRequest(rejectingRequest.id, rejectionReason);
    setRejectionLoading(false);
    setShowRejectModal(false);
    setRejectingRequest(null);
    setRejectionReason('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div data-ev-id="ev_444b1bf378" className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
        <div data-ev-id="ev_09e725b49a" className="flex items-center gap-3 mb-4">
          <div data-ev-id="ev_7eb847d85d" className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-purple-600" />
          </div>
          <div data-ev-id="ev_62910223f7">
            <h3 data-ev-id="ev_54fc4f9101" className="font-semibold text-purple-900">Offene Sonderfreigabe-Anfragen</h3>
            <p data-ev-id="ev_84f20eaa68" className="text-sm text-purple-700">{pendingRequests.length} Anfrage{pendingRequests.length !== 1 ? 'n' : ''} warten auf Ihre Entscheidung</p>
          </div>
        </div>

        <div data-ev-id="ev_d65d50df5e" className="flex flex-col gap-3">
          {pendingRequests.map((request) =>
          <div data-ev-id="ev_e15d69c821"
          key={request.id}
          className="bg-white border border-purple-200 rounded-lg p-4">

              <div data-ev-id="ev_e7653c5914" className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div data-ev-id="ev_e2543e8d4d" className="flex-1">
                  <div data-ev-id="ev_24e6e58a11" className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span data-ev-id="ev_511ace389d" className="font-medium text-foreground">
                      {request.supplier?.name || 'Unbekannter Lieferant'}
                    </span>
                  </div>
                  
                  <div data-ev-id="ev_26079fb59c" className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <User className="w-4 h-4" />
                    <span data-ev-id="ev_18ce2b1f98">Angefragt von: {request.requester?.full_name || 'Unbekannt'}</span>
                  </div>
                  
                  <div data-ev-id="ev_0523fff66e" className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Clock className="w-4 h-4" />
                    <span data-ev-id="ev_72533f3185">{formatDate(request.created_at)}</span>
                  </div>

                  <div data-ev-id="ev_b4e9bc0c2d" className="bg-gray-50 rounded-lg p-3">
                    <div data-ev-id="ev_0e99eb6ed9" className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div data-ev-id="ev_c44f289779">
                        <span data-ev-id="ev_78bb5cc0e8" className="text-xs font-medium text-muted-foreground block mb-1">Begründung:</span>
                        <p data-ev-id="ev_cb768910c9" className="text-sm text-foreground">{request.reason}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div data-ev-id="ev_5a8361ddcc" className="flex sm:flex-col gap-2">
                  <button data-ev-id="ev_76e266d97d"
                onClick={() => handleApprove(request)}
                disabled={processingId === request.id}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50">

                    {processingId === request.id ?
                  <Loader2 className="w-4 h-4 animate-spin" /> :

                  <CheckCircle className="w-4 h-4" />
                  }
                    Genehmigen
                  </button>
                  <button data-ev-id="ev_d1110b2b3d"
                onClick={() => handleRejectClick(request)}
                disabled={processingId === request.id}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50">

                    <XCircle className="w-4 h-4" />
                    Ablehnen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ablehnungs-Modal */}
      {showRejectModal && rejectingRequest &&
      <div data-ev-id="ev_57c020a8ee" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_5c2bd651a3" className="bg-card rounded-xl border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_c37409ad6e" className="flex items-center justify-between mb-4">
              <div data-ev-id="ev_93f1cd54b2" className="flex items-center gap-3">
                <div data-ev-id="ev_27b637b36c" className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 data-ev-id="ev_d4c22aaa5f" className="text-lg font-semibold text-foreground">Anfrage ablehnen</h3>
              </div>
              <button data-ev-id="ev_84fa7189f6"
            onClick={() => {
              setShowRejectModal(false);
              setRejectingRequest(null);
              setRejectionReason('');
            }}
            className="p-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground touch-manipulation">

                <X className="w-5 h-5" />
              </button>
            </div>

            <div data-ev-id="ev_dee4a7bc36" className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p data-ev-id="ev_307c7a9a75" className="text-sm text-muted-foreground">
                <strong data-ev-id="ev_c92a8a0952">Lieferant:</strong> {rejectingRequest.supplier?.name}
              </p>
              <p data-ev-id="ev_412cbb4f73" className="text-sm text-muted-foreground mt-1">
                <strong data-ev-id="ev_3da816cfd8">Anfrager:</strong> {rejectingRequest.requester?.full_name}
              </p>
            </div>

            <div data-ev-id="ev_07bf2d7559" className="mb-4">
              <label data-ev-id="ev_8ac5fb9f02" className="block text-sm font-medium text-foreground mb-2">
                Ablehnungsgrund <span data-ev-id="ev_417331b291" className="text-red-500">*</span>
              </label>
              <textarea data-ev-id="ev_f97e5b9c0a"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Bitte geben Sie einen Grund für die Ablehnung an..."
            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={4}
            disabled={rejectionLoading} />

            </div>

            <div data-ev-id="ev_3ee40fc6e4" className="flex gap-3">
              <button data-ev-id="ev_8e948bbcbe"
            onClick={() => {
              setShowRejectModal(false);
              setRejectingRequest(null);
              setRejectionReason('');
            }}
            disabled={rejectionLoading}
            className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50">

                Abbrechen
              </button>
              <button data-ev-id="ev_f041718a03"
            onClick={handleRejectSubmit}
            disabled={rejectionLoading || !rejectionReason.trim()}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">

                {rejectionLoading ?
              <Loader2 className="w-4 h-4 animate-spin" /> :

              <Send className="w-4 h-4" />
              }
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      }
    </>);

}