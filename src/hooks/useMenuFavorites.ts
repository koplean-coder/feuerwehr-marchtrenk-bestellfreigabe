import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Standard-Favoriten für neue User
const DEFAULT_FAVORITES = ['/', '/bestellungen', '/aufgaben', '/antragsformulare', '/kassier'];

export function useMenuFavorites() {
  const { user, profile, refetchProfile } = useAuth();
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Favoriten aus Profil laden
  useEffect(() => {
    if (profile?.menu_favorites && Array.isArray(profile.menu_favorites)) {
      setFavorites(profile.menu_favorites);
    } else {
      setFavorites(DEFAULT_FAVORITES);
    }
    setLoading(false);
  }, [profile]);

  // Favorit hinzufügen
  const addFavorite = useCallback(async (path: string) => {
    if (!supabase || !user) return { error: new Error('Nicht angemeldet') };
    if (favorites.includes(path)) return { error: null }; // Bereits vorhanden

    const newFavorites = [...favorites, path];
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ menu_favorites: newFavorites })
      .eq('id', user.id);

    if (!error) {
      setFavorites(newFavorites);
      refetchProfile?.();
    }

    setSaving(false);
    return { error };
  }, [favorites, user, refetchProfile]);

  // Favorit entfernen
  const removeFavorite = useCallback(async (path: string) => {
    if (!supabase || !user) return { error: new Error('Nicht angemeldet') };
    if (!favorites.includes(path)) return { error: null }; // Nicht vorhanden

    const newFavorites = favorites.filter(f => f !== path);
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ menu_favorites: newFavorites })
      .eq('id', user.id);

    if (!error) {
      setFavorites(newFavorites);
      refetchProfile?.();
    }

    setSaving(false);
    return { error };
  }, [favorites, user, refetchProfile]);

  // Favorit umschalten
  const toggleFavorite = useCallback(async (path: string) => {
    if (favorites.includes(path)) {
      return removeFavorite(path);
    } else {
      return addFavorite(path);
    }
  }, [favorites, addFavorite, removeFavorite]);

  // Favoriten neu ordnen
  const reorderFavorites = useCallback(async (newOrder: string[]) => {
    if (!supabase || !user) return { error: new Error('Nicht angemeldet') };

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ menu_favorites: newOrder })
      .eq('id', user.id);

    if (!error) {
      setFavorites(newOrder);
      refetchProfile?.();
    }

    setSaving(false);
    return { error };
  }, [user, refetchProfile]);

  // Auf Standard zurücksetzen
  const resetToDefault = useCallback(async () => {
    if (!supabase || !user) return { error: new Error('Nicht angemeldet') };

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ menu_favorites: DEFAULT_FAVORITES })
      .eq('id', user.id);

    if (!error) {
      setFavorites(DEFAULT_FAVORITES);
      refetchProfile?.();
    }

    setSaving(false);
    return { error };
  }, [user, refetchProfile]);

  return {
    favorites,
    loading,
    saving,
    isFavorite: (path: string) => favorites.includes(path),
    addFavorite,
    removeFavorite,
    toggleFavorite,
    reorderFavorites,
    resetToDefault,
    DEFAULT_FAVORITES
  };
}
