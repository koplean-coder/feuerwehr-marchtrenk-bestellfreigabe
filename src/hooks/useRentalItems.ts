import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RentalItem {
  id: string;
  name: string;
  description: string | null;
  price_day: number;      // 1-Tag Preis
  price_2days: number;    // 2-Tage Preis
  price_3days: number;    // 3-Tage Preis
  price_week: number;     // Wochenpauschale (7 Tage)
  price_short: number;    // Legacy - wird nicht mehr verwendet
  image_url: string | null;
  is_active: boolean;
  is_single_item: boolean; // Einzelstück: Warnung bei Doppelbuchung
  item_type: 'artikel' | 'service'; // artikel = Leihgerät, service = Zusatzleistung
  sort_order: number;
  condition_notes: string | null; // Persistente Mängel-Historie
  created_at: string;
  updated_at: string;
}

export interface RentalItemInsert {
  name: string;
  description?: string;
  price_day: number;      // 1-Tag Preis
  price_2days: number;    // 2-Tage Preis
  price_3days: number;    // 3-Tage Preis
  price_week: number;     // Wochenpauschale (7 Tage)
  price_short?: number;   // Legacy
  image_url?: string;
  is_active?: boolean;
  is_single_item?: boolean;
  item_type?: 'artikel' | 'service';
  sort_order?: number;
}

export interface RentalItemUpdate {
  name?: string;
  description?: string | null;
  price_day?: number;
  price_2days?: number;
  price_3days?: number;
  price_week?: number;
  price_short?: number;   // Legacy
  image_url?: string | null;
  is_active?: boolean;
  is_single_item?: boolean;
  item_type?: 'artikel' | 'service';
  sort_order?: number;
}

export function useRentalItems() {
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    if (!supabase) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('rental_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    
    if (!error && data) {
      setItems(data as RentalItem[]);
    }
    setLoading(false);
  }

  async function createItem(item: RentalItemInsert) {
    if (!supabase) return { error: new Error('Database not connected'), data: null };
    
    // Get max sort_order
    const maxOrder = items.reduce((max, i) => Math.max(max, i.sort_order), 0);
    
    const { data, error } = await supabase
      .from('rental_items')
      .insert({ ...item, sort_order: maxOrder + 1 })
      .select()
      .single();
    
    if (!error && data) {
      setItems(prev => [...prev, data as RentalItem]);
    }
    return { error, data: data as RentalItem | null };
  }

  async function updateItem(id: string, updates: RentalItemUpdate) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('rental_items')
      .update(updates)
      .eq('id', id);
    
    if (!error) {
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } as RentalItem : item
      ));
    }
    return { error };
  }

  async function deleteItem(id: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('rental_items')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
    return { error };
  }

  async function toggleActive(id: string) {
    const item = items.find(i => i.id === id);
    if (!item) return { error: new Error('Item not found') };
    
    return updateItem(id, { is_active: !item.is_active });
  }

  async function reorderItems(orderedIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    // Update sort_order for each item
    const updates = orderedIds.map((id, index) => 
      supabase!.from('rental_items').update({ sort_order: index }).eq('id', id)
    );
    
    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);
    
    if (!hasError) {
      // Reorder local state
      const reordered = orderedIds.map(id => items.find(i => i.id === id)!).filter(Boolean);
      setItems(reordered);
    }
    
    return { error: hasError ? new Error('Failed to reorder') : null };
  }

  // Persistente Mängelnotizen aktualisieren (bei Rückgabe)
  async function updateConditionNotes(id: string, notes: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const item = items.find(i => i.id === id);
    if (!item) return { error: new Error('Item not found') };
    
    // Neue Mängel an bestehende anhängen
    const existingNotes = item.condition_notes || '';
    const timestamp = new Date().toLocaleDateString('de-DE');
    const newNotes = existingNotes 
      ? `${existingNotes}\n[${timestamp}] ${notes}`
      : `[${timestamp}] ${notes}`;
    
    const { error } = await supabase
      .from('rental_items')
      .update({ condition_notes: newNotes })
      .eq('id', id);
    
    if (!error) {
      setItems(prev => prev.map(i => 
        i.id === id ? { ...i, condition_notes: newNotes } as RentalItem : i
      ));
    }
    return { error };
  }

  // Get only active items (for form selection)
  const activeItems = items.filter(item => item.is_active);
  
  // Get only active articles (no services) for item selection
  const activeArticles = items.filter(item => item.is_active && (item.item_type === 'artikel' || !item.item_type));
  
  // Get only active services for service checkboxes
  const activeServices = items.filter(item => item.is_active && item.item_type === 'service');

  return {
    items,
    activeItems,
    activeArticles,
    activeServices,
    loading,
    createItem,
    updateItem,
    deleteItem,
    toggleActive,
    reorderItems,
    updateConditionNotes,
    refetch: fetchItems
  };
}
