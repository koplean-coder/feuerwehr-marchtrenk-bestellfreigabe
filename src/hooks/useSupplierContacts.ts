import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export function useSupplierContacts(supplierId: string | null) {
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!supabase || !supplierId) {
      setContacts([]);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from('supplier_contacts')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('name', { ascending: true });
    
    if (!error && data) {
      setContacts(data as SupplierContact[]);
    }
    setLoading(false);
  }, [supplierId]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  async function createContact(data: {
    name: string;
    position?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) {
    if (!supabase || !supplierId) return { error: new Error('Not connected') };
    
    const { error } = await supabase
      .from('supplier_contacts')
      .insert({
        supplier_id: supplierId,
        name: data.name,
        position: data.position || null,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null
      });
    
    if (!error) fetchContacts();
    return { error };
  }

  async function updateContact(id: string, data: {
    name: string;
    position?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) {
    if (!supabase) return { error: new Error('Not connected') };
    
    const { error } = await supabase
      .from('supplier_contacts')
      .update({
        name: data.name,
        position: data.position || null,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null
      })
      .eq('id', id);
    
    if (!error) fetchContacts();
    return { error };
  }

  async function deleteContact(id: string) {
    if (!supabase) return { error: new Error('Not connected') };
    
    const { error } = await supabase
      .from('supplier_contacts')
      .delete()
      .eq('id', id);
    
    if (!error) fetchContacts();
    return { error };
  }

  return {
    contacts,
    loading,
    createContact,
    updateContact,
    deleteContact,
    refetch: fetchContacts
  };
}
