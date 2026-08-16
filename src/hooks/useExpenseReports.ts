import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/helpers';
import type { PaymentOrder } from '@/hooks/usePaymentOrders';

export type ExpenseReport = Tables<'expense_reports'>;
export type ExpenseReportInsert = TablesInsert<'expense_reports'>;
export type ExpenseReportItem = Tables<'expense_report_items'>;
export type ExpenseReportItemInsert = TablesInsert<'expense_report_items'>;
export type ExpenseReportPaymentOrder = Tables<'expense_report_payment_orders'>;

export interface LinkedPaymentOrder {
  payment_order: PaymentOrder;
  amount: number;
}

export interface ExpenseReportWithItems extends ExpenseReport {
  items: ExpenseReportItem[];
  payment_orders: LinkedPaymentOrder[];
  creator?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export interface CreateExpenseReportData {
  payment_order_ids: string[]; // Array of payment order IDs
  payment_order_amounts?: Record<string, number>; // Map of PO ID to amount (for updates)
  event_name: string;
  event_date_from: string;
  event_date_to?: string;
  participants?: string;
  responsible_person: string;
  notes?: string;
  items: {
    description: string;
    category_id?: string;
    category_custom?: string;
    amount: number;
  }[];
}

export function useExpenseReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ExpenseReportWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!supabase || !user) return;

    try {
      setLoading(true);
      
      // Fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('expense_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      // Fetch items for all reports
      const reportIds = reportsData.map(r => r.id);
      const { data: itemsData } = await supabase
        .from('expense_report_items')
        .select('*')
        .in('expense_report_id', reportIds)
        .order('position_number');

      // Fetch linked payment orders
      const { data: linkedPOs } = await supabase
        .from('expense_report_payment_orders')
        .select('*')
        .in('expense_report_id', reportIds);

      // Get all payment order IDs
      const allPoIds = [
        ...new Set([
          ...reportsData.map(r => r.payment_order_id).filter(Boolean),
          ...(linkedPOs ?? []).map(l => l.payment_order_id)
        ])
      ];

      // Fetch payment orders
      let paymentOrdersMap: Record<string, PaymentOrder> = {};
      if (allPoIds.length > 0) {
        const { data: paymentOrders } = await supabase
          .from('payment_orders')
          .select('*')
          .in('id', allPoIds);
        
        paymentOrdersMap = (paymentOrders ?? []).reduce((acc, po) => {
          acc[po.id] = po as PaymentOrder;
          return acc;
        }, {} as Record<string, PaymentOrder>);
      }

      // Fetch creators
      const creatorIds = [...new Set(reportsData.map(r => r.created_by))];
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', creatorIds);

      // Map data together
      const reportsWithItems: ExpenseReportWithItems[] = reportsData.map(report => {
        // Get linked payment orders from the junction table
        const reportLinkedPOs = (linkedPOs ?? [])
          .filter(l => l.expense_report_id === report.id)
          .map(l => ({
            payment_order: paymentOrdersMap[l.payment_order_id],
            amount: l.amount
          }))
          .filter(l => l.payment_order); // Filter out any missing

        // Fallback to legacy single payment_order_id if no linked POs
        if (reportLinkedPOs.length === 0 && report.payment_order_id && paymentOrdersMap[report.payment_order_id]) {
          reportLinkedPOs.push({
            payment_order: paymentOrdersMap[report.payment_order_id],
            amount: paymentOrdersMap[report.payment_order_id].amount
          });
        }

        return {
          ...report,
          items: (itemsData ?? []).filter(i => i.expense_report_id === report.id),
          payment_orders: reportLinkedPOs,
          creator: creators?.find(c => c.id === report.created_by)
        };
      });

      setReports(reportsWithItems);
    } catch (err) {
      console.error('Error fetching expense reports:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const generateReferenceNumber = async (): Promise<string> => {
    if (!supabase) return 'VA-0000-0001';

    const { data, error } = await supabase
      .rpc('generate_expense_report_number');

    if (error) {
      console.error('Error generating reference number:', error);
      const year = new Date().getFullYear();
      return `VA-${year}-0001`;
    }

    return data as string;
  };

  const createReport = async (data: CreateExpenseReportData): Promise<ExpenseReport | null> => {
    if (!supabase || !user) {
      console.error('[ExpenseReports] No supabase or user');
      return null;
    }

    try {
      console.log('[ExpenseReports] Creating report with data:', data);
      const referenceNumber = await generateReferenceNumber();
      console.log('[ExpenseReports] Generated reference:', referenceNumber);
      
      // Calculate totals
      const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

      // Create report (without payment_order_id - we use the junction table now)
      const { data: report, error: reportError } = await supabase
        .from('expense_reports')
        .insert({
          reference_number: referenceNumber,
          payment_order_id: null, // Legacy field, not used anymore
          event_name: data.event_name,
          event_date_from: data.event_date_from,
          event_date_to: data.event_date_to || null,
          participants: data.participants || null,
          total_amount: totalAmount,
          advance_amount: 0, // Will be calculated from linked POs
          balance_amount: totalAmount, // Will be recalculated
          responsible_person: data.responsible_person,
          notes: data.notes || null,
          created_by: user.id
        })
        .select()
        .single();

      if (reportError) {
        console.error('[ExpenseReports] Error creating report:', reportError);
        throw reportError;
      }
      console.log('[ExpenseReports] Report created:', report);

      // Link payment orders and calculate advance amount
      let totalAdvance = 0;
      if (data.payment_order_ids.length > 0) {
        // Fetch payment order amounts
        const { data: paymentOrders } = await supabase
          .from('payment_orders')
          .select('id, amount')
          .in('id', data.payment_order_ids);

        const poLinks = (paymentOrders ?? []).map(po => {
          totalAdvance += po.amount;
          return {
            expense_report_id: report.id,
            payment_order_id: po.id,
            amount: po.amount
          };
        });

        if (poLinks.length > 0) {
          const { error: linkError } = await supabase
            .from('expense_report_payment_orders')
            .insert(poLinks);

          if (linkError) throw linkError;
        }
      }

      // Update report with calculated advance and balance
      const balanceAmount = totalAmount - totalAdvance;
      await supabase
        .from('expense_reports')
        .update({
          advance_amount: totalAdvance,
          balance_amount: balanceAmount
        })
        .eq('id', report.id);

      // Create items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item, index) => ({
          expense_report_id: report.id,
          position_number: index + 1,
          description: item.description,
          category_id: item.category_id || null,
          category_custom: item.category_custom || null,
          amount: item.amount
        }));

        const { error: itemsError } = await supabase
          .from('expense_report_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await fetchReports();
      return report;
    } catch (err) {
      console.error('Error creating expense report:', err);
      return null;
    }
  };

  const deleteReport = async (id: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('expense_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchReports();
      return true;
    } catch (err) {
      console.error('Error deleting expense report:', err);
      return false;
    }
  };

  const updateReport = async (id: string, data: CreateExpenseReportData): Promise<boolean> => {
    if (!supabase || !user) return false;

    try {
      // Calculate totals
      const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
      const totalAdvance = data.payment_order_ids
        .map(poId => {
          const po = reports.flatMap(r => r.payment_orders).find(p => p.payment_order.id === poId);
          return po?.amount || 0;
        })
        .reduce((sum, amt) => sum + amt, 0) || 
        // If not found in existing, look in all payment orders passed
        data.payment_order_ids.length * 0; // Will be recalculated below

      // Get advance amounts from payment_order_amounts if provided
      let advanceAmount = 0;
      if (data.payment_order_amounts) {
        advanceAmount = Object.values(data.payment_order_amounts).reduce((sum, amt) => sum + amt, 0);
      }

      const balanceAmount = totalAmount - advanceAmount;

      // Update report
      console.log('[ExpenseReports] Updating report with:', {
        id,
        event_name: data.event_name,
        event_date_from: data.event_date_from,
        total_amount: totalAmount,
        advance_amount: advanceAmount,
        balance_amount: balanceAmount
      });

      const { data: updatedReport, error: reportError } = await supabase
        .from('expense_reports')
        .update({
          event_name: data.event_name,
          event_date_from: data.event_date_from,
          event_date_to: data.event_date_to || null,
          participants: data.participants || null,
          total_amount: totalAmount,
          advance_amount: advanceAmount,
          balance_amount: balanceAmount,
          responsible_person: data.responsible_person,
          notes: data.notes || null
        })
        .eq('id', id)
        .select()
        .single();

      console.log('[ExpenseReports] Update result:', { updatedReport, reportError });

      if (reportError) throw reportError;

      // Delete existing items and payment order links
      await supabase.from('expense_report_items').delete().eq('expense_report_id', id);
      await supabase.from('expense_report_payment_orders').delete().eq('expense_report_id', id);

      // Re-create items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item, index) => ({
          expense_report_id: id,
          position_number: index + 1,
          description: item.description,
          category_id: item.category_id || null,
          category_custom: item.category_custom || null,
          amount: item.amount
        }));

        const { error: itemsError } = await supabase
          .from('expense_report_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Re-create payment order links
      if (data.payment_order_ids.length > 0 && data.payment_order_amounts) {
        const poLinks = data.payment_order_ids.map(poId => ({
          expense_report_id: id,
          payment_order_id: poId,
          amount: data.payment_order_amounts?.[poId] || 0
        }));

        const { error: linkError } = await supabase
          .from('expense_report_payment_orders')
          .insert(poLinks);

        if (linkError) throw linkError;
      }

      await fetchReports();
      return true;
    } catch (err) {
      console.error('Error updating expense report:', err);
      return false;
    }
  };

  // Get all payment order IDs that are already used
  const getUsedPaymentOrderIds = (): string[] => {
    const ids: string[] = [];
    reports.forEach(r => {
      r.payment_orders.forEach(po => {
        ids.push(po.payment_order.id);
      });
      // Also check legacy field
      if (r.payment_order_id) {
        ids.push(r.payment_order_id);
      }
    });
    return [...new Set(ids)];
  };

  return {
    reports,
    loading,
    createReport,
    updateReport,
    deleteReport,
    getUsedPaymentOrderIds,
    refetch: fetchReports
  };
}
