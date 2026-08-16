import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MinOrderRequest {
  id: string;
  supplier_id: string;
  requested_by: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  requester?: { full_name: string; email: string };
  supplier?: { name: string };
  decider?: { full_name: string; email: string };
}

export function useMinOrderRequests() {
  const [requests, setRequests] = useState<MinOrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const fetchRequests = useCallback(async () => {
    if (!supabase || !user) return;

    const { data, error } = await supabase
      .from('min_order_value_requests')
      .select(`
        *,
        requester:profiles!min_order_value_requests_requested_by_fkey(full_name, email),
        supplier:suppliers(name),
        decider:profiles!min_order_value_requests_decided_by_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching min order requests:', error);
    } else {
      setRequests((data as MinOrderRequest[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Realtime-Subscription für Änderungen an Sonderfreigabe-Anfragen
  useEffect(() => {
    if (!supabase || !user) return;

    const channel = supabase
      .channel('min_order_value_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'min_order_value_requests'
        },
        () => {
          // Bei jeder Änderung die Anfragen neu laden
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRequests]);

  // Neue Anfrage erstellen
  async function createRequest(supplierId: string, reason: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('min_order_value_requests')
      .insert({
        supplier_id: supplierId,
        requested_by: user.id,
        reason: reason.trim()
      })
      .select(`
        *,
        requester:profiles!min_order_value_requests_requested_by_fkey(full_name, email),
        supplier:suppliers(name)
      `)
      .single();

    if (!error && data) {
      setRequests(prev => [data as MinOrderRequest, ...prev]);
      
      // E-Mail an Kommandanten senden
      try {
        // Kommandanten finden
        const { data: kommandanten } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('role', 'kommandant');

        if (kommandanten && kommandanten.length > 0) {
          for (const kommandant of kommandanten) {
            // E-Mail senden
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'min_order_request',
                recipientEmail: kommandant.email,
                recipientName: kommandant.full_name || 'Kommandant',
                requesterName: profile?.full_name || user.email,
                supplierName: (data as MinOrderRequest).supplier?.name || 'Unbekannt',
                reason: reason.trim()
              }
            });
            
            // In-App Benachrichtigung erstellen
            await supabase.from('notifications').insert({
              user_id: kommandant.id,
              subject: 'Neue Sonderfreigabe-Anfrage',
              message: `${profile?.full_name || user.email} hat eine Sonderfreigabe für Bestellungen unter dem Mindestbestellwert beim Lieferanten ${(data as MinOrderRequest).supplier?.name || 'Unbekannt'} angefragt.`,
              notification_type: 'system'
            });
          }
        }
      } catch (emailError) {
        console.error('Error sending notification:', emailError);
      }
    }

    return { data, error };
  }

  // Anfrage genehmigen
  async function approveRequest(requestId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    const request = requests.find(r => r.id === requestId);
    if (!request) return { error: new Error('Request not found') };

    const { data, error } = await supabase
      .from('min_order_value_requests')
      .update({
        status: 'approved',
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select(`
        *,
        requester:profiles!min_order_value_requests_requested_by_fkey(full_name, email),
        supplier:suppliers(name),
        decider:profiles!min_order_value_requests_decided_by_fkey(full_name, email)
      `)
      .single();

    if (!error && data) {
      setRequests(prev => prev.map(r => r.id === requestId ? data as MinOrderRequest : r));

      // Benachrichtigung an Anfrager senden
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'min_order_approved',
            recipientEmail: request.requester?.email,
            recipientName: request.requester?.full_name || 'Benutzer',
            supplierName: request.supplier?.name || 'Unbekannt'
          }
        });

        // In-App Benachrichtigung erstellen
        await supabase.from('notifications').insert({
          user_id: request.requested_by,
          message: `Ihre Sonderfreigabe-Anfrage für ${request.supplier?.name} wurde genehmigt`,
          notification_type: 'system'
        });
      } catch (emailError) {
        console.error('Error sending approval notification:', emailError);
      }
    }

    return { data, error };
  }

  // Anfrage ablehnen
  async function rejectRequest(requestId: string, rejectionReason: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    if (!rejectionReason.trim()) return { error: new Error('Rejection reason required') };

    const request = requests.find(r => r.id === requestId);
    if (!request) return { error: new Error('Request not found') };

    const { data, error } = await supabase
      .from('min_order_value_requests')
      .update({
        status: 'rejected',
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        rejection_reason: rejectionReason.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select(`
        *,
        requester:profiles!min_order_value_requests_requested_by_fkey(full_name, email),
        supplier:suppliers(name),
        decider:profiles!min_order_value_requests_decided_by_fkey(full_name, email)
      `)
      .single();

    if (!error && data) {
      setRequests(prev => prev.map(r => r.id === requestId ? data as MinOrderRequest : r));

      // Benachrichtigung an Anfrager senden
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'min_order_rejected',
            recipientEmail: request.requester?.email,
            recipientName: request.requester?.full_name || 'Benutzer',
            supplierName: request.supplier?.name || 'Unbekannt',
            rejectionReason: rejectionReason.trim()
          }
        });

        // In-App Benachrichtigung erstellen
        await supabase.from('notifications').insert({
          user_id: request.requested_by,
          message: `Ihre Sonderfreigabe-Anfrage für ${request.supplier?.name} wurde abgelehnt: ${rejectionReason}`,
          notification_type: 'system'
        });
      } catch (emailError) {
        console.error('Error sending rejection notification:', emailError);
      }
    }

    return { data, error };
  }

  // Prüfen ob eine genehmigte Anfrage für einen Lieferanten existiert (gilt für alle Benutzer)
  function hasApprovedRequest(supplierId: string): boolean {
    return requests.some(r => 
      r.supplier_id === supplierId && 
      r.status === 'approved'
    );
  }

  // Prüfen ob eine ausstehende Anfrage für einen Lieferanten existiert (nur eigene Anfragen)
  function hasPendingRequest(supplierId: string): boolean {
    return requests.some(r => 
      r.supplier_id === supplierId && 
      r.status === 'pending' &&
      r.requested_by === user?.id
    );
  }

  // Ausstehende Anfragen (für Kommandanten)
  const pendingRequests = requests.filter(r => r.status === 'pending');

  return {
    requests,
    pendingRequests,
    loading,
    createRequest,
    approveRequest,
    rejectRequest,
    hasApprovedRequest,
    hasPendingRequest,
    fetchRequests
  };
}
