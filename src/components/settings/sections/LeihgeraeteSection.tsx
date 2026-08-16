import { useState } from 'react';
import { Package, Plus, Save, Trash2, Check, X, Edit2, ToggleLeft, ToggleRight, Euro, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

interface RentalItem {
  id: string;
  name: string;
  description?: string | null;
  price_day: number;
  price_2days: number;
  price_3days: number;
  price_week: number;
  price_short?: number;
  is_active: boolean;
  item_type?: 'artikel' | 'service';
}

interface LeihgeraeteSectionProps {
  rentalItems: RentalItem[];
  loading: boolean;
  createItem: (data: {name: string;description?: string;price_day: number;price_2days: number;price_3days: number;price_week: number;is_active?: boolean;item_type?: 'artikel' | 'service';}) => Promise<{error: Error | null;}>;
  updateItem: (id: string, data: Partial<RentalItem>) => Promise<{error: Error | null;}>;
  deleteItem: (id: string) => Promise<{error: Error | null;}>;
  toggleActive: (id: string, isActive: boolean) => Promise<{error: Error | null;}>;
  canAccessSettings?: boolean;
}

export function LeihgeraeteSection({
  rentalItems,
  loading,
  createItem,
  updateItem,
  deleteItem,
  toggleActive
}: LeihgeraeteSectionProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newItemType, setNewItemType] = useState<'artikel' | 'service'>('artikel');
  const [newItem, setNewItem] = useState({ name: '', description: '', price_day: 0, price_2days: 0, price_3days: 0, price_week: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', description: '', price_day: 0, price_2days: 0, price_3days: 0, price_week: 0 });
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const handleCreate = async () => {
    if (!newItem.name) return;
    await createItem({
      name: newItem.name,
      description: newItem.description || undefined,
      price_day: newItem.price_day,
      price_2days: newItem.price_2days,
      price_3days: newItem.price_3days,
      price_week: newItem.price_week,
      is_active: true,
      item_type: newItemType
    });
    setNewItem({ name: '', description: '', price_day: 0, price_2days: 0, price_3days: 0, price_week: 0 });
    setShowNewForm(false);
  };

  const handleEdit = (item: RentalItem) => {
    setEditingId(item.id);
    setEditData({
      name: item.name,
      description: item.description || '',
      price_day: item.price_day ?? 0,
      price_2days: item.price_2days ?? 0,
      price_3days: item.price_3days ?? 0,
      price_week: item.price_week ?? 0
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await updateItem(editingId, {
      name: editData.name,
      description: editData.description || null,
      price_day: editData.price_day,
      price_2days: editData.price_2days,
      price_3days: editData.price_3days,
      price_week: editData.price_week
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Dieses Leihgerät wirklich löschen?')) {
      await deleteItem(id);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  };

  const artikelItems = rentalItems.filter((i) => !i.item_type || i.item_type === 'artikel');
  const serviceItems = rentalItems.filter((i) => i.item_type === 'service');

  // Render Geräte-Karte
  const renderItemCard = (item: RentalItem, isService: boolean = false) => {
    const isEditing = editingId === item.id;
    const isExpanded = expandedItems.has(item.id);

    if (isEditing) {
      return (
        <div data-ev-id="ev_b4a7824858" key={item.id} className="bg-card border-2 border-primary rounded-xl p-4">
          <div data-ev-id="ev_1ea83f253f" className="flex flex-col gap-3">
            <input data-ev-id="ev_fe63941695"
            type="text"
            value={editData.name}
            onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Name"
            className="px-3 py-2 border border-input rounded-lg text-base font-medium" />

            <input data-ev-id="ev_414db00cea"
            type="text"
            value={editData.description}
            onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Beschreibung (optional)"
            className="px-3 py-2 border border-input rounded-lg text-sm" />

            
            {isService ?
            <div data-ev-id="ev_d4692e3027" className="flex items-center gap-2">
                <span data-ev-id="ev_45aba13acf" className="text-sm text-muted-foreground w-16">Preis:</span>
                <div data-ev-id="ev_687e4ed342" className="relative flex-1">
                  <input data-ev-id="ev_8bc1f684e7"
                type="number"
                min="0"
                step="0.01"
                value={editData.price_day || ''}
                onChange={(e) => setEditData((prev) => ({ ...prev, price_day: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-input rounded-lg pr-8" />

                  <span data-ev-id="ev_a663f1f741" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                </div>
              </div> :

            <div data-ev-id="ev_e7be4e289f" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([{ key: 'price_day' as const, label: '1 Tag' }, { key: 'price_2days' as const, label: '2 Tage' }, { key: 'price_3days' as const, label: '3 Tage' }, { key: 'price_week' as const, label: 'Woche' }]).map(({ key, label }) =>
              <div data-ev-id="ev_e7b86eab07" key={key} className="flex flex-col gap-1">
                    <span data-ev-id="ev_0d8eb24ff5" className="text-xs text-muted-foreground">{label}</span>
                    <div data-ev-id="ev_001172495f" className="relative">
                      <input data-ev-id="ev_c89c50478d"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editData[key] || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-input rounded-lg pr-8 text-right" />

                      <span data-ev-id="ev_c8c1494749" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>
              )}
              </div>
            }

            <div data-ev-id="ev_abd71f84f2" className="flex gap-2 pt-2">
              <button data-ev-id="ev_d8006b1ce7"
              onClick={handleSaveEdit}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">

                <Check className="w-4 h-4" />
                Speichern
              </button>
              <button data-ev-id="ev_d00f7488df"
              onClick={() => setEditingId(null)}
              className="px-4 py-2 border border-input rounded-lg hover:bg-muted">

                Abbrechen
              </button>
            </div>
          </div>
        </div>);

    }

    return (
      <div data-ev-id="ev_071a6fde0e"
      key={item.id}
      className={`bg-card border rounded-xl overflow-hidden transition-all ${
      !item.is_active ? 'opacity-50 border-dashed' : 'border-border hover:border-primary/50 hover:shadow-sm'}`
      }>

        {/* Header */}
        <div data-ev-id="ev_5e657b2166"
        className="p-4 cursor-pointer"
        onClick={() => !isService && toggleExpand(item.id)}>

          <div data-ev-id="ev_41de88420c" className="flex items-start justify-between gap-3">
            <div data-ev-id="ev_0a492c1216" className="flex-1 min-w-0">
              <div data-ev-id="ev_2243897fe6" className="flex items-center gap-2">
                <h4 data-ev-id="ev_37fdae8966" className="font-semibold text-foreground truncate">{item.name}</h4>
                {!item.is_active &&
                <span data-ev-id="ev_4f9bce6c56" className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">Inaktiv</span>
                }
              </div>
              {item.description &&
              <p data-ev-id="ev_b5202cd197" className="text-sm text-muted-foreground mt-0.5 truncate">{item.description}</p>
              }
            </div>

            {/* Preis-Badge für Services */}
            {isService ?
            <div data-ev-id="ev_ee50e5e48a" className="text-right">
                <span data-ev-id="ev_e76dc47318" className="text-lg font-bold text-primary">{formatPrice(item.price_day)}</span>
              </div> : (

            /* Kompakte Preisanzeige für Artikel */
            <div data-ev-id="ev_0f312d6b23" className="flex items-center gap-2">
                <div data-ev-id="ev_ce2e566dc6" className="text-right">
                  <span data-ev-id="ev_742a687fb1" className="text-lg font-bold text-primary">{formatPrice(item.price_day)}</span>
                  <span data-ev-id="ev_0a8658bc52" className="text-xs text-muted-foreground block">pro Tag</span>
                </div>
                <button data-ev-id="ev_1f45a30aeb" className="p-1 text-muted-foreground hover:text-foreground">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>)
            }
          </div>

          {/* Erweiterte Preise für Artikel */}
          {!isService && isExpanded &&
          <div data-ev-id="ev_2bb859f3e1" className="mt-4 pt-4 border-t border-border">
              <div data-ev-id="ev_095ff7191f" className="grid grid-cols-4 gap-2">
                {[
              { label: '1 Tag', value: item.price_day },
              { label: '2 Tage', value: item.price_2days },
              { label: '3 Tage', value: item.price_3days },
              { label: 'Woche', value: item.price_week }].
              map(({ label, value }) =>
              <div data-ev-id="ev_1e5ea6044d" key={label} className="text-center p-2 bg-muted/50 rounded-lg">
                    <div data-ev-id="ev_6f5dabdd03" className="text-xs text-muted-foreground mb-1">{label}</div>
                    <div data-ev-id="ev_b097bf9aa0" className="font-semibold text-sm">{formatPrice(value)}</div>
                  </div>
              )}
              </div>
            </div>
          }
        </div>

        {/* Footer mit Aktionen */}
        <div data-ev-id="ev_419063d717" className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between">
          <button data-ev-id="ev_3c3008d29d"
          onClick={(e) => {e.stopPropagation();toggleActive(item.id, !item.is_active);}}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
          item.is_active ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-foreground'}`
          }>

            {item.is_active ?
            <><ToggleRight className="w-5 h-5" /> Aktiv</> :

            <><ToggleLeft className="w-5 h-5" /> Inaktiv</>
            }
          </button>

          <div data-ev-id="ev_165fb39931" className="flex items-center gap-1">
            <button data-ev-id="ev_576208a47e"
            onClick={(e) => {e.stopPropagation();handleEdit(item);}}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Bearbeiten">

              <Edit2 className="w-4 h-4" />
            </button>
            <button data-ev-id="ev_5be940eb23"
            onClick={(e) => {e.stopPropagation();handleDelete(item.id);}}
            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Löschen">

              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>);

  };

  return (
    <div data-ev-id="ev_5b8e165f4b">
      <SectionHeader
        icon={Package}
        title="Leihgeräte"
        description="Verfügbare Leihgeräte und Tarife verwalten." />


      {/* Add Button */}
      <div data-ev-id="ev_73a1ac5553" className="flex justify-end mb-6">
        <button data-ev-id="ev_f4e86755df"
        onClick={() => setShowNewForm(!showNewForm)}
        className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 font-medium shadow-sm">

          <Plus className="w-4 h-4" />
          Neues Gerät
        </button>
      </div>

      {/* New Item Form */}
      {showNewForm &&
      <SectionCard className="mb-6 border-2 border-primary/20">
          <div data-ev-id="ev_13138caa5e" className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-primary" />
            <h3 data-ev-id="ev_fbee6788da" className="font-semibold text-lg">Neues Leihgerät anlegen</h3>
          </div>

          {/* Typ-Auswahl */}
          <div data-ev-id="ev_07a220ebc0" className="flex gap-2 mb-4">
            <button data-ev-id="ev_a0213b3959"
          onClick={() => setNewItemType('artikel')}
          className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
          newItemType === 'artikel' ?
          'border-primary bg-primary/10 text-primary' :
          'border-border hover:border-primary/50'}`
          }>

              <Package className="w-4 h-4 inline-block mr-2" />
              Gerät
            </button>
            <button data-ev-id="ev_3e1feb0fed"
          onClick={() => setNewItemType('service')}
          className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
          newItemType === 'service' ?
          'border-primary bg-primary/10 text-primary' :
          'border-border hover:border-primary/50'}`
          }>

              <Truck className="w-4 h-4 inline-block mr-2" />
              Zusatzleistung
            </button>
          </div>

          <div data-ev-id="ev_3e8f5c2c00" className="flex flex-col gap-4">
            <div data-ev-id="ev_24d5fa169d" className="grid gap-3 sm:grid-cols-2">
              <input data-ev-id="ev_798a08d33d"
            type="text"
            value={newItem.name}
            onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Name *"
            className="px-4 py-2.5 border border-input rounded-lg focus:border-primary focus:ring-1 focus:ring-primary" />

              <input data-ev-id="ev_73fb198f18"
            type="text"
            value={newItem.description}
            onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Beschreibung (optional)"
            className="px-4 py-2.5 border border-input rounded-lg focus:border-primary focus:ring-1 focus:ring-primary" />

            </div>

            {newItemType === 'service' ?
          <div data-ev-id="ev_b2c5d8b519" className="flex items-center gap-3">
                <span data-ev-id="ev_3b7beb44c8" className="text-sm font-medium text-muted-foreground">Preis:</span>
                <div data-ev-id="ev_aa2a37567e" className="relative flex-1 max-w-xs">
                  <input data-ev-id="ev_e2e2474662"
              type="number"
              min="0"
              step="0.01"
              value={newItem.price_day || ''}
              onChange={(e) => setNewItem((prev) => ({ ...prev, price_day: parseFloat(e.target.value) || 0 }))}
              placeholder="0,00"
              className="w-full px-4 py-2.5 border border-input rounded-lg pr-10 text-right focus:border-primary focus:ring-1 focus:ring-primary" />

                  <span data-ev-id="ev_e744a1360d" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
                </div>
              </div> :

          <div data-ev-id="ev_9eec8bee81" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
            { key: 'price_day' as const, label: '1 Tag' },
            { key: 'price_2days' as const, label: '2 Tage' },
            { key: 'price_3days' as const, label: '3 Tage' },
            { key: 'price_week' as const, label: 'Woche' }]).
            map(({ key, label }) =>
            <div data-ev-id="ev_9ee0e3e1bd" key={key} className="flex flex-col gap-1.5">
                    <label data-ev-id="ev_d902e6d090" className="text-sm font-medium text-muted-foreground">{label}</label>
                    <div data-ev-id="ev_de3b874ab4" className="relative">
                      <input data-ev-id="ev_8c1bc01315"
                type="number"
                min="0"
                step="0.01"
                value={newItem[key] || ''}
                onChange={(e) => setNewItem((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-input rounded-lg pr-8 text-right focus:border-primary focus:ring-1 focus:ring-primary" />

                      <span data-ev-id="ev_e72135218b" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>
            )}
              </div>
          }

            <div data-ev-id="ev_29fc5303fe" className="flex gap-3 pt-2">
              <button data-ev-id="ev_091b8e0e85"
            onClick={handleCreate}
            disabled={!newItem.name}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium">

                <Check className="w-4 h-4" />
                Anlegen
              </button>
              <button data-ev-id="ev_635f0453cc"
            onClick={() => {
              setShowNewForm(false);
              setNewItem({ name: '', description: '', price_day: 0, price_2days: 0, price_3days: 0, price_week: 0 });
            }}
            className="px-6 py-2.5 border border-input rounded-lg hover:bg-muted font-medium">

                Abbrechen
              </button>
            </div>
          </div>
        </SectionCard>
      }

      {/* Geräte (Artikel) */}
      <div data-ev-id="ev_31723f9c18" className="mb-8">
        <div data-ev-id="ev_7ac19644cc" className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-primary" />
          <h3 data-ev-id="ev_709bfc0dad" className="font-semibold text-lg">Geräte</h3>
          <span data-ev-id="ev_f65e7af816" className="text-sm text-muted-foreground ml-2">
            ({artikelItems.filter((i) => i.is_active).length} aktiv)
          </span>
        </div>

        {loading ?
        <div data-ev-id="ev_a523fe8fcd" className="text-center py-8 text-muted-foreground">
            <div data-ev-id="ev_a594c5e852" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            Laden...
          </div> :
        artikelItems.length === 0 ?
        <div data-ev-id="ev_294065636c" className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p data-ev-id="ev_68ff9b97ed">Keine Leihgeräte vorhanden</p>
            <button data-ev-id="ev_dd4e689550"
          onClick={() => {setNewItemType('artikel');setShowNewForm(true);}}
          className="mt-3 text-primary hover:underline text-sm font-medium">

              Erstes Gerät anlegen →
            </button>
          </div> :

        <div data-ev-id="ev_850ff1ed8f" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {artikelItems.map((item) => renderItemCard(item, false))}
          </div>
        }
      </div>

      {/* Services (Zusatzleistungen) */}
      <div data-ev-id="ev_dc72e44373">
        <div data-ev-id="ev_4f445ba196" className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-primary" />
          <h3 data-ev-id="ev_cb08b7ab2f" className="font-semibold text-lg">Zusatzleistungen</h3>
          <span data-ev-id="ev_891b2afdd0" className="text-sm text-muted-foreground ml-2">
            ({serviceItems.filter((i) => i.is_active).length} aktiv)
          </span>
        </div>

        {loading ?
        <div data-ev-id="ev_4c765718a8" className="text-center py-8 text-muted-foreground">
            Laden...
          </div> :
        serviceItems.length === 0 ?
        <div data-ev-id="ev_7533cb5050" className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p data-ev-id="ev_c83864d34b">Keine Zusatzleistungen vorhanden</p>
            <button data-ev-id="ev_793e2048b6"
          onClick={() => {setNewItemType('service');setShowNewForm(true);}}
          className="mt-3 text-primary hover:underline text-sm font-medium">

              Erste Zusatzleistung anlegen →
            </button>
          </div> :

        <div data-ev-id="ev_b09d9bc128" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {serviceItems.map((item) => renderItemCard(item, true))}
          </div>
        }
      </div>

      {/* Statistik */}
      <div data-ev-id="ev_c8a7214e62" className="mt-6 pt-4 border-t border-border">
        <p data-ev-id="ev_7e621cd4a2" className="text-sm text-muted-foreground">
          Gesamt: {artikelItems.length} Geräte ({artikelItems.filter((i) => i.is_active).length} aktiv), 
          {serviceItems.length} Zusatzleistungen ({serviceItems.filter((i) => i.is_active).length} aktiv)
        </p>
      </div>
    </div>);

}