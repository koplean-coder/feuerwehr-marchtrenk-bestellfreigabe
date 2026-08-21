import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RentalItem } from '@/hooks/useRentalItems';

// Helper: Findet oder erstellt eine Standard-Aufgabenliste für den Benutzer
async function getOrCreateDefaultListId(userId: string): Promise<string | null> {
  if (!supabase) return null;
  
  // Versuche eine existierende Liste zu finden
  const { data: existingLists } = await supabase
    .from('todo_lists')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_smart_list', false)
    .limit(1);
  
  if (existingLists && existingLists.length > 0) {
    return existingLists[0].id;
  }
  
  // Erstelle eine neue Standard-Liste
  const { data: newList } = await supabase
    .from('todo_lists')
    .insert({
      name: 'Aufgaben',
      owner_id: userId,
      is_smart_list: false
    })
    .select('id')
    .single();
  
  return newList?.id ?? null;
}

export interface RentalContractItem {
  item_id: string;
  item_name: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  price_day: number;    // 1-Tag Preis
  price_2days: number;  // 2-Tage Preis
  price_3days: number;  // 3-Tage Preis
  price_week: number;   // Wochenpauschale
  price_short?: number; // Legacy
  condition?: string;   // Zustand pro Artikel
}

export interface RentalContract {
  id: string;
  contract_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string;
  rental_start: string;
  rental_end: string;
  items: RentalContractItem[];
  subtotal: number;
  delivery_cost: number;
  total_amount: number;
  includes_delivery: boolean;
  is_sponsor: boolean;
  status: string;
  condition_pickup: string | null;
  condition_return: string | null;
  damage_notes: string | null;
  additional_costs: number | null;
  additional_costs_reason: string | null;
  pdf_url: string | null;
  returned_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentalContractInsert {
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address: string;
  rental_start: string;
  rental_end: string;
  items: RentalContractItem[];
  subtotal: number;
  delivery_cost: number;
  total_amount: number;
  includes_delivery?: boolean;
  is_sponsor?: boolean;
  condition_pickup?: string | null;
}

export function useRentalContracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = useCallback(async (silent = false) => {
    if (!supabase) return;

    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rental_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching rental contracts:', error);
        throw error;
      }
      
      setContracts((data || []).map(contract => ({
        ...contract,
        items: (contract.items as RentalContractItem[]) || []
      })) as RentalContract[]);
    } catch (err) {
      console.error('Error fetching rental contracts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const generateContractNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const prefix = `LV-${year}-`;
    
    if (!supabase) return `${prefix}0001`;

    const { data } = await supabase
      .from('rental_contracts')
      .select('contract_number')
      .like('contract_number', `${prefix}%`)
      .order('contract_number', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].contract_number.replace(prefix, ''), 10);
      return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`;
    }

    return `${prefix}0001`;
  };

  const calculateItemPrice = (
    item: RentalItem,
    startDate: string,
    endDate: string
  ): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Neue Preisstufen: 1 Tag, 2 Tage, 3 Tage, Woche
    const price1day = item.price_day ?? 0;
    const price2days = item.price_2days ?? 0;
    const price3days = item.price_3days ?? 0;
    const priceWeek = item.price_week ?? 0;

    // Direkte Zuordnung für 1-3 Tage
    if (days === 1 && price1day > 0) return price1day;
    if (days === 2 && price2days > 0) return price2days;
    if (days === 3 && price3days > 0) return price3days;

    // Fallback für 1-3 Tage wenn kein spezifischer Preis
    if (days <= 3) {
      if (days === 1) return price1day || price2days / 2 || price3days / 3 || priceWeek / 7;
      if (days === 2) return price2days || price1day * 2 || price3days * 2/3 || priceWeek * 2/7;
      if (days === 3) return price3days || price1day * 3 || price2days * 1.5 || priceWeek * 3/7;
    }

    // 4-6 Tage: Berechne beide Optionen und nimm das Günstigere
    if (days >= 4 && days < 7) {
      // Option A: 3-Tage-Preis + Resttage mit Tagespreis
      const extraDays = days - 3;
      const dayRate = price1day || (price2days / 2) || (price3days / 3) || (priceWeek / 7);
      const optionA = (price3days > 0 ? price3days : dayRate * 3) + (extraDays * dayRate);
      
      // Option B: Wochenpauschale (wenn verfügbar)
      const optionB = priceWeek > 0 ? priceWeek : Infinity;
      
      return Math.min(optionA, optionB);
    }

    // 7+ Tage: Wochenpauschale + Resttage
    if (days >= 7 && priceWeek > 0) {
      const fullWeeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      const dayRate = price1day || (price2days / 2) || (price3days / 3) || (priceWeek / 7);
      
      if (remainingDays === 0) {
        return fullWeeks * priceWeek;
      }
      
      // Prüfe ob Aufrunden auf nächste Woche günstiger ist
      const optionA = fullWeeks * priceWeek + remainingDays * dayRate;
      const optionB = (fullWeeks + 1) * priceWeek;
      return Math.min(optionA, optionB);
    }

    // Fallback: Tagespreis * Tage
    const dayRate = price1day || (price2days / 2) || (price3days / 3) || (priceWeek / 7);
    return dayRate * days;
  };

  const createContract = async (data: RentalContractInsert): Promise<RentalContract | null> => {
    if (!supabase || !user) {
      console.error('Cannot create contract: no supabase or user');
      return null;
    }

    try {
      const contract_number = await generateContractNumber();

      const insertData = {
        contract_number,
        customer_name: data.customer_name,
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || null,
        customer_address: data.customer_address || '',
        rental_start: data.rental_start,
        rental_end: data.rental_end,
        items: data.items,
        subtotal: data.subtotal,
        delivery_cost: data.delivery_cost,
        total_amount: data.total_amount,
        includes_delivery: data.includes_delivery || false,
        is_sponsor: data.is_sponsor || false,
        condition_pickup: data.condition_pickup || null,
        created_by: user.id,
        status: 'active'
      };

      console.log('Creating contract with data:', insertData);

      const { data: newContract, error } = await supabase
        .from('rental_contracts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating rental contract:', error);
        throw error;
      }

      console.log('Contract created:', newContract);

      // Benachrichtige Kassier wenn Vertrag einen Preis hat (nicht Sponsor)
      if (newContract.total_amount > 0 && !newContract.is_sponsor) {
        try {
          // Finde Kassier (hat Funktion 'kassier')
          const { data: kassierProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .contains('functions', ['kassier'])
            .eq('is_active', true)
            .limit(1);

          const kassierProfile = kassierProfiles?.[0];

          if (kassierProfile?.id) {
            // Erstelle Benachrichtigung
            await supabase.from('notifications').insert({
              user_id: kassierProfile.id,
              title: 'Neuer Leihvertrag erstellt',
              message: `Leihvertrag ${contract_number} für ${data.customer_name} mit ${newContract.total_amount.toFixed(2)} € wurde erstellt. Bitte Rechnung im Buchhaltungssystem erstellen.`,
              type: 'rental_contract',
              link: '/leihgeraete'
            });

            // Erstelle Aufgabe für Kassier
            const listId = await getOrCreateDefaultListId(kassierProfile.id);
            if (listId) {
              await supabase.from('todo_tasks').insert({
                title: `Rechnung erstellen: LV ${contract_number}`,
                notes: `Leihvertrag ${contract_number} für ${data.customer_name}\nBetrag: ${newContract.total_amount.toFixed(2)} €\n\nBitte Rechnung im Buchhaltungssystem erstellen.`,
                list_id: listId,
                assigned_to: kassierProfile.id,
                assigned_by: user.id,
                assigned_at: new Date().toISOString(),
                created_by: user.id,
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Fällig in 7 Tagen
                is_important: true
              });
            }

            // Push-Benachrichtigung an Kassier senden
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            if (anonKey) {
              try {
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
                      userIds: [kassierProfile.id],
                      payload: {
                        title: '📝 Neuer Leihvertrag - Rechnung erstellen',
                        body: `LV ${contract_number} für ${data.customer_name}: ${newContract.total_amount.toFixed(2)} €`,
                        icon: '/icon-192.png',
                        tag: `rental-${newContract.id}`,
                        data: { url: '/leihgeraete' },
                      },
                    }),
                  }
                );
                console.log('Push notification sent to Kassier');
              } catch (pushErr) {
                console.warn('Push notification failed (non-critical):', pushErr);
              }

              // E-Mail-Benachrichtigung an Kassier senden
              if (kassierProfile.email) {
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
                        type: 'rental_contract_created',
                        recipientEmail: kassierProfile.email,
                        recipientName: kassierProfile.full_name || 'Kassier',
                        customSubject: `Neuer Leihvertrag ${contract_number} - Rechnung erstellen`,
                        customBody: `<p>Hallo ${kassierProfile.full_name || 'Kassier'},</p>
                          <p>Ein neuer Leihvertrag wurde erstellt:</p>
                          <ul>
                            <li><strong>Vertragsnummer:</strong> ${contract_number}</li>
                            <li><strong>Kunde:</strong> ${data.customer_name}</li>
                            <li><strong>Betrag:</strong> ${newContract.total_amount.toFixed(2)} €</li>
                            <li><strong>Zeitraum:</strong> ${new Date(data.rental_start).toLocaleDateString('de-AT')} - ${new Date(data.rental_end).toLocaleDateString('de-AT')}</li>
                          </ul>
                          <p>Bitte erstelle eine Rechnung im Buchhaltungssystem.</p>`,
                      }),
                    }
                  );
                  console.log('Email notification sent to Kassier');
                } catch (emailErr) {
                  console.warn('Email notification failed (non-critical):', emailErr);
                }
              }
            }

            console.log('Kassier notification and task created for contract:', contract_number);
          }
        } catch (notifyErr) {
          // Benachrichtigungsfehler sollten den Vertrag nicht blockieren
          console.error('Error notifying Kassier:', notifyErr);
        }
      }

      await fetchContracts(true);
      return {
        ...newContract,
        items: (newContract.items as RentalContractItem[]) || []
      } as RentalContract;
    } catch (err) {
      console.error('Error creating rental contract:', err);
      return null;
    }
  };

  const updateContract = async (id: string, data: Partial<RentalContractInsert>): Promise<void> => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('rental_contracts')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      await fetchContracts(true);
    } catch (err) {
      console.error('Error updating rental contract:', err);
    }
  };

  interface ReturnData {
    conditionReturn?: string;
    damageNotes?: string;
    additionalCosts?: number;
    additionalCostsReason?: string;
  }

  const markAsReturned = async (id: string, returnData?: ReturnData): Promise<void> => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('rental_contracts')
        .update({
          status: 'returned',
          returned_at: new Date().toISOString(),
          condition_return: returnData?.conditionReturn || null,
          damage_notes: returnData?.damageNotes || null,
          additional_costs: returnData?.additionalCosts || null,
          additional_costs_reason: returnData?.additionalCostsReason || null
        })
        .eq('id', id);

      if (error) throw error;
      await fetchContracts(true);
    } catch (err) {
      console.error('Error marking contract as returned:', err);
    }
  };

  // Aktuell verliehene Artikel mit Rückgabedatum ermitteln
  const rentedItemsInfo = contracts
    .filter(c => c.status === 'active' && !c.returned_at)
    .flatMap(c => c.items.map(i => ({
      item_id: i.item_id,
      rental_end: c.rental_end,
      customer_name: c.customer_name,
      contract_number: c.contract_number
    })));

  // Einfache Liste für Abwärtskompatibilität
  const rentedItemIds = rentedItemsInfo.map(r => r.item_id);

  const deleteContract = async (id: string): Promise<void> => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('rental_contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchContracts(true);
    } catch (err) {
      console.error('Error deleting rental contract:', err);
    }
  };

  // Admin-Funktion: Nachträglich Benachrichtigungen für bestehende Verträge senden
  const sendPendingNotifications = async (): Promise<{ sent: number; errors: number }> => {
    if (!supabase || !user) {
      return { sent: 0, errors: 0 };
    }

    let sent = 0;
    let errors = 0;

    try {
      // Finde Kassier
      const { data: kassierProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .contains('functions', ['kassier'])
        .eq('is_active', true)
        .limit(1);

      const kassierProfile = kassierProfiles?.[0];

      if (!kassierProfile?.id) {
        console.error('Kein Kassier gefunden');
        return { sent: 0, errors: 1 };
      }

      // Finde alle aktiven Verträge mit Preis > 0 (nicht Sponsor)
      const activeContracts = contracts.filter(
        c => c.status === 'active' && c.total_amount > 0 && !c.is_sponsor
      );

      for (const contract of activeContracts) {
        try {
          // Prüfe ob bereits eine Aufgabe für diesen Vertrag existiert
          const { data: existingTask } = await supabase
            .from('todo_tasks')
            .select('id')
            .ilike('title', `%${contract.contract_number}%`)
            .limit(1);

          if (existingTask && existingTask.length > 0) {
            console.log(`Aufgabe für ${contract.contract_number} existiert bereits, übersprungen`);
            continue;
          }

          // Benachrichtigung erstellen
          await supabase.from('notifications').insert({
            user_id: kassierProfile.id,
            title: 'Leihvertrag - Rechnung ausstehend',
            message: `Leihvertrag ${contract.contract_number} für ${contract.customer_name} mit ${contract.total_amount.toFixed(2)} € - Bitte Rechnung im Buchhaltungssystem erstellen.`,
            type: 'rental_contract',
            link: '/leihgeraete'
          });

          // Aufgabe erstellen
          const listId = await getOrCreateDefaultListId(kassierProfile.id);
          if (listId) {
            await supabase.from('todo_tasks').insert({
              title: `Rechnung erstellen: LV ${contract.contract_number}`,
              notes: `Leihvertrag ${contract.contract_number} für ${contract.customer_name}\nBetrag: ${contract.total_amount.toFixed(2)} €\n\nBitte Rechnung im Buchhaltungssystem erstellen.`,
              list_id: listId,
              assigned_to: kassierProfile.id,
              assigned_by: user.id,
              assigned_at: new Date().toISOString(),
              created_by: user.id,
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              is_important: true
            });
          }

          sent++;
          console.log(`Benachrichtigung gesendet für: ${contract.contract_number}`);
        } catch (err) {
          console.error(`Fehler bei Vertrag ${contract.contract_number}:`, err);
          errors++;
        }
      }

      // Push + E-Mail-Benachrichtigung an Kassier senden (einmalig für alle)
      if (sent > 0) {
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (anonKey) {
          // Push-Benachrichtigung
          try {
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
                  userIds: [kassierProfile.id],
                  payload: {
                    title: `📝 ${sent} Leihverträge mit Rechnungsbedarf`,
                    body: `${sent} offene Leihverträge wurden deiner Aufgabenliste hinzugefügt`,
                    icon: '/icon-192.png',
                    tag: 'rental-contracts-batch',
                    data: { url: '/aufgaben' },
                  },
                }),
              }
            );
            console.log('Push notification sent to Kassier');
          } catch (pushErr) {
            console.warn('Push notification failed (non-critical):', pushErr);
          }

          // E-Mail-Benachrichtigung
          if (kassierProfile.email) {
            try {
              // Erstelle HTML-Liste der Verträge (alle aktiven mit Rechnungsbedarf)
              const contractListHtml = activeContracts
                .map(c => `<li><strong>${c.contract_number}</strong> - ${c.customer_name}: ${c.total_amount.toFixed(2)} €</li>`)
                .join('');

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
                    type: 'rental_contracts_pending',
                    recipientEmail: kassierProfile.email,
                    recipientName: kassierProfile.full_name || 'Kassier',
                    customSubject: `${sent} Leihverträge mit Rechnungsbedarf`,
                    customBody: `<p>Hallo ${kassierProfile.full_name || 'Kassier'},</p>
                      <p>${sent} offene Leihverträge wurden deiner Aufgabenliste hinzugefügt:</p>
                      <ul>${contractListHtml || '<li>Siehe Aufgabenliste für Details</li>'}</ul>
                      <p>Bitte erstelle die entsprechenden Rechnungen im Buchhaltungssystem.</p>`,
                  }),
                }
              );
              console.log('Email notification sent to Kassier');
            } catch (emailErr) {
              console.warn('Email notification failed (non-critical):', emailErr);
            }
          }
        }
      }

      return { sent, errors };
    } catch (err) {
      console.error('Fehler beim Senden der Benachrichtigungen:', err);
      return { sent, errors: errors + 1 };
    }
  };

  // Offene Leihverträge mit Rechnungsbedarf (für Kassier Dashboard)
  const pendingInvoiceContracts = contracts.filter(
    c => c.status === 'active' && c.total_amount > 0 && !c.is_sponsor
  );

  return {
    contracts,
    loading,
    rentedItemIds,
    rentedItemsInfo,
    pendingInvoiceContracts,
    calculateItemPrice,
    createContract,
    updateContract,
    markAsReturned,
    deleteContract,
    sendPendingNotifications,
    refetch: fetchContracts
  };
}
