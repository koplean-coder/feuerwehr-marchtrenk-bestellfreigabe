import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

export interface PaymentOrder {
  id: string;
  reference_number: string;
  amount: number;
  recipient_name: string;
  recipient_iban: string | null;
  purpose: string;
  payment_method: 'cash' | 'transfer' | 'direct_to_organizer';
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
  created_by: string;
  created_at: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  paid_by: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  updated_at: string;
  linked_event_participation_id: string | null;
  is_direct_to_organizer: boolean;
  // Email status tracking
  email_status: 'none' | 'sent' | 'failed' | 'partial';
  // When true, this payment order won't appear in expense reports list
  no_expense_report_required: boolean;
}

export interface PaymentOrderInsert {
  amount: number;
  recipient_name: string;
  recipient_iban?: string | null;
  purpose: string;
  payment_method: 'cash' | 'transfer' | 'direct_to_organizer';
  notes?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  linked_event_participation_id?: string | null;
  is_direct_to_organizer?: boolean;
  no_expense_report_required?: boolean;
}

export function usePaymentOrders() {
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { effectiveProfile, effectiveIsKommandant } = useSimulation();
  const profile = effectiveProfile;

  const fetchPaymentOrders = useCallback(async () => {
    if (!supabase || !user) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('payment_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPaymentOrders((data as PaymentOrder[]) || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching payment orders:', err);
      setError('Fehler beim Laden der Auszahlungsanweisungen');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPaymentOrders();
  }, [fetchPaymentOrders]);

  const generateReferenceNumber = async (): Promise<string> => {
    if (!supabase) return `AZ-${Date.now()}`;
    
    const year = new Date().getFullYear();
    
    // Hole alle Referenznummern für dieses Jahr und finde die höchste Nummer
    const { data: existingOrders } = await supabase
      .from('payment_orders')
      .select('reference_number')
      .like('reference_number', `AZ-${year}-%`);
    
    let maxNumber = 0;
    if (existingOrders && existingOrders.length > 0) {
      for (const order of existingOrders) {
        // Extrahiere nur die Zahl (ignoriere eventuelle Suffixe von alten Einträgen)
        const match = order.reference_number.match(/AZ-\d{4}-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }
    
    const nextNumber = maxNumber + 1;
    // Sauberes Format ohne Suffix: AZ-YYYY-NNN
    return `AZ-${year}-${String(nextNumber).padStart(3, '0')}`;
  };

  const createPaymentOrder = async (data: PaymentOrderInsert): Promise<PaymentOrder | null> => {
    if (!supabase || !user) return null;

    // Retry-Logik bei Konflikten (z.B. doppelte Referenznummer)
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const reference_number = await generateReferenceNumber();
        
        const { data: newOrder, error: insertError } = await supabase
          .from('payment_orders')
          .insert({
            ...data,
            reference_number,
            created_by: user.id,
            status: 'draft'
          })
          .select()
          .single();

        if (insertError) {
          // Bei 409 (Conflict) oder Unique-Constraint-Fehler: retry
          if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
            console.warn(`Reference number conflict, retrying (attempt ${attempt + 1}/${maxRetries})...`);
            lastError = new Error(insertError.message);
            await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1))); // Kurze Pause
            continue;
          }
          throw insertError;
        }
        
        await fetchPaymentOrders();
        return newOrder as PaymentOrder;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Bei unbekannten Fehlern: abbrechen
        if (!lastError.message?.includes('duplicate') && !lastError.message?.includes('unique')) {
          console.error('Error creating payment order:', err);
          throw err;
        }
      }
    }
    
    console.error('Error creating payment order after retries:', lastError);
    throw lastError || new Error('Fehler beim Erstellen der Auszahlungsanweisung');
  };

  const updatePaymentOrder = async (id: string, data: Partial<PaymentOrderInsert>): Promise<void> => {
    if (!supabase) return;

    try {
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchPaymentOrders();
    } catch (err) {
      console.error('Error updating payment order:', err);
      throw err;
    }
  };

  const submitPaymentOrder = async (id: string): Promise<void> => {
    if (!supabase) return;

    try {
      // Get the order details first
      const { data: orderData } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', id)
        .single();

      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          email_status: 'none'
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Send notification to all Kommandanten
      let emailStatus: 'sent' | 'failed' | 'none' = 'none';
      if (orderData) {
        try {
          // Get all Kommandanten profiles
          const { data: kommandanten, error: kommandantError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'kommandant');

          if (kommandantError) {
            console.error('Error fetching Kommandanten:', kommandantError);
          }

          // Get creator name
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', orderData.created_by)
            .single();

          const validKommandanten = (kommandanten ?? []).filter(k => k.email);
          
          if (validKommandanten.length === 0) {
            console.warn(`[PaymentOrder ${orderData.reference_number}] No Kommandanten with email found`);
            emailStatus = 'none';
          } else {
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            let successCount = 0;
            let failCount = 0;

            // Send notification to each Kommandant
            for (const kommandant of validKommandanten) {
              try {
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
                      type: 'payment_order_submitted',
                      recipientEmail: kommandant.email,
                      recipientName: kommandant.full_name || 'Kommandant',
                      recipientId: kommandant.id,
                      referenceNumber: orderData.reference_number,
                      amount: orderData.amount,
                      purpose: orderData.purpose,
                      recipientNameOrder: orderData.recipient_name,
                      creatorName: creatorData?.full_name || 'Benutzer',
                    }),
                  }
                );
                if (response.ok) {
                  successCount++;
                  console.log(`[PaymentOrder ${orderData.reference_number}] Email sent to ${kommandant.email}`);
                } else {
                  failCount++;
                  console.error(`[PaymentOrder ${orderData.reference_number}] Email failed for ${kommandant.email}`);
                }
              } catch (err) {
                failCount++;
                console.error(`[PaymentOrder ${orderData.reference_number}] Email error for ${kommandant.email}:`, err);
              }
            }

            // Determine overall status
            if (successCount === validKommandanten.length) {
              emailStatus = 'sent';
            } else if (successCount > 0) {
              emailStatus = 'sent'; // partial success still counts as sent
            } else {
              emailStatus = 'failed';
            }
            console.log(`[PaymentOrder ${orderData.reference_number}] Submit emails: ${successCount}/${validKommandanten.length} sent`);

            // In-App Push-Benachrichtigungen für alle Kommandanten
            const inAppNotifications = (kommandanten ?? []).map(kdt => ({
              user_id: kdt.id,
              subject: 'Neue Auszahlungsanweisung',
              message: `${creatorData?.full_name || 'Ein Mitglied'} hat eine Auszahlungsanweisung eingereicht: ${orderData.purpose} (${orderData.amount.toFixed(2)} €)`,
              notification_type: 'payment_order'
            }));

            if (inAppNotifications.length > 0) {
              await supabase.from('notifications').insert(inAppNotifications);
              console.log(`[PaymentOrder ${orderData.reference_number}] In-App notifications sent to ${inAppNotifications.length} Kommandanten`);
            }
          }
        } catch (notifyErr) {
          console.error('Error sending notification:', notifyErr);
          emailStatus = 'failed';
        }
        
        // Update email status in database
        await supabase
          .from('payment_orders')
          .update({ email_status: emailStatus })
          .eq('id', id);
      }

      await fetchPaymentOrders();
    } catch (err) {
      console.error('Error submitting payment order:', err);
      throw err;
    }
  };

  // Berechtigungsprüfung: Nur Kommandant oder Kommandant-Stellvertreter dürfen genehmigen (mit Simulation)
  const profileFunctionsLower = profile?.functions?.map(f => f.toLowerCase()) || [];
  const canApprovePaymentOrders = effectiveIsKommandant || 
    profileFunctionsLower.includes('kommandant_stellvertreter');

  const approvePaymentOrder = async (id: string): Promise<void> => {
    if (!supabase || !user) return;
    
    // Berechtigungsprüfung
    if (!canApprovePaymentOrders) {
      throw new Error('Keine Berechtigung: Nur Kommandant oder Kommandant-Stellvertreter dürfen Auszahlungsanweisungen genehmigen.');
    }

    try {
      // Get the order details first
      const { data: orderData } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', id)
        .single();

      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          email_status: 'none'
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Send notification to Kassier
      let emailStatus: 'sent' | 'failed' | 'none' = 'none';
      if (orderData) {
        try {
          // Get Kassier profile (kassier is a function, not a role)
          const { data: kassierProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, functions')
            .contains('functions', ['kassier'])
            .limit(1);
          
          const kassierData = kassierProfiles?.[0] || null;

          // Get approver name
          const { data: approverData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          if (kassierData?.email) {
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
                  type: 'payment_order_approved',
                  recipientEmail: kassierData.email,
                  recipientName: kassierData.full_name || 'Kassier',
                  recipientId: kassierData.id,
                  referenceNumber: orderData.reference_number,
                  amount: orderData.amount,
                  purpose: orderData.purpose,
                  recipientNameOrder: orderData.recipient_name,
                  approverName: approverData?.full_name || 'Kommandant',
                }),
              }
            );
            emailStatus = response.ok ? 'sent' : 'failed';
            console.log(`[PaymentOrder ${orderData.reference_number}] Approval email: ${emailStatus}`);
          }

          // In-App Push-Benachrichtigungen
          const inAppNotifications = [];
          
          // Benachrichtigung an Kassier
          if (kassierData) {
            inAppNotifications.push({
              user_id: kassierData.id,
              subject: 'Auszahlungsanweisung genehmigt',
              message: `${approverData?.full_name || 'Kommandant'} hat die Auszahlungsanweisung "${orderData.purpose}" (${orderData.amount.toFixed(2)} €) genehmigt. Bitte zur Auszahlung vorbereiten.`,
              notification_type: 'payment_order'
            });
          }
          
          // Benachrichtigung an Ersteller
          if (orderData.created_by) {
            inAppNotifications.push({
              user_id: orderData.created_by,
              subject: 'Auszahlungsanweisung genehmigt',
              message: `Ihre Auszahlungsanweisung "${orderData.purpose}" (${orderData.amount.toFixed(2)} €) wurde von ${approverData?.full_name || 'Kommandant'} genehmigt.`,
              notification_type: 'payment_order'
            });
          }

          if (inAppNotifications.length > 0) {
            await supabase.from('notifications').insert(inAppNotifications);
            console.log(`[PaymentOrder ${orderData.reference_number}] In-App approval notifications sent`);
          }
        } catch (notifyErr) {
          console.error('Error sending notification:', notifyErr);
          emailStatus = 'failed';
        }
        
        // Update email status in database
        await supabase
          .from('payment_orders')
          .update({ email_status: emailStatus })
          .eq('id', id);
      }

      await fetchPaymentOrders();
    } catch (err) {
      console.error('Error approving payment order:', err);
      throw err;
    }
  };

  const markAsPaid = async (id: string): Promise<void> => {
    if (!supabase || !user) return;

    try {
      // Get order details for notification
      const { data: orderData } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', id)
        .single();

      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'paid',
          paid_by: user.id,
          paid_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // In-App Push-Benachrichtigung an Ersteller
      if (orderData?.created_by) {
        const { data: kassierData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        await supabase.from('notifications').insert({
          user_id: orderData.created_by,
          subject: 'Auszahlung erfolgt',
          message: `Ihre Auszahlungsanweisung "${orderData.purpose}" (${orderData.amount.toFixed(2)} €) wurde von ${kassierData?.full_name || 'Kassier'} ausgezahlt.`,
          notification_type: 'payment_order'
        });
        console.log(`[PaymentOrder ${orderData.reference_number}] Paid notification sent to creator`);
      }

      await fetchPaymentOrders();
    } catch (err) {
      console.error('Error marking as paid:', err);
      throw err;
    }
  };

  const deletePaymentOrder = async (id: string): Promise<void> => {
    if (!supabase) return;

    try {
      console.log(`[PaymentOrder] Deleting order: ${id}`);
      
      // Optimistic update - remove from UI immediately
      setPaymentOrders(prev => prev.filter(order => order.id !== id));
      
      const { error: deleteError } = await supabase
        .from('payment_orders')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('[PaymentOrder] Delete error:', deleteError);
        // Revert on error - refetch from DB
        await fetchPaymentOrders();
        throw deleteError;
      }
      
      console.log(`[PaymentOrder] Successfully deleted: ${id}`);
    } catch (err) {
      console.error('Error deleting payment order:', err);
      throw err;
    }
  };

  const rejectPaymentOrder = async (id: string, rejectionReason: string): Promise<void> => {
    if (!supabase || !user) return;

    try {
      // Get order details for notification
      const { data: orderData } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', id)
        .single();

      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'rejected',
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // In-App Push-Benachrichtigung an Ersteller
      if (orderData?.created_by) {
        const { data: rejecterData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        await supabase.from('notifications').insert({
          user_id: orderData.created_by,
          subject: 'Auszahlungsanweisung abgelehnt',
          message: `Ihre Auszahlungsanweisung "${orderData.purpose}" (${orderData.amount.toFixed(2)} €) wurde von ${rejecterData?.full_name || 'Kommandant'} abgelehnt. Grund: ${rejectionReason}`,
          notification_type: 'payment_order'
        });
        console.log(`[PaymentOrder ${orderData.reference_number}] Rejection notification sent to creator`);
      }

      await fetchPaymentOrders();
    } catch (err) {
      console.error('Error rejecting payment order:', err);
      throw err;
    }
  };

  const resetReferenceNumber = async (id: string): Promise<string> => {
    if (!supabase || !user) return '';

    try {
      const newReferenceNumber = await generateReferenceNumber();
      
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          reference_number: newReferenceNumber
        })
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchPaymentOrders();
      return newReferenceNumber;
    } catch (err) {
      console.error('Error resetting reference number:', err);
      throw err;
    }
  };

  // Toggle no_expense_report_required flag (for admin/kassier)
  const toggleNoExpenseReportRequired = async (id: string, value: boolean): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({ no_expense_report_required: value, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchPaymentOrders();
      return true;
    } catch (err) {
      console.error('Error toggling no_expense_report_required:', err);
      return false;
    }
  };

  return {
    paymentOrders,
    loading,
    error,
    refetch: fetchPaymentOrders,
    createPaymentOrder,
    updatePaymentOrder,
    submitPaymentOrder,
    approvePaymentOrder,
    canApprovePaymentOrders,
    markAsPaid,
    deletePaymentOrder,
    rejectPaymentOrder,
    resetReferenceNumber,
    toggleNoExpenseReportRequired
  };
}
