import { useState } from 'react';
import { X, UserCheck, Calendar, Save, Check } from 'lucide-react';
import type { Profile } from '@/hooks/useProfiles';

interface SubstituteModalProps {
  profile: {
    id: string;
    substitute_id?: string | null;
    is_absent?: boolean;
    absent_until?: string | null;
    absence_reason?: string | null;
  };
  profiles: Profile[];
  onClose: () => void;
  onUpdateSubstitute: (substituteId: string | null) => Promise<void>;
  onSetAbsence: (data: {
    is_absent: boolean;
    absent_until?: string | null;
    absence_reason?: string | null;
  }) => Promise<void>;
}

export function SubstituteModal({
  profile,
  profiles,
  onClose,
  onUpdateSubstitute,
  onSetAbsence
}: SubstituteModalProps) {
  const [substituteId, setSubstituteId] = useState(profile.substitute_id || '');
  const [isAbsent, setIsAbsent] = useState(profile.is_absent || false);
  const [absentUntil, setAbsentUntil] = useState(
    profile.absent_until ? profile.absent_until.split('T')[0] : ''
  );
  const [absenceReason, setAbsenceReason] = useState(profile.absence_reason || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const availableSubstitutes = profiles.filter(
    (p) =>
    p.id !== profile.id && (
    p.role === 'bereichsleiter' || p.role === 'kommandant' || p.role === 'admin')
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update substitute
      await onUpdateSubstitute(substituteId || null);

      // Update absence
      await onSetAbsence({
        is_absent: isAbsent,
        absent_until: isAbsent && absentUntil ? new Date(absentUntil).toISOString() : null,
        absence_reason: isAbsent ? absenceReason || null : null
      });

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error saving substitute settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-ev-id="ev_61d8c636f1" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div data-ev-id="ev_5e44819e95" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
        {/* Header */}
        <div data-ev-id="ev_adcaba19d7" className="flex items-center justify-between mb-6">
          <div data-ev-id="ev_217b452dcc" className="flex items-center gap-3">
            <div data-ev-id="ev_48e090fe74" className="p-2 bg-purple-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div data-ev-id="ev_64812a6008">
              <h3 data-ev-id="ev_b6742bc6ce" className="text-lg font-semibold text-foreground">Meine Vertretung</h3>
              <p data-ev-id="ev_80a86f568c" className="text-xs text-muted-foreground">Abwesenheit & Stellvertretung</p>
            </div>
          </div>
          <button data-ev-id="ev_71f08c76b7"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Absence Toggle */}
        <div data-ev-id="ev_eb8fa18c15" className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mb-4">
          <div data-ev-id="ev_775256d4f2" className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-600" />
            <div data-ev-id="ev_0829490b7f">
              <span data-ev-id="ev_ff7857c0e1" className="text-sm font-medium text-foreground">
                {isAbsent ? 'Ich bin abwesend' : 'Ich bin anwesend'}
              </span>
              {isAbsent && absentUntil &&
              <p data-ev-id="ev_38176cc007" className="text-xs text-muted-foreground">
                  bis {new Date(absentUntil).toLocaleDateString('de-DE')}
                </p>
              }
            </div>
          </div>
          <button data-ev-id="ev_00d19f3994"
          onClick={() => setIsAbsent(!isAbsent)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
          isAbsent ? 'bg-purple-600' : 'bg-gray-300'}`
          }>
            <span data-ev-id="ev_f5cf9bf075"
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            isAbsent ? 'left-7' : 'left-1'}`
            } />

          </button>
        </div>

        {/* Absence Details (only show when absent) */}
        {isAbsent &&
        <div data-ev-id="ev_a8c60662c2" className="space-y-4 mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div data-ev-id="ev_75e1f40f91">
              <label data-ev-id="ev_1d22a8f72b" className="block text-sm font-medium text-purple-900 mb-1.5">
                Abwesend bis (optional)
              </label>
              <input data-ev-id="ev_b48aca6e07"
            type="date"
            value={absentUntil}
            onChange={(e) => setAbsentUntil(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />

            </div>
            <div data-ev-id="ev_5045662b46">
              <label data-ev-id="ev_d44d0e70ec" className="block text-sm font-medium text-purple-900 mb-1.5">
                Grund (optional)
              </label>
              <input data-ev-id="ev_bb35cf6fec"
            type="text"
            value={absenceReason}
            onChange={(e) => setAbsenceReason(e.target.value)}
            placeholder="z.B. Urlaub, Dienstreise..."
            className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />

            </div>
          </div>
        }

        {/* Substitute Selection */}
        <div data-ev-id="ev_2fc390125f" className="mb-6">
          <label data-ev-id="ev_83690a164e" className="block text-sm font-medium text-muted-foreground mb-2">
            Meine Vertretung
          </label>
          <select data-ev-id="ev_c232eba27f"
          value={substituteId}
          onChange={(e) => setSubstituteId(e.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
            <option data-ev-id="ev_8807b52c64" value="">Keine Vertretung ausgewählt</option>
            {availableSubstitutes.map((p) =>
            <option data-ev-id="ev_c696fab6d8" key={p.id} value={p.id}>
                {p.full_name} ({p.role === 'bereichsleiter' ? 'BL' : p.role === 'kommandant' ? 'KDT' : 'Admin'})
              </option>
            )}
          </select>
          <p data-ev-id="ev_ee92b12f77" className="text-xs text-muted-foreground mt-2">
            Bei Abwesenheit werden Genehmigungsanfragen an Ihre Vertretung weitergeleitet.
          </p>
        </div>

        {/* Actions */}
        <div data-ev-id="ev_7630502825" className="flex gap-3">
          <button data-ev-id="ev_fb0bd088be"
          onClick={onClose}
          className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">
            Abbrechen
          </button>
          <button data-ev-id="ev_4c96a12b08"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">
            {saved ?
            <>
                <Check className="w-4 h-4" />
                Gespeichert
              </> :
            saving ?
            'Speichern...' :

            <>
                <Save className="w-4 h-4" />
                Speichern
              </>
            }
          </button>
        </div>
      </div>
    </div>);

}