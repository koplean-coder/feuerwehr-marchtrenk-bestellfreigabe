import { useState } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Briefcase,
  MessageSquare,
  X,
  Save,
  Loader2 } from
'lucide-react';
import { type SupplierContact } from '@/hooks/useSupplierContacts';

interface SupplierContactsSectionProps {
  contacts: SupplierContact[];
  loading: boolean;
  onAdd: (data: ContactFormData) => Promise<{error: Error | null;}>;
  onUpdate: (id: string, data: ContactFormData) => Promise<{error: Error | null;}>;
  onDelete: (id: string) => Promise<{error: Error | null;}>;
}

interface ContactFormData {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

const emptyForm: ContactFormData = {
  name: '',
  position: '',
  phone: '',
  email: '',
  notes: ''
};

export function SupplierContactsSection({
  contacts,
  loading,
  onAdd,
  onUpdate,
  onDelete
}: SupplierContactsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const handleEdit = (contact: SupplierContact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      position: contact.position || '',
      phone: contact.phone || '',
      email: contact.email || '',
      notes: contact.notes || ''
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    if (editingId) {
      await onUpdate(editingId, formData);
    } else {
      await onAdd(formData);
    }
    setSaving(false);
    handleCancel();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Kontaktperson wirklich löschen?')) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  return (
    <section data-ev-id="ev_38ae066771" className="border-2 border-indigo-300 rounded-xl p-2">
      <div data-ev-id="ev_b363c899ed" className="flex items-center justify-between mb-3">
        <div data-ev-id="ev_2ae68e8cfa" className="flex items-center gap-2">
          <div data-ev-id="ev_fa0ed92cde" className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <h4 data-ev-id="ev_ea28e5f7d7" className="font-bold text-foreground">Kontaktpersonen</h4>
          <span data-ev-id="ev_c198efba56" className="text-xs text-muted-foreground">({contacts.length})</span>
        </div>
        {!showForm &&
        <button data-ev-id="ev_e4a59e4564"
        onClick={handleAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">

            <Plus className="w-4 h-4" />
            Hinzufügen
          </button>
        }
      </div>

      <div data-ev-id="ev_57acd110fb" className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
        {loading ?
        <div data-ev-id="ev_a9d1fcd43b" className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div> :

        <div data-ev-id="ev_9ace152522" className="flex flex-col gap-3">
            {/* Add/Edit Form */}
            {showForm &&
          <div data-ev-id="ev_5e64707b08" className="bg-white rounded-xl p-4 border border-indigo-200 shadow-sm">
                <div data-ev-id="ev_34bdcaff19" className="flex items-center justify-between mb-4">
                  <h5 data-ev-id="ev_f97266a018" className="font-semibold text-foreground">
                    {editingId ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
                  </h5>
                  <button data-ev-id="ev_7a92438434"
              onClick={handleCancel}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">

                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div data-ev-id="ev_9cd5c40f21" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div data-ev-id="ev_e0837aa3e8">
                    <label data-ev-id="ev_80ddf46310" className="block text-xs font-medium text-muted-foreground mb-1">
                      Name *
                    </label>
                    <input data-ev-id="ev_d9cfe1d9bf"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Max Mustermann" />

                  </div>
                  <div data-ev-id="ev_2db40f638f">
                    <label data-ev-id="ev_3c21319a8f" className="block text-xs font-medium text-muted-foreground mb-1">
                      Position
                    </label>
                    <input data-ev-id="ev_8126bc40a6"
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Vertriebsleiter" />

                  </div>
                  <div data-ev-id="ev_22d118b82c">
                    <label data-ev-id="ev_5f773804ba" className="block text-xs font-medium text-muted-foreground mb-1">
                      Telefon
                    </label>
                    <input data-ev-id="ev_3796eae449"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+43 123 456789" />

                  </div>
                  <div data-ev-id="ev_5eba232edd">
                    <label data-ev-id="ev_cd7f46deda" className="block text-xs font-medium text-muted-foreground mb-1">
                      E-Mail
                    </label>
                    <input data-ev-id="ev_0dcc26da84"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="max@beispiel.at" />

                  </div>
                  <div data-ev-id="ev_ad2a16f04d" className="sm:col-span-2">
                    <label data-ev-id="ev_880534ebe8" className="block text-xs font-medium text-muted-foreground mb-1">
                      Notizen
                    </label>
                    <textarea data-ev-id="ev_00f58d3cfd"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
                placeholder="Zusätzliche Informationen..." />

                  </div>
                </div>
                <div data-ev-id="ev_252e3c2473" className="flex justify-end gap-2 mt-4">
                  <button data-ev-id="ev_46ddb71595"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-slate-100 rounded-lg transition-colors">

                    Abbrechen
                  </button>
                  <button data-ev-id="ev_ff47d3d6a8"
              onClick={handleSubmit}
              disabled={!formData.name.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">

                    {saving ?
                <Loader2 className="w-4 h-4 animate-spin" /> :

                <Save className="w-4 h-4" />
                }
                    {editingId ? 'Speichern' : 'Hinzufügen'}
                  </button>
                </div>
              </div>
          }

            {/* Contact List */}
            {contacts.length === 0 && !showForm ?
          <p data-ev-id="ev_ab65d3071d" className="text-sm text-muted-foreground italic text-center py-4">
                Keine Kontaktpersonen hinterlegt
              </p> :

          contacts.map((contact) =>
          <div data-ev-id="ev_1760a92f20"
          key={contact.id}
          className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm">

                  <div data-ev-id="ev_73126a1d05" className="flex items-start justify-between">
                    <div data-ev-id="ev_e446b24d67" className="flex items-start gap-3">
                      <div data-ev-id="ev_f26a950bea" className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span data-ev-id="ev_f2a405430b" className="text-indigo-600 font-bold text-sm">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div data-ev-id="ev_0bff766863">
                        <h5 data-ev-id="ev_0d40b8f789" className="font-semibold text-foreground">{contact.name}</h5>
                        {contact.position &&
                  <p data-ev-id="ev_e5df5d72ab" className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Briefcase className="w-3.5 h-3.5" />
                            {contact.position}
                          </p>
                  }
                        <div data-ev-id="ev_88939997b4" className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {contact.phone &&
                    <a data-ev-id="ev_621028077f"
                    href={`tel:${contact.phone}`}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5">

                              <Phone className="w-3.5 h-3.5" />
                              {contact.phone}
                            </a>
                    }
                          {contact.email &&
                    <a data-ev-id="ev_9e2fb8353f"
                    href={`mailto:${contact.email}`}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5">

                              <Mail className="w-3.5 h-3.5" />
                              {contact.email}
                            </a>
                    }
                        </div>
                        {contact.notes &&
                  <p data-ev-id="ev_f7fc9c90ce" className="text-sm text-muted-foreground mt-2 flex items-start gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            {contact.notes}
                          </p>
                  }
                      </div>
                    </div>
                    <div data-ev-id="ev_22476585b3" className="flex items-center gap-1">
                      <button data-ev-id="ev_519c9e98f3"
                onClick={() => handleEdit(contact)}
                className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Bearbeiten">

                        <Pencil className="w-4 h-4 text-indigo-600" />
                      </button>
                      <button data-ev-id="ev_5849188249"
                onClick={() => handleDelete(contact.id)}
                disabled={deletingId === contact.id}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Löschen">

                        {deletingId === contact.id ?
                  <Loader2 className="w-4 h-4 text-red-500 animate-spin" /> :

                  <Trash2 className="w-4 h-4 text-red-500" />
                  }
                      </button>
                    </div>
                  </div>
                </div>
          )
          }
          </div>
        }
      </div>
    </section>);

}