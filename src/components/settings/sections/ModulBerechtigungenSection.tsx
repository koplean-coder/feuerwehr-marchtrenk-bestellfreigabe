import { useState } from 'react';
import { Shield, Check, X, Info, Loader2, Vote, Eye, LayoutGrid, Plus, Edit2, Trash2, Save, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { SectionHeader } from '../SettingsContent';
import { useModulePermissions, MODULE_DEFINITIONS, type ModulePermission } from '@/hooks/useModulePermissions';
import { useSettings } from '@/hooks/useSettings';

const AVAILABLE_ROLES = [
{ id: 'admin', label: 'Admin' },
{ id: 'kommandant', label: 'Kommandant' },
{ id: 'bereichsleiter', label: 'Bereichsleiter' },
{ id: 'schriftfuehrer', label: 'Schriftführer' },
{ id: 'kassier', label: 'Kassier' },
{ id: 'kommandomitglied', label: 'Kommandomitglied' },
{ id: 'erweitertes_kommando', label: 'Erweitertes Kommando' },
{ id: 'nutzer', label: 'Nutzer' }];


const AVAILABLE_CARDS = [
{ id: 'gesamt', label: 'Gesamt' },
{ id: 'gueltig', label: 'Gültig' },
{ id: 'abgelehnt', label: 'Abgelehnt' },
{ id: 'in_abstimmung', label: 'In Abstimmung' },
{ id: 'ausstehend', label: 'Ausstehend' },
{ id: 'finanzvolumen', label: 'Finanzvolumen' },
{ id: 'aufgehoben', label: 'Aufgehoben' },
{ id: 'abgelaufen', label: 'Abgelaufen' },
{ id: 'bald_ablaufend', label: 'Bald ablaufend' }];


export function ModulBerechtigungenSection() {
  const { permissions, loading, updatePermission } = useModulePermissions();
  const {
    sitzungenViewRoles,
    updateSitzungenViewRoles,
    sitzungenAbklaerungFarbe,
    updateSitzungenAbklaerungFarbe,
    beschlussRegisterViewRoles,
    beschlussRegisterCardsByRole,
    beschlussExpiryReminderDays,
    decisionTextTemplates,
    updateBeschlussRegisterViewRoles,
    updateBeschlussRegisterCardsByRole,
    updateBeschlussExpiryReminderDays,
    updateDecisionTextTemplates
  } = useSettings();

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savingSitzungen, setSavingSitzungen] = useState(false);
  const [sitzungenExpanded, setSitzungenExpanded] = useState(true);
  const [savingBeschluss, setSavingBeschluss] = useState(false);
  const [beschlussExpanded, setBeschlussExpanded] = useState(true);
  const [expandedRoles, setExpandedRoles] = useState<string[]>([]);

  // Beschlussvorlagen State
  const [newTemplate, setNewTemplate] = useState('');
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null);
  const [editTemplateText, setEditTemplateText] = useState('');

  const toggleRoleExpanded = (roleId: string) => {
    setExpandedRoles((prev) =>
    prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleCardToggle = async (roleId: string, cardId: string) => {
    setSavingBeschluss(true);
    const currentCards = beschlussRegisterCardsByRole[roleId] || [];
    const isSelected = currentCards.includes(cardId);
    const newCards = isSelected ?
    currentCards.filter((c) => c !== cardId) :
    [...currentCards, cardId];

    await updateBeschlussRegisterCardsByRole({
      ...beschlussRegisterCardsByRole,
      [roleId]: newCards
    });
    setSavingBeschluss(false);
  };

  const getPermissionValue = (moduleKey: string): boolean => {
    const permission = permissions.find((p) => p.module_key === moduleKey);
    return permission?.has_access ?? false;
  };

  const handleToggle = async (moduleKey: string, currentValue: boolean) => {
    setSaving((prev) => ({ ...prev, [moduleKey]: true }));
    await updatePermission(moduleKey, !currentValue);
    setSaving((prev) => ({ ...prev, [moduleKey]: false }));
  };

  if (loading) {
    return (
      <div data-ev-id="ev_2ba9493d6a" className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>);

  }

  return (
    <div data-ev-id="ev_2fbc541715">
      <SectionHeader
        icon={Shield}
        title="Modul-Berechtigungen"
        description="Legen Sie fest, welche Module für die Rolle 'Nutzer' (selbstregistrierte Mitglieder) zugänglich sind." />


      {/* Info Box */}
      <div data-ev-id="ev_cd4757bfb1" className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div data-ev-id="ev_678e5023ae" className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div data-ev-id="ev_52c65d522c">
            <p data-ev-id="ev_0542d04ffc" className="text-sm text-blue-800 font-medium">Hinweis</p>
            <p data-ev-id="ev_fd52d9b4ae" className="text-xs text-blue-700 mt-1">
              Diese Matrix gilt nur für Benutzer mit der Rolle <strong data-ev-id="ev_4477b1c42a">Nutzer</strong> (selbstregistrierte Mitglieder).
              Admin, Kommandant und Bereichsleiter haben automatisch Zugriff auf alle Module.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Module */}
      <div data-ev-id="ev_e18bd9197c" className="bg-card border border-border rounded-lg overflow-hidden mb-4">
        <div data-ev-id="ev_32c5fd8c00" className="p-4 bg-muted/30 border-b border-border">
          <h3 data-ev-id="ev_77440ee804" className="font-semibold text-foreground">Navigation</h3>
          <p data-ev-id="ev_8b4f66f2c1" className="text-xs text-muted-foreground mt-1">Hauptmenü-Einträge</p>
        </div>
        <div data-ev-id="ev_1b232433a3" className="divide-y divide-border">
          {MODULE_DEFINITIONS.navigation.map((module) => {
            const hasAccess = getPermissionValue(module.key);
            const isSaving = saving[module.key];

            return (
              <div data-ev-id="ev_fb05ff0d77" key={module.key} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                <div data-ev-id="ev_2718399cc2">
                  <p data-ev-id="ev_7bbfe36912" className="font-medium text-foreground">{module.label}</p>
                  <p data-ev-id="ev_4bada22127" className="text-xs text-muted-foreground">{module.description}</p>
                </div>
                <button data-ev-id="ev_4c5024f902"
                onClick={() => handleToggle(module.key, hasAccess)}
                disabled={isSaving}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                hasAccess ? 'bg-green-500' : 'bg-gray-300'} ${
                isSaving ? 'opacity-50' : ''}`}>

                  <span data-ev-id="ev_49c57829d7"
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 flex items-center justify-center ${
                  hasAccess ? 'translate-x-6' : 'translate-x-0.5'}`
                  }>

                    {isSaving ?
                    <Loader2 className="w-3 h-3 animate-spin text-gray-400" /> :
                    hasAccess ?
                    <Check className="w-3 h-3 text-green-500" /> :

                    <X className="w-3 h-3 text-gray-400" />
                    }
                  </span>
                </button>
              </div>);

          })}
        </div>
      </div>

      {/* Formulare Sub-Modules */}
      <div data-ev-id="ev_0abd215bdf" className="bg-card border border-border rounded-lg overflow-hidden">
        <div data-ev-id="ev_25c942de97" className="p-4 bg-muted/30 border-b border-border">
          <h3 data-ev-id="ev_54c8e7b8a1" className="font-semibold text-foreground">Formulare (Untermodule)</h3>
          <p data-ev-id="ev_eb162025fa" className="text-xs text-muted-foreground mt-1">Module innerhalb der Formulare-Seite</p>
        </div>
        <div data-ev-id="ev_5bfa8b2e4e" className="divide-y divide-border">
          {MODULE_DEFINITIONS.formulare.map((module) => {
            const hasAccess = getPermissionValue(module.key);
            const isSaving = saving[module.key];

            return (
              <div data-ev-id="ev_a55a0f3efb" key={module.key} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                <div data-ev-id="ev_8ee25bc864">
                  <p data-ev-id="ev_264f629226" className="font-medium text-foreground">{module.label}</p>
                  <p data-ev-id="ev_b3c6297079" className="text-xs text-muted-foreground">{module.description}</p>
                </div>
                <button data-ev-id="ev_9b8a8b7e76"
                onClick={() => handleToggle(module.key, hasAccess)}
                disabled={isSaving}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                hasAccess ? 'bg-green-500' : 'bg-gray-300'} ${
                isSaving ? 'opacity-50' : ''}`}>

                  <span data-ev-id="ev_aa0fc865fa"
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 flex items-center justify-center ${
                  hasAccess ? 'translate-x-6' : 'translate-x-0.5'}`
                  }>

                    {isSaving ?
                    <Loader2 className="w-3 h-3 animate-spin text-gray-400" /> :
                    hasAccess ?
                    <Check className="w-3 h-3 text-green-500" /> :

                    <X className="w-3 h-3 text-gray-400" />
                    }
                  </span>
                </button>
              </div>);

          })}
        </div>
      </div>

      {/* Sitzungen Einstellungen */}
      <div data-ev-id="ev_sitzungen_section" className="mt-6">
        <button
          data-ev-id="ev_sitzungen_toggle"
          onClick={() => setSitzungenExpanded(!sitzungenExpanded)}
          className="w-full flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
          <div data-ev-id="ev_sitzungen_header" className="flex items-center gap-3">
            <Users className="w-5 h-5 text-emerald-600" />
            <div data-ev-id="ev_sitzungen_title" className="text-left">
              <p data-ev-id="ev_sitzungen_label" className="font-semibold text-emerald-900">Sitzungen</p>
              <p data-ev-id="ev_sitzungen_desc" className="text-xs text-emerald-600">Zugriff auf Kommando- und Erweiterte Sitzungen</p>
            </div>
          </div>
          {sitzungenExpanded ? <ChevronUp className="w-5 h-5 text-emerald-600" /> : <ChevronDown className="w-5 h-5 text-emerald-600" />}
        </button>

        {sitzungenExpanded &&
        <div data-ev-id="ev_sitzungen_content" className="mt-4 space-y-4">
            {/* Sitzungen-Zugriff */}
            <div data-ev-id="ev_sitzungen_access" className="bg-card border border-border rounded-lg overflow-hidden">
              <div data-ev-id="ev_sitzungen_access_header" className="p-4 bg-muted/30 border-b border-border flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <div data-ev-id="ev_sitzungen_access_info">
                  <h4 data-ev-id="ev_sitzungen_access_title" className="font-semibold text-foreground">Sitzungen-Zugriff</h4>
                  <p data-ev-id="ev_sitzungen_access_desc" className="text-xs text-muted-foreground">Welche Rollen die Sitzungen sehen dürfen</p>
                </div>
              </div>
              <div data-ev-id="ev_sitzungen_access_grid" className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {AVAILABLE_ROLES.map((role) => {
                const isSelected = sitzungenViewRoles.includes(role.id);
                return (
                  <button
                    key={role.id}
                    data-ev-id={`ev_sitzungen_role_${role.id}`}
                    onClick={async () => {
                      setSavingSitzungen(true);
                      const newRoles = isSelected ?
                      sitzungenViewRoles.filter((r) => r !== role.id) :
                      [...sitzungenViewRoles, role.id];
                      await updateSitzungenViewRoles(newRoles);
                      setSavingSitzungen(false);
                    }}
                    disabled={savingSitzungen}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSelected ?
                    'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' :
                    'bg-muted text-muted-foreground border-2 border-transparent hover:bg-muted/80'}`
                    }>
                      {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                      {role.label}
                    </button>);

              })}
              </div>
            </div>

            {/* Abklärungs-Farbe (Textmarker) */}
            <div data-ev-id="ev_41834f3a0c" className="bg-card border border-border rounded-lg overflow-hidden">
              <div data-ev-id="ev_874c6d92f4" className="p-4 bg-muted/30 border-b border-border flex items-center gap-2">
                <div data-ev-id="ev_bf8b5ed91f" className="w-4 h-4 rounded-full bg-gradient-to-r from-sky-300 to-sky-500" />
                <div data-ev-id="ev_26fd254d18">
                  <h4 data-ev-id="ev_cdb5b9eb0a" className="font-semibold text-foreground">Abklärungs-Farbe (Ampel)</h4>
                  <p data-ev-id="ev_a274be12a4" className="text-xs text-muted-foreground">Textmarker-Farbe für Punkte die noch abgeklärt werden müssen</p>
                </div>
              </div>
              <div data-ev-id="ev_70f9184174" className="p-4 flex flex-wrap gap-3">
                {[
              { id: 'sky', label: 'Hellblau', gradient: 'from-sky-300 to-sky-500', bg: 'bg-sky-100' },
              { id: 'blue', label: 'Blau', gradient: 'from-blue-300 to-blue-500', bg: 'bg-blue-100' },
              { id: 'violet', label: 'Violett', gradient: 'from-violet-300 to-violet-500', bg: 'bg-violet-100' },
              { id: 'purple', label: 'Lila', gradient: 'from-purple-300 to-purple-500', bg: 'bg-purple-100' },
              { id: 'pink', label: 'Pink', gradient: 'from-pink-300 to-pink-500', bg: 'bg-pink-100' }].
              map((farbe) =>
              <button data-ev-id="ev_a8d1c1a444"
              key={farbe.id}
              onClick={async () => {
                await updateSitzungenAbklaerungFarbe(farbe.id);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
              sitzungenAbklaerungFarbe === farbe.id ?
              'border-primary bg-primary/5' :
              'border-transparent bg-muted hover:bg-muted/80'}`
              }>

                    <div data-ev-id="ev_6e6c909ed4" className={`w-5 h-5 rounded-full bg-gradient-to-br ${farbe.gradient}`} />
                    <span data-ev-id="ev_d63432c262" className="text-sm font-medium">{farbe.label}</span>
                    {sitzungenAbklaerungFarbe === farbe.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
              )}
              </div>
              <div data-ev-id="ev_4cf50eede3" className="px-4 pb-4">
                <p data-ev-id="ev_8564260101" className="text-xs text-muted-foreground">Vorschau:</p>
                <p data-ev-id="ev_c8b2391fca" className={`mt-1 text-sm ${sitzungenAbklaerungFarbe === 'sky' ? 'bg-gradient-to-r from-sky-100 to-sky-200' :
              sitzungenAbklaerungFarbe === 'blue' ? 'bg-gradient-to-r from-blue-100 to-blue-200' :
              sitzungenAbklaerungFarbe === 'violet' ? 'bg-gradient-to-r from-violet-100 to-violet-200' :
              sitzungenAbklaerungFarbe === 'purple' ? 'bg-gradient-to-r from-purple-100 to-purple-200' :
              'bg-gradient-to-r from-pink-100 to-pink-200'} px-2 py-1 rounded inline-block`}>
                  Beispieltext mit Textmarker-Effekt
                </p>
              </div>
            </div>
          </div>
        }
      </div>

      {/* Beschluss-Register Einstellungen */}
      <div data-ev-id="ev_beschluss_section" className="mt-6">
        <button
          data-ev-id="ev_beschluss_toggle"
          onClick={() => setBeschlussExpanded(!beschlussExpanded)}
          className="w-full flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
          <div data-ev-id="ev_beschluss_header" className="flex items-center gap-3">
            <Vote className="w-5 h-5 text-indigo-600" />
            <div data-ev-id="ev_beschluss_title" className="text-left">
              <p data-ev-id="ev_beschluss_label" className="font-semibold text-indigo-900">Beschluss-Register</p>
              <p data-ev-id="ev_beschluss_desc" className="text-xs text-indigo-600">Zugriff, Sichtbarkeit und Textvorlagen</p>
            </div>
          </div>
          {beschlussExpanded ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-indigo-600" />}
        </button>

        {beschlussExpanded &&
        <div data-ev-id="ev_beschluss_content" className="mt-4 space-y-4">
            {/* Register-Zugriff */}
            <div data-ev-id="ev_register_access" className="bg-card border border-border rounded-lg overflow-hidden">
              <div data-ev-id="ev_access_header" className="p-4 bg-muted/30 border-b border-border flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <div data-ev-id="ev_59d393a050">
                  <h4 data-ev-id="ev_access_title" className="font-semibold text-foreground">Register-Zugriff</h4>
                  <p data-ev-id="ev_access_desc" className="text-xs text-muted-foreground">Welche Rollen das Beschluss-Register sehen dürfen</p>
                </div>
              </div>
              <div data-ev-id="ev_access_grid" className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {AVAILABLE_ROLES.map((role) => {
                const isSelected = beschlussRegisterViewRoles.includes(role.id);
                return (
                  <button
                    key={role.id}
                    data-ev-id={`ev_role_${role.id}`}
                    onClick={async () => {
                      setSavingBeschluss(true);
                      const newRoles = isSelected ?
                      beschlussRegisterViewRoles.filter((r) => r !== role.id) :
                      [...beschlussRegisterViewRoles, role.id];
                      await updateBeschlussRegisterViewRoles(newRoles);
                      setSavingBeschluss(false);
                    }}
                    disabled={savingBeschluss}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSelected ?
                    'bg-indigo-100 text-indigo-700 border-2 border-indigo-300' :
                    'bg-muted text-muted-foreground border-2 border-transparent hover:bg-muted/80'}`
                    }>
                      {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                      {role.label}
                    </button>);

              })}
              </div>
            </div>

            {/* Sichtbare Cards pro Rolle */}
            <div data-ev-id="ev_cards_by_role" className="bg-card border border-border rounded-lg overflow-hidden">
              <div data-ev-id="ev_cards_header" className="p-4 bg-muted/30 border-b border-border flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                <div data-ev-id="ev_cards_title_wrap">
                  <h4 data-ev-id="ev_cards_title" className="font-semibold text-foreground">Statistik-Cards pro Rolle</h4>
                  <p data-ev-id="ev_cards_desc" className="text-xs text-muted-foreground">Legen Sie fest, welche Cards jede Rolle im Register sieht</p>
                </div>
              </div>
              <div data-ev-id="ev_roles_list" className="divide-y divide-border">
                {AVAILABLE_ROLES.map((role) => {
                const roleCards = beschlussRegisterCardsByRole[role.id] || [];
                const isExpanded = expandedRoles.includes(role.id);
                const cardCount = roleCards.length;

                return (
                  <div key={role.id} data-ev-id={`ev_role_cards_${role.id}`}>
                      <button
                      data-ev-id={`ev_role_toggle_${role.id}`}
                      onClick={() => toggleRoleExpanded(role.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                        <div data-ev-id={`ev_role_info_${role.id}`} className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span data-ev-id={`ev_role_label_${role.id}`} className="font-medium text-foreground">{role.label}</span>
                        </div>
                        <div data-ev-id={`ev_role_meta_${role.id}`} className="flex items-center gap-2">
                          <span data-ev-id={`ev_role_count_${role.id}`} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {cardCount} von {AVAILABLE_CARDS.length} Cards
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>
                      
                      {isExpanded &&
                    <div data-ev-id={`ev_role_cards_grid_${role.id}`} className="p-3 pt-0 bg-muted/10">
                          <div data-ev-id={`ev_cards_grid_${role.id}`} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {AVAILABLE_CARDS.map((card) => {
                          const isSelected = roleCards.includes(card.id);
                          return (
                            <button
                              key={card.id}
                              data-ev-id={`ev_card_${role.id}_${card.id}`}
                              onClick={() => handleCardToggle(role.id, card.id)}
                              disabled={savingBeschluss}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isSelected ?
                              'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' :
                              'bg-card text-muted-foreground border-2 border-transparent hover:bg-muted/50'}`
                              }>
                                  {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                  {card.label}
                                </button>);

                        })}
                          </div>
                        </div>
                    }
                    </div>);

              })}
              </div>
            </div>

            {/* Textvorlagen */}
            <div data-ev-id="ev_templates_section" className="bg-card border border-border rounded-lg overflow-hidden">
              <div data-ev-id="ev_templates_header" className="p-4 bg-muted/30 border-b border-border flex items-center gap-2">
                <Vote className="w-4 h-4 text-muted-foreground" />
                <div data-ev-id="ev_7e27518e55">
                  <h4 data-ev-id="ev_templates_title" className="font-semibold text-foreground">Beschluss-Textvorlagen</h4>
                  <p data-ev-id="ev_templates_desc" className="text-xs text-muted-foreground">Schnellauswahl für neue Sitzungsbeschlüsse</p>
                </div>
              </div>
              <div data-ev-id="ev_templates_list" className="divide-y divide-border">
                {decisionTextTemplates.length === 0 ?
              <div data-ev-id="ev_no_templates" className="p-6 text-center text-muted-foreground">
                    Noch keine Vorlagen definiert
                  </div> :

              decisionTextTemplates.map((template, index) =>
              <div key={index} data-ev-id={`ev_template_row_${index}`} className="p-3 flex items-center gap-2 hover:bg-muted/30">
                      {editingTemplateIndex === index ?
                <>
                          <input
                    data-ev-id={`ev_edit_template_${index}`}
                    type="text"
                    value={editTemplateText}
                    onChange={(e) => setEditTemplateText(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm"
                    autoFocus />

                          <button
                    data-ev-id={`ev_save_template_${index}`}
                    onClick={async () => {
                      if (!editTemplateText.trim()) return;
                      setSavingBeschluss(true);
                      const newTemplates = [...decisionTextTemplates];
                      newTemplates[index] = editTemplateText.trim();
                      await updateDecisionTextTemplates(newTemplates);
                      setEditingTemplateIndex(null);
                      setEditTemplateText('');
                      setSavingBeschluss(false);
                    }}
                    disabled={savingBeschluss}
                    className="p-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                    data-ev-id={`ev_cancel_template_${index}`}
                    onClick={() => {setEditingTemplateIndex(null);setEditTemplateText('');}}
                    className="p-1.5 bg-muted text-muted-foreground rounded hover:bg-muted/80">
                            <X className="w-4 h-4" />
                          </button>
                        </> :

                <>
                          <span data-ev-id={`ev_template_text_${index}`} className="flex-1 text-sm text-foreground">{template}</span>
                          <button
                    data-ev-id={`ev_edit_btn_${index}`}
                    onClick={() => {setEditingTemplateIndex(index);setEditTemplateText(template);}}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                    data-ev-id={`ev_delete_btn_${index}`}
                    onClick={async () => {
                      if (!confirm('Vorlage löschen?')) return;
                      setSavingBeschluss(true);
                      await updateDecisionTextTemplates(decisionTextTemplates.filter((_, i) => i !== index));
                      setSavingBeschluss(false);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                }
                    </div>
              )
              }
              </div>
              <div data-ev-id="ev_add_template" className="p-3 border-t border-border flex gap-2">
                <input
                data-ev-id="ev_new_template_input"
                type="text"
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                placeholder="Neue Vorlage hinzufügen..."
                className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTemplate.trim()) {
                    setSavingBeschluss(true);
                    updateDecisionTextTemplates([...decisionTextTemplates, newTemplate.trim()]).then(() => {
                      setNewTemplate('');
                      setSavingBeschluss(false);
                    });
                  }
                }} />

                <button
                data-ev-id="ev_add_template_btn"
                onClick={async () => {
                  if (!newTemplate.trim()) return;
                  setSavingBeschluss(true);
                  await updateDecisionTextTemplates([...decisionTextTemplates, newTemplate.trim()]);
                  setNewTemplate('');
                  setSavingBeschluss(false);
                }}
                disabled={savingBeschluss || !newTemplate.trim()}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Hinzufügen
                </button>
              </div>
            </div>

            {/* Ablauf-Erinnerung */}
            <div data-ev-id="ev_expiry_reminder" className="bg-card border border-border rounded-lg overflow-hidden">
              <div data-ev-id="ev_expiry_header" className="p-4 bg-muted/30 border-b border-border flex items-center gap-2">
                <Vote className="w-4 h-4 text-muted-foreground" />
                <div data-ev-id="ev_expiry_title_wrap">
                  <h4 data-ev-id="ev_expiry_title" className="font-semibold text-foreground">Ablauf-Erinnerung</h4>
                  <p data-ev-id="ev_expiry_desc" className="text-xs text-muted-foreground">Wie viele Tage vor Ablauf soll erinnert werden?</p>
                </div>
              </div>
              <div data-ev-id="ev_expiry_content" className="p-4">
                <div data-ev-id="ev_expiry_input_wrap" className="flex items-center gap-3">
                  <input
                  data-ev-id="ev_expiry_days_input"
                  type="number"
                  min="1"
                  max="365"
                  value={beschlussExpiryReminderDays}
                  onChange={async (e) => {
                    const days = parseInt(e.target.value) || 30;
                    if (days >= 1 && days <= 365) {
                      setSavingBeschluss(true);
                      await updateBeschlussExpiryReminderDays(days);
                      setSavingBeschluss(false);
                    }
                  }}
                  className="w-24 px-3 py-2 border border-border rounded-lg text-center" />

                  <span data-ev-id="ev_expiry_label" className="text-sm text-muted-foreground">Tage vor Ablauf</span>
                </div>
                <p data-ev-id="ev_expiry_info" className="text-xs text-muted-foreground mt-2">
                  Beschlüsse mit Gültigkeitsdatum werden {beschlussExpiryReminderDays} Tage vor Ablauf als "bald ablaufend" markiert.
                </p>
              </div>
            </div>
          </div>
        }
      </div>
    </div>);

}