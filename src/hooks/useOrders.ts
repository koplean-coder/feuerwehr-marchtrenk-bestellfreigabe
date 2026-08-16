import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useOrdersContext, type Order, type OrderStatus, type OrderHistory, type EmailStatus, type InvoiceTo } from '@/contexts/OrdersContext';

// Re-export types from context
export type { Order, OrderStatus, OrderHistory, EmailStatus, InvoiceTo };

export function useOrders() {
  // Gemeinsamer State aus Context - alle Komponenten teilen dieselben Daten
  const { orders, loading, fetchOrders } = useOrdersContext();
  const { user, profile, isBereichsleiter, isKommandant, isAdmin } = useAuth();
  const { freigabebetragKdt, freigabebetragKommandomitglied, notificationEmail, schriftfuehrerEmail, kassierEmail } = useSettings();

  // Push-Notification an Benutzer senden
  async function sendPushNotification(params: {
    userId: string;
    title: string;
    body: string;
    orderId?: string;
  }): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) return false;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            userIds: [params.userId],
            payload: {
              title: params.title,
              body: params.body,
              icon: '/icon-192.png',
              tag: params.orderId ? `order-${params.orderId}` : undefined,
              data: params.orderId ? { orderId: params.orderId, url: `/orders/${params.orderId}` } : undefined,
            },
          }),
        }
      );
      
      if (!response.ok) {
        console.error('sendPushNotification: HTTP error', response.status);
        return false;
      }
      
      console.log('sendPushNotification: Success for user', params.userId);
      return true;
    } catch (error) {
      console.error('sendPushNotification: Exception', error);
      return false;
    }
  }

  // E-Mail-Benachrichtigung über Edge Function senden
  async function sendEmailNotification(params: {
    type: 'approval' | 'final_approval' | 'rejection';
    order: Order;
    approverName: string;
    approverRole: string;
    rejectionReason?: string;
  }): Promise<boolean> {
    if (!supabase) {
      console.error('sendEmailNotification: supabase client not available');
      return false;
    }
    
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) {
        console.error('sendEmailNotification: ANON_KEY not available');
        return false;
      }

      const payload = {
        type: params.type,
        orderId: params.order.id,
        orderTitle: params.order.title,
        orderAmount: params.order.amount,
        creatorEmail: params.order.creator?.email || '',
        creatorName: params.order.creator?.full_name || 'Benutzer',
        approverName: params.approvalName,
        approverRole: params.approvalRole,
        notificationEmail: params.type === 'final_approval' ? notificationEmail : undefined,
        rejectionReason: params.rejectionReason,
      };


      console.log('sendEmailNotification: Sending payload', payload);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify(payload),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('sendEmailNotification: HTTP error', response.status, errorText);
        return false;
      }
      
      const result = await response.json();
      console.log('sendEmailNotification: Success', result);
      return true;
    } catch (error) {
      console.error('sendEmailNotification: Exception', error);
      return false;
    }
  }

  // E-Mail an Schriftführer bei Ablehnung senden
  async function sendSchriftfuehrerNotification(params: {
    order: Order;
    approverName: string;
    decision: 'genehmigt' | 'abgelehnt';
    decisionType: 'Abstimmungsergebnis' | 'Kommandant-Direktentscheidung';
    votingResultsHtml: string;
  }): Promise<boolean> {
    if (!supabase || !schriftfuehrerEmail) {
      console.error('sendSchriftfuehrerNotification: No Schriftführer email configured');
      return false;
    }
    
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) {
        console.error('sendSchriftfuehrerNotification: ANON_KEY not available');
        return false;
      }

      const payload = {
        type: 'kommando_decision_schriftfuehrer',
        orderId: params.order.id,
        orderTitle: params.order.title,
        orderAmount: params.order.amount,
        creatorName: params.order.creator?.full_name || 'Benutzer',
        approverName: params.approverName,
        decision: params.decision === 'genehmigt' ? 'genehmigt' : 'abgelehnt',
        decisionType: params.decisionType,
        votingResults: params.votingResultsHtml,
        schriftfuehrerEmail: schriftfuehrerEmail,
      };

      console.log('sendSchriftfuehrerNotification: Sending payload', payload);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify(payload),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('sendSchriftfuehrerNotification: HTTP error', response.status, errorText);
        return false;
      }
      
      const result = await response.json();
      console.log('sendSchriftfuehrerNotification: Success', result);
      return true;
    } catch (error) {
      console.error('sendSchriftfuehrerNotification: Exception', error);
      return false;
    }
  }

  // E-Mail an Kassier bei Kommando-Entscheidung senden
  async function sendKassierNotification(params: {
    order: Order;
    approverName: string;
    decision: 'genehmigt' | 'abgelehnt';
    decisionType: 'Abstimmungsergebnis' | 'Kommandant-Direktentscheidung';
    votingResultsHtml: string;
  }): Promise<boolean> {
    if (!supabase || !kassierEmail) {
      console.error('sendKassierNotification: No Kassier email configured');
      return false;
    }
    
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) {
        console.error('sendKassierNotification: ANON_KEY not available');
        return false;
      }

      const payload = {
        type: 'kommando_decision_kassier',
        orderId: params.order.id,
        orderTitle: params.order.title,
        orderAmount: params.order.amount,
        creatorName: params.order.creator?.full_name || 'Benutzer',
        approverName: params.approverName,
        decision: params.decision === 'genehmigt' ? 'genehmigt' : 'abgelehnt',
        decisionType: params.decisionType,
        votingResults: params.votingResultsHtml,
        kassierEmail: kassierEmail,
      };

      console.log('sendKassierNotification: Sending payload', payload);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify(payload),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('sendKassierNotification: HTTP error', response.status, errorText);
        return false;
      }
      
      const result = await response.json();
      console.log('sendKassierNotification: Success', result);
      return true;
    } catch (error) {
      console.error('sendKassierNotification: Exception', error);
      return false;
    }
  }

  async function createOrder(data: {
    title: string;
    description?: string;
    amount: number;
    supplier_id?: string;
    bereichsleiter_id?: string;
  }, asDraft: boolean = false, files: File[] = []) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    console.log('[createOrder] Betragsprüfung:', {
      amount: data.amount,
      freigabebetragKdt,
      freigabebetragKommandomitglied,
      requiresKommandant: data.amount >= freigabebetragKdt,
      requiresKommandomitglied: data.amount >= freigabebetragKommandomitglied
    });
    
    const requiresKommandant = data.amount >= freigabebetragKdt;
    const requiresKommandomitglied = data.amount >= freigabebetragKommandomitglied;
    const status = asDraft ? 'entwurf' : 'eingereicht';
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        title: data.title,
        description: data.description || null,
        amount: data.amount,
        supplier_id: data.supplier_id || null,
        bereichsleiter_id: data.bereichsleiter_id || null,
        status,
        created_by: user.id,
        requires_kommandant_approval: requiresKommandant,
        requires_kommandomitglied_approval: requiresKommandomitglied,
        submitted_at: asDraft ? null : new Date().toISOString()
      })
      .select()
      .single();
    
    if (!error && order) {
      // Upload files if any
      if (files.length > 0) {
        await uploadOrderAttachments(order.id, files);
      }
      
      if (asDraft) {
        await createHistoryEntry(order.id, 'Entwurf erstellt', null, 'entwurf', 'none');
      } else {
        // E-Mails senden und Status tracken
        let emailSuccess = true;
        let emailPartial = false;
        
        if (data.bereichsleiter_id) {
          const blEmailSent = await notifyAndEmailBereichsleiter(order.id, data.title, data.bereichsleiter_id);
          if (!blEmailSent) emailSuccess = false;
        }
        
        if (requiresKommandant) {
          const kdtResult = await notifyAndEmailKommandant(order.id, data.title, true);
          if (kdtResult.failed > 0 && kdtResult.sent > 0) {
            emailPartial = true;
          } else if (kdtResult.failed > 0 && kdtResult.sent === 0) {
            emailSuccess = false;
          }
        }
        
        // E-Mail an Kommandomitglieder bei sehr hohem Betrag
        if (requiresKommandomitglied) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          const kmResult = await notifyAndEmailKommandomitglieder(
            order.id, 
            data.title, 
            data.amount,
            creatorProfile?.full_name || 'Benutzer'
          );
          if (kmResult.failed > 0 && kmResult.sent > 0) {
            emailPartial = true;
          } else if (kmResult.failed > 0 && kmResult.sent === 0) {
            emailSuccess = false;
          }
        }
        
        const emailStatus: EmailStatus = emailPartial ? 'partial' : (emailSuccess ? 'sent' : 'failed');
        await createHistoryEntry(order.id, 'Bestellung eingereicht', null, 'eingereicht', emailStatus);
      }
      fetchOrders(true);
    }
    
    return { error, data: order };
  }

  // Entwurf einreichen
  async function submitDraft(orderId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    const order = orders.find(o => o.id === orderId);
    if (!order) return { error: new Error('Order not found') };
    
    // Nur Entwürfe können eingereicht werden
    if (order.status !== 'entwurf') {
      return { error: new Error('Nur Entwürfe können eingereicht werden') };
    }
    
    // Nur der Ersteller kann einreichen
    if (order.created_by !== user.id) {
      return { error: new Error('Nur der Ersteller kann diese Bestellung einreichen') };
    }
    
    // Bereichsleiter muss ausgewählt sein
    if (!order.bereichsleiter_id) {
      return { error: new Error('Bitte wählen Sie einen Bereichsleiter aus') };
    }
    
    // Stelle sicher dass die Werte als Zahlen verglichen werden
    const orderAmount = typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount;
    const requiresKommandant = orderAmount >= freigabebetragKdt;
    const requiresKommandomitglied = orderAmount >= freigabebetragKommandomitglied;
    
    console.log('[submitDraft] Betragsprüfung:', {
      orderAmount,
      orderAmountType: typeof order.amount,
      freigabebetragKdt,
      freigabebetragKdtType: typeof freigabebetragKdt,
      requiresKommandant,
      requiresKommandomitglied
    });
    
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'eingereicht',
        requires_kommandant_approval: requiresKommandant,
        requires_kommandomitglied_approval: requiresKommandomitglied,
        // Wenn Kommandoabstimmung erforderlich, Abstimmung automatisch öffnen
        ...(requiresKommandomitglied ? {
          voting_status: 'open',
          voting_opened_at: new Date().toISOString(),
          voting_result: null,
          voting_closed_at: null,
          voting_closed_by: null
        } : {}),
        updated_at: new Date().toISOString(),
        submitted_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (!error) {
      // E-Mails senden und Status tracken
      let emailSuccess = true;
      let emailPartial = false;
      
      const blEmailSent = await notifyAndEmailBereichsleiter(orderId, order.title, order.bereichsleiter_id);
      if (!blEmailSent) emailSuccess = false;
      
      if (requiresKommandant) {
        const kdtResult = await notifyAndEmailKommandant(orderId, order.title, true);
        if (kdtResult.failed > 0 && kdtResult.sent > 0) {
          emailPartial = true;
        } else if (kdtResult.failed > 0 && kdtResult.sent === 0) {
          emailSuccess = false;
        }
      }
      
      // E-Mail an Kommandomitglieder bei sehr hohem Betrag
      if (requiresKommandomitglied) {
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        const kmResult = await notifyAndEmailKommandomitglieder(
          orderId, 
          order.title, 
          order.amount,
          creatorProfile?.full_name || 'Benutzer'
        );
        if (kmResult.failed > 0 && kmResult.sent > 0) {
          emailPartial = true;
        } else if (kmResult.failed > 0 && kmResult.sent === 0) {
          emailSuccess = false;
        }
      }
      
      const emailStatus: EmailStatus = emailPartial ? 'partial' : (emailSuccess ? 'sent' : 'failed');
      await createHistoryEntry(orderId, 'Bestellung eingereicht', 'entwurf', 'eingereicht', emailStatus);
      fetchOrders(true);
    }
    
    return { error };
  }

  async function updateOrder(orderId: string, data: {
    title: string;
    description?: string;
    amount: number;
    supplier_id?: string;
    bereichsleiter_id: string;
  }, submitAfterUpdate: boolean = true, files?: File[]) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    const order = orders.find(o => o.id === orderId);
    if (!order) return { error: new Error('Order not found') };
    
    // Nur eigene Bestellungen können bearbeitet werden
    if (order.created_by !== user.id) {
      return { error: new Error('Not authorized to edit this order') };
    }
    
    // Nur Entwürfe und abgelehnte Bestellungen können bearbeitet werden
    if (!['entwurf', 'abgelehnt'].includes(order.status)) {
      return { error: new Error('Diese Bestellung kann nicht mehr bearbeitet werden') };
    }
    
    const requiresKommandant = data.amount >= freigabebetragKdt;
    const requiresKommandomitglied = data.amount >= freigabebetragKommandomitglied;
    
    // Bei Entwürfen: Status bleibt Entwurf wenn nicht eingereicht werden soll
    // Bei abgelehnten: Status wird eingereicht
    const newStatus = order.status === 'entwurf' && !submitAfterUpdate ? 'entwurf' : 'eingereicht';
    
    const { error } = await supabase
      .from('orders')
      .update({
        title: data.title,
        description: data.description || null,
        amount: data.amount,
        supplier_id: data.supplier_id || null,
        bereichsleiter_id: data.bereichsleiter_id,
        status: newStatus,
        requires_kommandant_approval: requiresKommandant,
        requires_kommandomitglied_approval: requiresKommandomitglied,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
        submitted_at: newStatus === 'eingereicht' ? new Date().toISOString() : null
      })
      .eq('id', orderId);
    
    if (!error) {
      // Neue Dateien hochladen wenn vorhanden
      if (files && files.length > 0) {
        await uploadOrderAttachments(orderId, files);
      }
      
      if (newStatus === 'entwurf') {
        await createHistoryEntry(orderId, 'Entwurf aktualisiert', order.status, 'entwurf', 'none');
      } else {
        // E-Mails senden und Status tracken
        let emailSuccess = true;
        let emailPartial = false;
        
        const blEmailSent = await notifyAndEmailBereichsleiter(orderId, data.title, data.bereichsleiter_id);
        if (!blEmailSent) emailSuccess = false;
        
        if (requiresKommandant) {
          const kdtResult = await notifyAndEmailKommandant(orderId, data.title, true);
          if (kdtResult.failed > 0 && kdtResult.sent > 0) {
            emailPartial = true;
          } else if (kdtResult.failed > 0 && kdtResult.sent === 0) {
            emailSuccess = false;
          }
        }
        
        // E-Mail an Kommandomitglieder bei sehr hohem Betrag
        if (requiresKommandomitglied) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          const kmResult = await notifyAndEmailKommandomitglieder(
            orderId, 
            data.title, 
            data.amount,
            creatorProfile?.full_name || 'Benutzer'
          );
          if (kmResult.failed > 0 && kmResult.sent > 0) {
            emailPartial = true;
          } else if (kmResult.failed > 0 && kmResult.sent === 0) {
            emailSuccess = false;
          }
        }
        
        const emailStatus: EmailStatus = emailPartial ? 'partial' : (emailSuccess ? 'sent' : 'failed');
        await createHistoryEntry(orderId, 'Bestellung aktualisiert und eingereicht', order.status, 'eingereicht', emailStatus);
      }
      fetchOrders(true);
    }
    
    return { error };
  }

  async function approveByBereichsleiter(orderId: string, invoiceTo?: InvoiceTo) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Bestellung direkt aus der Datenbank holen (falls lokaler State leer ist)
    let order = orders.find(o => o.id === orderId);
    if (!order) {
      console.log('approveByBereichsleiter: Order not in local state, fetching from database...');
      const { data: fetchedOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          creator:profiles!orders_created_by_fkey(full_name, email),
          supplier:suppliers(name)
        `)
        .eq('id', orderId)
        .single();
      
      if (fetchError || !fetchedOrder) {
        console.error('approveByBereichsleiter: Order not found in database', fetchError);
        return { error: new Error('Order not found') };
      }
      order = fetchedOrder as Order;
      console.log('approveByBereichsleiter: Fetched order from database:', order.id, 'status:', order.status);
    }
    
    // Nur der zugewiesene Bereichsleiter darf freigeben
    if (order.bereichsleiter_id !== user.id) {
      return { error: new Error('Nur der zugewiesene Bereichsleiter darf diese Bestellung freigeben') };
    }
    
    // IMMER den aktuellen Schwellwert verwenden, nicht den gespeicherten Flag
    const orderAmount = typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount;
    const actuallyRequiresKommandant = orderAmount >= freigabebetragKdt;
    
    console.log('[approveByBereichsleiter] Betragsprüfung:', {
      orderId: order.id,
      orderAmount,
      gespeicherter_flag: order.requires_kommandant_approval,
      freigabebetragKdt_aktuell: freigabebetragKdt,
      tatsaechlich_kdt_erforderlich: actuallyRequiresKommandant
    });
    
    const newStatus: OrderStatus = actuallyRequiresKommandant 
      ? 'ausstehend_kommandant' 
      : 'genehmigt';
    
    // WICHTIG: Wenn der aktuelle Benutzer (zugewiesener Bereichsleiter) auch Kommandant ist
    // und Kommandant-Freigabe erforderlich ist, direkt beide Freigaben erteilen
    const userIsAlsoKommandant = isKommandant;
    const shouldAutoApproveAsKommandant = userIsAlsoKommandant && actuallyRequiresKommandant;
    
    const finalStatus: OrderStatus = shouldAutoApproveAsKommandant 
      ? 'freigegeben_kommandant' 
      : newStatus;
    
    console.log('[approveByBereichsleiter] Duale Rolle Prüfung:', {
      userIsAlsoKommandant,
      actuallyRequiresKommandant,
      shouldAutoApproveAsKommandant,
      finalStatus
    });
    
    // Berechne auch Kommandomitglied-Erfordernis neu
    const actuallyRequiresKommandomitglied = orderAmount >= freigabebetragKommandomitglied;
    
    // invoice_to immer speichern wenn angegeben, und Flags aktualisieren
    // Batch-Felder zurücksetzen bei Neugenehmigung
    const updateData: Record<string, unknown> = {
      status: finalStatus,
      bereichsleiter_approved_at: new Date().toISOString(),
      // Aktualisiere die Flags basierend auf aktuellem Schwellwert
      requires_kommandant_approval: actuallyRequiresKommandant,
      requires_kommandomitglied_approval: actuallyRequiresKommandomitglied,
      // Batch-Felder zurücksetzen damit Status korrekt angezeigt wird
      order_executed: false,
      order_executed_at: null,
      order_executed_by: null,
      order_received: false,
      order_received_at: null,
      order_received_by: null,
      kassier_bestellt: false,
      kassier_bestellt_at: null,
      kassier_bestellt_by: null
    };
    
    // Wenn Kommandant gleichzeitig freigibt, auch Kommandant-Felder setzen
    if (shouldAutoApproveAsKommandant) {
      updateData.kommandant_id = user.id;
      updateData.kommandant_approved_at = new Date().toISOString();
    }
    
    if (invoiceTo) {
      updateData.invoice_to = invoiceTo;
    }
    
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
    
    if (!error) {
      let emailStatus: EmailStatus = 'none';
      
      if (shouldAutoApproveAsKommandant) {
        // Kommandant hat als Bereichsleiter direkt freigegeben - finale Freigabe
        await notifyCreator(orderId, order.title, 'freigegeben_kommandant');
        const emailSent = await sendEmailNotification({
          type: 'final_approval',
          order,
          approverName: profile?.full_name || 'Kommandant',
          approverRole: 'Kommandant (als Bereichsleiter)',
        });
        emailStatus = emailSent ? 'sent' : 'failed';
        
        // Push-Notification an Ersteller: Direkt genehmigt
        if (order.created_by) {
          await sendPushNotification({
            userId: order.created_by,
            title: '✅ Bestellung genehmigt',
            body: `"${order.title}" wurde vom Kommandant direkt genehmigt.`,
            orderId: order.id,
          });
        }
        
        await createHistoryEntry(orderId, 'Direkte Freigabe durch Kommandant (als Bereichsleiter)', order.status, finalStatus, emailStatus);
      } else if (finalStatus === 'ausstehend_kommandant') {
        const kdtResult = await notifyKommandant(orderId, order.title);
        // E-Mail an Ersteller: Freigabe erfolgt, wartet auf Kommandant
        const creatorEmailSent = await sendEmailNotification({
          type: 'approval',
          order,
          approverName: profile?.full_name || 'Bereichsleiter',
          approverRole: 'Bereichsleiter',
        });
        emailStatus = creatorEmailSent ? 'sent' : 'failed';
        
        // Push-Notification an Ersteller
        if (order.created_by) {
          await sendPushNotification({
            userId: order.created_by,
            title: 'Bestellung weitergeleitet',
            body: `"${order.title}" wurde vom Bereichsleiter freigegeben und wartet auf Kommandant-Freigabe.`,
            orderId: order.id,
          });
        }
      } else {
        await notifyCreator(orderId, order.title, 'genehmigt');
        // E-Mail an Ersteller + Benachrichtigungs-E-Mail: Endgültige Freigabe
        const emailSent = await sendEmailNotification({
          type: 'final_approval',
          order,
          approverName: profile?.full_name || 'Bereichsleiter',
          approverRole: 'Bereichsleiter',
        });
        emailStatus = emailSent ? 'sent' : 'failed';
        
        // Push-Notification an Ersteller: Genehmigt
        if (order.created_by) {
          await sendPushNotification({
            userId: order.created_by,
            title: '✅ Bestellung genehmigt',
            body: `"${order.title}" wurde vom Bereichsleiter genehmigt.`,
            orderId: order.id,
          });
        }
      }
      
      // History-Eintrag nur wenn nicht schon oben erstellt (bei shouldAutoApproveAsKommandant)
      if (!shouldAutoApproveAsKommandant) {
        await createHistoryEntry(orderId, 'Freigabe durch Bereichsleitung', order.status, finalStatus, emailStatus);
      }
      fetchOrders(true);
    }
    
    return { error };
  }

  // Helper: Generate payment order reference number
  async function generatePaymentOrderReferenceNumber(): Promise<string> {
    if (!supabase) return `AZ-${Date.now()}`;
    
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
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }
    
    const nextNumber = maxNumber + 1;
    return `AZ-${year}-${String(nextNumber).padStart(3, '0')}`;
  }

  // Helper: Create approved payment order from order
  async function createApprovedPaymentOrderFromOrder(order: Order, approverName: string): Promise<{ success: boolean; referenceNumber?: string; error?: Error }> {
    if (!supabase || !user) return { success: false, error: new Error('Not authenticated') };
    
    try {
      // Get creator's full name
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', order.created_by)
        .single();
      
      const recipientName = creatorProfile?.full_name || 'Unbekannt';
      
      // Generate reference number with retry logic
      let referenceNumber = '';
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          referenceNumber = await generatePaymentOrderReferenceNumber();
          
          // Create the payment order with status 'approved'
          const { data: newPaymentOrder, error: insertError } = await supabase
            .from('payment_orders')
            .insert({
              reference_number: referenceNumber,
              created_by: user.id,
              amount: order.amount,
              recipient_name: recipientName,
              recipient_iban: null, // BAR payment, no IBAN needed
              purpose: order.title,
              payment_method: 'bar',
              notes: `Automatisch erstellt bei Freigabe der Bestellung. Bestellung: ${order.title}`,
              status: 'approved',
              approved_by: user.id,
              approved_at: new Date().toISOString(),
              submitted_at: new Date().toISOString(),
              order_id: order.id,
              email_status: 'none'
            })
            .select()
            .single();
          
          if (insertError) {
            if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
              lastError = new Error(insertError.message);
              await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
              continue;
            }
            throw insertError;
          }
          
          // Copy attachments from order
          if (newPaymentOrder) {
            const { data: orderAttachments } = await supabase
              .from('order_attachments')
              .select('*')
              .eq('order_id', order.id);
            
            if (orderAttachments && orderAttachments.length > 0) {
              // For payment orders, we store attachment info differently
              // Use the first attachment as the main attachment
              const firstAttachment = orderAttachments[0];
              await supabase
                .from('payment_orders')
                .update({
                  attachment_url: firstAttachment.file_path,
                  attachment_name: firstAttachment.file_name
                })
                .eq('id', newPaymentOrder.id);
            }
          }
          
          // Send notification to Kassier
          const { data: kassierProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, functions')
            .contains('functions', ['kassier'])
            .limit(1);
          
          const kassierData = kassierProfiles?.[0] || null;
          
          if (kassierData?.email) {
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            if (anonKey) {
              try {
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
                      type: 'payment_order_approved',
                      recipientEmail: kassierData.email,
                      recipientName: kassierData.full_name || 'Kassier',
                      recipientId: kassierData.id,
                      referenceNumber: referenceNumber,
                      amount: order.amount,
                      purpose: order.title,
                      recipientNameOrder: recipientName,
                      approverName: approverName,
                    }),
                  }
                );
                
                // Update email status
                await supabase
                  .from('payment_orders')
                  .update({ email_status: 'sent' })
                  .eq('id', newPaymentOrder.id);
              } catch (emailError) {
                console.error('Error sending payment order notification:', emailError);
                await supabase
                  .from('payment_orders')
                  .update({ email_status: 'failed' })
                  .eq('id', newPaymentOrder.id);
              }
            }
          }
          
          // Create in-app notification for Kassier
          if (kassierData?.id) {
            await supabase.from('notifications').insert({
              user_id: kassierData.id,
              type: 'order',
              title: 'Neue genehmigte Auszahlungsanweisung',
              message: `${approverName} hat eine Auszahlungsanweisung genehmigt (${referenceNumber}, ${order.amount.toFixed(2)} €)`,
              data: { referenceNumber },
            });
          }
          
          // Push notification to Kassier
          if (kassierData?.id) {
            await sendPushNotification({
              userId: kassierData.id,
              title: '💰 Neue Auszahlungsanweisung',
              body: `${referenceNumber}: ${order.amount.toFixed(2)} € an ${recipientName} - Bereit zur Auszahlung`,
            });
          }
          
          return { success: true, referenceNumber };
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (!lastError.message?.includes('duplicate') && !lastError.message?.includes('unique')) {
            console.error('Error creating payment order:', err);
            return { success: false, error: lastError };
          }
        }
      }
      
      return { success: false, error: lastError || new Error('Failed to create payment order after retries') };
    } catch (err) {
      console.error('Error in createApprovedPaymentOrderFromOrder:', err);
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  async function approveByKommandant(orderId: string, invoiceTo: InvoiceTo, createPaymentOrder?: boolean) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Bestellung direkt aus der Datenbank holen (falls lokaler State leer ist)
    let order = orders.find(o => o.id === orderId);
    if (!order) {
      console.log('approveByKommandant: Order not in local state, fetching from database...');
      const { data: fetchedOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          creator:profiles!orders_created_by_fkey(full_name, email),
          supplier:suppliers(name)
        `)
        .eq('id', orderId)
        .single();
      
      if (fetchError || !fetchedOrder) {
        console.error('approveByKommandant: Order not found in database', fetchError);
        return { error: new Error('Order not found') };
      }
      order = fetchedOrder as Order;
      console.log('approveByKommandant: Fetched order from database:', order.id, 'status:', order.status);
    }
    
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'freigegeben_kommandant',
        kommandant_id: user.id,
        kommandant_approved_at: new Date().toISOString(),
        invoice_to: invoiceTo,
        // Batch-Felder zurücksetzen bei Neugenehmigung
        order_executed: false,
        order_executed_at: null,
        order_executed_by: null,
        order_received: false,
        order_received_at: null,
        order_received_by: null,
        kassier_bestellt: false,
        kassier_bestellt_at: null,
        kassier_bestellt_by: null
      })
      .eq('id', orderId);
    
    if (!error) {
      await notifyCreator(orderId, order.title, 'freigegeben_kommandant');
      // E-Mail an Ersteller + Benachrichtigungs-E-Mail: Kommandant-Freigabe
      const emailSent = await sendEmailNotification({
        type: 'final_approval',
        order,
        approverName: profile?.full_name || 'Kommandant',
        approverRole: 'Kommandant',
      });
      
      // Push-Notification an Ersteller: Genehmigt
      if (order.created_by) {
        await sendPushNotification({
          userId: order.created_by,
          title: '✅ Bestellung genehmigt',
          body: `"${order.title}" wurde vom Kommandant genehmigt.`,
          orderId: order.id,
        });
      }
      
      await createHistoryEntry(orderId, 'Freigabe durch Kommandant', order.status, 'freigegeben_kommandant', emailSent ? 'sent' : 'failed');
      
      // Create approved payment order if requested
      if (createPaymentOrder) {
        const paymentResult = await createApprovedPaymentOrderFromOrder(order, profile?.full_name || 'Kommandant');
        if (paymentResult.success) {
          await createHistoryEntry(orderId, `Auszahlungsanweisung ${paymentResult.referenceNumber} automatisch erstellt und genehmigt`, 'freigegeben_kommandant', 'freigegeben_kommandant', 'none');
        }
      }
      
      fetchOrders(true);
    }
    
    return { error };
  }

  // Kommandant kann auch Bestellungen direkt freigeben (ohne Bereichsleiter-Freigabe)
  async function approveByKommandantDirect(orderId: string, invoiceTo: InvoiceTo, createPaymentOrder?: boolean) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Bestellung direkt aus der Datenbank holen (falls lokaler State leer ist)
    let order = orders.find(o => o.id === orderId);
    if (!order) {
      console.log('approveByKommandantDirect: Order not in local state, fetching from database...');
      const { data: fetchedOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          creator:profiles!orders_created_by_fkey(full_name, email),
          supplier:suppliers(name)
        `)
        .eq('id', orderId)
        .single();
      
      if (fetchError || !fetchedOrder) {
        console.error('approveByKommandantDirect: Order not found in database', fetchError);
        return { error: new Error('Order not found') };
      }
      order = fetchedOrder as Order;
      console.log('approveByKommandantDirect: Fetched order from database:', order.id, 'status:', order.status);
    }
    
    // Für Bestellungen die noch beim Bereichsleiter sind oder auf ihn warten
    if (!['eingereicht', 'ausstehend_bereichsleitung'].includes(order.status)) {
      return { error: new Error('Diese Bestellung kann nicht direkt freigegeben werden') };
    }
    
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'freigegeben_kommandant',
        kommandant_id: user.id,
        kommandant_approved_at: new Date().toISOString(),
        // Auch als Bereichsleiter-Freigabe markieren
        bereichsleiter_approved_at: new Date().toISOString(),
        invoice_to: invoiceTo,
        // Batch-Felder zurücksetzen bei Neugenehmigung
        order_executed: false,
        order_executed_at: null,
        order_executed_by: null,
        order_received: false,
        order_received_at: null,
        order_received_by: null,
        kassier_bestellt: false,
        kassier_bestellt_at: null,
        kassier_bestellt_by: null
      })
      .eq('id', orderId);
    
    if (!error) {
      await notifyCreator(orderId, order.title, 'freigegeben_kommandant');
      // E-Mail an Ersteller + Benachrichtigungs-E-Mail: Kommandant-Freigabe
      const emailSent = await sendEmailNotification({
        type: 'final_approval',
        order,
        approverName: profile?.full_name || 'Kommandant',
        approverRole: 'Kommandant',
      });
      
      // Push-Notification an Ersteller: Genehmigt
      if (order.created_by) {
        await sendPushNotification({
          userId: order.created_by,
          title: '✅ Bestellung genehmigt',
          body: `"${order.title}" wurde direkt vom Kommandant genehmigt.`,
          orderId: order.id,
        });
      }
      
      await createHistoryEntry(orderId, 'Direkte Freigabe durch Kommandant (ohne Bereichsleitung)', order.status, 'freigegeben_kommandant', emailSent ? 'sent' : 'failed');
      
      // Create approved payment order if requested
      if (createPaymentOrder) {
        const paymentResult = await createApprovedPaymentOrderFromOrder(order, profile?.full_name || 'Kommandant');
        if (paymentResult.success) {
          await createHistoryEntry(orderId, `Auszahlungsanweisung ${paymentResult.referenceNumber} automatisch erstellt und genehmigt`, 'freigegeben_kommandant', 'freigegeben_kommandant', 'none');
        }
      }
      
      fetchOrders(true);
    }
    
    return { error };
  }

  // Kommandant kann Kommandomitglieder-Abstimmung überstimmen mit Begründung
  async function overrideKommandomitgliedVote(orderId: string, decision: 'approve' | 'reject', reason: string, invoiceTo?: InvoiceTo, votingResultsHtml?: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Bestellung direkt aus der Datenbank holen (falls lokaler State leer ist)
    let order = orders.find(o => o.id === orderId);
    if (!order) {
      const { data: fetchedOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          creator:profiles!orders_created_by_fkey(full_name, email),
          supplier:suppliers(name)
        `)
        .eq('id', orderId)
        .single();
      
      if (fetchError || !fetchedOrder) {
        console.error('overrideKommandomitgliedVote: Order not found', fetchError);
        return { error: new Error('Order not found') };
      }
      order = fetchedOrder as Order;
    }
    
    // Kommandant oder Admin darf überstimmen
    const canOverride = profile?.role === 'kommandant' || profile?.role === 'admin';
    if (!canOverride) {
      return { error: new Error('Nur der Kommandant oder Admin kann die Abstimmung überstimmen') };
    }

    const newStatus = decision === 'approve' ? 'genehmigt' : 'abgelehnt';
    
    const updateData: Record<string, unknown> = {
      status: newStatus,
      kommandomitglied_override_by: user.id,
      kommandomitglied_override_reason: reason,
      kommandomitglied_override_at: new Date().toISOString(),
      // Abstimmung schließen
      voting_status: 'closed',
      voting_closed_at: new Date().toISOString(),
      voting_closed_by: user.id,
      voting_result: 'overridden',
      // Batch-Felder zurücksetzen bei Neugenehmigung
      order_executed: false,
      order_executed_at: null,
      order_executed_by: null,
      order_received: false,
      order_received_at: null,
      order_received_by: null,
      kassier_bestellt: false,
      kassier_bestellt_at: null,
      kassier_bestellt_by: null
    };

    if (decision === 'approve') {
      updateData.kommandant_id = user.id;
      updateData.kommandant_approved_at = new Date().toISOString();
      updateData.kommandomitglied_approved_at = new Date().toISOString();
      if (invoiceTo) updateData.invoice_to = invoiceTo;
    } else {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = user.id;
      updateData.rejection_reason = reason;
    }
    
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
    
    if (!error) {
      await notifyCreator(orderId, order.title, newStatus);
      const actionText = decision === 'approve' 
        ? `Kommandant-Direktentscheidung (Freigabe): ${reason}`
        : `Kommandant-Direktentscheidung (Ablehnung): ${reason}`;
      
      const emailSent = await sendEmailNotification({
        type: decision === 'approve' ? 'final_approval' : 'rejection',
        order,
        approverName: profile?.full_name || 'Kommandant',
        approverRole: 'Kommandant',
        rejectionReason: decision === 'reject' ? reason : undefined,
      });
      
      // E-Mail an Schriftführer senden (bei Freigabe UND Ablehnung)
      if (decision === 'reject' && schriftfuehrerEmail) {
        await sendSchriftfuehrerNotification({
          order,
          approverName: profile?.full_name || 'Kommandant',
          approverRole: 'Kommandant',
          rejectionReason: reason,
          votingResultsHtml: votingResultsHtml || 'Keine Abstimmungsdaten verfügbar',
        });
      }
      
      // E-Mail an Kassier senden (bei Freigabe UND Ablehnung)
      if (kassierEmail) {
        await sendKassierNotification({
          order,
          approverName: profile?.full_name || 'Kommandant',
          decision: decision === 'approve' ? 'genehmigt' : 'abgelehnt',
          decisionType: 'Kommandant-Direktentscheidung',
          votingResultsHtml: votingResultsHtml || 'Keine Abstimmungsdaten verfügbar',
        });
      }
      
      // Push-Notification an Ersteller
      if (order.created_by) {
        await sendPushNotification({
          userId: order.created_by,
          title: decision === 'approve' ? '✅ Bestellung genehmigt' : '❌ Bestellung abgelehnt',
          body: decision === 'approve' 
            ? `"${order.title}" wurde durch Kommandant-Direktentscheidung genehmigt.`
            : `"${order.title}" wurde durch Kommandant-Direktentscheidung abgelehnt.`,
          orderId: order.id,
        });
      }
      
      await createHistoryEntry(orderId, actionText, order.status, newStatus, emailSent ? 'sent' : 'failed');
      fetchOrders(true);
    } else {
      console.error('overrideKommandomitgliedVote: Update error', error);
    }
    
    return { error };
  }

  // Kommandomitglieder-Abstimmung abschließen (wird automatisch aufgerufen wenn Mehrheit erreicht)
  async function completeKommandomitgliedVote(orderId: string, decision: 'approve' | 'reject', invoiceTo?: InvoiceTo, votingResultsHtml?: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Bestellung direkt aus der Datenbank holen (falls lokaler State leer ist)
    let order = orders.find(o => o.id === orderId);
    if (!order) {
      const { data: fetchedOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          creator:profiles!orders_created_by_fkey(full_name, email),
          supplier:suppliers(name)
        `)
        .eq('id', orderId)
        .single();
      
      if (fetchError || !fetchedOrder) {
        console.error('completeKommandomitgliedVote: Order not found', fetchError);
        return { error: new Error('Order not found') };
      }
      order = fetchedOrder as Order;
    }

    const newStatus = decision === 'approve' ? 'genehmigt' : 'abgelehnt';
    
    const updateData: Record<string, unknown> = {
      status: newStatus,
      // Abstimmung schließen
      voting_status: 'closed',
      voting_closed_at: new Date().toISOString(),
      voting_closed_by: user.id,
      voting_result: decision === 'approve' ? 'approved' : 'rejected',
      // Batch-Felder zurücksetzen bei Neugenehmigung
      order_executed: false,
      order_executed_at: null,
      order_executed_by: null,
      order_received: false,
      order_received_at: null,
      order_received_by: null,
      kassier_bestellt: false,
      kassier_bestellt_at: null,
      kassier_bestellt_by: null
    };

    if (decision === 'approve') {
      updateData.kommandomitglied_approved_at = new Date().toISOString();
      if (invoiceTo) updateData.invoice_to = invoiceTo;
    } else {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejection_reason = 'Mehrheitlich abgelehnt durch Kommandomitglieder';
    }
    
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
    
    if (!error) {
      await notifyCreator(orderId, order.title, newStatus);
      const actionText = decision === 'approve' 
        ? 'Mehrheitlich freigegeben durch Kommandomitglieder'
        : 'Mehrheitlich abgelehnt durch Kommandomitglieder';
      
      const emailSent = await sendEmailNotification({
        type: decision === 'approve' ? 'final_approval' : 'rejection',
        order,
        approverName: 'Kommandomitglieder (Mehrheit)',
        approverRole: 'Kommandomitglieder',
        rejectionReason: decision === 'reject' ? 'Mehrheitlich abgelehnt' : undefined,
      });
      
      // E-Mail an Schriftführer senden (bei Freigabe UND Ablehnung)
      if (schriftfuehrerEmail) {
        await sendSchriftfuehrerNotification({
          order,
          approverName: 'Kommandomitglieder (Mehrheit)',
          decision: decision === 'approve' ? 'genehmigt' : 'abgelehnt',
          decisionType: 'Abstimmungsergebnis',
          votingResultsHtml: votingResultsHtml || 'Keine Abstimmungsdaten verfügbar',
        });
      }
      
      // E-Mail an Kassier senden (bei Freigabe UND Ablehnung)
      if (kassierEmail) {
        await sendKassierNotification({
          order,
          approverName: 'Kommandomitglieder (Mehrheit)',
          decision: decision === 'approve' ? 'genehmigt' : 'abgelehnt',
          decisionType: 'Abstimmungsergebnis',
          votingResultsHtml: votingResultsHtml || 'Keine Abstimmungsdaten verfügbar',
        });
      }
      
      // Push-Notification an Ersteller
      if (order.created_by) {
        await sendPushNotification({
          userId: order.created_by,
          title: decision === 'approve' ? '✅ Bestellung genehmigt' : '❌ Bestellung abgelehnt',
          body: decision === 'approve' 
            ? `"${order.title}" wurde durch Kommandomitglieder-Abstimmung genehmigt.`
            : `"${order.title}" wurde durch Kommandomitglieder-Abstimmung abgelehnt.`,
          orderId: order.id,
        });
      }
      
      await createHistoryEntry(orderId, actionText, order.status, newStatus, emailSent ? 'sent' : 'failed');
      fetchOrders(true);
    }
    
    return { error };
  }

  async function rejectOrder(orderId: string, reason: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Bestellung direkt aus der Datenbank holen (falls lokaler State leer ist)
    let order = orders.find(o => o.id === orderId);
    if (!order) {
      console.log('rejectOrder: Order not in local state, fetching from database...');
      const { data: fetchedOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          creator:profiles!orders_created_by_fkey(full_name, email),
          supplier:suppliers(name)
        `)
        .eq('id', orderId)
        .single();
      
      if (fetchError || !fetchedOrder) {
        console.error('rejectOrder: Order not found in database', fetchError);
        return { error: new Error('Order not found') };
      }
      order = fetchedOrder as Order;
      console.log('rejectOrder: Fetched order from database:', order.id, 'status:', order.status);
    }
    
    // Berechtigungsprüfung: Nur zugewiesener Bereichsleiter oder Kommandant
    const canRejectAsBereichsleiter = isBereichsleiter && order.status === 'eingereicht' && order.bereichsleiter_id === user.id;
    // Kommandant kann bei allen relevanten Status ablehnen
    const kommandantAllowedStatuses: OrderStatus[] = ['eingereicht', 'ausstehend_bereichsleitung', 'ausstehend_kommandant', 'freigegeben_bereichsleitung'];
    const canRejectAsKommandant = isKommandant && kommandantAllowedStatuses.includes(order.status);
    
    console.log('rejectOrder: Permission check -', {
      isBereichsleiter,
      isKommandant,
      orderStatus: order.status,
      orderBereichsleiterId: order.bereichsleiter_id,
      userId: user.id,
      canRejectAsBereichsleiter,
      canRejectAsKommandant,
      kommandantAllowedStatuses
    });
    
    if (!canRejectAsBereichsleiter && !canRejectAsKommandant) {
      return { error: new Error('Sie sind nicht berechtigt, diese Bestellung abzulehnen') };
    }
    
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'abgelehnt',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: reason
      })
      .eq('id', orderId);
    
    if (!error) {
      await notifyCreator(orderId, order.title, 'abgelehnt');
      // E-Mail an Ersteller: Ablehnung
      const emailSent = await sendEmailNotification({
        type: 'rejection',
        order,
        approverName: profile?.full_name || 'Benutzer',
        approverRole: isKommandant ? 'Kommandant' : 'Bereichsleiter',
        rejectionReason: reason,
      });
      
      // Push-Notification an Ersteller: Abgelehnt
      if (order.created_by) {
        await sendPushNotification({
          userId: order.created_by,
          title: '❌ Bestellung abgelehnt',
          body: `"${order.title}" wurde abgelehnt: ${reason}`,
          orderId: order.id,
        });
      }
      
      await createHistoryEntry(orderId, `Abgelehnt: ${reason}`, order.status, 'abgelehnt', emailSent ? 'sent' : 'failed');
      fetchOrders(true);
    } else {
      console.error('rejectOrder: Update error', error);
    }
    
    return { error };
  }

  async function completeOrder(orderId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Bestellung direkt aus der Datenbank holen (falls lokaler State leer ist)
    let order = orders.find(o => o.id === orderId);
    if (!order) {
      console.log('completeOrder: Order not in local state, fetching from database...');
      const { data: fetchedOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          creator:profiles!orders_created_by_fkey(full_name, email),
          supplier:suppliers(name)
        `)
        .eq('id', orderId)
        .single();
      
      if (fetchError || !fetchedOrder) {
        console.error('completeOrder: Order not found in database', fetchError);
        return { error: new Error('Order not found') };
      }
      order = fetchedOrder as Order;
    }
    
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'abgeschlossen',
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: user.id
      })
      .eq('id', orderId);
    
    if (!error) {
      await createHistoryEntry(orderId, 'Bestellung abgeschlossen und archiviert', order.status, 'abgeschlossen');
      fetchOrders(true);
    } else {
      console.error('completeOrder: Update error', error);
    }
    
    return { error };
  }

  // Kommandant kann Bestellungen auf Entwurf zurücksetzen
  async function resetToDraft(orderId: string, reason: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Nur Kommandant darf zurücksetzen
    if (!isKommandant) {
      return { error: new Error('Nur Kommandanten können Bestellungen zurücksetzen') };
    }
    
    // Bestellung direkt aus der Datenbank holen (falls lokaler State leer ist)
    let order = orders.find(o => o.id === orderId);
    if (!order) {
      console.log('resetToDraft: Order not in local state, fetching from database...');
      const { data: fetchedOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          creator:profiles!orders_created_by_fkey(full_name, email),
          supplier:suppliers(name)
        `)
        .eq('id', orderId)
        .single();
      
      if (fetchError || !fetchedOrder) {
        console.error('resetToDraft: Order not found in database', fetchError);
        return { error: new Error('Order not found') };
      }
      order = fetchedOrder as Order;
    }
    
    // Grund muss angegeben werden
    if (!reason.trim()) {
      return { error: new Error('Bitte geben Sie einen Grund für die Zurücksetzung an') };
    }
    
    // Nur bestimmte Status können zurückgesetzt werden
    const allowedStatuses: OrderStatus[] = ['eingereicht', 'ausstehend_kommandant', 'freigegeben_bereichsleitung', 'genehmigt', 'abgelehnt'];
    if (!allowedStatuses.includes(order.status)) {
      return { error: new Error('Diese Bestellung kann nicht zurückgesetzt werden') };
    }
    
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'entwurf',
        reset_at: new Date().toISOString(),
        reset_by: user.id,
        reset_reason: reason,
        // Reset approval fields
        bereichsleiter_approved_at: null,
        kommandant_approved_at: null,
        kommandant_id: null,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (!error) {
      // E-Mail an Ersteller senden
      const emailSent = await sendResetNotification(order, reason);
      
      // Benachrichtigung an Ersteller
      await supabase.from('notifications').insert({
        user_id: order.created_by,
        order_id: orderId,
        message: `Ihre Bestellung "${order.title}" wurde auf Entwurf zurückgesetzt. Grund: ${reason}`
      });
      
      await createHistoryEntry(orderId, `Auf Entwurf zurückgesetzt: ${reason}`, order.status, 'entwurf', emailSent ? 'sent' : 'failed');
      fetchOrders(true);
    } else {
      console.error('resetToDraft: Update error', error);
    }
    
    return { error };
  }

  // E-Mail an Ersteller bei Zurücksetzung
  async function sendResetNotification(order: Order, resetReason: string): Promise<boolean> {
    if (!supabase) return false;
    
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.error('sendResetNotification: ANON_KEY not available');
      return false;
    }
    
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
            type: 'reset_to_draft',
            orderId: order.id,
            orderTitle: order.title,
            orderAmount: order.amount,
            creatorEmail: order.creator?.email || '',
            creatorName: order.creator?.full_name || 'Benutzer',
            approverName: profile?.full_name || 'Kommandant',
            approverRole: 'Kommandant',
            resetReason,
          }),
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error sending reset notification:', error);
      return false;
    }
  }

  async function createHistoryEntry(
    orderId: string, 
    action: string, 
    oldStatus: OrderStatus | null, 
    newStatus: OrderStatus,
    emailStatus: EmailStatus = 'none'
  ) {
    if (!supabase || !user) return;
    
    await supabase.from('order_history').insert({
      order_id: orderId,
      action,
      old_status: oldStatus,
      new_status: newStatus,
      performed_by: user.id,
      email_status: emailStatus
    });
  }

  // E-Mail an zugewiesenen Bereichsleiter senden
  async function notifyAndEmailBereichsleiter(orderId: string, orderTitle: string, bereichsleiterId: string): Promise<boolean> {
    if (!supabase) return false;
    
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.error('notifyAndEmailBereichsleiter: ANON_KEY not available');
      return false;
    }
    
    // Check if Bereichsleiter is absent and has a substitute
    const { data: blProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_absent, absent_until, substitute_id')
      .eq('id', bereichsleiterId)
      .single();
    
    let effectiveRecipientId = bereichsleiterId;
    let effectiveProfile = blProfile;
    let isSubstitute = false;
    
    // Check if BL is absent and has a substitute
    if (blProfile?.is_absent && blProfile?.substitute_id) {
      // Check if absence is still valid
      let isStillAbsent = true;
      if (blProfile.absent_until) {
        const absentUntil = new Date(blProfile.absent_until);
        if (absentUntil < new Date()) {
          isStillAbsent = false;
        }
      }
      
      if (isStillAbsent) {
        // Get substitute's profile
        const { data: substituteProfile } = await supabase
          .from('profiles')
          .select('id, email, full_name, is_absent')
          .eq('id', blProfile.substitute_id)
          .single();
        
        // Only use substitute if they're not also absent
        if (substituteProfile && !substituteProfile.is_absent) {
          effectiveRecipientId = substituteProfile.id;
          effectiveProfile = substituteProfile;
          isSubstitute = true;
          console.log(`[notifyAndEmailBereichsleiter] Using substitute: ${substituteProfile.full_name} for ${blProfile.full_name}`);
        }
      }
    }
    
    // In-App Benachrichtigung an effektiven Empfänger
    await supabase.from('notifications').insert({
      user_id: effectiveRecipientId,
      order_id: orderId,
      message: isSubstitute 
        ? `[Vertretung] Neue Bestellung zur Freigabe: ${orderTitle}`
        : `Neue Bestellung zur Freigabe: ${orderTitle}`
    });
    
    // E-Mail an effektiven Empfänger senden
    try {
      if (effectiveProfile?.email) {
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
              type: 'new_order_bereichsleiter',
              recipientEmail: effectiveProfile.email,
              recipientName: effectiveProfile.full_name,
              orderTitle,
              orderId,
              creatorName: profile?.full_name || 'Ein Mitglied',
              isSubstitute,
              originalApproverName: isSubstitute ? blProfile?.full_name : undefined,
            }),
          }
        );
        return response.ok;
      }
      return false;
    } catch (error) {
      console.error('Error sending email to Bereichsleiter:', error);
      return false;
    }
  }

  // E-Mail an alle Kommandanten senden
  async function notifyAndEmailKommandant(orderId: string, orderTitle: string, isNewOrder: boolean = false): Promise<{ sent: number; failed: number }> {
    if (!supabase) return { sent: 0, failed: 0 };
    
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.error('notifyAndEmailKommandant: ANON_KEY not available');
      return { sent: 0, failed: 0 };
    }
    
    const { data: kommandanten } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'kommandant');
    
    let sent = 0;
    let failed = 0;
    
    if (kommandanten) {
      for (const kdt of kommandanten) {
        // In-App Benachrichtigung
        await supabase.from('notifications').insert({
          user_id: kdt.id,
          order_id: orderId,
          message: isNewOrder 
            ? `Neue Bestellung erfordert Ihre Freigabe: ${orderTitle}`
            : `Bestellung wartet auf Ihre Freigabe: ${orderTitle}`
        });
        
        // E-Mail senden
        if (kdt.email) {
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
                  type: 'new_order_kommandant',
                  recipientEmail: kdt.email,
                  recipientName: kdt.full_name,
                  orderTitle,
                  orderId,
                  requiresApproval: !isNewOrder,
                }),
              }
            );
            if (response.ok) {
              sent++;
            } else {
              failed++;
            }
          } catch (error) {
            console.error('Error sending email to Kommandant:', error);
            failed++;
          }
        }
      }
    }
    return { sent, failed };
  }

  // E-Mail an alle Kommandomitglieder senden
  async function notifyAndEmailKommandomitglieder(orderId: string, orderTitle: string, orderAmount: number, creatorName: string): Promise<{ sent: number; failed: number }> {
    if (!supabase) return { sent: 0, failed: 0 };
    
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.error('notifyAndEmailKommandomitglieder: ANON_KEY not available');
      return { sent: 0, failed: 0 };
    }
    
    // Fetch all Kommandomitglieder
    const { data: kommandomitglieder } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .contains('functions', ['kommandomitglied']);
    
    if (!kommandomitglieder || kommandomitglieder.length === 0) {
      console.log('notifyAndEmailKommandomitglieder: No Kommandomitglieder found');
      return { sent: 0, failed: 0 };
    }
    
    // Create in-app notifications for all
    for (const km of kommandomitglieder) {
      await supabase.from('notifications').insert({
        user_id: km.id,
        order_id: orderId,
        message: `Abstimmung erforderlich: ${orderTitle}`
      });
    }
    
    // Collect emails for batch send
    const recipientEmails = kommandomitglieder
      .filter(km => km.email)
      .map(km => km.email);
    
    if (recipientEmails.length === 0) {
      return { sent: 0, failed: 0 };
    }
    
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
            type: 'new_order_kommandomitglied',
            recipientEmails,
            recipientName: 'Kommandomitglied',
            orderTitle,
            orderId,
            orderAmount,
            creatorName,
          }),
        }
      );
      
      if (response.ok) {
        return { sent: recipientEmails.length, failed: 0 };
      } else {
        console.error('notifyAndEmailKommandomitglieder: HTTP error', response.status);
        return { sent: 0, failed: recipientEmails.length };
      }
    } catch (error) {
      console.error('Error sending email to Kommandomitglieder:', error);
      return { sent: 0, failed: recipientEmails.length };
    }
  }

  // Alte Funktionen für Kompatibilität beibehalten
  async function notifyBereichsleiter(orderId: string, orderTitle: string) {
    // Wird nicht mehr verwendet, aber für Kompatibilität beibehalten
  }

  async function notifyKommandant(orderId: string, orderTitle: string) {
    await notifyAndEmailKommandant(orderId, orderTitle, false);
  }

  async function notifyCreator(orderId: string, orderTitle: string, status: 'genehmigt' | 'abgelehnt' | 'freigegeben_kommandant' | 'freigegeben_bereichsleitung') {
    if (!supabase) return;
    
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    let message: string;
    switch (status) {
      case 'genehmigt':
        message = `Ihre Bestellung wurde genehmigt: ${orderTitle}`;
        break;
      case 'freigegeben_kommandant':
        message = `Ihre Bestellung wurde vom Kommandant freigegeben: ${orderTitle}`;
        break;
      case 'freigegeben_bereichsleitung':
        message = `Ihre Bestellung wurde von der Bereichsleitung freigegeben: ${orderTitle}`;
        break;
      case 'abgelehnt':
        message = `Ihre Bestellung wurde abgelehnt: ${orderTitle}`;
        break;
    }
    
    await supabase.from('notifications').insert({
      user_id: order.created_by,
      order_id: orderId,
      message
    });
  }

  // Bestellungen die ich freigeben muss
  const pendingForMe = orders.filter(order => {
    // Bereichsleiter: Nur Bestellungen die mir zugewiesen sind
    if (isBereichsleiter && order.status === 'eingereicht' && order.bereichsleiter_id === user?.id) {
      return true;
    }
    // Kommandant: Alle Bestellungen die auf Kommandant-Freigabe warten
    if (isKommandant && order.status === 'ausstehend_kommandant') {
      return true;
    }
    // Kommandant als zugewiesener Bereichsleiter: Eingereichte Bestellungen die ihm zugewiesen sind
    // Diese werden dann direkt freigegeben (beide Stufen gleichzeitig)
    if (isKommandant && order.status === 'eingereicht' && order.bereichsleiter_id === user?.id) {
      return true;
    }
    // Kommandant: Eingereichte Bestellungen OHNE Bereichsleiter die KDT-Freigabe erfordern
    // Diese gehen direkt zum Kommandant ohne BL-Freigabe
    if (isKommandant && order.status === 'eingereicht' && order.requires_kommandant_approval && !order.bereichsleiter_id) {
      return true;
    }
    return false;
  });

  // Funktion zum Hochladen von Anhängen
  async function uploadOrderAttachments(orderId: string, files: File[]): Promise<void> {
    if (!supabase || !user) return;

    for (const file of files) {
      try {
        // Eindeutiger Dateipfad: userId/orderId/timestamp-filename
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${user.id}/${orderId}/${timestamp}-${safeName}`;

        // Datei in Storage hochladen
        const { error: uploadError } = await supabase.storage
          .from('order-attachments')
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          continue;
        }

        // Metadaten in der Datenbank speichern
        const { error: dbError } = await supabase
          .from('order_attachments')
          .insert({
            order_id: orderId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id
          });

        if (dbError) {
          console.error('Attachment metadata error:', dbError);
          // Versuche die hochgeladene Datei zu löschen wenn DB-Insert fehlschlägt
          await supabase.storage.from('order-attachments').remove([filePath]);
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
  }

  // Funktion zum Löschen eines einzelnen Anhangs
  async function deleteOrderAttachment(attachmentId: string, filePath: string): Promise<{ error: Error | null }> {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    try {
      // Zuerst die Datei aus dem Storage löschen
      const { error: storageError } = await supabase.storage
        .from('order-attachments')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Weiter machen - vielleicht existiert die Datei nicht mehr
      }

      // Dann den Metadatensatz löschen
      const { error: dbError } = await supabase
        .from('order_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) {
        console.error('Attachment metadata delete error:', dbError);
        return { error: new Error('Fehler beim Löschen des Anhangs') };
      }

      return { error: null };
    } catch (error) {
      console.error('Delete attachment error:', error);
      return { error: error instanceof Error ? error : new Error('Unbekannter Fehler') };
    }
  }

  // Bestellungen die auf Bereichsleiter-Freigabe warten (für Kommandant-Übersicht)
  const waitingForBereichsleiter = orders.filter(order => 
    order.status === 'eingereicht'
  );

  // Meine erstellten Bestellungen (nur Entwürfe und Eingereichte)
  const myOrders = orders.filter(order => 
    order.created_by === user?.id && ['entwurf', 'eingereicht'].includes(order.status)
  );

  // Meine abgeschlossenen Bestellungen
  const completedOrders = orders.filter(order => 
    order.created_by === user?.id && order.status === 'abgeschlossen'
  );

  // Freigegebene Bestellungen (nur für Ersteller relevant)
  const approvedOrders = orders.filter(order => 
    order.created_by === user?.id && order.status === 'genehmigt'
  );

  // Kassier: Bestellung als bestellt markieren
  async function markAsOrdered(orderId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('orders')
      .update({
        kassier_bestellt: true,
        kassier_bestellt_at: new Date().toISOString(),
        kassier_bestellt_by: user.id
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error marking order as ordered:', error);
      return { error };
    }

    // Add history entry
    await supabase.from('order_history').insert({
      order_id: orderId,
      action: 'Bestellung wurde vom Kassier als bestellt markiert',
      old_status: 'genehmigt',
      new_status: 'genehmigt',
      performed_by: user.id
    });

    await fetchOrders(true);
    return { error: null };
  }

  // Kassier: Bestellung wieder als nicht bestellt markieren
  async function unmarkAsOrdered(orderId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('orders')
      .update({
        kassier_bestellt: false,
        kassier_bestellt_at: null,
        kassier_bestellt_by: null
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error unmarking order as ordered:', error);
      return { error };
    }

    // Add history entry
    await supabase.from('order_history').insert({
      order_id: orderId,
      action: 'Bestellung wurde vom Kassier als nicht bestellt zurückgesetzt',
      old_status: 'genehmigt',
      new_status: 'genehmigt',
      performed_by: user.id
    });

    await fetchOrders(true);
    return { error: null };
  }

  // Mark order as executed (Bestellung wurde ausgeführt)
  async function markAsExecuted(orderId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('orders')
      .update({
        order_executed: true,
        order_executed_at: new Date().toISOString(),
        order_executed_by: user.id
      })
      .eq('id', orderId);

    if (error) return { error };

    // Add history entry
    await supabase.from('order_history').insert({
      order_id: orderId,
      action: 'Bestellung wurde als ausgeführt markiert',
      old_status: 'genehmigt',
      new_status: 'genehmigt',
      performed_by: user.id
    });

    await fetchOrders(true);
    return { error: null };
  }

  // Mark multiple orders as executed (Sammelbestellung)
  async function markMultipleAsExecuted(orderIds: string[]): Promise<{ error: Error | null; count: number }> {
    if (!supabase || !user) return { error: new Error('Not authenticated'), count: 0 };
    if (orderIds.length === 0) return { error: null, count: 0 };

    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('orders')
      .update({
        order_executed: true,
        order_executed_at: now,
        order_executed_by: user.id
      })
      .in('id', orderIds);

    if (error) return { error, count: 0 };

    // Add history entries for all orders
    const historyEntries = orderIds.map(orderId => ({
      order_id: orderId,
      action: 'Bestellung wurde als Sammelbestellung ausgeführt markiert',
      old_status: 'genehmigt',
      new_status: 'genehmigt',
      performed_by: user.id
    }));

    await supabase.from('order_history').insert(historyEntries);

    await fetchOrders(true);
    return { error: null, count: orderIds.length };
  }

  // Unmark order as executed
  async function unmarkAsExecuted(orderId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('orders')
      .update({
        order_executed: false,
        order_executed_at: null,
        order_executed_by: null
      })
      .eq('id', orderId);

    if (error) return { error };

    // Add history entry
    await supabase.from('order_history').insert({
      order_id: orderId,
      action: 'Markierung "Bestellung ausgeführt" wurde zurückgesetzt',
      old_status: 'genehmigt',
      new_status: 'genehmigt',
      performed_by: user.id
    });

    await fetchOrders(true);
    return { error: null };
  }

  // Mark order as received (Bestellung erhalten) - setzt auch Status auf abgeschlossen
  async function markAsReceived(orderId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    // Erst den aktuellen Status holen für die History
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    const oldStatus = currentOrder?.status || 'genehmigt';
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('orders')
      .update({
        order_received: true,
        order_received_at: now,
        order_received_by: user.id,
        status: 'abgeschlossen',
        is_archived: true,
        archived_at: now,
        archived_by: user.id
      })
      .eq('id', orderId);

    if (error) return { error };

    // Add history entry
    await supabase.from('order_history').insert({
      order_id: orderId,
      action: 'Bestellung wurde als erhalten markiert und abgeschlossen',
      old_status: oldStatus,
      new_status: 'abgeschlossen',
      performed_by: user.id
    });

    await fetchOrders(true);
    return { error: null };
  }

  // Unmark order as received
  async function unmarkAsReceived(orderId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('orders')
      .update({
        order_received: false,
        order_received_at: null,
        order_received_by: null
      })
      .eq('id', orderId);

    if (error) return { error };

    // Add history entry
    await supabase.from('order_history').insert({
      order_id: orderId,
      action: 'Markierung "Bestellung erhalten" wurde zurückgesetzt',
      old_status: 'genehmigt',
      new_status: 'genehmigt',
      performed_by: user.id
    });

    await fetchOrders(true);
    return { error: null };
  }

  // Bestellung und alle zugehörigen Daten löschen (nur für Admin und Kassier)
  async function deleteOrder(orderId: string) {
    console.log('deleteOrder: Starte Löschvorgang für Order', orderId);
    
    if (!supabase || !user) {
      console.error('deleteOrder: Nicht authentifiziert', { supabase: !!supabase, user: !!user });
      return { error: new Error('Not authenticated') };
    }
    
    // Prüfen ob Benutzer Admin oder Kassier ist
    const hasKassierFunction = profile?.functions?.includes('kassier') ?? false;
    console.log('deleteOrder: Berechtigungsprüfung', { isAdmin, hasKassierFunction, profile });
    
    if (!isAdmin && !hasKassierFunction) {
      console.error('deleteOrder: Keine Berechtigung');
      return { error: new Error('Nur Admin und Kassier dürfen Bestellungen löschen') };
    }
    
    console.log('deleteOrder: Berechtigung OK, lösche History...');
    
    // Zuerst alle zugehörigen Verlaufseinträge löschen
    const { error: historyError, count: historyCount } = await supabase
      .from('order_history')
      .delete()
      .eq('order_id', orderId)
      .select();
    
    console.log('deleteOrder: History gelöscht', { historyError, historyCount });
    
    if (historyError) {
      console.error('deleteOrder: Error deleting history', historyError);
      return { error: historyError };
    }
    
    console.log('deleteOrder: Lösche Anhänge...');
    
    // Alle zugehörigen Anhänge löschen
    const { error: attachmentsError } = await supabase
      .from('order_attachments')
      .delete()
      .eq('order_id', orderId);
    
    if (attachmentsError) {
      console.error('deleteOrder: Error deleting attachments', attachmentsError);
      // Weiter machen, da Anhänge optional sind
    }
    
    console.log('deleteOrder: Lösche Votes...');
    
    // Alle zugehörigen Votes löschen
    const { error: votesError } = await supabase
      .from('order_votes')
      .delete()
      .eq('order_id', orderId);
    
    if (votesError) {
      console.error('deleteOrder: Error deleting votes', votesError);
      // Weiter machen, da Votes optional sind
    }
    
    console.log('deleteOrder: Lösche Order selbst...');
    
    // Bestellung löschen
    const { error, data } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .select();
    
    console.log('deleteOrder: Order Löschung Ergebnis', { error, data });
    
    if (error) {
      console.error('deleteOrder: Error deleting order', error);
      return { error };
    }
    
    console.log('deleteOrder: Erfolgreich gelöscht, aktualisiere Liste...');
    
    // Liste aktualisieren
    await fetchOrders(true);
    
    console.log('deleteOrder: Fertig');
    
    return { error: null };
  }

  // Kommandoabstimmung für eine Bestellung anfordern
  async function requestKommandoVoting(orderId: string, enable: boolean) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Nur Kommandomitglieder, Kommandant oder Admin dürfen dies
    const canRequest = profile?.functions?.includes('kommandomitglied') || 
                       profile?.role === 'kommandant' || 
                       profile?.role === 'admin';
    
    if (!canRequest) {
      return { error: new Error('Keine Berechtigung für diese Aktion') };
    }
    
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return { error: new Error('Bestellung nicht gefunden') };
    }
    
    // Nur bei Bestellungen die noch nicht abgeschlossen sind
    if (order.status === 'genehmigt' || order.status === 'abgelehnt' || order.status === 'abgeschlossen') {
      return { error: new Error('Bestellung ist bereits abgeschlossen') };
    }
    
    // Wenn aktiviert: Abstimmung automatisch eröffnen (voting_status = 'open')
    // Wenn deaktiviert: Abstimmung zurücksetzen
    const updateData: Record<string, unknown> = {
      requires_kommandomitglied_approval: enable,
      updated_at: new Date().toISOString()
    };
    
    if (enable) {
      // Abstimmung automatisch eröffnen, damit sie unter "Zu erledigen" erscheint
      updateData.voting_status = 'open';
      updateData.voting_opened_at = new Date().toISOString();
      updateData.voting_result = null;
      updateData.voting_closed_at = null;
      updateData.voting_closed_by = null;
    } else {
      // Bei Deaktivierung: Abstimmungsstatus zurücksetzen
      updateData.voting_status = null;
      updateData.voting_opened_at = null;
      updateData.voting_result = null;
      updateData.voting_closed_at = null;
      updateData.voting_closed_by = null;
    }
    
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
    
    if (!error) {
      const actionText = enable 
        ? `Kommandoabstimmung angefordert und eröffnet von ${profile?.full_name || user.email}`
        : `Kommandoabstimmung deaktiviert von ${profile?.full_name || user.email}`;
      
      await createHistoryEntry(orderId, actionText, order.status, order.status, 'none');
      
      // Benachrichtigung an alle Kommandomitglieder, Kommandanten und Admins senden wenn aktiviert
      if (enable) {
        // Kommandomitglieder holen
        const { data: kommandomitglieder } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .contains('functions', ['kommandomitglied']);
        
        // Kommandanten und Admins holen
        const { data: kommandantenAdmins } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('role', ['kommandant', 'admin']);
        
        // Alle Empfänger zusammenführen (ohne Duplikate)
        const allRecipients = new Map<string, { id: string; email: string; full_name: string }>();
        
        kommandomitglieder?.forEach(km => allRecipients.set(km.id, km));
        kommandantenAdmins?.forEach(ka => allRecipients.set(ka.id, ka));
        
        // Sich selbst ausschließen (der Anfordernde muss nicht benachrichtigt werden)
        allRecipients.delete(user.id);
        
        // In-App Benachrichtigungen für alle Empfänger erstellen
        for (const recipient of allRecipients.values()) {
          await supabase.from('notifications').insert({
            user_id: recipient.id,
            subject: 'Kommandoabstimmung angefordert',
            message: `Für die Bestellung "${order.title}" (${order.amount.toFixed(2)} €) wurde eine Kommandoabstimmung angefordert. Bitte stimmen Sie ab.`,
            notification_type: 'order',
            order_id: orderId
          });
        }
        
        // E-Mails an alle Empfänger senden (batch)
        const recipientEmails = Array.from(allRecipients.values())
          .filter(r => r.email)
          .map(r => r.email);
        
        if (recipientEmails.length > 0) {
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          if (anonKey) {
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
                    type: 'new_order_kommandomitglied',
                    orderTitle: order.title,
                    orderId: order.id,
                    orderAmount: order.amount,
                    recipientEmails,
                    recipientName: 'Kommandomitglied',
                    creatorName: profile?.full_name || user.email
                  }),
                }
              );
              if (!response.ok) {
                console.error('requestKommandoVoting: E-Mail-Versand fehlgeschlagen', response.status);
              }
            } catch (error) {
              console.error('requestKommandoVoting: E-Mail-Versand Fehler', error);
            }
          }
        }
      }
      
      fetchOrders(true);
    }
    
    return { error };
  }

  // Status einer Bestellung ändern (nur für Kassier und Admin)
  async function changeOrderStatus(orderId: string, newStatus: OrderStatus, reason?: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Nur Kassier oder Admin dürfen den Status ändern
    const isKassier = profile?.functions?.includes('kassier');
    const isAdmin = profile?.role === 'admin';
    
    if (!isKassier && !isAdmin) {
      return { error: new Error('Keine Berechtigung für diese Aktion') };
    }
    
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return { error: new Error('Bestellung nicht gefunden') };
    }
    
    const oldStatus = order.status;
    
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    
    // Zusätzliche Felder je nach Status setzen
    if (newStatus === 'genehmigt' || newStatus === 'freigegeben_kommandant') {
      updateData.kommandant_approved_at = new Date().toISOString();
      updateData.kommandant_id = user.id;
    } else if (newStatus === 'abgelehnt') {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = user.id;
      updateData.rejection_reason = reason || 'Status manuell geändert';
    } else if (newStatus === 'entwurf') {
      updateData.reset_at = new Date().toISOString();
      updateData.reset_by = user.id;
      updateData.reset_reason = reason || 'Status manuell geändert';
    } else if (newStatus === 'freigegeben_bereichsleitung') {
      updateData.bereichsleiter_approved_at = new Date().toISOString();
      updateData.bereichsleiter_id = user.id;
    }
    
    // Bei manueller Statusänderung: Batch-Felder IMMER zurücksetzen (außer bei abgeschlossen)
    // damit die Buttons und Badges wieder korrekt angezeigt werden
    if (newStatus !== 'abgeschlossen') {
      updateData.order_executed = false;
      updateData.order_executed_at = null;
      updateData.order_executed_by = null;
      updateData.order_received = false;
      updateData.order_received_at = null;
      updateData.order_received_by = null;
      updateData.kassier_bestellt = false;
      updateData.kassier_bestellt_at = null;
      updateData.kassier_bestellt_by = null;
    }
    
    // Freigabe-Felder zurücksetzen wenn auf früheren Status
    const statusesBeforeApproval = ['entwurf', 'eingereicht', 'ausstehend_bereichsleitung', 'ausstehend_kommandant', 'ausstehend_kommandomitglieder', 'freigegeben_bereichsleitung'];
    if (statusesBeforeApproval.includes(newStatus)) {
      if (newStatus === 'entwurf' || newStatus === 'eingereicht') {
        updateData.bereichsleiter_approved_at = null;
        updateData.kommandant_approved_at = null;
        updateData.kommandomitglied_approved_at = null;
        updateData.rejected_at = null;
        updateData.rejected_by = null;
        updateData.rejection_reason = null;
      }
    }
    
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
    
    if (error) {
      console.error('changeOrderStatus: Database update failed', error);
      return { error };
    }
    
    const roleLabel = isAdmin ? 'Administrator' : 'Kassier';
    const actionText = reason 
      ? `Status geändert von "${getStatusLabel(oldStatus)}" zu "${getStatusLabel(newStatus)}" durch ${roleLabel}: ${reason}`
      : `Status geändert von "${getStatusLabel(oldStatus)}" zu "${getStatusLabel(newStatus)}" durch ${roleLabel}`;
    
    await createHistoryEntry(orderId, actionText, oldStatus, newStatus, 'none');
    
    // Benachrichtigung an Ersteller senden
    await supabase.from('notifications').insert({
      user_id: order.created_by,
      subject: 'Bestellungsstatus geändert',
      message: `Der Status Ihrer Bestellung "${order.title}" wurde von ${profile?.full_name || user.email} zu "${getStatusLabel(newStatus)}" geändert.${reason ? ` Grund: ${reason}` : ''}`,
      notification_type: 'order',
      order_id: orderId
    });
    
    await fetchOrders(true);
    
    return { error: null };
  }
  
  // Hilfsfunktion für Status-Labels
  function getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      'entwurf': 'Entwurf',
      'eingereicht': 'Eingereicht',
      'ausstehend_bereichsleitung': 'Warte auf Bereichsleitung',
      'ausstehend_kommandant': 'Warte auf Kommandant',
      'ausstehend_kommandomitglieder': 'Warte auf Kommandomitglieder',
      'freigegeben_bereichsleitung': 'Freigegeben (Bereichsleitung)',
      'freigegeben_kommandant': 'Freigegeben (Kommandant)',
      'genehmigt': 'Genehmigt',
      'abgelehnt': 'Abgelehnt',
      'abgeschlossen': 'Abgeschlossen'
    };
    return labels[status] || status;
  }

  // Bestellung ins Archiv verschieben
  async function archiveOrder(orderId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { error: new Error('Bestellung nicht gefunden') };
    }
    
    // Nur genehmigt, freigegeben_kommandant oder abgelehnt darf archiviert werden
    if (order.status !== 'genehmigt' && order.status !== 'freigegeben_kommandant' && order.status !== 'abgelehnt') {
      return { error: new Error('Nur genehmigte oder abgelehnte Bestellungen können archiviert werden') };
    }
    
    const { error } = await supabase
      .from('orders')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) {
      console.error('archiveOrder: Database update failed', error);
      return { error };
    }
    
    await createHistoryEntry(orderId, 'Bestellung ins Archiv verschoben', order.status, order.status, 'none');
    await fetchOrders(true);
    
    return { error: null };
  }
  
  // Bestellung aus Archiv zurückholen
  async function unarchiveOrder(orderId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase
      .from('orders')
      .update({
        is_archived: false,
        archived_at: null,
        archived_by: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) {
      console.error('unarchiveOrder: Database update failed', error);
      return { error };
    }
    
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      await createHistoryEntry(orderId, 'Bestellung aus Archiv zurückholt', order.status, order.status, 'none');
    }
    
    await fetchOrders(true);
    
    return { error: null };
  }

  // Eskalationsfrist verlängern (addiert zur bestehenden Frist)
  async function extendEscalationDeadline(orderId: string, days: number, reason: string, escalationTimeoutHours: number) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { error: new Error('Bestellung nicht gefunden') };
    }
    
    // Nur für eingereichte Bestellungen relevant
    if (order.status !== 'eingereicht') {
      return { error: new Error('Eskalationsfrist kann nur für eingereichte Bestellungen verlängert werden') };
    }
    
    // Berechne das neue Verlängerungsdatum basierend auf der bisherigen Frist
    let baseDeadline: Date;
    
    if (order.escalation_extended_until) {
      // Wenn bereits verlängert, addiere zur bestehenden Verlängerung
      baseDeadline = new Date(order.escalation_extended_until);
    } else if (order.submitted_at) {
      // Sonst: submitted_at + timeout
      baseDeadline = new Date(order.submitted_at);
      baseDeadline.setHours(baseDeadline.getHours() + escalationTimeoutHours);
    } else {
      // Fallback: ab jetzt
      baseDeadline = new Date();
    }
    
    // Addiere die zusätzlichen Tage
    const extendedUntil = new Date(baseDeadline);
    extendedUntil.setDate(extendedUntil.getDate() + days);
    
    const { error } = await supabase
      .from('orders')
      .update({
        escalation_extended_until: extendedUntil.toISOString(),
        escalation_extension_reason: reason,
        escalation_extended_by: user.id,
        escalation_extended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) {
      console.error('extendEscalationDeadline: Database update failed', error);
      return { error };
    }
    
    // Protokollierung in Bestellhistorie mit detaillierten Informationen
    const dayLabel = days === 1 ? '1 Tag' : `${days} Tage`;
    const previousDeadlineStr = baseDeadline.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const newDeadlineStr = extendedUntil.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    await createHistoryEntry(
      orderId, 
      `Eskalationsfrist um ${dayLabel} verlängert. Bisherige Frist: ${previousDeadlineStr} Uhr → Neue Frist: ${newDeadlineStr} Uhr. Grund: ${reason}`,
      order.status, 
      order.status, 
      'none'
    );
    
    await fetchOrders(true);
    
    return { error: null, newDeadline: extendedUntil };
  }

  // ====== ABSTIMMUNGSVERWALTUNG ======
  
  // Abstimmung eröffnen
  async function openVoting(orderId: string): Promise<{ error: Error | null }> {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    const canOpen = profile?.role === 'kommandant' || profile?.role === 'admin';
    if (!canOpen) {
      return { error: new Error('Nur Kommandant oder Admin kann die Abstimmung eröffnen') };
    }

    const { error } = await supabase
      .from('orders')
      .update({
        voting_status: 'open',
        voting_opened_at: new Date().toISOString(),
        voting_result: null,
        voting_closed_at: null,
        voting_closed_by: null,
        voting_reminder_count: 0,
        voting_last_reminder_at: null
      })
      .eq('id', orderId);

    if (!error) {
      await createHistoryEntry(orderId, 'Abstimmung eröffnet', null, null, 'none');
      fetchOrders(true);
    }

    return { error };
  }

  // Abstimmung manuell schließen (ohne Entscheidung - z.B. zum Pausieren)
  async function closeVotingManually(orderId: string, reason?: string): Promise<{ error: Error | null }> {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    const canClose = profile?.role === 'kommandant' || profile?.role === 'admin';
    if (!canClose) {
      return { error: new Error('Nur Kommandant oder Admin kann die Abstimmung schließen') };
    }

    const { error } = await supabase
      .from('orders')
      .update({
        voting_status: 'closed',
        voting_closed_at: new Date().toISOString(),
        voting_closed_by: user.id
      })
      .eq('id', orderId);

    if (!error) {
      await createHistoryEntry(orderId, `Abstimmung manuell geschlossen${reason ? `: ${reason}` : ''}`, null, null, 'none');
      fetchOrders(true);
    }

    return { error };
  }

  // Fehlende Stimmen bei Abschluss aufzeichnen
  async function recordMissingVotes(orderId: string, missingUserIds: string[]): Promise<{ error: Error | null }> {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    if (missingUserIds.length === 0) return { error: null };

    const records = missingUserIds.map(userId => ({
      order_id: orderId,
      user_id: userId
    }));

    const { error } = await supabase
      .from('order_votes_missing')
      .upsert(records, { onConflict: 'order_id,user_id' });

    return { error };
  }

  // Abstimmung wiederöffnen
  async function reopenVoting(orderId: string): Promise<{ error: Error | null }> {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    const canReopen = profile?.role === 'kommandant' || profile?.role === 'admin';
    if (!canReopen) {
      return { error: new Error('Nur Kommandant oder Admin kann die Abstimmung wieder eröffnen') };
    }

    const { error } = await supabase
      .from('orders')
      .update({
        voting_status: 'open',
        voting_result: null,
        voting_closed_at: null,
        voting_closed_by: null
      })
      .eq('id', orderId);

    if (!error) {
      // Lösche alte fehlende Stimmen
      await supabase
        .from('order_votes_missing')
        .delete()
        .eq('order_id', orderId);
        
      await createHistoryEntry(orderId, 'Abstimmung wieder eröffnet', null, null, 'none');
      fetchOrders(true);
    }

    return { error };
  }

  return {
    orders,
    loading,
    createOrder,
    updateOrder,
    submitDraft,
    approveByBereichsleiter,
    approveByKommandant,
    approveByKommandantDirect,
    overrideKommandomitgliedVote,
    completeKommandomitgliedVote,
    rejectOrder,
    completeOrder,
    resetToDraft,
    markAsOrdered,
    unmarkAsOrdered,
    markAsExecuted,
    markMultipleAsExecuted,
    unmarkAsExecuted,
    markAsReceived,
    unmarkAsReceived,
    deleteOrder,
    deleteOrderAttachment,
    requestKommandoVoting,
    isAdmin,
    changeOrderStatus,
    archiveOrder,
    unarchiveOrder,
    extendEscalationDeadline,
    // Abstimmungsverwaltung
    openVoting,
    closeVotingManually,
    recordMissingVotes,
    reopenVoting,
    fetchOrders,
    refetch: fetchOrders,
    pendingForMe,
    waitingForBereichsleiter,
    myOrders,
    completedOrders,
    approvedOrders
  };
}

export function useOrderHistory(orderId: string) {
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!supabase) return;
      
      const { data } = await supabase
        .from('order_history')
        .select(`
          *,
          performer:profiles!order_history_performed_by_fkey(full_name, email)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      
      setHistory((data as OrderHistory[]) ?? []);
      setLoading(false);
    }
    
    fetchHistory();
  }, [orderId]);

  return { history, loading };
}
