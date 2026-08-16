import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import { X, Star, Grid3X3, RotateCcw, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  category?: string;
}

// Kategorie-Labels für die Anzeige
const CATEGORY_LABELS: Record<string, string> = {
  arbeit: 'Meine Arbeit',
  verwaltung: 'Verwaltung',
  system: 'System & Hilfe'
};

// Reihenfolge der Kategorien
const CATEGORY_ORDER = ['arbeit', 'verwaltung', 'system'];

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  favorites: string[];
  onToggleFavorite: (path: string) => void;
  onResetFavorites?: () => void;
  onReorderFavorites?: (newOrder: string[]) => void;
  saving?: boolean;
}

export function MegaMenu({
  isOpen,
  onClose,
  menuItems,
  favorites = [],
  onToggleFavorite,
  onResetFavorites,
  onReorderFavorites,
  saving = false
}: MegaMenuProps) {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Get favorite items with full details
  const favoriteItems = useMemo(() => {
    return favorites.
    map((path) => menuItems.find((item) => item.path === path)).
    filter((item): item is MenuItem => item !== undefined);
  }, [favorites, menuItems]);

  // Move favorite up/down
  const moveFavorite = (path: string, direction: 'up' | 'down') => {
    if (!onReorderFavorites) return;
    const currentIndex = favorites.indexOf(path);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= favorites.length) return;

    const newOrder = [...favorites];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    onReorderFavorites(newOrder);
  };

  // Items nach Kategorien gruppieren
  const categorizedItems = useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {};

    menuItems.forEach((item) => {
      const cat = item.category || 'system';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    // Nach definierter Reihenfolge sortieren
    return CATEGORY_ORDER.
    filter((cat) => grouped[cat] && grouped[cat].length > 0).
    map((cat) => ({
      id: cat,
      label: CATEGORY_LABELS[cat] || cat,
      items: grouped[cat]
    }));
  }, [menuItems]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        data-ev-id="ev_megamenu_backdrop"
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={onClose} />


      {/* Mega Menu Panel */}
      <div
        data-ev-id="ev_megamenu_panel"
        className="fixed left-1/2 -translate-x-1/2 top-16 z-50 w-full max-w-4xl px-4">

        <div data-ev-id="ev_236840fdf5" className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div data-ev-id="ev_8a824a60e2" className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div data-ev-id="ev_d00373543d" className="flex items-center gap-3">
              <div data-ev-id="ev_1b0acea992" className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Grid3X3 className="w-5 h-5 text-primary" />
              </div>
              <div data-ev-id="ev_fc25626643">
                <h2 data-ev-id="ev_1795e730e5" className="text-lg font-semibold text-gray-900">Alle Module</h2>
                <p data-ev-id="ev_df6d41463d" className="text-sm text-gray-500">Klicke auf ⭐ um Favoriten festzulegen</p>
              </div>
            </div>
            <div data-ev-id="ev_c5a7a52f5d" className="flex items-center gap-2">
              {onResetFavorites &&
              <button data-ev-id="ev_7eeb1f080d"
              onClick={onResetFavorites}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Favoriten zurücksetzen">

                  <RotateCcw className="w-4 h-4" />
                  <span data-ev-id="ev_05f1f61e20" className="hidden sm:inline">Zurücksetzen</span>
                </button>
              }
              <button data-ev-id="ev_6af384ff65"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors">

                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Main Content: Favorites + Categories */}
          <div data-ev-id="ev_b41582fe1e" className="p-6">
            <div data-ev-id="ev_6ac6579888" className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Left Column: Favorites with Reorder */}
              <div data-ev-id="ev_favorites_column" className="md:border-r md:border-gray-200 md:pr-6">
                <h3 data-ev-id="ev_favorites_title" className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Meine Favoriten
                </h3>
                {favoriteItems.length === 0 ?
                <p data-ev-id="ev_no_favorites" className="text-sm text-gray-500 italic py-4">
                    Noch keine Favoriten festgelegt.
                    <br data-ev-id="ev_4d485e044a" />
                    <span data-ev-id="ev_95de89ad79" className="text-xs">Klicke auf ⭐ bei einem Modul.</span>
                  </p> :

                <div data-ev-id="ev_favorites_list" className="flex flex-col gap-1">
                    {favoriteItems.map((item, index) => {
                    const Icon = item.icon;
                    const isFirst = index === 0;
                    const isLast = index === favoriteItems.length - 1;

                    return (
                      <div
                        data-ev-id={`ev_fav_${item.path}`}
                        key={item.path}
                        className="flex items-center gap-1 group">

                          {/* Reorder Buttons */}
                          <div data-ev-id="ev_reorder_btns" className="flex flex-col">
                            <button
                            data-ev-id="ev_move_up"
                            onClick={() => moveFavorite(item.path, 'up')}
                            disabled={isFirst || saving}
                            className={`p-0.5 rounded transition-colors ${
                            isFirst ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-primary hover:bg-primary/10'}`
                            }
                            title="Nach oben">

                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                            data-ev-id="ev_move_down"
                            onClick={() => moveFavorite(item.path, 'down')}
                            disabled={isLast || saving}
                            className={`p-0.5 rounded transition-colors ${
                            isLast ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-primary hover:bg-primary/10'}`
                            }
                            title="Nach unten">

                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          {/* Favorite Item Link */}
                          <Link
                          to={item.path}
                          onClick={onClose}
                          className="flex-1 flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">

                            <div data-ev-id="ev_fav_icon" className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span data-ev-id="ev_fav_label" className="text-sm font-medium truncate">{item.label}</span>
                          </Link>
                          
                          {/* Remove from favorites */}
                          <button
                          data-ev-id="ev_remove_fav"
                          onClick={() => onToggleFavorite(item.path)}
                          disabled={saving}
                          className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Aus Favoriten entfernen">

                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>);

                  })}
                  </div>
                }
              </div>
              
              {/* Right Side: Categories Grid (3 columns) */}
              <div data-ev-id="ev_categories_grid" className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              {categorizedItems.map((category) =>
                <div data-ev-id="ev_2d8c8152d6" key={category.id}>
                  <h3 data-ev-id="ev_3ffb3a5513" className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {category.label}
                  </h3>
                  <div data-ev-id="ev_ecb16d1ed1" className="flex flex-col gap-1">
                    {category.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      const isFavorite = favorites.includes(item.path);
                      const isHovered = hoveredItem === item.path;
                      const Icon = item.icon;

                      return (
                        <div data-ev-id="ev_b1a52a17c5"
                        key={item.path}
                        className="relative group"
                        onMouseEnter={() => setHoveredItem(item.path)}
                        onMouseLeave={() => setHoveredItem(null)}>

                          <Link
                            to={item.path}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                            isActive ?
                            'bg-primary text-white shadow-lg shadow-primary/25' :
                            'hover:bg-gray-100 text-gray-700'}`
                            }>

                            <div data-ev-id="ev_71dcdf50bc"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isActive ?
                            'bg-white/20' :
                            'bg-gray-100 group-hover:bg-primary/10'}`
                            }>

                              <Icon
                                className={`w-4 h-4 ${
                                isActive ? 'text-white' : 'text-gray-600 group-hover:text-primary'}`
                                } />

                            </div>
                            <span data-ev-id="ev_4a1ccf71d5" className="font-medium flex-1">{item.label}</span>

                            {/* Favorite Star */}
                            <button data-ev-id="ev_dd4b8113d0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleFavorite(item.path);
                            }}
                            disabled={saving}
                            className={`p-1.5 rounded-lg transition-all duration-200 ${
                            isFavorite ?
                            'text-amber-500 hover:text-amber-600 hover:bg-amber-50' :
                            isActive ?
                            'text-white/50 hover:text-white hover:bg-white/10' :
                            'text-gray-300 hover:text-amber-500 hover:bg-amber-50'} ${
                            isHovered || isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>

                              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                            </button>
                          </Link>
                        </div>);

                    })}
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div data-ev-id="ev_3c29f94066" className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p data-ev-id="ev_569ea811ca" className="text-xs text-gray-500 text-center">
              Favoriten werden in der Hauptleiste angezeigt • Pfeile zum Sortieren • Max. 6 empfohlen
            </p>
          </div>
        </div>
      </div>
    </>);

}