import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSettings } from '@/hooks/useSettings';
import { useProfiles } from '@/hooks/useProfiles';
import { useFunctions } from '@/hooks/useFunctions';
import { Layout } from '@/components/Layout';
import { FileUpload, UploadedFile } from '@/components/FileUpload';
import { SupplierSelect } from '@/components/SupplierSelect';
import {
  ArrowLeft,
  ShoppingCart,
  FileText,
  Paperclip,
  Shield,
  Send,
  FileEdit,
  AlertTriangle,
  Vote,
  User,
  Calendar,
  Euro,
  Users,
  ChevronRight } from
'lucide-react';

export default function NewOrder() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { createOrder } = useOrders();
  const { suppliers } = useSuppliers();
  const { freigabebetragKdt, freigabebetragKommandomitglied } = useSettings();
  const { profiles } = useProfiles();
  const { functions } = useFunctions();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [bereichsleiterId, setBereichsleiterId] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Hilfsunktion: Prüft ob ein Bereichsleiter gültig ist
  const isValidBereichsleiter = (blId: string | null | undefined): boolean => {
    if (!blId) return false;
    return profiles.some(
      (p) => p.id === blId && (p.role === 'bereichsleiter' || p.role === 'kommandant')
    );
  };

  // Bereichsleiter basierend auf Lieferant oder User-Standard auswählen
  useEffect(() => {
    if (profiles.length === 0) return;

    if (supplierId) {
      const selectedSupplier = suppliers.find((s) => s.id === supplierId);
      if (selectedSupplier?.assigned_bereichsleiter_id &&
      isValidBereichsleiter(selectedSupplier.assigned_bereichsleiter_id)) {
        setBereichsleiterId(selectedSupplier.assigned_bereichsleiter_id);
        return;
      }
    }

    if (profile) {
      const currentUserProfile = profiles.find((p) => p.id === profile.id);
      if (currentUserProfile?.default_bereichsleiter_id &&
      isValidBereichsleiter(currentUserProfile.default_bereichsleiter_id)) {
        setBereichsleiterId(currentUserProfile.default_bereichsleiter_id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isValidBereichsleiter ist stabil
  }, [supplierId, suppliers, profile, profiles]);

  const parsedAmount = parseFloat(amount) || 0;
  const requiresKommandant = parsedAmount >= freigabebetragKdt;
  const requiresKommandomitglied = parsedAmount >= freigabebetragKommandomitglied;

  const bereichsleiter = profiles.filter((p) => p.role === 'bereichsleiter' || p.role === 'kommandant');

  function getFunctionsLabel(profileFunctions: string[] | null): string {
    if (!profileFunctions || profileFunctions.length === 0) return '';
    const labels = profileFunctions.
    map((funcName) => functions.find((f) => f.name === funcName)?.label).
    filter(Boolean);
    return labels.length > 0 ? ` (${labels.join(', ')})` : '';
  }

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSavingDraft(true);

    const { error } = await createOrder({
      title,
      description: description || undefined,
      amount: parsedAmount,
      supplier_id: supplierId || undefined,
      bereichsleiter_id: bereichsleiterId || undefined
    }, true, files.map((f) => f.file));

    if (error) {
      setError(error.message);
      setSavingDraft(false);
    } else {
      navigate('/');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!bereichsleiterId) {
      setError('Bitte wählen Sie einen Bereichsleiter aus.');
      return;
    }

    setError('');
    setSubmitting(true);

    const { error } = await createOrder({
      title,
      description: description || undefined,
      amount: parsedAmount,
      supplier_id: supplierId || undefined,
      bereichsleiter_id: bereichsleiterId
    }, false, files.map((f) => f.file));

    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      navigate('/');
    }
  }

  const today = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const canSubmit = title && amount && bereichsleiterId;
  const canSaveDraft = title && amount;

  return (
    <Layout>
      <div data-ev-id="ev_aecd30b5fa" className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button data-ev-id="ev_5073e6a44b"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors group">

          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Zurück
        </button>

        <form data-ev-id="ev_c0966cc89e" onSubmit={handleSubmit} onKeyDown={(e) => {
          // Verhindere unbeabsichtigtes Absenden durch Enter-Taste
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }} className="flex flex-col gap-4">
          {/* Header Card */}
          <div data-ev-id="ev_6bff56d3f6" className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-5 text-primary-foreground shadow-lg">
            <div data-ev-id="ev_40007eb536" className="flex items-center gap-4">
              <div data-ev-id="ev_c4203e39e3" className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div data-ev-id="ev_9a4371a213" className="flex-1">
                <h1 data-ev-id="ev_e1afd5a3cb" className="text-xl font-bold">Neue Bestellung</h1>
                <div data-ev-id="ev_ac6cf79ae3" className="flex items-center gap-4 mt-1 text-sm text-primary-foreground/80">
                  <span data-ev-id="ev_c0ffe98804" className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {profile?.full_name || profile?.email}
                  </span>
                  <span data-ev-id="ev_afee01d904" className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {today}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error &&
          <div data-ev-id="ev_08f4aa7c4e" className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          }

          {/* Bestelldetails Card */}
          <div data-ev-id="ev_4f5bda5362" className="bg-card rounded-xl border border-border">
            <div data-ev-id="ev_2b655dcaa6" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h2 data-ev-id="ev_0d681df94e" className="font-medium text-sm text-foreground">Bestelldetails</h2>
            </div>
            <div data-ev-id="ev_bd74b7a171" className="p-4 flex flex-col gap-4">
              {/* Titel */}
              <div data-ev-id="ev_a2b5b62293">
                <label data-ev-id="ev_d03b3a5341" className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Titel *
                </label>
                <input data-ev-id="ev_004649d4eb"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bezeichnung der Bestellung"
                className="w-full px-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                required />

              </div>

              {/* Lieferant */}
              <div data-ev-id="ev_5ef1c9e591">
                <label data-ev-id="ev_98ce4108dd" className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Lieferant
                </label>
                <SupplierSelect
                  suppliers={suppliers}
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder="Lieferant auswählen..." />

              </div>

              {/* Beschreibung */}
              <div data-ev-id="ev_0dad1a79a1">
                <label data-ev-id="ev_92a4a5aa1b" className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Beschreibung
                </label>
                <textarea data-ev-id="ev_a5ca2c6740"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Details zur Bestellung..."
                rows={2}
                className="w-full px-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none" />

              </div>
            </div>
          </div>

          {/* Anhänge Card */}
          <div data-ev-id="ev_6cf1f208ca" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_f8e510cd49" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
              <div data-ev-id="ev_8bbf334080" className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <h2 data-ev-id="ev_a83b43427e" className="font-medium text-sm text-foreground">Anhänge</h2>
              </div>
              {files.length > 0 &&
              <span data-ev-id="ev_d38a3e0ce5" className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {files.length} {files.length === 1 ? 'Datei' : 'Dateien'}
                </span>
              }
            </div>
            <div data-ev-id="ev_6f26c02966" className="p-4">
              <FileUpload
                files={files}
                onChange={setFiles}
                disabled={savingDraft || submitting} />

            </div>
          </div>

          {/* Freigabe Card */}
          <div data-ev-id="ev_02c48dc91f" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_13b96b2e57" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <h2 data-ev-id="ev_e7e36689c1" className="font-medium text-sm text-foreground">Freigabe</h2>
            </div>
            <div data-ev-id="ev_78a6cf3168" className="p-4 flex flex-col gap-4">
              {/* Bereichsleiter */}
              <div data-ev-id="ev_ef73c4f394">
                <label data-ev-id="ev_b09d48f32b" className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Bereichsleiter *
                </label>
                <div data-ev-id="ev_be57619228" className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select data-ev-id="ev_afa846bbf8"
                  value={bereichsleiterId}
                  onChange={(e) => setBereichsleiterId(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none transition-colors"
                  required>

                    <option data-ev-id="ev_c673b5bb91" value="">Bitte auswählen...</option>
                    {bereichsleiter.map((bl) =>
                    <option data-ev-id="ev_23b4e6aba8" key={bl.id} value={bl.id}>
                        {bl.full_name}{getFunctionsLabel(bl.functions)}
                      </option>
                    )}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none rotate-90" />
                </div>
              </div>

              {/* Betrag */}
              <div data-ev-id="ev_880da3793e">
                <label data-ev-id="ev_a57bc63067" className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Gesamtbetrag *
                </label>
                <div data-ev-id="ev_0874f1cf5f" className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input data-ev-id="ev_3be02761ba"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  required />

                </div>
              </div>

              {/* Freigabe-Hinweise */}
              {(requiresKommandant || requiresKommandomitglied) &&
              <div data-ev-id="ev_cde15b5da4" className="flex flex-col gap-2 pt-2">
                  {requiresKommandant &&
                <div data-ev-id="ev_ccc2d41dcc" className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs">
                      <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                      <span data-ev-id="ev_00da3347c4">Ab {freigabebetragKdt.toLocaleString('de-DE')} €: Kommandant-Freigabe erforderlich</span>
                    </div>
                }
                  {requiresKommandomitglied &&
                <div data-ev-id="ev_359472b010" className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 text-xs">
                      <Vote className="w-3.5 h-3.5 flex-shrink-0" />
                      <span data-ev-id="ev_797fd8e976">Ab {freigabebetragKommandomitglied.toLocaleString('de-DE')} €: Kommando-Abstimmung erforderlich</span>
                    </div>
                }
                </div>
              }
            </div>
          </div>

          {/* Action Buttons */}
          <div data-ev-id="ev_6bd8f7227b" className="flex flex-col sm:flex-row gap-3 pt-2">
            <button data-ev-id="ev_98b87817cd"
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || submitting || !canSaveDraft}
            className="flex-1 py-3 px-4 bg-muted text-foreground border border-border rounded-xl font-medium hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group">

              {savingDraft ?
              <span data-ev-id="ev_c3bfe418fa" className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> :

              <>
                  <FileEdit className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Als Entwurf speichern
                </>
              }
            </button>

            <button data-ev-id="ev_c54677fe6c"
            type="submit"
            disabled={submitting || savingDraft || !canSubmit}
            className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 group">

              {submitting ?
              <span data-ev-id="ev_499de1aac4" className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

              <>
                  <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  Einreichen
                </>
              }
            </button>
          </div>
        </form>
      </div>
    </Layout>);

}