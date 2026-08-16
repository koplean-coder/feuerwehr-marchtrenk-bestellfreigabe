import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export type PaymentMethod = 'cash' | 'transfer' | 'direct_to_organizer';

export interface EventParticipation {
  id: string;
  reference_number: string;
  event_name: string;
  event_location: string | null;
  organizer: string | null;
  event_date: string;
  max_participants: number;
  description: string | null;
  estimated_costs: number;
  transport_type: string | null;
  overnight_required: boolean | null;
  attachment_url: string | null;
  attachment_name: string | null;
  notes: string | null;
  payment_method: PaymentMethod | null;
  organizer_iban: string | null;
  payment_details_accepted: boolean | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  // Amount verification fields
  amount_confirmed: boolean | null;
  confirmed_amount: number | null;
  amount_confirmed_by: string | null;
  amount_confirmed_at: string | null;
  amount_change_reason: string | null;
  requires_reapproval: boolean | null;
  reapproved_by: string | null;
  reapproved_at: string | null;
  // Email status tracking
  email_status: 'none' | 'sent' | 'failed' | 'partial';
}

export interface EventParticipationInsert {
  event_name: string;
  event_location?: string | null;
  organizer?: string | null;
  event_date: string;
  max_participants: number;
  description?: string | null;
  estimated_costs: number;
  transport_type?: string | null;
  overnight_required?: boolean;
  attachment_url?: string | null;
  attachment_name?: string | null;
  notes?: string | null;
  payment_method?: PaymentMethod | null;
  organizer_iban?: string | null;
  payment_details_accepted?: boolean | null;
}

export interface AmountHistoryEntry {
  id: string;
  event_participation_id: string;
  original_amount: number;
  new_amount: number;
  change_reason: string | null;
  changed_by: string;
  changed_at: string;
  requires_approval: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  notification_sent: boolean | null;
  notification_sent_at: string | null;
}

export function useEventParticipations() {
  const [eventParticipations, setEventParticipations] = useState<EventParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { effectiveProfile, effectiveIsKommandant } = useSimulation();
  const profile = effectiveProfile;
  const isKommandant = effectiveIsKommandant;

  const fetchEventParticipations = useCallback(async (): Promise<EventParticipation[]> => {
    if (!supabase || !user) return [];

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('event_participations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      const participations = (data as EventParticipation[]) || [];
      setEventParticipations(participations);
      setError(null);
      return participations;
    } catch (err) {
      console.error('Error fetching event participations:', err);
      setError('Fehler beim Laden der Veranstaltungsteilnahmen');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEventParticipations();
  }, [fetchEventParticipations]);

  const generateReferenceNumber = async (attempt: number = 0): Promise<string> => {
    if (!supabase) return `TV-${Date.now()}`;

    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('event_participations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);

    // Bei Retry: Offset hinzufügen um Konflikte zu vermeiden
    const nextNumber = (count || 0) + 1 + attempt;
    return `TV-${year}-${String(nextNumber).padStart(3, '0')}`;
  };

  const createEventParticipation = async (data: EventParticipationInsert): Promise<EventParticipation | null> => {
    if (!supabase || !user) return null;

    const maxRetries = 5;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const reference_number = await generateReferenceNumber(attempt);

        const { data: newEntry, error: insertError } = await supabase
          .from('event_participations')
          .insert({
            ...data,
            reference_number,
            created_by: user.id,
            status: 'draft'
          })
          .select()
          .single();

        if (insertError) {
          // Prüfen ob es ein Unique-Constraint-Fehler ist (409 Conflict oder Code 23505)
          if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
            console.warn(`Reference number conflict, retrying (attempt ${attempt + 1}/${maxRetries})`);
            lastError = insertError;
            continue; // Nächster Versuch
          }
          throw insertError;
        }

        await fetchEventParticipations();
        return newEntry as EventParticipation;
      } catch (err) {
        lastError = err;
        // Bei anderen Fehlern nicht erneut versuchen
        if (!(err as { code?: string })?.code?.includes('23505')) {
          break;
        }
      }
    }

    console.error('Error creating event participation after retries:', lastError);
    throw lastError;
  };

  const updateEventParticipation = async (id: string, data: Partial<EventParticipationInsert>): Promise<void> => {
    if (!supabase) return;

    try {
      const { error: updateError } = await supabase
        .from('event_participations')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchEventParticipations();
    } catch (err) {
      console.error('Error updating event participation:', err);
      throw err;
    }
  };

  const submitEventParticipation = async (id: string): Promise<void> => {
    if (!supabase || !user) return;

    try {
      // Get the entry details first
      const { data: entryData } = await supabase
        .from('event_participations')
        .select('*')
        .eq('id', id)
        .single();

      // Wenn der Kommandant selbst einreicht, direkt genehmigen
      if (isKommandant) {
        const { error: approveError } = await supabase
          .from('event_participations')
          .update({
            status: 'approved',
            submitted_at: new Date().toISOString(),
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            email_status: 'none'
          })
          .eq('id', id);

        if (approveError) throw approveError;
        
        console.log(`[EventParticipation ${entryData?.reference_number}] Auto-approved by Kommandant`);

        // === AUTO-CREATE PAYMENT ORDER IF COSTS > 0 (for Kommandant auto-approval) ===
        if (entryData && entryData.estimated_costs > 0) {
          try {
            // Get creator profile (Kommandant himself)
            const { data: creatorData } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .eq('id', entryData.created_by)
              .single();

            // Generate reference number for payment order
            const year = new Date().getFullYear();
            const { data: existingOrders } = await supabase
              .from('payment_orders')
              .select('reference_number')
              .like('reference_number', `AZ-${year}-%`);
            
            let maxNumber = 0;
            if (existingOrders && existingOrders.length > 0) {
              for (const order of existingOrders) {
                const match = order.reference_number.match(/AZ-\d{4}-(\d+)/);
                if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > maxNumber) maxNumber = num;
                }
              }
            }
            const newNumber = maxNumber + 1;
            const paymentRefNumber = `AZ-${year}-${newNumber.toString().padStart(4, '0')}`;

            // Create payment order as draft
            const { data: newPaymentOrder, error: paymentError } = await supabase
              .from('payment_orders')
              .insert({
                reference_number: paymentRefNumber,
                amount: entryData.estimated_costs,
                recipient_name: creatorData?.full_name || 'Antragsteller',
                recipient_iban: null,
                purpose: `${entryData.event_name} (${entryData.reference_number})`,
                payment_method: 'transfer',
                status: 'draft',
                created_by: user.id,
                notes: `Automatisch erstellt bei Auto-Genehmigung der Veranstaltungsteilnahme ${entryData.reference_number}`,
                linked_event_participation_id: entryData.id,
                is_direct_to_organizer: false
              })
              .select()
              .single();

            if (paymentError) {
              console.error('Error creating auto payment order (Kommandant):', paymentError);
            } else if (newPaymentOrder) {
              console.log(`[EventParticipation ${entryData.reference_number}] Auto-created payment order: ${paymentRefNumber}`);

              // Get Kassier info
              const { data: kassierSetting } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'kassier_email')
                .single();

              const kassierEmail = kassierSetting?.value;

              const { data: kassierProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .contains('functions', ['kassier'])
                .eq('is_active', true);

              const kassierProfile = kassierProfiles?.[0];
              const kassierUserId = kassierProfile?.id;

              // Send notifications to Kassier
              if (kassierEmail || kassierProfile?.email) {
                const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                
                await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${anonKey}`,
                      'apikey': anonKey,
                    },
                    body: JSON.stringify({
                      type: 'payment_order_created_for_kassier',
                      recipientEmail: kassierEmail || kassierProfile?.email,
                      recipientName: kassierProfile?.full_name || 'Kassier',
                      recipientId: kassierUserId,
                      referenceNumber: paymentRefNumber,
                      amount: entryData.estimated_costs,
                      purpose: `${entryData.event_name} (${entryData.reference_number})`,
                      creatorName: creatorData?.full_name || 'Antragsteller',
                      eventParticipationRef: entryData.reference_number,
                    }),
                  }
                );
              }

              if (kassierUserId) {
                const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${anonKey}`,
                      'apikey': anonKey,
                    },
                    body: JSON.stringify({
                      userIds: [kassierUserId],
                      payload: {
                        title: 'Neue Auszahlungsanweisung',
                        body: `${paymentRefNumber}: ${entryData.estimated_costs.toFixed(2)} € für ${creatorData?.full_name || 'Antragsteller'}`,
                        icon: '/icon-192.png',
                        tag: `payment-order-${newPaymentOrder.id}`,
                      },
                    }),
                  }
                );

                await supabase.from('notifications').insert({
                  user_id: kassierUserId,
                  type: 'payment_order',
                  title: 'Neue Auszahlungsanweisung (Entwurf)',
                  message: `${paymentRefNumber}: ${entryData.estimated_costs.toFixed(2)} € für ${creatorData?.full_name || 'Antragsteller'} - ${entryData.event_name}`,
                  data: { referenceNumber: paymentRefNumber, paymentOrderId: newPaymentOrder.id },
                });
              }
            }
          } catch (paymentOrderErr) {
            console.error('Error in auto payment order creation (Kommandant):', paymentOrderErr);
          }
        }

        await fetchEventParticipations();
        return;
      }

      const { error: updateError } = await supabase
        .from('event_participations')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          email_status: 'none'
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Send notification to Kommandant
      let emailStatus: 'sent' | 'failed' | 'none' = 'none';
      if (entryData) {
        try {
          // Get Kommandant profile
          const { data: kommandantData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'kommandant')
            .single();

          // Get creator name
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', entryData.created_by)
            .single();

          if (kommandantData?.email) {
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${anonKey}`,
                  'apikey': anonKey,
                },
                body: JSON.stringify({
                  type: 'event_participation_submitted',
                  recipientEmail: kommandantData.email,
                  recipientName: kommandantData.full_name || 'Kommandant',
                  recipientId: kommandantData.id,
                  referenceNumber: entryData.reference_number,
                  eventName: entryData.event_name,
                  eventDate: entryData.event_date,
                  estimatedCosts: entryData.estimated_costs,
                  creatorName: creatorData?.full_name || 'Benutzer',
                }),
              }
            );
            emailStatus = response.ok ? 'sent' : 'failed';
            console.log(`[EventParticipation ${entryData.reference_number}] Email notification: ${emailStatus}`);
          }
        } catch (notifyErr) {
          console.error('Error sending notification:', notifyErr);
          emailStatus = 'failed';
        }
        
        // Update email status in database
        await supabase
          .from('event_participations')
          .update({ email_status: emailStatus })
          .eq('id', id);
      }

      await fetchEventParticipations();
    } catch (err) {
      console.error('Error submitting event participation:', err);
      throw err;
    }
  };

  const approveEventParticipation = async (id: string): Promise<void> => {
    if (!supabase || !user) return;

    try {
      // Get the entry details first
      const { data: entryData } = await supabase
        .from('event_participations')
        .select('*')
        .eq('id', id)
        .single();

      const { error: updateError } = await supabase
        .from('event_participations')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          email_status: 'none'
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Send notification to creator
      let emailStatus: 'sent' | 'failed' | 'none' = 'none';
      if (entryData) {
        try {
          // Get creator profile
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', entryData.created_by)
            .single();

          // Get approver name
          const { data: approverData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          if (creatorData?.email) {
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${anonKey}`,
                  'apikey': anonKey,
                },
                body: JSON.stringify({
                  type: 'event_participation_approved',
                  recipientEmail: creatorData.email,
                  recipientName: creatorData.full_name || 'Benutzer',
                  recipientId: creatorData.id,
                  referenceNumber: entryData.reference_number,
                  eventName: entryData.event_name,
                  eventDate: entryData.event_date,
                  approverName: approverData?.full_name || 'Kommandant',
                }),
              }
            );
            emailStatus = response.ok ? 'sent' : 'failed';
            console.log(`[EventParticipation ${entryData.reference_number}] Approval email: ${emailStatus}`);
          }
        } catch (notifyErr) {
          console.error('Error sending notification:', notifyErr);
          emailStatus = 'failed';
        }
        
        // Update email status in database
        await supabase
          .from('event_participations')
          .update({ email_status: emailStatus })
          .eq('id', id);
      }

      // === AUTO-CREATE PAYMENT ORDER IF COSTS > 0 ===
      if (entryData && entryData.estimated_costs > 0) {
        try {
          // Generate reference number for payment order
          const year = new Date().getFullYear();
          const { data: existingOrders } = await supabase
            .from('payment_orders')
            .select('reference_number')
            .like('reference_number', `AZ-${year}-%`);
          
          let maxNumber = 0;
          if (existingOrders && existingOrders.length > 0) {
            for (const order of existingOrders) {
              const match = order.reference_number.match(/AZ-\d{4}-(\d+)/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNumber) maxNumber = num;
              }
            }
          }
          const newNumber = maxNumber + 1;
          const paymentRefNumber = `AZ-${year}-${newNumber.toString().padStart(4, '0')}`;

          // Create payment order as draft
          const { data: newPaymentOrder, error: paymentError } = await supabase
            .from('payment_orders')
            .insert({
              reference_number: paymentRefNumber,
              amount: entryData.estimated_costs,
              recipient_name: creatorData?.full_name || 'Antragsteller',
              recipient_iban: null,
              purpose: `${entryData.event_name} (${entryData.reference_number})`,
              payment_method: 'transfer',
              status: 'draft',
              created_by: user.id,
              notes: `Automatisch erstellt bei Genehmigung der Veranstaltungsteilnahme ${entryData.reference_number}`,
              linked_event_participation_id: entryData.id,
              is_direct_to_organizer: false
            })
            .select()
            .single();

          if (paymentError) {
            console.error('Error creating auto payment order:', paymentError);
          } else if (newPaymentOrder) {
            console.log(`[EventParticipation ${entryData.reference_number}] Auto-created payment order: ${paymentRefNumber}`);

            // Get Kassier info from settings and profiles
            const { data: kassierSetting } = await supabase
              .from('settings')
              .select('value')
              .eq('key', 'kassier_email')
              .single();

            const kassierEmail = kassierSetting?.value;

            // Find Kassier user by function
            const { data: kassierProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .contains('functions', ['kassier'])
              .eq('is_active', true);

            const kassierProfile = kassierProfiles?.[0];
            const kassierUserId = kassierProfile?.id;

            // Send notification to Kassier
            if (kassierEmail || kassierProfile?.email) {
              const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              
              // Send email notification
              await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`,
                    'apikey': anonKey,
                  },
                  body: JSON.stringify({
                    type: 'payment_order_created_for_kassier',
                    recipientEmail: kassierEmail || kassierProfile?.email,
                    recipientName: kassierProfile?.full_name || 'Kassier',
                    recipientId: kassierUserId,
                    referenceNumber: paymentRefNumber,
                    amount: entryData.estimated_costs,
                    purpose: `${entryData.event_name} (${entryData.reference_number})`,
                    creatorName: creatorData?.full_name || 'Antragsteller',
                    eventParticipationRef: entryData.reference_number,
                  }),
                }
              );
              console.log(`[PaymentOrder ${paymentRefNumber}] Kassier notification sent`);
            }

            // Send push notification to Kassier
            if (kassierUserId) {
              const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`,
                    'apikey': anonKey,
                  },
                  body: JSON.stringify({
                    userIds: [kassierUserId],
                    payload: {
                      title: 'Neue Auszahlungsanweisung',
                      body: `${paymentRefNumber}: ${entryData.estimated_costs.toFixed(2)} € für ${creatorData?.full_name || 'Antragsteller'}`,
                      icon: '/icon-192.png',
                      tag: `payment-order-${newPaymentOrder.id}`,
                    },
                  }),
                }
              );

              // Create in-app notification
              await supabase.from('notifications').insert({
                user_id: kassierUserId,
                type: 'payment_order',
                title: 'Neue Auszahlungsanweisung (Entwurf)',
                message: `${paymentRefNumber}: ${entryData.estimated_costs.toFixed(2)} € für ${creatorData?.full_name || 'Antragsteller'} - ${entryData.event_name}`,
                data: { referenceNumber: paymentRefNumber, paymentOrderId: newPaymentOrder.id },
              });
            }
          }
        } catch (paymentOrderErr) {
          console.error('Error in auto payment order creation:', paymentOrderErr);
          // Don't throw - the approval was successful, just log the payment order error
        }
      }

      await fetchEventParticipations();
    } catch (err) {
      console.error('Error approving event participation:', err);
      throw err;
    }
  };

  const rejectEventParticipation = async (id: string, rejectionReason: string): Promise<void> => {
    if (!supabase || !user) return;

    try {
      // Get the entry details first
      const { data: entryData } = await supabase
        .from('event_participations')
        .select('*')
        .eq('id', id)
        .single();

      const { error: updateError } = await supabase
        .from('event_participations')
        .update({
          status: 'rejected',
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          email_status: 'none'
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Send notification to creator
      let emailStatus: 'sent' | 'failed' | 'none' = 'none';
      if (entryData) {
        try {
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', entryData.created_by)
            .single();

          const { data: rejecterData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          if (creatorData?.email) {
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${anonKey}`,
                  'apikey': anonKey,
                },
                body: JSON.stringify({
                  type: 'event_participation_rejected',
                  recipientEmail: creatorData.email,
                  recipientName: creatorData.full_name || 'Benutzer',
                  recipientId: creatorData.id,
                  referenceNumber: entryData.reference_number,
                  eventName: entryData.event_name,
                  rejectionReason: rejectionReason,
                  rejecterName: rejecterData?.full_name || 'Kommandant',
                }),
              }
            );
            emailStatus = response.ok ? 'sent' : 'failed';
            console.log(`[EventParticipation ${entryData.reference_number}] Rejection email: ${emailStatus}`);
          }
        } catch (notifyErr) {
          console.error('Error sending notification:', notifyErr);
          emailStatus = 'failed';
        }
        
        // Update email status in database
        await supabase
          .from('event_participations')
          .update({ email_status: emailStatus })
          .eq('id', id);
      }

      await fetchEventParticipations();
    } catch (err) {
      console.error('Error rejecting event participation:', err);
      throw err;
    }
  };

  const deleteEventParticipation = async (id: string): Promise<void> => {
    if (!supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from('event_participations')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchEventParticipations();
    } catch (err) {
      console.error('Error deleting event participation:', err);
      throw err;
    }
  };

  // Kassier confirms the amount before PDF generation
  const confirmAmount = async (
    id: string, 
    confirmedAmount: number, 
    changeReason?: string
  ): Promise<{ requiresReapproval: boolean }> => {
    if (!supabase || !user) return { requiresReapproval: false };

    try {
      // Get the current entry
      const { data: entry, error: fetchError } = await supabase
        .from('event_participations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!entry) throw new Error('Eintrag nicht gefunden');

      // Use Number() to ensure proper comparison
      const originalAmount = Number(entry.estimated_costs);
      const newAmount = Number(confirmedAmount);
      const amountChanged = originalAmount !== newAmount;
      const amountIncreased = newAmount > originalAmount;

      // Log the amount history if changed
      if (amountChanged) {
        await supabase
          .from('event_participation_amount_history')
          .insert({
            event_participation_id: id,
            original_amount: originalAmount,
            new_amount: confirmedAmount,
            change_reason: changeReason || null,
            changed_by: user.id,
            requires_approval: amountIncreased
          });
      }

      // Update the participation with confirmed amount
      const updateData: Record<string, unknown> = {
        amount_confirmed: true,
        confirmed_amount: confirmedAmount,
        amount_confirmed_by: user.id,
        amount_confirmed_at: new Date().toISOString(),
        amount_change_reason: amountChanged ? changeReason : null,
        requires_reapproval: amountIncreased
      };

      // If amount increased, require re-approval from Kommandant
      if (amountIncreased) {
        updateData.status = 'submitted'; // Reset to submitted for re-approval
        updateData.approved_by = null;
        updateData.approved_at = null;
      }

      const { error: updateError } = await supabase
        .from('event_participations')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Send notification
      try {
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', entry.created_by)
          .single();

        const { data: kassierData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (amountIncreased) {
          // Notify Kommandant about required re-approval
          const { data: kommandantData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'kommandant')
            .single();

          if (kommandantData?.email) {
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${anonKey}`,
                  'apikey': anonKey,
                },
                body: JSON.stringify({
                  type: 'event_participation_reapproval_required',
                  recipientEmail: kommandantData.email,
                  recipientName: kommandantData.full_name || 'Kommandant',
                  recipientId: kommandantData.id,
                  referenceNumber: entry.reference_number,
                  eventName: entry.event_name,
                  originalAmount,
                  newAmount: confirmedAmount,
                  changeReason: changeReason || 'Nicht angegeben',
                  kassierName: kassierData?.full_name || 'Kassier',
                }),
              }
            );
          }
        } else if (amountChanged && creatorData?.email) {
          // Notify creator about amount change (reduction)
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
                'apikey': anonKey,
              },
              body: JSON.stringify({
                type: 'event_participation_amount_changed',
                recipientEmail: creatorData.email,
                recipientName: creatorData.full_name || 'Benutzer',
                recipientId: creatorData.id,
                referenceNumber: entry.reference_number,
                eventName: entry.event_name,
                originalAmount,
                newAmount: confirmedAmount,
                changeReason: changeReason || 'Nicht angegeben',
                kassierName: kassierData?.full_name || 'Kassier',
              }),
            }
          );
        }
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr);
      }

      await fetchEventParticipations();
      return { requiresReapproval: amountIncreased };
    } catch (err) {
      console.error('Error confirming amount:', err);
      throw err;
    }
  };

  // Nachträgliche Erstellung einer Auszahlungsanweisung für bereits genehmigte Veranstaltungsteilnahme
  const createPaymentOrderForApprovedParticipation = async (referenceNumber: string): Promise<{ success: boolean; paymentOrderRef?: string; error?: string }> => {
    if (!supabase || !user) return { success: false, error: 'Nicht angemeldet' };

    try {
      // Get the event participation
      const { data: entryData, error: fetchError } = await supabase
        .from('event_participations')
        .select('*')
        .eq('reference_number', referenceNumber)
        .single();

      if (fetchError || !entryData) {
        return { success: false, error: 'Veranstaltungsteilnahme nicht gefunden' };
      }

      if (entryData.status !== 'approved') {
        return { success: false, error: 'Veranstaltungsteilnahme ist nicht genehmigt' };
      }

      if (entryData.estimated_costs <= 0) {
        return { success: false, error: 'Keine Kosten vorhanden' };
      }

      // Check if payment order already exists for this participation
      const { data: existingPaymentOrder } = await supabase
        .from('payment_orders')
        .select('reference_number')
        .eq('linked_event_participation_id', entryData.id)
        .single();

      if (existingPaymentOrder) {
        return { success: false, error: `Auszahlungsanweisung existiert bereits: ${existingPaymentOrder.reference_number}` };
      }

      // Get creator profile
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', entryData.created_by)
        .single();

      // Generate reference number for payment order
      const year = new Date().getFullYear();
      const { data: existingOrders } = await supabase
        .from('payment_orders')
        .select('reference_number')
        .like('reference_number', `AZ-${year}-%`);
      
      let maxNumber = 0;
      if (existingOrders && existingOrders.length > 0) {
        for (const order of existingOrders) {
          const match = order.reference_number.match(/AZ-\d{4}-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) maxNumber = num;
          }
        }
      }
      const newNumber = maxNumber + 1;
      const paymentRefNumber = `AZ-${year}-${newNumber.toString().padStart(4, '0')}`;

      // Create payment order as draft
      const { data: newPaymentOrder, error: paymentError } = await supabase
        .from('payment_orders')
        .insert({
          reference_number: paymentRefNumber,
          amount: entryData.estimated_costs,
          recipient_name: creatorData?.full_name || 'Antragsteller',
          recipient_iban: null,
          purpose: `${entryData.event_name} (${entryData.reference_number})`,
          payment_method: 'transfer',
          status: 'draft',
          created_by: user.id,
          notes: `Nachträglich erstellt für Veranstaltungsteilnahme ${entryData.reference_number}`,
          linked_event_participation_id: entryData.id,
          is_direct_to_organizer: false
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment order:', paymentError);
        return { success: false, error: paymentError.message };
      }

      console.log(`[EventParticipation ${referenceNumber}] Manually created payment order: ${paymentRefNumber}`);

      // Get Kassier info and send notifications
      const { data: kassierSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'kassier_email')
        .single();

      const kassierEmail = kassierSetting?.value;

      const { data: kassierProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .contains('functions', ['kassier'])
        .eq('is_active', true);

      const kassierProfile = kassierProfiles?.[0];
      const kassierUserId = kassierProfile?.id;

      // Send notifications to Kassier
      if (kassierEmail || kassierProfile?.email) {
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`,
              'apikey': anonKey,
            },
            body: JSON.stringify({
              type: 'payment_order_created_for_kassier',
              recipientEmail: kassierEmail || kassierProfile?.email,
              recipientName: kassierProfile?.full_name || 'Kassier',
              recipientId: kassierUserId,
              referenceNumber: paymentRefNumber,
              amount: entryData.estimated_costs,
              purpose: `${entryData.event_name} (${entryData.reference_number})`,
              creatorName: creatorData?.full_name || 'Antragsteller',
              eventParticipationRef: entryData.reference_number,
            }),
          }
        );
      }

      if (kassierUserId) {
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`,
              'apikey': anonKey,
            },
            body: JSON.stringify({
              userIds: [kassierUserId],
              payload: {
                title: 'Neue Auszahlungsanweisung',
                body: `${paymentRefNumber}: ${entryData.estimated_costs.toFixed(2)} € für ${creatorData?.full_name || 'Antragsteller'}`,
                icon: '/icon-192.png',
                tag: `payment-order-${newPaymentOrder.id}`,
              },
            }),
          }
        );

        await supabase.from('notifications').insert({
          user_id: kassierUserId,
          type: 'payment_order',
          title: 'Neue Auszahlungsanweisung (Entwurf)',
          message: `${paymentRefNumber}: ${entryData.estimated_costs.toFixed(2)} € für ${creatorData?.full_name || 'Antragsteller'} - ${entryData.event_name}`,
          data: { referenceNumber: paymentRefNumber, paymentOrderId: newPaymentOrder.id },
        });
      }

      return { success: true, paymentOrderRef: paymentRefNumber };
    } catch (err) {
      console.error('Error creating payment order for approved participation:', err);
      return { success: false, error: String(err) };
    }
  };

  return {
    eventParticipations,
    loading,
    error,
    refetch: fetchEventParticipations,
    createEventParticipation,
    updateEventParticipation,
    submitEventParticipation,
    approveEventParticipation,
    rejectEventParticipation,
    deleteEventParticipation,
    confirmAmount,
    createPaymentOrderForApprovedParticipation
  };
}