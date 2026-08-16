import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';

export interface Supplier {
  id: string;
  name: string;
  link: string | null;
  username: string | null;
  password: string | null;
  order_methods: string[] | null;
  order_email: string | null;
  order_phone: string | null;
  offered_articles: string | null;
  assigned_bereichsleiter_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  minimum_order_value: number | null;
  order_days: string[] | null;
  customer_number: string | null;
}

export const ORDER_DAY_OPTIONS = [
  { id: 'mo', label: 'Montag' },
  { id: 'di', label: 'Dienstag' },
  { id: 'mi', label: 'Mittwoch' },
  { id: 'do', label: 'Donnerstag' },
  { id: 'fr', label: 'Freitag' },
  { id: 'sa', label: 'Samstag' },
  { id: 'so', label: 'Sonntag' },
];

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pendingSuppliers, setPendingSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { supplierApprovalUsers } = useSettings();

  // Admin und Kommandant können immer freigeben, plus explizit berechtigte Benutzer
  const canApproveSuppliers = profile?.role === 'admin' || profile?.role === 'kommandant' || (user?.id && supplierApprovalUsers.includes(user.id));

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    if (!supabase) return;
    
    // Fetch approved suppliers (visible to everyone)
    const { data: approvedData } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_approved', true)
      .order('name', { ascending: true });
    
    setSuppliers((approvedData as Supplier[]) ?? []);

    // Fetch pending suppliers (for admin/kommandant)
    const { data: pendingData } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });
    
    setPendingSuppliers((pendingData as Supplier[]) ?? []);
    
    setLoading(false);
  }

  async function sendSupplierNotification(
    type: 'new_supplier_pending' | 'supplier_approved' | 'supplier_rejected',
    supplierName: string,
    creatorEmail?: string,
    creatorName?: string,
    approverName?: string,
    rejectionReason?: string,
    recipientEmails?: string[]
  ) {
    if (!supabase) return;

    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          type,
          supplierName,
          creatorEmail,
          creatorName,
          approverName,
          rejectionReason,
          recipientEmails
        }
      });
    } catch (error) {
      console.error('Error sending supplier notification:', error);
    }
  }

  async function createSupplier(data: {
    name: string;
    link?: string;
    username?: string;
    password?: string;
    order_methods?: string[];
    order_email?: string;
    order_phone?: string;
    offered_articles?: string;
    assigned_bereichsleiter_id?: string;
    minimum_order_value?: number | null;
    order_days?: string[] | null;
    customer_number?: string;
    discount_percent?: number;
    payment_terms?: string;
    special_conditions?: string;
  }) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase
      .from('suppliers')
      .insert({
        name: data.name,
        link: data.link || null,
        username: data.username || null,
        password: data.password || null,
        order_methods: data.order_methods || [],
        order_email: data.order_email || null,
        order_phone: data.order_phone || null,
        offered_articles: data.offered_articles || null,
        assigned_bereichsleiter_id: data.assigned_bereichsleiter_id || null,
        minimum_order_value: data.minimum_order_value ?? null,
        order_days: data.order_days ?? null,
        customer_number: data.customer_number || null,
        discount_percent: data.discount_percent ?? null,
        payment_terms: data.payment_terms || null,
        special_conditions: data.special_conditions || null,
        created_by: user.id,
        is_approved: false // New suppliers need approval
      });
    
    if (!error) {
      // Fetch admin and kommandant emails for notification
      const { data: adminKommandants } = await supabase
        .from('profiles')
        .select('email, full_name')
        .in('role', ['admin', 'kommandant']);

      if (adminKommandants && adminKommandants.length > 0) {
        const recipientEmails = adminKommandants.map(p => p.email);
        await sendSupplierNotification(
          'new_supplier_pending',
          data.name,
          undefined,
          profile?.full_name || profile?.email,
          undefined,
          undefined,
          recipientEmails
        );
      }

      fetchSuppliers();
    }
    return { error };
  }

  async function updateSupplier(id: string, data: {
    name: string;
    link?: string;
    username?: string;
    password?: string;
    order_methods?: string[];
    order_email?: string;
    order_phone?: string;
    offered_articles?: string;
    assigned_bereichsleiter_id?: string;
    minimum_order_value?: number | null;
    order_days?: string[] | null;
    customer_number?: string;
    discount_percent?: number;
    payment_terms?: string;
    special_conditions?: string;
  }) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('suppliers')
      .update({
        name: data.name,
        link: data.link || null,
        username: data.username || null,
        password: data.password || null,
        order_methods: data.order_methods || [],
        order_email: data.order_email || null,
        order_phone: data.order_phone || null,
        offered_articles: data.offered_articles || null,
        assigned_bereichsleiter_id: data.assigned_bereichsleiter_id || null,
        minimum_order_value: data.minimum_order_value ?? null,
        order_days: data.order_days ?? null,
        customer_number: data.customer_number || null,
        discount_percent: data.discount_percent ?? null,
        payment_terms: data.payment_terms || null,
        special_conditions: data.special_conditions || null
      })
      .eq('id', id);
    
    if (!error) fetchSuppliers();
    return { error };
  }

  async function approveSupplier(id: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };
    
    // Get supplier info for email notification
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name, created_by')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('suppliers')
      .update({
        is_approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (!error) {
      // Create notification for creator
      if (supplier?.created_by) {
        await supabase.from('notifications').insert({
          user_id: supplier.created_by,
          message: `Ihr Lieferant "${supplier.name}" wurde genehmigt und ist jetzt sichtbar.`,
          order_id: id // Using order_id field for supplier_id
        });

        // Get creator email for email notification
        const { data: creator } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', supplier.created_by)
          .single();

        if (creator) {
          await sendSupplierNotification(
            'supplier_approved',
            supplier.name,
            creator.email,
            creator.full_name,
            profile?.full_name || profile?.email
          );
        }
      }
      fetchSuppliers();
    }
    return { error };
  }

  async function deleteSupplier(id: string, reason?: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    // Get supplier info for email notification
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name, created_by, is_approved')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    
    if (!error) {
      // Create notification for creator if pending supplier was rejected
      if (supplier?.created_by && !supplier.is_approved) {
        await supabase.from('notifications').insert({
          user_id: supplier.created_by,
          message: `Ihr Lieferant "${supplier.name}" wurde abgelehnt${reason ? `: ${reason}` : '.'}`,
          order_id: id // Using order_id field for supplier_id
        });

        // Get creator email for email notification
        const { data: creator } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', supplier.created_by)
          .single();

        if (creator) {
          await sendSupplierNotification(
            'supplier_rejected',
            supplier.name,
            creator.email,
            creator.full_name,
            profile?.full_name || profile?.email,
            reason
          );
        }
      }
      fetchSuppliers();
    }
    return { error };
  }

  return {
    suppliers,
    pendingSuppliers,
    loading,
    canApproveSuppliers,
    createSupplier,
    updateSupplier,
    approveSupplier,
    deleteSupplier,
    refetch: fetchSuppliers
  };
}
