import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, Calendar, User, Phone, Mail, MapPin, Euro, Package, Trash2, Printer, Download, RotateCcw, CheckCircle2, Clock, X, AlertTriangle, Pencil, Save, Box, Bell } from 'lucide-react';
import { useRentalContracts, RentalContractItem, RentalContractInsert } from '@/hooks/useRentalContracts';
import { useRentalItems } from '@/hooks/useRentalItems';
import { useSettings } from '@/hooks/useSettings';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { generateRentalContractPdf, RentalContractClause } from '@/utils/generateRentalContractPdf';
import ffLogo from '@/assets/uploads/ff-marchtrenk-logo.png';

interface RentalContractsSectionProps {
  onBack: () => void;
}

export function RentalContractsSection({ onBack }: RentalContractsSectionProps) {
  const { effectiveProfile, effectiveIsAdmin, effectiveIsKommandant } = useSimulation();
  const profile = effectiveProfile;
  const { contracts, loading, calculateItemPrice, createContract, updateContract, deleteContract, markAsReturned, rentedItemIds, rentedItemsInfo, sendPendingNotifications } = useRentalContracts();
  const { updateConditionNotes, createItem: createRentalItem } = useRentalItems();
  const { items: rentalItems, activeArticles, activeServices, loading: itemsLoading, refetch: refetchRentalItems } = useRentalItems();
  const {
    rentalDeliveryCost,
    rentalOverduePerDay,
    rentalContractHeader,
    rentalContractClauses,
    pdfBackgroundUrl
  } = useSettings();
  const { profiles } = useProfiles();

  const [activeTab, setActiveTab] = useState<'overview' | 'archive' | 'new'>('overview');
  const [submitting, setSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSponsor, setIsSponsor] = useState(false);
  const [hasCustomPrice, setHasCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [rentalStart, setRentalStart] = useState('');
  const [rentalEnd, setRentalEnd] = useState('');
  const [selectedItems, setSelectedItems] = useState<RentalContractItem[]>([]);
  const [includeDelivery, setIncludeDelivery] = useState(false);
  const [notes, setNotes] = useState('');

  // Item selection state
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemQuantity, setSelectedItemQuantity] = useState(1);
  const [selectedItemCondition, setSelectedItemCondition] = useState('');

  // Return dialog state
  const [returnDialogContract, setReturnDialogContract] = useState<typeof contracts[0] | null>(null);
  const [returnCondition, setReturnCondition] = useState<'good' | 'minor' | 'damaged'>('good');
  const [returnDamageNotes, setReturnDamageNotes] = useState('');
  const [returnAdditionalCosts, setReturnAdditionalCosts] = useState('');
  const [returnCostsReason, setReturnCostsReason] = useState('');
  const [returningContract, setReturningContract] = useState(false);
  const [saveDamagePermanently, setSaveDamagePermanently] = useState(false);

  // Edit dialog state
  const [editingContract, setEditingContract] = useState<typeof contracts[0] | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editIsSponsor, setEditIsSponsor] = useState(false);
  const [editHasCustomPrice, setEditHasCustomPrice] = useState(false);
  const [editCustomPrice, setEditCustomPrice] = useState('');
  const [editRentalStart, setEditRentalStart] = useState('');
  const [editRentalEnd, setEditRentalEnd] = useState('');
  const [editSelectedItems, setEditSelectedItems] = useState<RentalContractItem[]>([]);
  const [editIncludeDelivery, setEditIncludeDelivery] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editShowItemSelector, setEditShowItemSelector] = useState(false);
  const [editSelectedItemId, setEditSelectedItemId] = useState('');
  const [editSelectedItemQuantity, setEditSelectedItemQuantity] = useState(1);
  const [editSelectedItemCondition, setEditSelectedItemCondition] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);

  // Quick add new item modal state
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice1Day, setNewItemPrice1Day] = useState('');
  const [newItemPrice2Days, setNewItemPrice2Days] = useState('');
  const [newItemPrice3Days, setNewItemPrice3Days] = useState('');
  const [newItemPriceWeek, setNewItemPriceWeek] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemIsSingle, setNewItemIsSingle] = useState(true);
  const [savingNewItem, setSavingNewItem] = useState(false);

  const activeItems = (rentalItems ?? []).filter((item) => item.is_active);

  // Service-Artikel IDs für Checkboxen (Anlieferung, Abholung)
  const deliveryService = (activeServices ?? []).find((s) => s.name.toLowerCase().includes('anlieferung'));
  const pickupService = (activeServices ?? []).find((s) => s.name.toLowerCase().includes('abholung'));

  // Filter contracts: aktiv (offen) vs. archiviert (zurückgegeben)
  const activeContracts = contracts.filter((c) => c.status !== 'returned' && !c.returned_at);
  const archivedContracts = contracts.filter((c) => c.status === 'returned' || c.returned_at);

  // Admin check for delete functionality (mit Simulation)
  const isAdmin = effectiveIsAdmin || effectiveIsKommandant;

  const resetForm = () => {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerAddress('');
    setIsSponsor(false);
    setHasCustomPrice(false);
    setCustomPrice('');
    setRentalStart('');
    setRentalEnd('');
    setSelectedItems([]);
    setIncludeDelivery(false);
    setNotes('');
  };

  const calculateTotals = () => {
    // Alle Items (inkl. Services) summieren
    const itemsTotal = selectedItems.reduce((sum, item) => sum + item.total_price, 0);
    // Legacy-Unterstützung: wenn includeDelivery an ist aber keine Services gewählt
    const hasServiceItems = selectedItems.some((item) => {
      const rentalItem = rentalItems?.find((ri) => ri.id === item.item_id);
      return rentalItem?.item_type === 'service';
    });
    const legacyDeliveryCost = includeDelivery && !hasServiceItems ? rentalDeliveryCost : 0;
    const totalAmount = itemsTotal + legacyDeliveryCost;
    return { itemsTotal, deliveryCost: legacyDeliveryCost, totalAmount };
  };

  // Hilfsfunktion: Nur erfasste Preise anzeigen
  const formatItemPrices = (item: typeof rentalItems[0]) => {
    const prices: string[] = [];
    if (item.price_day > 0) prices.push(`${item.price_day}€/1T`);
    if (item.price_2days > 0) prices.push(`${item.price_2days}€/2T`);
    if (item.price_3days > 0) prices.push(`${item.price_3days}€/3T`);
    if (item.price_week > 0) prices.push(`${item.price_week}€/W`);
    if (prices.length === 0) return '(kein Preis)';
    return `(${prices.join(' | ')})`;
  };

  // Hilfsfunktion: Preisaufschlüsselung für Transparenz
  const formatPriceBreakdown = (item: typeof rentalItems[0] | undefined, days: number, totalPrice: number) => {
    if (!item || days === 0) return '';

    // Neue Preisstufen
    const price1day = item.price_day ?? 0;
    const price2days = item.price_2days ?? 0;
    const price3days = item.price_3days ?? 0;
    const priceWeek = item.price_week ?? 0;

    // Direkte Preisstufen
    if (days === 1 && price1day > 0) return `1-Tag-Preis`;
    if (days === 2 && price2days > 0) return `2-Tage-Preis`;
    if (days === 3 && price3days > 0) return `3-Tage-Preis`;

    // 4-6 Tage
    if (days >= 4 && days < 7) {
      if (priceWeek > 0 && totalPrice === priceWeek) {
        return `Wochenpauschale`;
      }
      return `3-Tage + ${days - 3} Tag(e)`;
    }

    // 7+ Tage
    if (days >= 7 && priceWeek > 0) {
      const fullWeeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      if (remainingDays === 0) {
        return `${fullWeeks}x Woche`;
      }
      return `${fullWeeks}x Woche + ${remainingDays} Tag(e)`;
    }

    return `${days} Tage`;
  };

  // Schnell neuen Artikel erstellen
  const handleCreateNewItem = async () => {
    if (!newItemName.trim()) {
      alert('Bitte geben Sie einen Artikelnamen ein.');
      return;
    }
    // Mindestens ein Preis muss ausgefüllt sein
    const price1Day = parseFloat(newItemPrice1Day) || 0;
    const price2Days = parseFloat(newItemPrice2Days) || 0;
    const price3Days = parseFloat(newItemPrice3Days) || 0;
    const priceWeek = parseFloat(newItemPriceWeek) || 0;
    if (price1Day === 0 && price2Days === 0 && price3Days === 0 && priceWeek === 0) {
      alert('Bitte geben Sie mindestens einen Preis ein.');
      return;
    }

    setSavingNewItem(true);
    try {
      const { error, data } = await createRentalItem({
        name: newItemName.trim(),
        description: newItemDescription.trim() || undefined,
        price_day: price1Day,
        price_2days: price2Days,
        price_3days: price3Days,
        price_week: priceWeek,
        is_single_item: newItemIsSingle,
        is_active: true
      });

      if (error) {
        alert('Fehler beim Erstellen des Artikels: ' + error.message);
      } else {
        // Modal schließen und Formulare zurücksetzen
        setShowNewItemModal(false);
        setNewItemName('');
        setNewItemPrice1Day('');
        setNewItemPrice2Days('');
        setNewItemPrice3Days('');
        setNewItemPriceWeek('');
        setNewItemDescription('');
        setNewItemIsSingle(true);
        // Artikel-Liste aktualisieren
        await refetchRentalItems();
        // Neu erstellten Artikel automatisch auswählen
        if (data) {
          setSelectedItemId(data.id);
        }
      }
    } catch (err) {
      alert('Fehler beim Erstellen des Artikels');
    } finally {
      setSavingNewItem(false);
    }
  };

  const addItem = () => {
    if (!selectedItemId || !rentalStart || !rentalEnd) return;

    const item = activeItems.find((i) => i.id === selectedItemId);
    if (!item) return;

    // Bei Einzelstücken immer Menge 1
    const quantity = item.is_single_item ? 1 : selectedItemQuantity;

    const pricePerUnit = calculateItemPrice(item, rentalStart, rentalEnd);
    const totalPrice = pricePerUnit * quantity;

    // Bekannte Mängel vom Artikel übernehmen, falls vorhanden
    const itemCondition = selectedItemCondition || item.condition_notes || undefined;

    const newItem: RentalContractItem = {
      item_id: item.id,
      item_name: item.name,
      quantity: quantity,
      price_per_unit: pricePerUnit,
      total_price: totalPrice,
      price_day: item.price_day,
      price_2days: item.price_2days,
      price_3days: item.price_3days,
      price_week: item.price_week,
      condition: itemCondition
    };

    const existingIndex = selectedItems.findIndex((i) => i.item_id === item.id);
    if (existingIndex >= 0) {
      // Bei Einzelstücken keine Erhöhung der Menge
      if (item.is_single_item) {
        alert('Einzelstücke können nur einmal hinzugefügt werden.');
        return;
      }
      const updated = [...selectedItems];
      updated[existingIndex].quantity += quantity;
      updated[existingIndex].total_price = updated[existingIndex].price_per_unit * updated[existingIndex].quantity;
      setSelectedItems(updated);
    } else {
      setSelectedItems([...selectedItems, newItem]);
    }

    setSelectedItemId('');
    setSelectedItemQuantity(1);
    setSelectedItemCondition('');
    setShowItemSelector(false);
  };

  const updateItemCondition = (itemId: string, condition: string) => {
    setSelectedItems((prev) => prev.map((item) =>
    item.item_id === itemId ? { ...item, condition: condition || undefined } : item
    ));
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.item_id !== itemId));
  };

  // Recalculate prices when dates change
  useEffect(() => {
    if (rentalStart && rentalEnd && selectedItems.length > 0) {
      const updatedItems = selectedItems.map((item) => {
        const rentalItem = activeItems.find((i) => i.id === item.item_id);
        if (!rentalItem) return item;

        const pricePerUnit = calculateItemPrice(rentalItem, rentalStart, rentalEnd);
        return {
          ...item,
          price_per_unit: pricePerUnit,
          total_price: pricePerUnit * item.quantity
        };
      });
      setSelectedItems(updatedItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentalStart, rentalEnd]);

  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      alert('Bitte geben Sie den Kundennamen ein.');
      return false;
    }
    if (!customerEmail.trim()) {
      alert('Bitte geben Sie die Kunden-E-Mail ein (Pflichtfeld).');
      return false;
    }
    if (!rentalStart || !rentalEnd) {
      alert('Bitte wählen Sie Start- und Enddatum.');
      return false;
    }
    if (new Date(rentalEnd) < new Date(rentalStart)) {
      alert('Das Enddatum muss nach dem Startdatum liegen.');
      return false;
    }
    if (selectedItems.length === 0) {
      alert('Bitte fügen Sie mindestens einen Artikel hinzu.');
      return false;
    }
    return true;
  };

  const handleSave = async (andPrint: boolean = false) => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const { itemsTotal, deliveryCost, totalAmount } = calculateTotals();

      // Berechne finalen Preis: Sponsor = 0, Sonderpreis = custom, sonst berechnet
      const finalAmount = isSponsor ? 0 : hasCustomPrice && customPrice ? parseFloat(customPrice) : totalAmount;

      const data: RentalContractInsert = {
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        customer_address: customerAddress || '',
        rental_start: rentalStart,
        rental_end: rentalEnd,
        items: selectedItems,
        subtotal: itemsTotal,
        delivery_cost: isSponsor ? 0 : hasCustomPrice ? 0 : deliveryCost,
        total_amount: finalAmount,
        includes_delivery: includeDelivery,
        is_sponsor: isSponsor,
        has_custom_price: hasCustomPrice && !isSponsor,
        custom_price: hasCustomPrice && !isSponsor && customPrice ? parseFloat(customPrice) : null,
        condition_pickup: notes || null
      };

      const newContract = await createContract(data);

      if (andPrint && newContract) {
        await handleGeneratePdf(newContract);
      }

      resetForm();
      setActiveTab('overview');
    } catch (err) {
      alert('Fehler beim Speichern des Leihvertrags');
    } finally {
      setSubmitting(false);
    }
  };

  const getCreatorName = (userId: string) => {
    const creator = profiles.find((p) => p.id === userId);
    return creator?.full_name || 'Unbekannt';
  };

  const openReturnDialog = (contract: typeof contracts[0]) => {
    setReturnDialogContract(contract);
    setReturnCondition('good');
    setReturnDamageNotes('');
    setReturnAdditionalCosts('');
    setReturnCostsReason('');
    setSaveDamagePermanently(false);
  };

  const handleReturn = async () => {
    if (!returnDialogContract) return;

    setReturningContract(true);
    try {
      const conditionText = returnCondition === 'good' ?
      'Wie lt. Vertrag erhalten' :
      returnCondition === 'minor' ?
      'Leichte Gebrauchsspuren' :
      'Beschädigt';

      await markAsReturned(returnDialogContract.id, {
        conditionReturn: conditionText,
        damageNotes: returnDamageNotes || undefined,
        additionalCosts: returnAdditionalCosts ? parseFloat(returnAdditionalCosts) : undefined,
        additionalCostsReason: returnCostsReason || undefined
      });

      // Bei Schäden: Mängel-Historie der Artikel aktualisieren (nur wenn Checkbox aktiviert)
      if ((returnCondition === 'damaged' || returnCondition === 'minor') && returnDamageNotes && saveDamagePermanently) {
        for (const item of returnDialogContract.items) {
          await updateConditionNotes(item.item_id, returnDamageNotes);
        }
      }

      setReturnDialogContract(null);
    } catch (err) {
      alert('Fehler beim Erfassen der Rückgabe');
    } finally {
      setReturningContract(false);
    }
  };

  const isItemCurrentlyRented = (itemId: string) => rentedItemIds.includes(itemId);

  // Prüft ob für diesen Artikel eine Warnung angezeigt werden soll (nur bei Einzelstücken)
  const shouldShowRentalWarning = (itemId: string) => {
    if (!isItemCurrentlyRented(itemId)) return false;
    const item = rentalItems?.find((i) => i.id === itemId);
    return item?.is_single_item !== false; // Default true wenn nicht gesetzt
  };

  // Holt Rückgabe-Info für verliehenen Artikel
  const getRentalInfo = (itemId: string) => {
    return rentedItemsInfo.find((r) => r.item_id === itemId);
  };

  // Formatiert Rückgabedatum
  const formatRentalHint = (itemId: string) => {
    const info = getRentalInfo(itemId);
    if (!info) return '';
    const returnDate = new Date(info.rental_end).toLocaleDateString('de-DE');
    return ` → Rückgabe: ${returnDate}`;
  };

  // Bearbeiten-Dialog öffnen
  const openEditDialog = (contract: typeof contracts[0]) => {
    setEditingContract(contract);
    setEditCustomerName(contract.customer_name);
    setEditCustomerEmail(contract.customer_email || '');
    setEditCustomerPhone(contract.customer_phone || '');
    setEditCustomerAddress(contract.customer_address || '');
    setEditIsSponsor(contract.is_sponsor || false);
    setEditHasCustomPrice(contract.has_custom_price || false);
    setEditCustomPrice(contract.custom_price?.toString() || '');
    setEditRentalStart(contract.rental_start);
    setEditRentalEnd(contract.rental_end);

    // Sync: Aktuelle Mängel vom Artikel übernehmen
    const syncedItems = contract.items.map((item) => {
      const rentalItem = activeItems.find((ri) => ri.id === item.item_id);
      return {
        ...item,
        condition: rentalItem?.condition_notes || undefined
      };
    });
    setEditSelectedItems(syncedItems);

    setEditIncludeDelivery(contract.includes_delivery);
    setEditNotes(contract.condition_pickup || '');
    setEditShowItemSelector(false);
  };

  // Bearbeiten: Artikel hinzufügen
  const addEditItem = () => {
    if (!editSelectedItemId || !editRentalStart || !editRentalEnd) return;

    const item = activeItems.find((i) => i.id === editSelectedItemId);
    if (!item) return;

    // Bei Einzelstücken immer Menge 1
    const quantity = item.is_single_item ? 1 : editSelectedItemQuantity;

    const pricePerUnit = calculateItemPrice(item, editRentalStart, editRentalEnd);
    const totalPrice = pricePerUnit * quantity;

    const newItem: RentalContractItem = {
      item_id: item.id,
      item_name: item.name,
      quantity: quantity,
      price_per_unit: pricePerUnit,
      total_price: totalPrice,
      price_day: item.price_day,
      price_2days: item.price_2days,
      price_3days: item.price_3days,
      price_week: item.price_week,
      condition: editSelectedItemCondition || undefined
    };

    const existingIndex = editSelectedItems.findIndex((i) => i.item_id === item.id);
    if (existingIndex >= 0) {
      // Bei Einzelstücken keine Erhöhung der Menge
      if (item.is_single_item) {
        alert('Einzelstücke können nur einmal hinzugefügt werden.');
        return;
      }
      const updated = [...editSelectedItems];
      updated[existingIndex].quantity += quantity;
      updated[existingIndex].total_price = updated[existingIndex].price_per_unit * updated[existingIndex].quantity;
      setEditSelectedItems(updated);
    } else {
      setEditSelectedItems([...editSelectedItems, newItem]);
    }

    setEditSelectedItemId('');
    setEditSelectedItemQuantity(1);
    setEditSelectedItemCondition('');
    setEditShowItemSelector(false);
  };

  // Bearbeiten: Artikel entfernen
  const removeEditItem = (itemId: string) => {
    setEditSelectedItems(editSelectedItems.filter((i) => i.item_id !== itemId));
  };

  // Bearbeiten: Zustand aktualisieren
  const updateEditItemCondition = (itemId: string, condition: string) => {
    setEditSelectedItems((prev) => prev.map((item) =>
    item.item_id === itemId ? { ...item, condition: condition || undefined } : item
    ));
  };

  // Bearbeiten: Preise neu berechnen wenn Datum sich ändert
  useEffect(() => {
    if (editRentalStart && editRentalEnd && editSelectedItems.length > 0 && editingContract) {
      const updatedItems = editSelectedItems.map((item) => {
        const rentalItem = activeItems.find((i) => i.id === item.item_id);
        if (!rentalItem) return item;

        const pricePerUnit = calculateItemPrice(rentalItem, editRentalStart, editRentalEnd);
        return {
          ...item,
          price_per_unit: pricePerUnit,
          total_price: pricePerUnit * item.quantity
        };
      });
      setEditSelectedItems(updatedItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRentalStart, editRentalEnd]);

  // Bearbeiten: Summen berechnen
  const calculateEditTotals = () => {
    const itemsTotal = editSelectedItems.reduce((sum, item) => sum + item.total_price, 0);
    const deliveryCost = editIncludeDelivery ? rentalDeliveryCost : 0;
    const totalAmount = itemsTotal + deliveryCost;
    return { itemsTotal, deliveryCost, totalAmount };
  };

  // Bearbeiten: Speichern
  const handleSaveEdit = async () => {
    if (!editingContract) return;
    if (!editCustomerName.trim()) {
      alert('Bitte geben Sie den Kundennamen ein.');
      return;
    }
    if (!editCustomerEmail.trim()) {
      alert('Bitte geben Sie die Kunden-E-Mail ein.');
      return;
    }
    if (!editRentalStart || !editRentalEnd) {
      alert('Bitte wählen Sie Start- und Enddatum.');
      return;
    }
    if (editSelectedItems.length === 0) {
      alert('Bitte fügen Sie mindestens einen Artikel hinzu.');
      return;
    }

    setSavingEdit(true);
    try {
      const { itemsTotal, deliveryCost, totalAmount } = calculateEditTotals();

      // Berechne finalen Preis: Sponsor = 0, Sonderpreis = custom, sonst berechnet
      const finalAmount = editIsSponsor ? 0 : editHasCustomPrice && editCustomPrice ? parseFloat(editCustomPrice) : totalAmount;

      await updateContract(editingContract.id, {
        customer_name: editCustomerName,
        customer_email: editCustomerEmail || null,
        customer_phone: editCustomerPhone || null,
        customer_address: editCustomerAddress || '',
        rental_start: editRentalStart,
        rental_end: editRentalEnd,
        items: editSelectedItems,
        subtotal: itemsTotal,
        delivery_cost: editIsSponsor ? 0 : editHasCustomPrice ? 0 : deliveryCost,
        total_amount: finalAmount,
        includes_delivery: editIncludeDelivery,
        is_sponsor: editIsSponsor,
        has_custom_price: editHasCustomPrice && !editIsSponsor,
        custom_price: editHasCustomPrice && !editIsSponsor && editCustomPrice ? parseFloat(editCustomPrice) : null,
        condition_pickup: editNotes || null
      });

      setEditingContract(null);
    } catch (err) {
      alert('Fehler beim Speichern der Änderungen');
    } finally {
      setSavingEdit(false);
    }
  };

  // Prüfen ob Vertrag bearbeitbar ist (nicht zurückgegeben)
  const isContractEditable = (contract: typeof contracts[0]) => {
    return contract.status !== 'returned' && !contract.returned_at;
  };

  const buildClausesForPdf = (): RentalContractClause[] => {
    // Dynamisch alle Klauseln aus den Settings holen
    const clauseIds = Object.keys(rentalContractClauses).sort((a, b) => {
      const [aMain, aSub] = a.split('_').map(Number);
      const [bMain, bSub] = b.split('_').map(Number);
      if (aMain !== bMain) return aMain - bMain;
      return aSub - bSub;
    });
    
    // Titel für erste Klausel jeder Sektion
    const sectionTitles: Record<string, string> = {
      '1': '1 Zustand',
      '2': '2 Haftung',
      '3': '3 Rückgabe',
      '4': '4 Leihkosten'
    };
    
    const seenSections = new Set<string>();

    return clauseIds.map((id) => {
      const sectionNum = id.split('_')[0];
      let title = '';
      
      // Nur die erste Klausel einer Sektion bekommt den Titel
      if (!seenSections.has(sectionNum)) {
        seenSections.add(sectionNum);
        title = sectionTitles[sectionNum] || `${sectionNum} Abschnitt`;
      }
      
      return {
        id,
        title,
        text: rentalContractClauses[id] || ''
      };
    });
  };

  const handleGeneratePdf = async (contract: typeof contracts[0]) => {
    setGeneratingPdf(contract.id);
    try {
      await generateRentalContractPdf(
        {
          contractNumber: contract.contract_number,
          customerName: contract.customer_name,
          customerEmail: contract.customer_email,
          customerPhone: contract.customer_phone,
          customerAddress: contract.customer_address,
          isSponsor: contract.is_sponsor,
          hasCustomPrice: contract.has_custom_price,
          customPrice: contract.custom_price,
          items: contract.items,
          rentalStart: contract.rental_start,
          rentalEnd: contract.rental_end,
          totalAmount: contract.total_amount,
          deliveryCost: contract.delivery_cost,
          includeDelivery: contract.includes_delivery,
          notes: contract.condition_pickup,
          createdAt: contract.created_at,
          // Rückgabe-Info
          returnedAt: contract.returned_at,
          damageNotes: contract.damage_notes,
          conditionReturn: contract.condition_return,
          additionalCosts: contract.additional_costs,
          additionalCostsReason: contract.additional_costs_reason
        },
        {
          header: rentalContractHeader,
          clauses: buildClausesForPdf(),
          deliveryCost: rentalDeliveryCost,
          overduePerDay: rentalOverduePerDay,
          logoUrl: ffLogo
        }
      );
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Fehler beim Erstellen des PDFs');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const { itemsTotal, deliveryCost, totalAmount } = calculateTotals();

  const getDaysCount = () => {
    if (!rentalStart || !rentalEnd) return 0;
    const start = new Date(rentalStart);
    const end = new Date(rentalEnd);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const daysCount = getDaysCount();

  return (
    <div data-ev-id="ev_e6bab64e2f" className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div data-ev-id="ev_72daa0defb" className="flex items-center gap-4 mb-6">
        <button data-ev-id="ev_a0f7ac0b0f"
        onClick={onBack}
        className="p-2 hover:bg-muted rounded-lg transition-colors">

          <ArrowLeft className="w-5 h-5" />
        </button>
        <div data-ev-id="ev_49649f8584" className="flex-1">
          <h1 data-ev-id="ev_c421e13355" className="text-2xl font-bold text-foreground">Leihverträge</h1>
          <p data-ev-id="ev_2c11663647" className="text-sm text-muted-foreground">Erstellen und drucken Sie Leihverträge</p>
        </div>
      </div>

      {/* Tabs */}
      <div data-ev-id="ev_d4c62eddd9" className="flex gap-2 mb-6 border-b border-border">
        <button data-ev-id="ev_21b75c31af"
        onClick={() => setActiveTab('overview')}
        className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
        activeTab === 'overview' ?
        'border-primary text-primary' :
        'border-transparent text-muted-foreground hover:text-foreground'}`
        }>
          Offen
          {activeContracts.length > 0 &&
          <span data-ev-id="ev_bd6603f92a" className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
              {activeContracts.length}
            </span>
          }
        </button>
        <button data-ev-id="ev_76d21f923f"
        onClick={() => setActiveTab('archive')}
        className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
        activeTab === 'archive' ?
        'border-primary text-primary' :
        'border-transparent text-muted-foreground hover:text-foreground'}`
        }>
          Archiv
          {archivedContracts.length > 0 &&
          <span data-ev-id="ev_db3b0a86db" className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
              {archivedContracts.length}
            </span>
          }
        </button>
        <button data-ev-id="ev_5609952937"
        onClick={() => setActiveTab('new')}
        className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
        activeTab === 'new' ?
        'border-primary text-primary' :
        'border-transparent text-muted-foreground hover:text-foreground'}`
        }>
          Neuer Vertrag
        </button>
      </div>

      {/* Admin-Funktion: Benachrichtigungen nachträglich senden (mit Simulation) */}
      {activeTab === 'overview' && isAdmin && activeContracts.filter((c) => c.total_amount > 0 && !c.is_sponsor).length > 0 &&
      <div data-ev-id="ev_cf78affd43" className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div data-ev-id="ev_32f942f1ab" className="flex items-center justify-between gap-4 flex-wrap">
            <div data-ev-id="ev_d7b5e9a078" className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <div data-ev-id="ev_834173b459">
                <p data-ev-id="ev_e6695c4013" className="font-medium text-amber-800">Kassier-Benachrichtigungen</p>
                <p data-ev-id="ev_75b9ba4476" className="text-sm text-amber-600">
                  {activeContracts.filter((c) => c.total_amount > 0 && !c.is_sponsor).length} offene Verträge mit Rechnungsbedarf
                </p>
              </div>
            </div>
            <button data-ev-id="ev_12f38ac83b"
          onClick={async () => {
            if (!confirm('Für alle offenen Verträge mit Preis > 0 € Benachrichtigungen und Aufgaben an den Kassier senden?')) return;
            setSendingNotifications(true);
            try {
              const result = await sendPendingNotifications();
              alert(`${result.sent} Benachrichtigung(en) gesendet.${result.errors > 0 ? ` ${result.errors} Fehler.` : ''}`);
            } finally {
              setSendingNotifications(false);
            }
          }}
          disabled={sendingNotifications}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">

              {sendingNotifications ?
            <span data-ev-id="ev_3919af0742" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

            <Bell className="w-4 h-4" />
            }
              Kassier benachrichtigen
            </button>
          </div>
        </div>
      }

      {/* Overview Tab - Offene Verträge */}
      {activeTab === 'overview' &&
      <div data-ev-id="ev_16882b684a">
          {loading ?
        <div data-ev-id="ev_bef169682d" className="flex justify-center py-12">
              <span data-ev-id="ev_f1caa9e991" className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div> :
        activeContracts.length === 0 ?
        <div data-ev-id="ev_f5760dc9c1" className="text-center py-12 bg-card rounded-xl border border-border">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p data-ev-id="ev_67af554268" className="text-muted-foreground mb-4">
                {contracts.length === 0 ? 'Noch keine Leihverträge vorhanden' : 'Keine offenen Verleihungen'}
              </p>
              <button data-ev-id="ev_4bf4a26979"
          onClick={() => setActiveTab('new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">

                <Plus className="w-4 h-4" />
                Neuen Vertrag erstellen
              </button>
            </div> :

        <div data-ev-id="ev_8ee2f30ed8" className="flex flex-col gap-3">
              {activeContracts.map((contract) =>
          <div data-ev-id="ev_1cd1dc6d43"
          key={contract.id}
          className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">

                  <div data-ev-id="ev_0755992e4f" className="flex items-start justify-between gap-4">
                    <div data-ev-id="ev_3bbf0ac11d" className="flex-1 min-w-0">
                      <div data-ev-id="ev_fa8bf047db" className="flex items-center gap-2 mb-1">
                        <span data-ev-id="ev_355f89c14b" className="font-mono text-sm text-muted-foreground">
                          {contract.contract_number}
                        </span>
                        {/* Status Badge */}
                        {contract.status === 'returned' || contract.returned_at ?
                  <span data-ev-id="ev_af070f4f11" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Zurückgegeben
                          </span> :
                  new Date(contract.rental_end) < new Date() ?
                  <span data-ev-id="ev_1bf450d4a8" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            Überfällig
                          </span> :

                  <span data-ev-id="ev_81b85343a1" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3" />
                            Verliehen
                          </span>
                  }
                        {contract.is_sponsor &&
                  <span data-ev-id="ev_4c1b3d2296" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                            <Euro className="w-3 h-3" />
                            Sponsor
                          </span>
                  }
                        {contract.has_custom_price && !contract.is_sponsor &&
                  <span data-ev-id="ev_3e2c6fd90c" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            <Euro className="w-3 h-3" />
                            Sonderpreis
                          </span>
                  }
                      </div>
                      <h3 data-ev-id="ev_e8b9ce94e4" className="font-semibold text-foreground truncate">
                        {contract.customer_name}
                      </h3>
                      <div data-ev-id="ev_c660cd69fe" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span data-ev-id="ev_c2a5cd95e5" className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(contract.rental_start).toLocaleDateString('de-DE')} -{' '}
                          {new Date(contract.rental_end).toLocaleDateString('de-DE')}
                        </span>
                        <span data-ev-id="ev_d3fe66bcec" className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          {contract.items.length} Artikel
                        </span>
                        <span data-ev-id="ev_5e5dd461fe" className="flex items-center gap-1">
                          <Euro className="w-3.5 h-3.5" />
                          {contract.total_amount.toLocaleString('de-DE')} €
                        </span>
                      </div>
                      <p data-ev-id="ev_c9b0cbc7e5" className="text-xs text-muted-foreground mt-2">
                        Erstellt von {getCreatorName(contract.created_by)} am{' '}
                        {new Date(contract.created_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div data-ev-id="ev_4f9f476655" className="flex items-center gap-2">
                      {/* Rückgabe-Button (nur bei aktiven Verträgen) */}
                      {contract.status !== 'returned' && !contract.returned_at &&
                <button data-ev-id="ev_7c4eac1518"
                onClick={() => openReturnDialog(contract)}
                className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5">

                          <RotateCcw className="w-3.5 h-3.5" />
                          Rückgabe
                        </button>
                }
                      {/* Bearbeiten-Button (nur bei nicht zurückgegebenen Verträgen) */}
                      {isContractEditable(contract) &&
                <button data-ev-id="ev_095e9314e7"
                onClick={() => openEditDialog(contract)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Bearbeiten">

                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                }
                      {/* PDF-Button */}
                      <button data-ev-id="ev_5e58c461a9"
                onClick={() => handleGeneratePdf(contract)}
                disabled={generatingPdf === contract.id}
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                title="PDF erstellen">

                        {generatingPdf === contract.id ?
                  <span data-ev-id="ev_b43df959c0" className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin block" /> :

                  <Download className="w-4 h-4 text-blue-600" />
                  }
                      </button>
                      {/* Löschen-Button (nur Admin) */}
                      {isAdmin &&
                <button data-ev-id="ev_76fdc6065b"
                onClick={() => {
                  if (confirm('Vertrag wirklich löschen?')) {
                    deleteContract(contract.id);
                  }
                }}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Löschen (nur Admin)">

                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                }
                    </div>
                  </div>
                </div>
          )}
            </div>
        }
        </div>
      }

      {/* Archive Tab - Zurückgegebene Verträge */}
      {activeTab === 'archive' &&
      <div data-ev-id="ev_3ca5454a66">
          {loading ?
        <div data-ev-id="ev_dd84609d69" className="flex justify-center py-12">
              <span data-ev-id="ev_31ff3d904f" className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div> :
        archivedContracts.length === 0 ?
        <div data-ev-id="ev_4839272d9e" className="text-center py-12 bg-card rounded-xl border border-border">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p data-ev-id="ev_9d99a6987f" className="text-muted-foreground">Noch keine abgeschlossenen Verleihungen</p>
            </div> :

        <div data-ev-id="ev_83d267ece4" className="flex flex-col gap-3">
              {archivedContracts.map((contract) =>
          <div data-ev-id="ev_d8583f17d4"
          key={contract.id}
          className="bg-card rounded-xl border border-border p-4 opacity-75 hover:opacity-100 transition-opacity">

                  <div data-ev-id="ev_404b0f0cc7" className="flex items-start justify-between gap-4">
                    <div data-ev-id="ev_506100e100" className="flex-1 min-w-0">
                      <div data-ev-id="ev_05d9ea1a0d" className="flex items-center gap-2 mb-1">
                        <span data-ev-id="ev_5b707986cc" className="font-mono text-sm text-muted-foreground">
                          {contract.contract_number}
                        </span>
                        <span data-ev-id="ev_63de01a96c" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3" />
                          Zurückgegeben
                        </span>
                        {contract.condition_return && (
                  contract.condition_return === 'Wie lt. Vertrag erhalten' ?
                  <span data-ev-id="ev_7b2e2d1fa0" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Wie lt. Vertrag erhalten
                            </span> :
                  contract.condition_return === 'Leichte Gebrauchsspuren' ?
                  <span data-ev-id="ev_4ec901da6e" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                              <Clock className="w-3 h-3" />
                              Leichte Gebrauchsspuren
                            </span> :

                  <span data-ev-id="ev_dc75d1af1c" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              <AlertTriangle className="w-3 h-3" />
                              Beschädigt / Mängel
                            </span>)

                  }
                        {contract.is_sponsor &&
                  <span data-ev-id="ev_ba09d62d08" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                            <Euro className="w-3 h-3" />
                            Sponsor
                          </span>
                  }
                        {contract.has_custom_price && !contract.is_sponsor &&
                  <span data-ev-id="ev_4f85186408" className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            <Euro className="w-3 h-3" />
                            Sonderpreis
                          </span>
                  }
                      </div>
                      <h3 data-ev-id="ev_4e545cd558" className="font-semibold text-foreground truncate">
                        {contract.customer_name}
                      </h3>
                      <div data-ev-id="ev_91ba42db85" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span data-ev-id="ev_bb639a712f" className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(contract.rental_start).toLocaleDateString('de-DE')} -{' '}
                          {new Date(contract.rental_end).toLocaleDateString('de-DE')}
                        </span>
                        <span data-ev-id="ev_6f40642bc8" className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          {contract.items.length} Artikel
                        </span>
                        <span data-ev-id="ev_6fe8213512" className="flex items-center gap-1">
                          <Euro className="w-3.5 h-3.5" />
                          {contract.total_amount.toLocaleString('de-DE')} €
                        </span>
                      </div>
                      {contract.returned_at &&
                <p data-ev-id="ev_06313bfb60" className="text-xs text-green-600 mt-1">
                          Rückgabe am {new Date(contract.returned_at).toLocaleDateString('de-DE')}
                        </p>
                }
                    </div>
                    <div data-ev-id="ev_4d7f818f02" className="flex items-center gap-2">
                      {/* PDF-Button */}
                      <button data-ev-id="ev_239de63cd0"
                onClick={() => handleGeneratePdf(contract)}
                disabled={generatingPdf === contract.id}
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                title="PDF erstellen">

                        {generatingPdf === contract.id ?
                  <span data-ev-id="ev_575b40a5cb" className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin block" /> :

                  <Download className="w-4 h-4 text-blue-600" />
                  }
                      </button>
                      {/* Löschen-Button (nur Admin) */}
                      {isAdmin &&
                <button data-ev-id="ev_cd7fc1203d"
                onClick={() => {
                  if (confirm('Archivierten Vertrag wirklich löschen?')) {
                    deleteContract(contract.id);
                  }
                }}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Löschen (nur Admin)">

                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                }
                    </div>
                  </div>
                </div>
          )}
            </div>
        }
        </div>
      }

      {/* New Contract Tab */}
      {activeTab === 'new' &&
      <div data-ev-id="ev_2065d3c46b" className="bg-card rounded-xl border border-border overflow-hidden">
          <div data-ev-id="ev_e1382f94eb" className="p-4 bg-muted/30 border-b border-border">
            <h2 data-ev-id="ev_212a58a3c3" className="font-semibold text-foreground">Neuen Leihvertrag erstellen</h2>
          </div>
          <div data-ev-id="ev_ddb0c924f2" className="p-4 flex flex-col gap-6">
            {/* Kundendaten */}
            <div data-ev-id="ev_fe6ad27f8c">
              <h3 data-ev-id="ev_fe9d97a9e4" className="font-medium text-foreground mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Kundendaten
              </h3>
              <div data-ev-id="ev_a1f3ae8fe0" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div data-ev-id="ev_8fa6d4a23a">
                  <label data-ev-id="ev_9e55f1ac5d" className="block text-sm font-medium text-foreground mb-1">
                    Name <span data-ev-id="ev_b8c7b0c400" className="text-red-500">*</span>
                  </label>
                  <input data-ev-id="ev_5174f5c08e"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Max Mustermann"
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />

                </div>
                <div data-ev-id="ev_c002410095">
                  <label data-ev-id="ev_1077441b11" className="block text-sm font-medium text-foreground mb-1">
                    E-Mail <span data-ev-id="ev_5ca7915ec5" className="text-red-500">*</span>
                  </label>
                  <div data-ev-id="ev_e07b792b29" className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input data-ev-id="ev_c513b32661"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="max@beispiel.de"
                  className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />

                  </div>
                </div>
                <div data-ev-id="ev_fd49f9fe7e">
                  <label data-ev-id="ev_efd79d5b99" className="block text-sm font-medium text-foreground mb-1">Telefon</label>
                  <div data-ev-id="ev_9864d63e02" className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input data-ev-id="ev_4cf8d78328"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+43 664 1234567"
                  className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
                  </div>
                </div>
                <div data-ev-id="ev_87e63ec6f0" className="flex items-center">
                  <label data-ev-id="ev_50dab42d9d" className="flex items-center gap-3 cursor-pointer">
                    <input data-ev-id="ev_fab6e7a690"
                  type="checkbox"
                  checked={isSponsor}
                  onChange={(e) => {
                    setIsSponsor(e.target.checked);
                    if (e.target.checked) {
                      setHasCustomPrice(false);
                      setCustomPrice('');
                    }
                  }}
                  className="w-5 h-5 rounded border-input text-primary focus:ring-primary/20" />
                    <span data-ev-id="ev_f8a3a64435" className="text-sm font-medium text-foreground">Sponsor (kostenlos)</span>
                  </label>
                </div>
                <div data-ev-id="ev_9a00f65c1e" className="flex items-center gap-3">
                  <label data-ev-id="ev_843d96e268" className="flex items-center gap-3 cursor-pointer">
                    <input data-ev-id="ev_2b1a4a49e6"
                  type="checkbox"
                  checked={hasCustomPrice}
                  disabled={isSponsor}
                  onChange={(e) => setHasCustomPrice(e.target.checked)}
                  className="w-5 h-5 rounded border-input text-primary focus:ring-primary/20 disabled:opacity-50" />
                    <span data-ev-id="ev_8a1bc93548" className={`text-sm font-medium ${isSponsor ? 'text-muted-foreground' : 'text-foreground'}`}>Sonderpreis</span>
                  </label>
                  {hasCustomPrice && !isSponsor &&
                <div data-ev-id="ev_8ce59e9943" className="relative">
                      <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input data-ev-id="ev_a767d318f6"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-28 pl-8 pr-2 py-1.5 text-sm border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
                    </div>
                }
                </div>
                <div data-ev-id="ev_af2f1ce9af" className="md:col-span-2">
                  <label data-ev-id="ev_82deb63ec1" className="block text-sm font-medium text-foreground mb-1">Rechnungsadresse</label>
                  <div data-ev-id="ev_4f4f5bc436" className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input data-ev-id="ev_fc46beaa40"
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Musterstraße 1, 12345 Stadt"
                  className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            {/* Zeitraum */}
            <div data-ev-id="ev_4c0f09c139">
              <h3 data-ev-id="ev_617e7088a2" className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Ausleihzeitraum
              </h3>
              <div data-ev-id="ev_758eb4af95" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div data-ev-id="ev_737a32604d">
                  <label data-ev-id="ev_9305e12104" className="block text-sm font-medium text-foreground mb-1">
                    Leihfrist ab <span data-ev-id="ev_e5a14f39da" className="text-red-500">*</span>
                  </label>
                  <input data-ev-id="ev_6999cee8d1"
                type="date"
                value={rentalStart}
                onChange={(e) => setRentalStart(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />

                </div>
                <div data-ev-id="ev_4cc4d7b1d0">
                  <label data-ev-id="ev_b33533c042" className="block text-sm font-medium text-foreground mb-1">
                    Leihfrist bis <span data-ev-id="ev_5cc613adfa" className="text-red-500">*</span>
                  </label>
                  <input data-ev-id="ev_54975cda62"
                type="date"
                value={rentalEnd}
                onChange={(e) => setRentalEnd(e.target.value)}
                min={rentalStart}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />

                </div>
                <div data-ev-id="ev_96be080c9f">
                  <label data-ev-id="ev_609cc22fca" className="block text-sm font-medium text-foreground mb-1">Dauer</label>
                  <div data-ev-id="ev_aab18fa8e1" className="px-3 py-2 bg-muted/50 border border-input rounded-lg text-foreground">
                    {daysCount > 0 ? `${daysCount} Tag${daysCount !== 1 ? 'e' : ''}` : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Artikel */}
            <div data-ev-id="ev_94317dda87">
              <h3 data-ev-id="ev_f0c8a82925" className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Leihgegenstände
              </h3>

              {selectedItems.length > 0 &&
            <div data-ev-id="ev_474182a926" className="mb-4 border border-border rounded-lg overflow-hidden">
                  <table data-ev-id="ev_8d0c443d15" className="w-full text-sm">
                    <thead data-ev-id="ev_76b0a8b367" className="bg-muted/50">
                      <tr data-ev-id="ev_1c319072b5">
                        <th data-ev-id="ev_7e15639d7a" className="text-left px-3 py-2 font-medium">Artikel</th>
                        <th data-ev-id="ev_40ae8c4db6" className="text-left px-3 py-2 font-medium">Zustand</th>
                        <th data-ev-id="ev_dfe8827bc0" className="text-center px-3 py-2 font-medium">Menge</th>
                        <th data-ev-id="ev_c915334ed4" className="text-right px-3 py-2 font-medium">Stückpreis</th>
                        <th data-ev-id="ev_9dbf630067" className="text-right px-3 py-2 font-medium">Gesamt</th>
                        <th data-ev-id="ev_5fa46ff19f" className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody data-ev-id="ev_9a1db61492">
                      {selectedItems.map((item) => {
                    const rentalItem = activeItems.find((i) => i.id === item.item_id);
                    const priceInfo = formatPriceBreakdown(rentalItem, daysCount, item.price_per_unit);
                    const showStrikethrough = hasCustomPrice && !isSponsor;
                    return (
                      <tr data-ev-id="ev_167d972305" key={item.item_id} className="border-t border-border">
                          <td data-ev-id="ev_d64f4b60ec" className="px-3 py-2">{item.item_name}</td>
                          <td data-ev-id="ev_a5f5bc9a5a" className="px-3 py-2">
                            <input data-ev-id="ev_af2739940a"
                          type="text"
                          value={item.condition || ''}
                          onChange={(e) => updateItemCondition(item.item_id, e.target.value)}
                          placeholder="Zustand..."
                          className="w-full px-2 py-1 text-sm border border-input rounded bg-background" />
                          </td>
                          <td data-ev-id="ev_d8912090e6" className="px-3 py-2 text-center">{item.quantity}</td>
                          <td data-ev-id="ev_efeac7805c" className={`px-3 py-2 text-right ${showStrikethrough ? 'text-muted-foreground' : ''}`}>
                            <div data-ev-id="ev_708f8f9cdf" className={showStrikethrough ? 'line-through' : ''}>{item.price_per_unit.toLocaleString('de-DE')} €</div>
                            {!showStrikethrough && <div data-ev-id="ev_cc69c0f5ff" className="text-xs text-muted-foreground">{priceInfo}</div>}
                          </td>
                          <td data-ev-id="ev_cefdc0c704" className={`px-3 py-2 text-right font-medium ${showStrikethrough ? 'text-muted-foreground line-through' : ''}`}>
                            {item.total_price.toLocaleString('de-DE')} €
                          </td>
                          <td data-ev-id="ev_3d73fbca95" className="px-2">
                            <button data-ev-id="ev_507a2822cc"
                          onClick={() => removeItem(item.item_id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors">

                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </td>
                        </tr>);

                  })}
                    </tbody>
                  </table>
                </div>
            }

              {showItemSelector ?
            <div data-ev-id="ev_ffef78f832" className="p-4 bg-muted/30 rounded-lg flex flex-col gap-3">
                  <div data-ev-id="ev_ee0dd23373" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div data-ev-id="ev_12491c4a49" className="md:col-span-2">
                      <label data-ev-id="ev_2801c370b6" className="block text-sm font-medium mb-1">Artikel</label>
                      <select data-ev-id="ev_6b7afcf51c"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background">

                        <option data-ev-id="ev_0418d013cd" value="">Artikel auswählen...</option>
                        {(activeArticles ?? activeItems).filter((item) => item.item_type !== 'service').map((item) => {
                      const isRented = isItemCurrentlyRented(item.id);
                      const showWarning = shouldShowRentalWarning(item.id);
                      const rentalHint = formatRentalHint(item.id);
                      return (
                        <option data-ev-id="ev_78002beb51"
                        key={item.id}
                        value={item.id}
                        className={showWarning ? 'text-amber-600' : ''}>

                              {item.name} {formatItemPrices(item)}{!item.is_single_item ? ' (Mehrfach)' : ''}{showWarning ? ` ⚠️ Verliehen${rentalHint}` : ''}
                            </option>);

                    })}
                      </select>
                      {/* Button: Neuen Artikel erstellen */}
                      <button data-ev-id="ev_ef05ceeac9"
                  type="button"
                  onClick={() => setShowNewItemModal(true)}
                  className="mt-2 text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                        Neuen Artikel erstellen
                      </button>
                      {/* Warnung bei verliehenen Einzelstücken */}
                      {selectedItemId && shouldShowRentalWarning(selectedItemId) &&
                  <div data-ev-id="ev_5bdda27fd3" className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div data-ev-id="ev_777f21c264">
                            <strong data-ev-id="ev_dd1f2ae8ac">Achtung:</strong> Dieser Artikel ist aktuell verliehen.
                            {(() => {
                        const info = getRentalInfo(selectedItemId);
                        if (info) {
                          return (
                            <span data-ev-id="ev_20a4342825" className="block text-xs mt-1">
                                    Geplante Rückgabe: {new Date(info.rental_end).toLocaleDateString('de-DE')} ({info.customer_name})
                                  </span>);

                        }
                        return null;
                      })()}
                          </div>
                        </div>
                  }
                    </div>
                    <div data-ev-id="ev_bd590cb73b">
                      <label data-ev-id="ev_850f5bc8e6" className="block text-sm font-medium mb-1">Menge</label>
                      {(() => {
                    const selectedItem = activeItems.find((i) => i.id === selectedItemId);
                    const isSingleItem = selectedItem?.is_single_item ?? true;
                    return isSingleItem ?
                    <div data-ev-id="ev_2f3c207c0f" className="w-full px-3 py-2 border border-input rounded-lg bg-muted text-muted-foreground cursor-not-allowed">
                            1 <span data-ev-id="ev_7345b9620b" className="text-xs">(Einzelstück)</span>
                          </div> :

                    <input data-ev-id="ev_9039642b54"
                    type="number"
                    min="1"
                    value={selectedItemQuantity}
                    onChange={(e) => setSelectedItemQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background" />;

                  })()}
                    </div>
                  </div>
                  <div data-ev-id="ev_f72751e904">
                    <label data-ev-id="ev_c7f9b1cd11" className="block text-sm font-medium mb-1">Zustand bei Übergabe (optional)</label>
                    <input data-ev-id="ev_ad35474907"
                type="text"
                value={selectedItemCondition}
                onChange={(e) => setSelectedItemCondition(e.target.value)}
                placeholder="z.B. leichte Gebrauchsspuren, neuwertig..."
                className="w-full px-3 py-2 border border-input rounded-lg bg-background" />
                    {(() => {
                  const selectedItem = activeItems.find((i) => i.id === selectedItemId);
                  if (selectedItem?.condition_notes) {
                    return (
                      <div data-ev-id="ev_31636346a1" className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <p data-ev-id="ev_abff3da345" className="text-xs font-medium text-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Bekannte Mängel:
                            </p>
                            <p data-ev-id="ev_0ecc9945c5" className="text-xs text-amber-700 mt-1 whitespace-pre-line">{selectedItem.condition_notes}</p>
                          </div>);

                  }
                  return null;
                })()}
                  </div>
                  <div data-ev-id="ev_dfd8f8d2ab" className="flex gap-2">
                    <button data-ev-id="ev_24de3d5ba2"
                onClick={addItem}
                disabled={!selectedItemId || !rentalStart || !rentalEnd}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">

                      Hinzufügen
                    </button>
                    <button data-ev-id="ev_356df93562"
                onClick={() => {
                  setShowItemSelector(false);
                  setSelectedItemId('');
                  setSelectedItemQuantity(1);
                }}
                className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">

                      Abbrechen
                    </button>
                  </div>
                  {(!rentalStart || !rentalEnd) &&
              <p data-ev-id="ev_b75c21a651" className="text-sm text-amber-600">
                      Bitte wählen Sie zuerst den Ausleihzeitraum, um die Preise zu berechnen.
                    </p>
              }
                </div> :

            <button data-ev-id="ev_6732fdadef"
            onClick={() => setShowItemSelector(true)}
            className="w-full p-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">

                  <Plus className="w-4 h-4" />
                  Artikel hinzufügen
                </button>
            }
            </div>

            {/* Service-Optionen (Anlieferung/Abholung) */}
            {(activeServices ?? []).length > 0 &&
          <div data-ev-id="ev_5f997d5ff2">
                <h3 data-ev-id="ev_service_header" className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Zusatzleistungen
                </h3>
                <div data-ev-id="ev_service_checkboxes" className="flex flex-col gap-2">
                  {(activeServices ?? []).map((service) => {
                const isSelected = selectedItems.some((item) => item.item_id === service.id);
                return (
                  <label
                    key={service.id}
                    data-ev-id={`ev_service_${service.id}`}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">

                        <input data-ev-id="ev_109dc261f5"
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Service als Item hinzufügen
                        const serviceItem: RentalContractItem = {
                          item_id: service.id,
                          item_name: service.name,
                          quantity: 1,
                          price_per_unit: service.price_day,
                          total_price: service.price_day,
                          price_day: service.price_day,
                          price_2days: service.price_2days ?? 0,
                          price_3days: service.price_3days ?? 0,
                          price_week: service.price_week
                        };
                        setSelectedItems((prev) => [...prev, serviceItem]);
                      } else {
                        // Service entfernen
                        setSelectedItems((prev) => prev.filter((item) => item.item_id !== service.id));
                      }
                    }}
                    className="w-5 h-5 rounded border-input text-primary focus:ring-primary/20" />

                        <div data-ev-id="ev_1bbb1f7c03">
                          <span data-ev-id="ev_0f7409694d" className="font-medium text-foreground">{service.name}</span>
                          <span data-ev-id="ev_d7b343b7fc" className="text-muted-foreground ml-2">
                            ({service.price_day.toLocaleString('de-DE')} €)
                          </span>
                          {service.description &&
                      <p data-ev-id="ev_f9f394b1dc" className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                      }
                        </div>
                      </label>);

              })}
                </div>
              </div>
          }
            
            {/* Legacy Lieferung Checkbox (nur wenn keine Service-Artikel existieren) */}
            {(activeServices ?? []).length === 0 &&
          <div data-ev-id="ev_legacy_delivery">
                <label data-ev-id="ev_98f94a1d5f" className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
                  <input data-ev-id="ev_5ae5354798"
              type="checkbox"
              checked={includeDelivery}
              onChange={(e) => setIncludeDelivery(e.target.checked)}
              className="w-5 h-5 rounded border-input text-primary focus:ring-primary/20" />

                  <div data-ev-id="ev_eae194ae98">
                    <span data-ev-id="ev_c49803f840" className="font-medium text-foreground">Zustellung & Abholung gewünscht</span>
                    <span data-ev-id="ev_971bf44e68" className="text-muted-foreground ml-2">
                      ({rentalDeliveryCost.toLocaleString('de-DE')} €)
                    </span>
                  </div>
                </label>
              </div>
          }

            {/* Notizen / Zustand */}
            <div data-ev-id="ev_18808b1837">
              <label data-ev-id="ev_0ae9065c18" className="block text-sm font-medium text-foreground mb-1">
                Besondere Merkmale / Schäden vor Verleih
              </label>
              <textarea data-ev-id="ev_b0c0b119ae"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Hier bekannte Schäden oder besondere Merkmale eintragen..."
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none" />

            </div>

            {/* Zusammenfassung */}
            {selectedItems.length > 0 &&
          <div data-ev-id="ev_52ee004f8a" className="bg-muted/30 p-4 rounded-lg">
                <h3 data-ev-id="ev_0e74f40764" className="font-medium text-foreground mb-3">Zusammenfassung</h3>
                <div data-ev-id="ev_c57d4d5089" className="flex flex-col gap-2 text-sm">
                  <div data-ev-id="ev_56109a9f05" className="flex justify-between">
                    <span data-ev-id="ev_cb1e586cb4" className="text-muted-foreground">Artikel</span>
                    <span data-ev-id="ev_462906e92d">{itemsTotal.toLocaleString('de-DE')} €</span>
                  </div>
                  {includeDelivery &&
              <div data-ev-id="ev_ca79b13eb2" className="flex justify-between">
                      <span data-ev-id="ev_b34ed8f7c2" className="text-muted-foreground">Zustellung & Abholung</span>
                      <span data-ev-id="ev_9bbac85164">{deliveryCost.toLocaleString('de-DE')} €</span>
                    </div>
              }
                  <div data-ev-id="ev_14ff274305" className="flex justify-between pt-2 border-t border-border font-semibold text-lg">
                    <span data-ev-id="ev_f5a8f3f35a">Gesamtbetrag</span>
                    <span data-ev-id="ev_6bf16945c7" className="text-primary">{totalAmount.toLocaleString('de-DE')} €</span>
                  </div>
                </div>
              </div>
          }

            {/* Actions */}
            <div data-ev-id="ev_510df7f62a" className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border">
              <button data-ev-id="ev_5a13abc866"
            onClick={() => {
              resetForm();
              setActiveTab('overview');
            }}
            className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_340e9f563c"
            onClick={() => handleSave(false)}
            disabled={submitting}
            className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors disabled:opacity-50">

                Speichern
              </button>
              <button data-ev-id="ev_4c743c2554"
            onClick={() => handleSave(true)}
            disabled={submitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">

                {submitting ?
              <span data-ev-id="ev_4bf4b992ce" className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

              <Printer className="w-4 h-4" />
              }
                Speichern & PDF erstellen
              </button>
            </div>
          </div>
        </div>
      }

      {/* Rückgabe-Dialog */}
      {returnDialogContract &&
      <div data-ev-id="ev_5ee8ad2773" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_d36498196e" className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_0a51d9dc48" className="flex items-center justify-between p-4 border-b border-border">
              <h2 data-ev-id="ev_73c15eed08" className="font-semibold text-lg">Rückgabe erfassen</h2>
              <button data-ev-id="ev_1e2fc1cb42"
            onClick={() => setReturnDialogContract(null)}
            className="p-1 hover:bg-muted rounded-lg transition-colors">

                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div data-ev-id="ev_ba00d3cbbe" className="p-4 flex flex-col gap-4">
              {/* Vertragsinfo */}
              <div data-ev-id="ev_53a2bd8f5d" className="bg-muted/30 rounded-lg p-3">
                <p data-ev-id="ev_c4988d3509" className="font-medium">{returnDialogContract.contract_number}</p>
                <p data-ev-id="ev_2fa9279d82" className="text-sm text-muted-foreground">{returnDialogContract.customer_name}</p>
                <p data-ev-id="ev_e6398a6366" className="text-sm text-muted-foreground">
                  {returnDialogContract.items.map((i) => i.item_name).join(', ')}
                </p>
              </div>

              {/* Zustand */}
              <div data-ev-id="ev_b040c99424">
                <label data-ev-id="ev_0292852162" className="block text-sm font-medium mb-2">Zustand bei Rückgabe</label>
                <div data-ev-id="ev_7c182b19ab" className="flex flex-col gap-2">
                  <label data-ev-id="ev_ed1d07e91a" className="flex items-center gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <input data-ev-id="ev_2b54f84aa1"
                  type="radio"
                  name="condition"
                  checked={returnCondition === 'good'}
                  onChange={() => setReturnCondition('good')}
                  className="w-4 h-4 text-green-600" />

                    <div data-ev-id="ev_2abe4134e0" className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span data-ev-id="ev_fdbe848def">Wie lt. Vertrag erhalten</span>
                    </div>
                  </label>
                  <label data-ev-id="ev_751eb94b2c" className="flex items-center gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <input data-ev-id="ev_1dfca8bc78"
                  type="radio"
                  name="condition"
                  checked={returnCondition === 'minor'}
                  onChange={() => setReturnCondition('minor')}
                  className="w-4 h-4 text-amber-600" />

                    <div data-ev-id="ev_79c4e533e9" className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <span data-ev-id="ev_c6b078754a">Leichte Gebrauchsspuren</span>
                    </div>
                  </label>
                  <label data-ev-id="ev_8722362bbb" className="flex items-center gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <input data-ev-id="ev_f2757b4c07"
                  type="radio"
                  name="condition"
                  checked={returnCondition === 'damaged'}
                  onChange={() => setReturnCondition('damaged')}
                  className="w-4 h-4 text-red-600" />

                    <div data-ev-id="ev_0ca3281308" className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span data-ev-id="ev_b792e02314">Beschädigt / Mängel</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Schadensbeschreibung (bei Schäden) */}
              {(returnCondition === 'minor' || returnCondition === 'damaged') &&
            <div data-ev-id="ev_b38ac8645a">
                  <label data-ev-id="ev_928ad67910" className="block text-sm font-medium mb-1">
                    Schadensbeschreibung {returnCondition === 'damaged' && <span data-ev-id="ev_05654b9f68" className="text-red-500">*</span>}
                  </label>
                  <textarea data-ev-id="ev_ccd490dab5"
              value={returnDamageNotes}
              onChange={(e) => setReturnDamageNotes(e.target.value)}
              rows={3}
              placeholder="Beschreiben Sie die Mängel oder Schäden..."
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none" />

                  {/* Checkbox: Dauerhaft speichern */}
                  <label data-ev-id="ev_a407ee91c5" className="flex items-start gap-3 mt-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <input data-ev-id="ev_62af2cc9bb"
                type="checkbox"
                checked={saveDamagePermanently}
                onChange={(e) => setSaveDamagePermanently(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-primary rounded" />
                    <div data-ev-id="ev_20bdb38d9e">
                      <span data-ev-id="ev_13d115f55b" className="font-medium text-sm">Dauerhaft am Artikel speichern</span>
                      <p data-ev-id="ev_e09e849408" className="text-xs text-muted-foreground mt-0.5">
                        Aktivieren für bleibende Schäden (Kratzer, Dellen). <br data-ev-id="ev_b6bda6be38" />
                        Deaktiviert lassen für temporäre Dinge (Reinigung, Trocknung).
                      </p>
                    </div>
                  </label>

                  {returnCondition === 'damaged' && !saveDamagePermanently &&
              <p data-ev-id="ev_temp_notice" className="text-xs text-amber-600 mt-2">
                      ℹ Der Mangel wird nur in diesem Vertrag dokumentiert, nicht beim Artikel gespeichert.
                    </p>
              }
                </div>
            }

              {/* Zusatzkosten */}
              <div data-ev-id="ev_7b4e28b404">
                <label data-ev-id="ev_12a423adb0" className="block text-sm font-medium mb-1">Zusatzkosten (optional)</label>
                <div data-ev-id="ev_559736676d" className="grid grid-cols-2 gap-3">
                  <div data-ev-id="ev_1353759bbf" className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input data-ev-id="ev_914d44d826"
                  type="number"
                  step="0.01"
                  min="0"
                  value={returnAdditionalCosts}
                  onChange={(e) => setReturnAdditionalCosts(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />

                  </div>
                  <input data-ev-id="ev_011d77c512"
                type="text"
                value={returnCostsReason}
                onChange={(e) => setReturnCostsReason(e.target.value)}
                placeholder="Grund (z.B. Reinigung)"
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />

                </div>
              </div>
            </div>

            {/* Actions */}
            <div data-ev-id="ev_f70c106327" className="flex justify-end gap-3 p-4 border-t border-border">
              <button data-ev-id="ev_5850dd9b31"
            onClick={() => setReturnDialogContract(null)}
            className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_1605c0ce23"
            onClick={handleReturn}
            disabled={returningContract || returnCondition === 'damaged' && !returnDamageNotes}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">

                {returningContract ?
              <span data-ev-id="ev_4b667d311c" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

              <CheckCircle2 className="w-4 h-4" />
              }
                Rückgabe bestätigen
              </button>
            </div>
          </div>
        </div>
      }

      {/* Bearbeiten-Dialog */}
      {editingContract &&
      <div data-ev-id="ev_d6403a5a82" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_b9924c6e9b" className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_e5d16b6fdb" className="flex items-center justify-between p-4 border-b border-border">
              <div data-ev-id="ev_ea3cee6032">
                <h2 data-ev-id="ev_af213eabb2" className="font-semibold text-lg">Vertrag bearbeiten</h2>
                <p data-ev-id="ev_4efc960306" className="text-sm text-muted-foreground">{editingContract.contract_number}</p>
              </div>
              <button data-ev-id="ev_f4888d2a04"
            onClick={() => setEditingContract(null)}
            className="p-1 hover:bg-muted rounded-lg transition-colors">

                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div data-ev-id="ev_d21dc2335b" className="p-4 flex flex-col gap-5">
              {/* Kundendaten */}
              <div data-ev-id="ev_47bdbedaf2">
                <h3 data-ev-id="ev_b88ede3c76" className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Kundendaten
                </h3>
                <div data-ev-id="ev_f880718c74" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div data-ev-id="ev_77ae355a66">
                    <label data-ev-id="ev_d0feb9a685" className="block text-sm font-medium mb-1">Name *</label>
                    <input data-ev-id="ev_ca11c3623c"
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />

                  </div>
                  <div data-ev-id="ev_41abc36e55">
                    <label data-ev-id="ev_7426368b75" className="block text-sm font-medium mb-1">E-Mail *</label>
                    <input data-ev-id="ev_cfb3bf43ca"
                  type="email"
                  value={editCustomerEmail}
                  onChange={(e) => setEditCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />

                  </div>
                  <div data-ev-id="ev_b4322603f2">
                    <label data-ev-id="ev_6de1b5993d" className="block text-sm font-medium mb-1">Telefon</label>
                    <div data-ev-id="ev_5a761474d7" className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input data-ev-id="ev_1484894a60"
                    type="tel"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    placeholder="+43 664 1234567"
                    className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
                    </div>
                  </div>
                  <div data-ev-id="ev_d417f2a1bb" className="flex items-center">
                    <label data-ev-id="ev_582f770ccf" className="flex items-center gap-3 cursor-pointer">
                      <input data-ev-id="ev_56326469f4"
                    type="checkbox"
                    checked={editIsSponsor}
                    onChange={(e) => {
                      setEditIsSponsor(e.target.checked);
                      if (e.target.checked) {
                        setEditHasCustomPrice(false);
                        setEditCustomPrice('');
                      }
                    }}
                    className="w-5 h-5 rounded border-input text-primary focus:ring-primary/20" />
                      <span data-ev-id="ev_bfbe4543fb" className="text-sm font-medium text-foreground">Sponsor (kostenlos)</span>
                    </label>
                  </div>
                  <div data-ev-id="ev_21e908e908" className="flex items-center gap-3">
                    <label data-ev-id="ev_a383742932" className="flex items-center gap-3 cursor-pointer">
                      <input data-ev-id="ev_44be6a62b8"
                    type="checkbox"
                    checked={editHasCustomPrice}
                    disabled={editIsSponsor}
                    onChange={(e) => setEditHasCustomPrice(e.target.checked)}
                    className="w-5 h-5 rounded border-input text-primary focus:ring-primary/20 disabled:opacity-50" />
                      <span data-ev-id="ev_3f448e7719" className={`text-sm font-medium ${editIsSponsor ? 'text-muted-foreground' : 'text-foreground'}`}>Sonderpreis</span>
                    </label>
                    {editHasCustomPrice && !editIsSponsor &&
                  <div data-ev-id="ev_b9b991fe5f" className="relative">
                        <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input data-ev-id="ev_2a8a47e47c"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editCustomPrice}
                    onChange={(e) => setEditCustomPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-28 pl-8 pr-2 py-1.5 text-sm border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
                      </div>
                  }
                  </div>
                  <div data-ev-id="ev_cf297582a4" className="md:col-span-2">
                    <label data-ev-id="ev_1ebe3b3a63" className="block text-sm font-medium mb-1">Rechnungsadresse</label>
                    <div data-ev-id="ev_5c94be2fd6" className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input data-ev-id="ev_f7e7065bdd"
                    type="text"
                    value={editCustomerAddress}
                    onChange={(e) => setEditCustomerAddress(e.target.value)}
                    placeholder="Musterstraße 1, 12345 Stadt"
                    className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Zeitraum */}
              <div data-ev-id="ev_b31c279b88">
                <h3 data-ev-id="ev_af377110f2" className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Ausleihzeitraum
                </h3>
                <div data-ev-id="ev_bc6dc4e843" className="grid grid-cols-2 gap-3">
                  <div data-ev-id="ev_7a9a815968">
                    <label data-ev-id="ev_5d5028b906" className="block text-sm font-medium mb-1">Von *</label>
                    <input data-ev-id="ev_78f743d408"
                  type="date"
                  value={editRentalStart}
                  onChange={(e) => setEditRentalStart(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />

                  </div>
                  <div data-ev-id="ev_a7ebb9482b">
                    <label data-ev-id="ev_7d5f692124" className="block text-sm font-medium mb-1">Bis *</label>
                    <input data-ev-id="ev_ea9317a2fe"
                  type="date"
                  value={editRentalEnd}
                  onChange={(e) => setEditRentalEnd(e.target.value)}
                  min={editRentalStart}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />

                  </div>
                </div>
              </div>

              {/* Artikel */}
              <div data-ev-id="ev_35af8b2db9">
                <h3 data-ev-id="ev_0d05b3e30c" className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Leihgegenstände
                </h3>

                {editSelectedItems.length > 0 &&
              <div data-ev-id="ev_2c06155300" className="mb-3 border border-border rounded-lg overflow-hidden">
                    <table data-ev-id="ev_1120bb8e3f" className="w-full text-sm">
                      <thead data-ev-id="ev_6181e19eac" className="bg-muted/50">
                        <tr data-ev-id="ev_f2d2cb494d">
                          <th data-ev-id="ev_efffa90b13" className="text-left px-3 py-2 font-medium">Artikel</th>
                          <th data-ev-id="ev_918772f94b" className="text-left px-3 py-2 font-medium">Zustand</th>
                          <th data-ev-id="ev_62c609ce15" className="text-center px-3 py-2 font-medium">Menge</th>
                          <th data-ev-id="ev_e23c708972" className="text-right px-3 py-2 font-medium">Preis</th>
                          <th data-ev-id="ev_23ab71d96a" className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody data-ev-id="ev_5a1da74867">
                        {editSelectedItems.map((item) => {
                      const editShowStrikethrough = editHasCustomPrice && !editIsSponsor;
                      return (
                        <tr data-ev-id="ev_27914a97f3" key={item.item_id} className="border-t border-border">
                            <td data-ev-id="ev_29fc6ecd52" className="px-3 py-2">{item.item_name}</td>
                            <td data-ev-id="ev_14d99f4248" className="px-3 py-2">
                              <input data-ev-id="ev_36eead9ee3"
                            type="text"
                            value={item.condition || ''}
                            onChange={(e) => updateEditItemCondition(item.item_id, e.target.value)}
                            placeholder="Zustand..."
                            className="w-full px-2 py-1 text-sm border border-input rounded bg-background" />

                            </td>
                            <td data-ev-id="ev_84ef33dc90" className="px-3 py-2 text-center">{item.quantity}</td>
                            <td data-ev-id="ev_586e375e1e" className={`px-3 py-2 text-right ${editShowStrikethrough ? 'text-muted-foreground line-through' : ''}`}>{item.total_price.toLocaleString('de-DE')} €</td>
                            <td data-ev-id="ev_d301f135ad" className="px-2">
                              <button data-ev-id="ev_f9cb48e273"
                            onClick={() => removeEditItem(item.item_id)}
                            className="p-1 hover:bg-red-50 rounded transition-colors">

                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </td>
                          </tr>);
                    })}
                      </tbody>
                    </table>
                  </div>
              }

                {editShowItemSelector ?
              <div data-ev-id="ev_2f007b8f50" className="p-3 bg-muted/30 rounded-lg flex flex-col gap-3">
                    <div data-ev-id="ev_3b85959ddf" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div data-ev-id="ev_9cd5f9af5d" className="md:col-span-2">
                        <label data-ev-id="ev_cbbc50231c" className="block text-sm font-medium mb-1">Artikel</label>
                        <select data-ev-id="ev_79af4e5a27"
                    value={editSelectedItemId}
                    onChange={(e) => setEditSelectedItemId(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background">

                          <option data-ev-id="ev_63cc941164" value="">Artikel auswählen...</option>
                          {activeItems.map((item) => {
                        const showWarning = shouldShowRentalWarning(item.id);
                        const rentalHint = formatRentalHint(item.id);
                        return (
                          <option data-ev-id="ev_a70d0ba343" key={item.id} value={item.id}>
                                {item.name} {formatItemPrices(item)}{!item.is_single_item ? ' (Mehrfach)' : ''}{showWarning ? ` ⚠️ Verliehen${rentalHint}` : ''}
                              </option>);

                      })}
                        </select>
                        {/* Button: Neuen Artikel erstellen */}
                        <button data-ev-id="ev_2aee16fd7a"
                    type="button"
                    onClick={() => setShowNewItemModal(true)}
                    className="mt-2 text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          Neuen Artikel erstellen
                        </button>
                        {/* Warnung bei verliehenen Einzelstücken */}
                        {editSelectedItemId && shouldShowRentalWarning(editSelectedItemId) &&
                    <div data-ev-id="ev_88a749b359" className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div data-ev-id="ev_8148524f31">
                              <strong data-ev-id="ev_fc249f836d">Achtung:</strong> Dieser Artikel ist aktuell verliehen.
                              {(() => {
                          const info = getRentalInfo(editSelectedItemId);
                          if (info) {
                            return (
                              <span data-ev-id="ev_bafb55ad09" className="block text-xs mt-1">
                                      Geplante Rückgabe: {new Date(info.rental_end).toLocaleDateString('de-DE')} ({info.customer_name})
                                    </span>);

                          }
                          return null;
                        })()}
                            </div>
                          </div>
                    }
                      </div>
                      <div data-ev-id="ev_271ca43b4a">
                        <label data-ev-id="ev_ed8080dd86" className="block text-sm font-medium mb-1">Menge</label>
                        {(() => {
                      const selectedItem = activeItems.find((i) => i.id === editSelectedItemId);
                      const isSingleItem = selectedItem?.is_single_item ?? true;
                      return isSingleItem ?
                      <div data-ev-id="ev_b1f11734dc" className="w-full px-3 py-2 border border-input rounded-lg bg-muted text-muted-foreground cursor-not-allowed">
                              1 <span data-ev-id="ev_9aea151e20" className="text-xs">(Einzelstück)</span>
                            </div> :

                      <input data-ev-id="ev_adc9a11949"
                      type="number"
                      min="1"
                      value={editSelectedItemQuantity}
                      onChange={(e) => setEditSelectedItemQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background" />;

                    })()}
                      </div>
                    </div>
                    <div data-ev-id="ev_f580347320">
                      <label data-ev-id="ev_7c5fa9b1e6" className="block text-sm font-medium mb-1">Zustand (optional)</label>
                      <input data-ev-id="ev_c2f1cd1c06"
                  type="text"
                  value={editSelectedItemCondition}
                  onChange={(e) => setEditSelectedItemCondition(e.target.value)}
                  placeholder="z.B. leichte Gebrauchsspuren..."
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background" />

                    </div>
                    <div data-ev-id="ev_58701f5b80" className="flex gap-2">
                      <button data-ev-id="ev_5fe7b9efb5"
                  onClick={addEditItem}
                  disabled={!editSelectedItemId || !editRentalStart || !editRentalEnd}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">

                        Hinzufügen
                      </button>
                      <button data-ev-id="ev_47a074f336"
                  onClick={() => {
                    setEditShowItemSelector(false);
                    setEditSelectedItemId('');
                    setEditSelectedItemQuantity(1);
                    setEditSelectedItemCondition('');
                  }}
                  className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">

                        Abbrechen
                      </button>
                    </div>
                  </div> :

              <button data-ev-id="ev_2ad98e11ca"
              onClick={() => setEditShowItemSelector(true)}
              className="w-full p-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">

                    <Plus className="w-4 h-4" />
                    Artikel hinzufügen
                  </button>
              }
              </div>

              {/* Lieferung */}
              <label data-ev-id="ev_4412caddb9" className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
                <input data-ev-id="ev_f70ea1bb28"
              type="checkbox"
              checked={editIncludeDelivery}
              onChange={(e) => setEditIncludeDelivery(e.target.checked)}
              className="w-5 h-5 rounded border-input text-primary focus:ring-primary/20" />

                <div data-ev-id="ev_f2178f8c67">
                  <span data-ev-id="ev_3fdf9c814d" className="font-medium">Zustellung & Abholung</span>
                  <span data-ev-id="ev_207f263f18" className="text-muted-foreground ml-2">({rentalDeliveryCost.toLocaleString('de-DE')} €)</span>
                </div>
              </label>

              {/* Notizen */}
              <div data-ev-id="ev_79b4e7daff">
                <label data-ev-id="ev_ee0342933e" className="block text-sm font-medium mb-1">Besondere Merkmale / Schäden</label>
                <textarea data-ev-id="ev_72be4cdd5a"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none" />

              </div>

              {/* Summe */}
              {editSelectedItems.length > 0 &&
            <div data-ev-id="ev_95d2f071e4" className="bg-muted/30 p-3 rounded-lg">
                  <div data-ev-id="ev_65d182f56d" className="flex justify-between text-sm">
                    <span data-ev-id="ev_6e0f01d6ff" className="text-muted-foreground">Artikel</span>
                    <span data-ev-id="ev_f59a664251">{calculateEditTotals().itemsTotal.toLocaleString('de-DE')} €</span>
                  </div>
                  {editIncludeDelivery &&
              <div data-ev-id="ev_bcc2ede020" className="flex justify-between text-sm mt-1">
                      <span data-ev-id="ev_36a64ee4fe" className="text-muted-foreground">Zustellung</span>
                      <span data-ev-id="ev_af614b122f">{rentalDeliveryCost.toLocaleString('de-DE')} €</span>
                    </div>
              }
                  <div data-ev-id="ev_25f4d9cc8d" className="flex justify-between font-semibold text-lg mt-2 pt-2 border-t border-border">
                    <span data-ev-id="ev_7aaa2acb75">Gesamt</span>
                    <span data-ev-id="ev_0b19ad075f" className="text-primary">{calculateEditTotals().totalAmount.toLocaleString('de-DE')} €</span>
                  </div>
                </div>
            }
            </div>

            {/* Actions */}
            <div data-ev-id="ev_1fc06f8c76" className="flex justify-end gap-3 p-4 border-t border-border">
              <button data-ev-id="ev_a1ee4a73eb"
            onClick={() => setEditingContract(null)}
            className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_081ea54679"
            onClick={handleSaveEdit}
            disabled={savingEdit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">

                {savingEdit ?
              <span data-ev-id="ev_27f17b049b" className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

              <CheckCircle2 className="w-4 h-4" />
              }
                Änderungen speichern
              </button>
            </div>
          </div>
        </div>
      }

      {/* Modal: Neuen Artikel erstellen */}
      {showNewItemModal &&
      <div data-ev-id="ev_4c2002de34" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div data-ev-id="ev_d49dedf1df" className="bg-card rounded-xl shadow-xl w-full max-w-md">
          <div data-ev-id="ev_0d34d273ba" className="p-4 border-b border-border flex items-center justify-between">
            <div data-ev-id="ev_abd1e5173e" className="flex items-center gap-2">
              <Box className="w-5 h-5 text-primary" />
              <h3 data-ev-id="ev_02abcc7e2b" className="font-semibold text-foreground">Neuen Artikel erstellen</h3>
            </div>
            <button data-ev-id="ev_d5a75f8f59"
            onClick={() => setShowNewItemModal(false)}
            className="p-1 hover:bg-muted rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div data-ev-id="ev_8c07c121a9" className="p-4 flex flex-col gap-4">
            <div data-ev-id="ev_4ef54e55d5">
              <label data-ev-id="ev_87038f147a" className="block text-sm font-medium text-foreground mb-1">Name *</label>
              <input data-ev-id="ev_4eeabbb6fa"
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="z.B. C-Schlauch, Festzelt 6x12m"
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
            </div>
            <div data-ev-id="ev_506a1ab825">
              <label data-ev-id="ev_ffa07cac6b" className="block text-sm font-medium text-foreground mb-1">Beschreibung</label>
              <textarea data-ev-id="ev_98f503ffa4"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              placeholder="Optionale Beschreibung..."
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none" />
            </div>
            <div data-ev-id="ev_f071ea2e6b" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div data-ev-id="ev_aa70eaa038" className="flex items-center gap-2 border border-input rounded-lg px-3 py-2">
                <span data-ev-id="ev_9a3b1e6875" className="text-sm text-muted-foreground whitespace-nowrap">1 Tag</span>
                <div data-ev-id="ev_097ea2635c" className="relative flex-1">
                  <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input data-ev-id="ev_5c9831b230" type="number" step="0.01" min="0"
                  value={newItemPrice1Day}
                  onChange={(e) => setNewItemPrice1Day(e.target.value)}
                  placeholder="0"
                  className="w-full pl-5 pr-1 py-1 text-sm border-0 focus:ring-0 bg-transparent" />
                </div>
              </div>
              <div data-ev-id="ev_42592b6a60" className="flex items-center gap-2 border border-input rounded-lg px-3 py-2">
                <span data-ev-id="ev_cc80dfd313" className="text-sm text-muted-foreground whitespace-nowrap">2 Tage</span>
                <div data-ev-id="ev_dac711f8da" className="relative flex-1">
                  <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input data-ev-id="ev_0a31904c19" type="number" step="0.01" min="0"
                  value={newItemPrice2Days}
                  onChange={(e) => setNewItemPrice2Days(e.target.value)}
                  placeholder="0"
                  className="w-full pl-5 pr-1 py-1 text-sm border-0 focus:ring-0 bg-transparent" />
                </div>
              </div>
              <div data-ev-id="ev_66a3468f1d" className="flex items-center gap-2 border border-input rounded-lg px-3 py-2">
                <span data-ev-id="ev_62ad19c1de" className="text-sm text-muted-foreground whitespace-nowrap">3 Tage</span>
                <div data-ev-id="ev_11c23a4580" className="relative flex-1">
                  <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input data-ev-id="ev_b2a70b23b8" type="number" step="0.01" min="0"
                  value={newItemPrice3Days}
                  onChange={(e) => setNewItemPrice3Days(e.target.value)}
                  placeholder="0"
                  className="w-full pl-5 pr-1 py-1 text-sm border-0 focus:ring-0 bg-transparent" />
                </div>
              </div>
              <div data-ev-id="ev_df8c3c2eff" className="flex items-center gap-2 border border-input rounded-lg px-3 py-2">
                <span data-ev-id="ev_d997226b53" className="text-sm text-muted-foreground whitespace-nowrap">Woche</span>
                <div data-ev-id="ev_ec069ab6f9" className="relative flex-1">
                  <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input data-ev-id="ev_7ee1da4757" type="number" step="0.01" min="0"
                  value={newItemPriceWeek}
                  onChange={(e) => setNewItemPriceWeek(e.target.value)}
                  placeholder="0"
                  className="w-full pl-5 pr-1 py-1 text-sm border-0 focus:ring-0 bg-transparent" />
                </div>
              </div>
            </div>
            <p data-ev-id="ev_41f0ac7718" className="text-xs text-muted-foreground -mt-2">
              Mindestens einen Preis ausfüllen. Ab 4 Tagen wird automatisch das Günstigere berechnet.
            </p>
            <div data-ev-id="ev_8da3f394bd" className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div data-ev-id="ev_8b090b2a3f">
                <span data-ev-id="ev_934e9fd254" className="font-medium text-foreground">Einzelstück</span>
                <p data-ev-id="ev_3b822a452e" className="text-xs text-muted-foreground">Nur 1x vorhanden, Warnung bei Doppelbuchung</p>
              </div>
              <button data-ev-id="ev_d98b6a91a2"
              type="button"
              onClick={() => setNewItemIsSingle(!newItemIsSingle)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newItemIsSingle ? 'bg-primary' : 'bg-muted'}`}>
                <span data-ev-id="ev_b517b0d97b" className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newItemIsSingle ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
          <div data-ev-id="ev_ce0ee28e4b" className="flex justify-end gap-3 p-4 border-t border-border">
            <button data-ev-id="ev_2e12f4e322"
            onClick={() => setShowNewItemModal(false)}
            className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">
              Abbrechen
            </button>
            <button data-ev-id="ev_e95c358992"
            onClick={handleCreateNewItem}
            disabled={savingNewItem || !newItemName.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
              {savingNewItem ?
              <span data-ev-id="ev_bb50e86e0f" className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :
              <Save className="w-4 h-4" />
              }
              Erstellen
            </button>
          </div>
        </div>
      </div>
      }
    </div>);

}