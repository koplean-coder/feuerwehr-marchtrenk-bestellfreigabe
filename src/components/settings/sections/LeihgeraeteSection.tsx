import { useState } from 'react';
import { Package, Plus, Save, Trash2, Check, X, Edit2, ToggleLeft, ToggleRight, Euro, Truck } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

interface RentalItem {
  id: string;
  name: string;
  description?: string | null;
  price_day: number; // 1 Tag
  price_2days: number; // 2 Tage
  price_3days: number; // 3 Tage
  price_week: number; // Woche
  price_short?: number; // Legacy
  is_active: boolean;
  item_type?: 'artikel' | 'service';
}

interface LeihgeraeteSectionProps {
  rentalItems: RentalItem[];
  loading: boolean;
  createItem: (data: {name: string; description?: string; price_day: number; price_2days: number; price_3days: number; price_week: number; is_active?: boolean;}) => Promise<{error: Error | null;}>;
  updateItem: (id: string, data: Partial<RentalItem>) => Promise<{error: Error | null;}>;
  deleteItem: (id: string) => Promise<{error: Error | null;}>;
  toggleActive: (id: string, isActive: boolean) => Promise<{error: Error | null;}>;
  canAccessSettings: boolean;
}

export function LeihgeraeteSection({
  rentalItems,
  loading,
  createItem,
  updateItem,
  deleteItem,
  toggleActive,
  canAccessSettings
}: LeihgeraeteSectionProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', price_day: 0, price_2days: 0, price_3days: 0, price_week: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', description: '', price_day: 0, price_2days: 0, price_3days: 0, price_week: 0 });

  const handleCreate = async () => {
    if (!newItem.name) return;
    await createItem({
      name: newItem.name,
      description: newItem.description || undefined,
      price_day: newItem.price_day,
      price_2days: newItem.price_2days,
      price_3days: newItem.price_3days,
      price_week: newItem.price_week,
      is_active: true
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

  return (
    <div data-ev-id="ev_9d11c45d24">
      <SectionHeader
        icon={Package}
        title="Leihgeräte"
        description="Verfügbare Leihgeräte und Tarife verwalten." />


      {/* Add Button */}
      <div data-ev-id="ev_be638c2465" className="flex justify-end mb-4">
        <button data-ev-id="ev_61e916aa85"
        onClick={() => setShowNewForm(!showNewForm)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">

          <Plus className="w-4 h-4" />
          Neues Gerät
        </button>
      </div>

      {/* New Item Form */}
      {showNewForm &&
      <SectionCard className="mb-4">
          <h3 data-ev-id="ev_ef5a944e12" className="font-semibold mb-3">Neues Leihgerät</h3>
          <div data-ev-id="ev_4fdfd27187" className="grid gap-3 sm:grid-cols-2">
            <input data-ev-id="ev_8eac8c0052"
          type="text"
          value={newItem.name}
          onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Name"
          className="px-3 py-2 border border-input rounded-lg" />

            <input data-ev-id="ev_d6510ebd6e"
          type="text"
          value={newItem.description}
          onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Beschreibung (optional)"
          className="px-3 py-2 border border-input rounded-lg" />
          </div>
          
          <div data-ev-id="ev_price_fields" className="grid gap-3 grid-cols-2 sm:grid-cols-4 mt-3">
            <div data-ev-id="ev_new_1tag" className="flex items-center gap-2 border border-input rounded-lg px-3 py-2">
              <span data-ev-id="ev_ef0173c691" className="text-sm text-muted-foreground whitespace-nowrap">1 Tag</span>
              <div data-ev-id="ev_ed51d69c2a" className="relative flex-1">
                <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input data-ev-id="ev_4f0846747b" type="number" min="0" step="0.01"
              value={newItem.price_day || ''}
              onChange={(e) => setNewItem((prev) => ({ ...prev, price_day: parseFloat(e.target.value) || 0 }))}
              className="w-full pl-6 pr-1 py-1 text-sm border-0 focus:ring-0 bg-transparent" />
              </div>
            </div>
            <div data-ev-id="ev_new_2tage" className="flex items-center gap-2 border border-input rounded-lg px-3 py-2">
              <span data-ev-id="ev_49e4fb3e85" className="text-sm text-muted-foreground whitespace-nowrap">2 Tage</span>
              <div data-ev-id="ev_c684fc10d1" className="relative flex-1">
                <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input data-ev-id="ev_17fdae0635" type="number" min="0" step="0.01"
              value={newItem.price_2days || ''}
              onChange={(e) => setNewItem((prev) => ({ ...prev, price_2days: parseFloat(e.target.value) || 0 }))}
              className="w-full pl-6 pr-1 py-1 text-sm border-0 focus:ring-0 bg-transparent" />
              </div>
            </div>
            <div data-ev-id="ev_new_3tage" className="flex items-center gap-2 border border-input rounded-lg px-3 py-2">
              <span data-ev-id="ev_d1bb81b51a" className="text-sm text-muted-foreground whitespace-nowrap">3 Tage</span>
              <div data-ev-id="ev_37ab294322" className="relative flex-1">
                <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input data-ev-id="ev_b41fbe7939" type="number" min="0" step="0.01"
              value={newItem.price_3days || ''}
              onChange={(e) => setNewItem((prev) => ({ ...prev, price_3days: parseFloat(e.target.value) || 0 }))}
              className="w-full pl-6 pr-1 py-1 text-sm border-0 focus:ring-0 bg-transparent" />
              </div>
            </div>
            <div data-ev-id="ev_new_woche" className="flex items-center gap-2 border border-input rounded-lg px-3 py-2">
              <span data-ev-id="ev_43fdcc72a7" className="text-sm text-muted-foreground whitespace-nowrap">Woche</span>
              <div data-ev-id="ev_2baa0baf77" className="relative flex-1">
                <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input data-ev-id="ev_4154993e69" type="number" min="0" step="0.01"
              value={newItem.price_week || ''}
              onChange={(e) => setNewItem((prev) => ({ ...prev, price_week: parseFloat(e.target.value) || 0 }))}
              className="w-full pl-6 pr-1 py-1 text-sm border-0 focus:ring-0 bg-transparent" />
              </div>
            </div>
          </div>
          <div data-ev-id="ev_7580d55761" className="flex gap-2 mt-3">
            <button data-ev-id="ev_c29dc85282"
          onClick={handleCreate}
          disabled={!newItem.name}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">

              <Check className="w-4 h-4" />
              Anlegen
            </button>
            <button data-ev-id="ev_b5fd4bf96c"
          onClick={() => setShowNewForm(false)}
          className="px-4 py-2 border border-input rounded-lg hover:bg-muted">

              Abbrechen
            </button>
          </div>
        </SectionCard>
      }

      {/* Geräte (Artikel) */}
      <div data-ev-id="ev_artikel_section" className="mb-6">
        <h3 data-ev-id="ev_a386fd5ad2" className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Geräte
        </h3>
        <div data-ev-id="ev_4fd3cb09e7" className="bg-card border border-border rounded-lg overflow-hidden">
          <div data-ev-id="ev_f692a071c0" className="hidden sm:grid grid-cols-[1fr,auto,auto,auto,auto,auto,auto] gap-2 p-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
            <span data-ev-id="ev_fbb08e5d7e">Name</span>
            <span data-ev-id="ev_89c27b333b" className="w-24 text-right">1 Tag</span>
            <span data-ev-id="ev_639f8d2d12" className="w-24 text-right">2 Tage</span>
            <span data-ev-id="ev_65ae5571cc" className="w-24 text-right">3 Tage</span>
            <span data-ev-id="ev_a16bb4bdd6" className="w-24 text-right">Woche</span>
            <span data-ev-id="ev_49bc269364">Status</span>
            <span data-ev-id="ev_6eec10fe3a" className="w-16"></span>
          </div>

          <div data-ev-id="ev_c70c42dc5d" className="divide-y divide-border">
            {loading ?
            <div data-ev-id="ev_32d0d223be" className="p-4 text-center text-muted-foreground">Laden...</div> :
            rentalItems.filter((i) => !i.item_type || i.item_type === 'artikel').length === 0 ?
            <div data-ev-id="ev_a97570a776" className="p-4 text-center text-muted-foreground">Keine Leihgeräte vorhanden</div> :

            rentalItems.filter((i) => !i.item_type || i.item_type === 'artikel').map((item) =>
            <div data-ev-id="ev_d924fd36c0"
            key={item.id}
            className={`sm:grid sm:grid-cols-[1fr,auto,auto,auto,auto,auto,auto] gap-2 items-center p-3 ${
            !item.is_active ? 'bg-muted/30 opacity-60' : 'hover:bg-muted/30'}`
            }>

                {editingId === item.id ?
              <>
                    <input data-ev-id="ev_d1426b6387"
                type="text"
                value={editData.name}
                onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                className="px-2 py-1 border border-input rounded text-sm mb-2 sm:mb-0" />

                    <div data-ev-id="ev_88b3e6bc37" className="flex items-center gap-1 w-24 border border-input rounded px-2 py-1">
                      <span data-ev-id="ev_b392b4a078" className="text-xs text-muted-foreground">1T</span>
                      <input data-ev-id="ev_a73d1231df" type="number" min="0" step="0.01"
                  value={editData.price_day || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, price_day: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-sm border-0 p-0 focus:ring-0 bg-transparent text-right" />
                      <span data-ev-id="ev_13bba715b9" className="text-xs">€</span>
                    </div>
                    <div data-ev-id="ev_00cdeb4ca3" className="flex items-center gap-1 w-24 border border-input rounded px-2 py-1">
                      <span data-ev-id="ev_57edfee595" className="text-xs text-muted-foreground">2T</span>
                      <input data-ev-id="ev_75b1771c5b" type="number" min="0" step="0.01"
                  value={editData.price_2days || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, price_2days: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-sm border-0 p-0 focus:ring-0 bg-transparent text-right" />
                      <span data-ev-id="ev_d68680b57a" className="text-xs">€</span>
                    </div>
                    <div data-ev-id="ev_36519d1fec" className="flex items-center gap-1 w-24 border border-input rounded px-2 py-1">
                      <span data-ev-id="ev_eb65df0f3b" className="text-xs text-muted-foreground">3T</span>
                      <input data-ev-id="ev_aafb760f10" type="number" min="0" step="0.01"
                  value={editData.price_3days || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, price_3days: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-sm border-0 p-0 focus:ring-0 bg-transparent text-right" />
                      <span data-ev-id="ev_141de33909" className="text-xs">€</span>
                    </div>
                    <div data-ev-id="ev_be43ae3b44" className="flex items-center gap-1 w-24 border border-input rounded px-2 py-1">
                      <span data-ev-id="ev_1e4478163c" className="text-xs text-muted-foreground">W</span>
                      <input data-ev-id="ev_add0dfb806" type="number" min="0" step="0.01"
                  value={editData.price_week || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, price_week: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-sm border-0 p-0 focus:ring-0 bg-transparent text-right" />
                      <span data-ev-id="ev_874922a555" className="text-xs">€</span>
                    </div>
                    <div data-ev-id="ev_a5e9f8d1a3"></div>
                    <div data-ev-id="ev_4934a7dbcd" className="flex gap-1">
                      <button data-ev-id="ev_0b8bc3bd01"
                  onClick={handleSaveEdit}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded">

                        <Check className="w-4 h-4" />
                      </button>
                      <button data-ev-id="ev_6209cb1fba"
                  onClick={() => setEditingId(null)}
                  className="p-1.5 text-muted-foreground hover:bg-muted rounded">

                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </> :

              <>
                    <div data-ev-id="ev_c452216d35" className="mb-2 sm:mb-0">
                      <p data-ev-id="ev_1e6e00125a" className="font-medium">{item.name}</p>
                      {item.description &&
                  <p data-ev-id="ev_399028f6bb" className="text-sm text-muted-foreground">{item.description}</p>
                  }
                    </div>
                    <div data-ev-id="ev_4b0aca0e85" className="flex sm:block items-center gap-4 sm:gap-0 flex-wrap mb-2 sm:mb-0">
                      <span data-ev-id="ev_59f9e7a1d5" className="inline-flex items-center gap-1 text-sm"><span data-ev-id="ev_065415619b" className="text-muted-foreground">1T:</span> <span data-ev-id="ev_8e87b70663" className="font-mono">{(item.price_day ?? 0).toFixed(2)}€</span></span>
                    </div>
                    <div data-ev-id="ev_9baf8386e8" className="hidden sm:block">
                      <span data-ev-id="ev_dfca406253" className="inline-flex items-center gap-1 text-sm"><span data-ev-id="ev_04c93e00b4" className="text-muted-foreground">2T:</span> <span data-ev-id="ev_221bd2f65f" className="font-mono">{(item.price_2days ?? 0).toFixed(2)}€</span></span>
                    </div>
                    <div data-ev-id="ev_95102880f9" className="hidden sm:block">
                      <span data-ev-id="ev_94f2836c8b" className="inline-flex items-center gap-1 text-sm"><span data-ev-id="ev_0b38501707" className="text-muted-foreground">3T:</span> <span data-ev-id="ev_224978db7d" className="font-mono">{(item.price_3days ?? 0).toFixed(2)}€</span></span>
                    </div>
                    <div data-ev-id="ev_88d3ce30f0" className="hidden sm:block">
                      <span data-ev-id="ev_43e1266bfb" className="inline-flex items-center gap-1 text-sm"><span data-ev-id="ev_fcc223e93b" className="text-muted-foreground">W:</span> <span data-ev-id="ev_e35d47565b" className="font-mono">{(item.price_week ?? 0).toFixed(2)}€</span></span>
                    </div>
                    {/* Mobile: alle Preise in einer Zeile */}
                    <div data-ev-id="ev_1ee5720450" className="sm:hidden flex items-center gap-3 text-sm mb-2">
                      <span data-ev-id="ev_2aae0dea1d"><span data-ev-id="ev_99db210c5d" className="text-muted-foreground">2T:</span> {(item.price_2days ?? 0).toFixed(2)}€</span>
                      <span data-ev-id="ev_af8eb94eaf"><span data-ev-id="ev_97f2dd62ae" className="text-muted-foreground">3T:</span> {(item.price_3days ?? 0).toFixed(2)}€</span>
                      <span data-ev-id="ev_b6263985fe"><span data-ev-id="ev_30b01b2e3c" className="text-muted-foreground">W:</span> {(item.price_week ?? 0).toFixed(2)}€</span>
                    </div>
                    <button data-ev-id="ev_90f68506d9"
                onClick={() => toggleActive(item.id, !item.is_active)}
                className={`flex items-center gap-1 text-sm ${item.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>

                      {item.is_active ?
                  <><ToggleRight className="w-5 h-5" /> Aktiv</> :

                  <><ToggleLeft className="w-5 h-5" /> Inaktiv</>
                  }
                    </button>
                    <div data-ev-id="ev_5594e176e4" className="flex gap-1">
                      <button data-ev-id="ev_c9a8b8bdd4"
                  onClick={() => handleEdit(item)}
                  className="p-1.5 text-muted-foreground hover:bg-muted rounded">

                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button data-ev-id="ev_6bdc7bd3d2"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded">

                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
              }
              </div>
            )
            }
          </div>
        </div>
      </div>

      {/* Services (Zusatzleistungen) */}
      <div data-ev-id="ev_service_section">
        <h3 data-ev-id="ev_a4758bdc54" className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Zusatzleistungen
        </h3>
        <div data-ev-id="ev_a5dcef2677" className="bg-card border border-border rounded-lg overflow-hidden">
          <div data-ev-id="ev_2abb696004" className="grid grid-cols-[1fr,1fr,auto,auto] gap-4 p-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
            <span data-ev-id="ev_62ea9f663a">Name</span>
            <span data-ev-id="ev_634ed92278">Preis</span>
            <span data-ev-id="ev_b3108f651a">Status</span>
            <span data-ev-id="ev_7fddfd02e6" className="w-20"></span>
          </div>

          <div data-ev-id="ev_39b101aa3d" className="divide-y divide-border">
            {loading ?
            <div data-ev-id="ev_a52e67be0b" className="p-4 text-center text-muted-foreground">Laden...</div> :
            rentalItems.filter((i) => i.item_type === 'service').length === 0 ?
            <div data-ev-id="ev_f5616ec58b" className="p-4 text-center text-muted-foreground">Keine Zusatzleistungen vorhanden</div> :

            rentalItems.filter((i) => i.item_type === 'service').map((item) =>
            <div data-ev-id="ev_354e07abe6"
            key={item.id}
            className={`grid grid-cols-[1fr,1fr,auto,auto] gap-4 items-center p-3 ${
            !item.is_active ? 'bg-muted/30 opacity-60' : 'hover:bg-muted/30'}`
            }>
              {editingId === item.id ?
              <>
                <input data-ev-id="ev_d1204e8f23"
                type="text"
                value={editData.name}
                onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                className="px-2 py-1 border border-input rounded text-sm" />

                <div data-ev-id="ev_5c0d63ff77" className="relative">
                  <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input data-ev-id="ev_a44cdc481d"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editData.price_day || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, price_day: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                  className="w-full pl-7 pr-2 py-1 border border-input rounded text-sm" />

                </div>
                <div data-ev-id="ev_1701d3b897"></div>
                <div data-ev-id="ev_a1659b2a4c" className="flex gap-1">
                  <button data-ev-id="ev_1608b41f6a"
                  onClick={handleSaveEdit}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded">

                    <Check className="w-4 h-4" />
                  </button>
                  <button data-ev-id="ev_3d8368d4bc"
                  onClick={() => setEditingId(null)}
                  className="p-1.5 text-muted-foreground hover:bg-muted rounded">

                    <X className="w-4 h-4" />
                  </button>
                </div>
              </> :
              <>
                <div data-ev-id="ev_8b051f0826">
                  <p data-ev-id="ev_4bc2eb9225" className="font-medium">{item.name}</p>
                  {item.description &&
                  <p data-ev-id="ev_7ea8d12f1e" className="text-sm text-muted-foreground">{item.description}</p>
                  }
                </div>
                <span data-ev-id="ev_c5bc62c2ff" className="font-mono">{(item.price_day ?? 0).toFixed(2)} €</span>
                <button data-ev-id="ev_7b6d4aed8b"
                onClick={() => toggleActive(item.id, !item.is_active)}
                className={`flex items-center gap-1 text-sm ${item.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>

                  {item.is_active ?
                  <><ToggleRight className="w-5 h-5" /> Aktiv</> :
                  <><ToggleLeft className="w-5 h-5" /> Inaktiv</>
                  }
                </button>
                <div data-ev-id="ev_e3c0b40d94" className="flex gap-1">
                  <button data-ev-id="ev_552bf408a0"
                  onClick={() => handleEdit(item)}
                  className="p-1.5 text-muted-foreground hover:bg-muted rounded">

                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button data-ev-id="ev_dbfc57126a"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded">

                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
              }
            </div>
            )
            }
          </div>
        </div>
      </div>

      <p data-ev-id="ev_1d9b42b081" className="text-sm text-muted-foreground mt-3">
        {rentalItems.filter((i) => i.is_active && (!i.item_type || i.item_type === 'artikel')).length} aktive Geräte, {rentalItems.filter((i) => i.is_active && i.item_type === 'service').length} aktive Services
      </p>
    </div>);

}