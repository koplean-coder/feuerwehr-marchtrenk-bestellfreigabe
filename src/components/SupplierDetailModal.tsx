import { useState } from 'react';
import {
  X,
  ExternalLink,
  User,
  Lock,
  Eye,
  EyeOff,
  ShoppingCart,
  Mail,
  Building2,
  Clock,
  Euro,
  Package,
  Globe,
  Key,
  Calendar,
  Copy,
  Check,
  Phone,
  Info,
  CreditCard,
  Percent,
  FileText } from
'lucide-react';
import { type Supplier, ORDER_DAY_OPTIONS } from '@/hooks/useSuppliers';
import { useSupplierContacts } from '@/hooks/useSupplierContacts';
import { SupplierContactsSection } from '@/components/SupplierContactsSection';
import { SupplierDocumentsSection } from '@/components/SupplierDocumentsSection';

const ORDER_METHOD_OPTIONS = [
{ id: 'webshop', label: 'Webshop', icon: Globe },
{ id: 'telefonisch', label: 'Telefonisch', icon: Phone },
{ id: 'email', label: 'Email', icon: Mail },
{ id: 'bereichsleiter', label: 'Bereichsleiter', icon: User },
{ id: 'ruecksprache_kdt', label: 'Rücksprache Kdt.', icon: ShoppingCart },
{ id: 'it_admin', label: 'IT-Admin', icon: ShoppingCart }];


interface SupplierDetailModalProps {
  supplier: Supplier;
  onClose: () => void;
  bereichsleiterName?: string;
}

export function SupplierDetailModal({ supplier, onClose, bereichsleiterName }: SupplierDetailModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    contacts,
    loading: contactsLoading,
    createContact,
    updateContact,
    deleteContact
  } = useSupplierContacts(supplier.id);

  const copyToClipboard = (text: string, field: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const hasLoginData = supplier.username || supplier.password;
  const hasOrderMethods = (supplier.order_methods ?? []).length > 0;
  const hasOrderConditions = supplier.minimum_order_value != null && supplier.minimum_order_value > 0 || (supplier.order_days ?? []).length > 0 || supplier.discount_percent != null || supplier.payment_terms || supplier.special_conditions;

  return (
    <div data-ev-id="ev_3b3b673471" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div data-ev-id="ev_be52ce08a8" className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Gradient Header */}
        <div data-ev-id="ev_fa38ed26b2" className="bg-gradient-to-r from-slate-600 to-slate-500 px-6 py-6">
          <div data-ev-id="ev_9d4abf280e" className="flex items-center justify-between">
            <div data-ev-id="ev_a7f372d7c6" className="flex items-center gap-4">
              <div data-ev-id="ev_7e20bcaf7a" className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div data-ev-id="ev_f096004805">
                <h3 data-ev-id="ev_037f20e510" className="text-2xl font-bold text-white">{supplier.name}</h3>
                {bereichsleiterName &&
                <p data-ev-id="ev_9ba510b45e" className="text-sm text-white/80 flex items-center gap-2 mt-1">
                    <User className="w-4 h-4" />
                    Zuständig: {bereichsleiterName}
                  </p>
                }
              </div>
            </div>
            <button data-ev-id="ev_8e8d446092"
            onClick={onClose}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">

              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div data-ev-id="ev_519b9c7355" className="flex-1 overflow-y-auto p-6">
          <div data-ev-id="ev_a0851242b9" className="flex flex-col gap-6">
            
            {/* SECTION 1: Basisdaten */}
            <section data-ev-id="ev_5ab066f661">
              <div data-ev-id="ev_404ef56c26" className="flex items-center gap-2 mb-3">
                <div data-ev-id="ev_a91e98ac7e" className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Info className="w-4 h-4 text-slate-600" />
                </div>
                <h4 data-ev-id="ev_2101d0d39f" className="font-bold text-foreground">Basisdaten</h4>
              </div>
              <div data-ev-id="ev_0294263dc8" className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200 flex flex-col gap-3">
                {supplier.customer_number &&
                <div data-ev-id="ev_00105b5a4a">
                    <p data-ev-id="ev_fd535622ea" className="text-xs font-medium text-slate-600 mb-1">Kundennummer</p>
                    <p data-ev-id="ev_49dc0781e7" className="text-foreground font-medium">{supplier.customer_number}</p>
                  </div>
                }
                {supplier.offered_articles ?
                <div data-ev-id="ev_00105b5a4a">
                    <p data-ev-id="ev_fd535622ea" className="text-xs font-medium text-slate-600 mb-1">Sortiment & Angebotene Artikel</p>
                    <p data-ev-id="ev_49dc0781e7" className="text-foreground leading-relaxed">{supplier.offered_articles}</p>
                  </div> :
                !supplier.customer_number &&
                <p data-ev-id="ev_c8f442e7fe" className="text-muted-foreground text-sm italic">Keine Artikelbeschreibung hinterlegt</p>
                }
              </div>
            </section>

            {/* SECTION 2: Kontakt & Website */}
            {(supplier.link || supplier.order_email || supplier.order_phone) &&
            <section data-ev-id="ev_ef155b5f62">
                <div data-ev-id="ev_5b2d7ff528" className="flex items-center gap-2 mb-3">
                  <div data-ev-id="ev_ad5d48fbde" className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-green-600" />
                  </div>
                  <h4 data-ev-id="ev_ccbd218f77" className="font-bold text-foreground">Kontakt & Website</h4>
                </div>
                <div data-ev-id="ev_fd54ebe3d0" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {supplier.link &&
                <a data-ev-id="ev_9659d12e3b"
                href={supplier.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 transition-colors group">

                      <div data-ev-id="ev_0e7371910b" className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <ExternalLink className="w-5 h-5 text-green-600" />
                      </div>
                      <div data-ev-id="ev_a20c6c5051">
                        <p data-ev-id="ev_7715404b0f" className="font-semibold text-green-700">Website öffnen</p>
                        <p data-ev-id="ev_31eb29c4f0" className="text-xs text-green-600 truncate max-w-[180px]">{supplier.link}</p>
                      </div>
                    </a>
                }
                  {supplier.order_email &&
                <a data-ev-id="ev_0ba310013a"
                href={`mailto:${supplier.order_email}`}
                className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors group">

                      <div data-ev-id="ev_00b4a801f1" className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                        <Mail className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div data-ev-id="ev_3843131787">
                        <p data-ev-id="ev_45d3e5db5e" className="font-semibold text-emerald-700">E-Mail senden</p>
                        <p data-ev-id="ev_af95cd4a0a" className="text-xs text-emerald-600 truncate max-w-[180px]">{supplier.order_email}</p>
                      </div>
                    </a>
                }
                  {supplier.order_phone &&
                <a data-ev-id="ev_d4ecc6119e"
                href={`tel:${supplier.order_phone}`}
                className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors group">

                      <div data-ev-id="ev_e4df85b05a" className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div data-ev-id="ev_883abef1f4">
                        <p data-ev-id="ev_6f7da49475" className="font-semibold text-blue-700">Anrufen</p>
                        <p data-ev-id="ev_0487a12d2b" className="text-xs text-blue-600 truncate max-w-[180px]">{supplier.order_phone}</p>
                      </div>
                    </a>
                }
                </div>
              </section>
            }

            {/* SECTION 3: Zugangsdaten */}
            {hasLoginData &&
            <section data-ev-id="ev_14a01235c0">
                <div data-ev-id="ev_1d322a02e3" className="flex items-center gap-2 mb-3">
                  <div data-ev-id="ev_3603740928" className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                    <Key className="w-4 h-4 text-slate-600" />
                  </div>
                  <h4 data-ev-id="ev_f4b0d4016a" className="font-bold text-foreground">Zugangsdaten</h4>
                </div>
                <div data-ev-id="ev_fe65386cbe" className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                  <div data-ev-id="ev_5e69a464b0" className="flex flex-col gap-3">
                    {supplier.username &&
                  <div data-ev-id="ev_130a493443" className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-sm">
                        <div data-ev-id="ev_11fbf5a39b" className="flex items-center gap-3">
                          <div data-ev-id="ev_537cbc0940" className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-600" />
                          </div>
                          <div data-ev-id="ev_f4e2d59c70">
                            <p data-ev-id="ev_f0bf53a0c5" className="text-xs text-muted-foreground">Benutzername</p>
                            <code data-ev-id="ev_8b18c0da70" className="text-sm font-semibold text-foreground">
                              {supplier.username}
                            </code>
                          </div>
                        </div>
                        <button data-ev-id="ev_dc96924b04"
                    onClick={() => copyToClipboard(supplier.username!, 'username')}
                    className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Kopieren">

                          {copiedField === 'username' ?
                      <Check className="w-5 h-5 text-green-600" /> :

                      <Copy className="w-5 h-5 text-muted-foreground" />
                      }
                        </button>
                      </div>
                  }
                    {supplier.password &&
                  <div data-ev-id="ev_50f1064b6e" className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-sm">
                        <div data-ev-id="ev_8e2b220a55" className="flex items-center gap-3">
                          <div data-ev-id="ev_d3de183037" className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                            <Lock className="w-5 h-5 text-slate-600" />
                          </div>
                          <div data-ev-id="ev_cd755c7aba">
                            <p data-ev-id="ev_4d56e70c8b" className="text-xs text-muted-foreground">Passwort</p>
                            <code data-ev-id="ev_d30f225a0e" className="text-sm font-semibold text-foreground">
                              {showPassword ? supplier.password : '••••••••••'}
                            </code>
                          </div>
                        </div>
                        <div data-ev-id="ev_cc7ba3fe39" className="flex items-center gap-1">
                          <button data-ev-id="ev_76cf7106da"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
                      title={showPassword ? 'Verbergen' : 'Anzeigen'}>

                            {showPassword ?
                        <EyeOff className="w-5 h-5 text-muted-foreground" /> :

                        <Eye className="w-5 h-5 text-muted-foreground" />
                        }
                          </button>
                          <button data-ev-id="ev_a985fbc8ba"
                      onClick={() => copyToClipboard(supplier.password!, 'password')}
                      className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
                      title="Kopieren">

                            {copiedField === 'password' ?
                        <Check className="w-5 h-5 text-green-600" /> :

                        <Copy className="w-5 h-5 text-muted-foreground" />
                        }
                          </button>
                        </div>
                      </div>
                  }
                  </div>
                </div>
              </section>
            }

            {/* SECTION 4: Bestellvorgang */}
            {hasOrderMethods &&
            <section data-ev-id="ev_afaaba4ada">
                <div data-ev-id="ev_68eb56b62f" className="flex items-center gap-2 mb-3">
                  <div data-ev-id="ev_35a173bf6e" className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-purple-600" />
                  </div>
                  <h4 data-ev-id="ev_0638df0e27" className="font-bold text-foreground">Bestellvorgang</h4>
                </div>
                <div data-ev-id="ev_ac1af48468" className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
                  <p data-ev-id="ev_dc34ce975c" className="text-xs text-purple-600 font-medium mb-3">So kann bei diesem Lieferanten bestellt werden:</p>
                  <div data-ev-id="ev_0f6de26118" className="flex flex-wrap gap-2">
                    {(supplier.order_methods ?? []).map((method) => {
                    const option = ORDER_METHOD_OPTIONS.find((o) => o.id === method);
                    if (!option) return null;
                    const Icon = option.icon;
                    return (
                      <span data-ev-id="ev_c83e996b95"
                      key={method}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-700 rounded-xl text-sm font-semibold border border-purple-200 shadow-sm">

                          <Icon className="w-4 h-4" />
                          {option.label}
                        </span>);

                  })}
                  </div>
                </div>
              </section>
            }

            {/* SECTION 5: Kontaktpersonen */}
            <SupplierContactsSection
              contacts={contacts}
              loading={contactsLoading}
              onAdd={createContact}
              onUpdate={updateContact}
              onDelete={deleteContact} />


            {/* SECTION 6: Bestellbedingungen */}
            {hasOrderConditions &&
            <section data-ev-id="ev_7225bac68a">
                <div data-ev-id="ev_36fbab42a0" className="flex items-center gap-2 mb-3">
                  <div data-ev-id="ev_13d125f815" className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                  </div>
                  <h4 data-ev-id="ev_5eeaedc6e8" className="font-bold text-foreground">Bestellbedingungen</h4>
                </div>
                <div data-ev-id="ev_81c5f77b43" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {supplier.minimum_order_value != null && supplier.minimum_order_value > 0 &&
                <div data-ev-id="ev_f9199b84a9" className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                      <div data-ev-id="ev_f8389938ff" className="flex items-center gap-3">
                        <div data-ev-id="ev_8f23b661f7" className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                          <Euro className="w-6 h-6 text-amber-600" />
                        </div>
                        <div data-ev-id="ev_88baaf3483">
                          <p data-ev-id="ev_75e833bad2" className="text-xs font-medium text-amber-600">Mindestbestellwert</p>
                          <p data-ev-id="ev_d0f1e40759" className="text-2xl font-bold text-amber-900">
                            {supplier.minimum_order_value.toFixed(2)} €
                          </p>
                        </div>
                      </div>
                    </div>
                }
                  {(supplier.order_days ?? []).length > 0 &&
                <div data-ev-id="ev_1abf36aad1" className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200">
                      <div data-ev-id="ev_7453ece920" className="flex items-center gap-3 mb-3">
                        <div data-ev-id="ev_f7a24f268d" className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-violet-600" />
                        </div>
                        <div data-ev-id="ev_1171e83543">
                          <p data-ev-id="ev_c5e344d133" className="text-xs font-medium text-violet-600">Bestelltage</p>
                          <p data-ev-id="ev_05656fce84" className="text-sm text-violet-700">An diesen Tagen möglich</p>
                        </div>
                      </div>
                      <div data-ev-id="ev_4a2a650d5e" className="flex flex-wrap gap-1.5">
                        {(supplier.order_days ?? []).map((dayId) => {
                      const day = ORDER_DAY_OPTIONS.find((d) => d.id === dayId);
                      return day ?
                      <span data-ev-id="ev_09f6d5e8e0"
                      key={dayId}
                      className="w-10 h-10 flex items-center justify-center bg-violet-200 text-violet-800 rounded-lg text-sm font-bold">

                              {day.label.slice(0, 2)}
                            </span> :
                      null;
                    })}
                      </div>
                    </div>
                }
                  {supplier.discount_percent != null &&
                <div data-ev-id="ev_7536098fdc" className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                      <div data-ev-id="ev_826ecfa529" className="flex items-center gap-3">
                        <div data-ev-id="ev_c146b948a2" className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <Percent className="w-6 h-6 text-green-600" />
                        </div>
                        <div data-ev-id="ev_a1e06ac3b3">
                          <p data-ev-id="ev_893395e36b" className="text-xs font-medium text-green-600">Rabatt</p>
                          <p data-ev-id="ev_2b8fe782ba" className="text-2xl font-bold text-green-900">
                            {supplier.discount_percent}%
                          </p>
                        </div>
                      </div>
                    </div>
                }
                  {supplier.payment_terms &&
                <div data-ev-id="ev_e15e43b684" className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <div data-ev-id="ev_d079591f12" className="flex items-center gap-3">
                        <div data-ev-id="ev_f97b6e5b0b" className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                        <div data-ev-id="ev_b28bdd469f">
                          <p data-ev-id="ev_26b3c5a47f" className="text-xs font-medium text-blue-600">Zahlungsbedingungen</p>
                          <p data-ev-id="ev_08ba1decee" className="text-sm font-medium text-blue-900">
                            {supplier.payment_terms}
                          </p>
                        </div>
                      </div>
                    </div>
                }
                </div>
                {supplier.special_conditions &&
              <div data-ev-id="ev_cdc231f286" className="mt-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                    <div data-ev-id="ev_97a2701b90" className="flex items-start gap-3">
                      <div data-ev-id="ev_a03ca80377" className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-slate-600" />
                      </div>
                      <div data-ev-id="ev_bed69d35d6">
                        <p data-ev-id="ev_97f6449e47" className="text-xs font-medium text-slate-600 mb-1">Sonderkonditionen</p>
                        <p data-ev-id="ev_3155f78311" className="text-sm text-slate-700 whitespace-pre-wrap">
                          {supplier.special_conditions}
                        </p>
                      </div>
                    </div>
                  </div>
              }
              </section>
            }

            {/* SECTION: Dokumente */}
            <section data-ev-id="ev_ff12842474">
              <SupplierDocumentsSection supplierId={supplier.id} />
            </section>
          </div>
        </div>

        {/* Footer */}
        <div data-ev-id="ev_88572a4bae" className="p-5 border-t border-border bg-gradient-to-r from-slate-50 to-slate-100">
          <button data-ev-id="ev_fe60e0d1c9"
          onClick={onClose}
          className="w-full px-6 py-3.5 bg-foreground text-background rounded-xl font-semibold hover:bg-foreground/90 transition-colors shadow-lg">

            Schließen
          </button>
        </div>
      </div>
    </div>);

}