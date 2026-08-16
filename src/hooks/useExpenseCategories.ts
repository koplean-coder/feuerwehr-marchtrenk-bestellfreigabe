import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/helpers';

export type ExpenseCategory = Tables<'expense_categories'>;
export type ExpenseCategoryInsert = TablesInsert<'expense_categories'>;

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setCategories(data ?? []);
    } catch (err) {
      console.error('Error fetching expense categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (name: string): Promise<ExpenseCategory | null> => {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ name, is_default: false })
        .select()
        .single();

      if (error) throw error;
      await fetchCategories();
      return data;
    } catch (err) {
      console.error('Error adding category:', err);
      return null;
    }
  };

  return {
    categories,
    loading,
    addCategory,
    refetch: fetchCategories
  };
}
