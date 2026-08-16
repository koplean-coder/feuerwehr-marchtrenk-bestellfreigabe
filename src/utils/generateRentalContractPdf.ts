import jsPDF from 'jspdf';
import { loadRobotoFonts, setFont } from './fonts/roboto-font';
import { loadOptimizedLogo } from './pdfBackground';

export interface RentalContractClause {
  id: string;
  title: string;
  text: string;
}

export const DEFAULT_RENTAL_CONTRACT_HEADER = `Ansprechperson: Marcel Gradauer | Tel: 0724358112585 / 0660 974 8617 | Mo–Do 07:00–16:00, Fr 07:00–12:00 | office@feuerwehr-marchtrenk.at`;

export const DEFAULT_RENTAL_CONTRACT_CLAUSES: RentalContractClause[] = [
  { id: '1_1', title: '1 Zustand', text: '1.1 Folgende besondere Merkmale oder Schäden waren dem Verleiher bereits vor dem Verleih bekannt:' },
  { id: '2_1', title: '2 Haftung', text: '2.1 Der Verleiher kann für finanzielle Schäden des Kunden oder Dritter, die durch technisches Versagen von verliehenem Equipment verursacht werden, nicht haften.' },
  { id: '2_2', title: '', text: '2.2 Der Kunde ist verpflichtet, Schäden am Equipment, die während der Leihfrist aufgetreten sind, dem Verleiher unmittelbar mitzuteilen.' },
  { id: '2_3', title: '', text: '2.3 Schäden durch unsachgemäßen Umgang gehen zu Lasten des Kunden (Reparaturkosten bzw. Ersatz). Bei Totalschaden oder Verlust zahlt der Kunde den Neupreis des betroffenen Artikels.' },
  { id: '3_1', title: '3 Rückgabe', text: '3.1 Die Rückgabe erfolgt zum vereinbarten Zeitpunkt bzw. Werktags zu den Geschäftszeiten. (siehe oben)' },
  { id: '3_2', title: '', text: '3.2 Verzögert sich die planmäßige Rückgabe ohne vorherige Absprache, wird für jeden weiteren Tag der übliche Tagessatz berechnet.' },
  { id: '3_3', title: '', text: '3.3 Der Kunde sorgt selbständig für die Abholung/Rückgabe beim Verleiher. Auf Wunsch kann das Equipment nach Absprache auch abgeholt werden – hierfür wird ein Entgelt berechnet.' },
  { id: '3_4', title: '', text: '3.4 Bringt der Kunde das Equipment beschädigt, verschmutzt oder gar nicht zurück, gilt Punkt 2.3.' },
  { id: '4_1', title: '4 Leihkosten', text: '4.1 Die Leihkosten werden je nach Leihgegenstand verrechnet. Die angeführten Preise verstehen sich inkl. Mehrwertsteuer.' }
];

export interface RentalContractPdfData {
  contractNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  isSponsor?: boolean;
  hasCustomPrice?: boolean;
  customPrice?: number | null;
  items: Array<{
    item_name: string;
    quantity: number;
    price_per_unit: number;
    total_price: number;
    price_short?: number;
    price_week?: number;
    condition?: string;
  }>;
  rentalStart: string;
  rentalEnd: string;
  totalAmount: number;
  deliveryCost: number;
  includeDelivery: boolean;
  notes?: string | null;
  createdAt: string;
  // Rückgabe-Info
  returnedAt?: string | null;
  damageNotes?: string | null;
  conditionReturn?: string | null;
  additionalCosts?: number | null;
  additionalCostsReason?: string | null;
}

export interface RentalContractPdfOptions {
  header: string;
  clauses: RentalContractClause[];
  deliveryCost: number;
  overduePerDay: number;
  logoUrl?: string;
}

// Use optimized logo loader from pdfBackground for smaller file sizes

export async function generateRentalContractPdf(
  data: RentalContractPdfData,
  options: RentalContractPdfOptions
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  await loadRobotoFonts(doc);

  const pageWidth = 210;
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  
  // Platzhalter-Ersetzung
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const startDate = new Date(data.rentalStart);
  const endDate = new Date(data.rentalEnd);
  const today = new Date();
  const itemsList = data.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ');
  
  const replacePlaceholders = (text: string): string => {
    return text
      .replace(/\{\{kunde_name\}\}/g, data.customerName || '')
      .replace(/\{\{kunde_adresse\}\}/g, data.customerAddress || '')
      .replace(/\{\{kunde_email\}\}/g, data.customerEmail || '')
      .replace(/\{\{kunde_telefon\}\}/g, data.customerPhone || '')
      .replace(/\{\{vertragsnummer\}\}/g, data.contractNumber || '')
      .replace(/\{\{leihfrist_start\}\}/g, `${weekdays[startDate.getDay()]}. ${startDate.toLocaleDateString('de-DE')}`)
      .replace(/\{\{leihfrist_ende\}\}/g, `${weekdays[endDate.getDay()]}. ${endDate.toLocaleDateString('de-DE')}`)
      .replace(/\{\{leihgegenstand\}\}/g, itemsList)
      .replace(/\{\{gesamtbetrag\}\}/g, `${data.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`)
      .replace(/\{\{lieferkosten\}\}/g, `${data.deliveryCost.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`)
      .replace(/\{\{datum_heute\}\}/g, today.toLocaleDateString('de-DE'))
      .replace(/\{\{verzugsgebuehr\}\}/g, `${options.overduePerDay.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`);
  };
  
  // Colors
  const RED = { r: 180, g: 40, b: 40 };
  const BLACK = { r: 0, g: 0, b: 0 };
  const GRAY = { r: 80, g: 80, b: 80 };
  const DARK_GRAY = { r: 60, g: 60, b: 60 };
  
  let y = 10;

  // ============ PAGE 1 ============

  // --- LOGO (top left, wide horizontal format) ---
  const logoWidth = 75;
  const logoHeight = 19;
  
  if (options.logoUrl) {
    try {
      const logoBase64 = await loadOptimizedLogo(options.logoUrl, 400, 200);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', marginLeft, y, logoWidth, logoHeight);
      }
    } catch (e) {
      console.error('Failed to load logo:', e);
    }
  }
  
  y += logoHeight + 3;

  // --- HORIZONTAL LINE (red separator - Feuerwehr Design) ---
  doc.setDrawColor(RED.r, RED.g, RED.b);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 4;

  // --- CONTACT LINE (small text below the line) ---
  setFont(doc, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
  doc.text(replacePlaceholders(options.header), marginLeft, y);
  y += 10;

  // --- TITLE (left aligned, in RED, underlined) with contract number ---
  setFont(doc, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(RED.r, RED.g, RED.b);
  const titleText = `Leihvertrag ${data.contractNumber}`;
  doc.text(titleText, marginLeft, y);
  
  // Underline the title
  const titleWidth = doc.getTextWidth(titleText);
  doc.setDrawColor(RED.r, RED.g, RED.b);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y + 1, marginLeft + titleWidth, y + 1);
  y += 12;

  // --- FORM FIELDS ---
  const labelWidth = 50;
  const fieldStartX = marginLeft + labelWidth + 2;
  const fieldWidth = contentWidth - labelWidth - 2;
  const fieldHeight = 8;

  // Helper: Draw section heading with red underline extending to right edge
  const drawSectionHeading = (text: string) => {
    setFont(doc, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(RED.r, RED.g, RED.b);
    doc.text(text, marginLeft, y);
    
    // Red underline from text start to right margin
    doc.setDrawColor(RED.r, RED.g, RED.b);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y + 1.5, pageWidth - marginRight, y + 1.5);
    y += 8;
  };

  const drawFormField = (label: string, value: string) => {
    // Label
    setFont(doc, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
    doc.text(label, marginLeft, y + 5.5);
    
    // Field box with light background
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(252, 252, 252);
    doc.rect(fieldStartX, y, fieldWidth, fieldHeight, 'FD');
    
    // Value in BOLD for better readability
    setFont(doc, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b);
    doc.text(value || '', fieldStartX + 3, y + 5.5);
    
    y += fieldHeight + 3;
  };

  // Customer data fields
  drawFormField('Name des Kunden', data.customerName);
  drawFormField('Rechnungsadresse', data.customerAddress || '');
  drawFormField('Kundenemail (Pflichtfeld)', data.customerEmail || '');
  drawFormField('Telefon', data.customerPhone || '');
  
  if (data.isSponsor) {
    y += 5;
    doc.setFillColor(34, 139, 34);
    doc.roundedRect(marginLeft, y, 50, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    setFont(doc, 'bold');
    doc.setFontSize(9);
    doc.text('SPONSOR - KOSTENLOS', marginLeft + 25, y + 5.5, { align: 'center' });
    doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
    setFont(doc, 'normal');
    y += 12;
  } else if (data.hasCustomPrice && data.customPrice != null) {
    y += 5;
    doc.setFillColor(59, 130, 246); // blue-500
    doc.roundedRect(marginLeft, y, 55, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    setFont(doc, 'bold');
    doc.setFontSize(9);
    doc.text(`SONDERPREIS: ${data.customPrice.toLocaleString('de-DE')} €`, marginLeft + 27.5, y + 5.5, { align: 'center' });
    doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
    setFont(doc, 'normal');
    y += 12;
  }
  
  // Items as comma-separated list
  const itemsList = data.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ');
  drawFormField('Leihgegenstand', itemsList);
  
  // Leihfrist in einer Zeile mit Wochentag
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const startDate = new Date(data.rentalStart);
  const endDate = new Date(data.rentalEnd);
  const startStr = `${weekdays[startDate.getDay()]}. ${startDate.toLocaleDateString('de-DE')}`;
  const endStr = `${weekdays[endDate.getDay()]}. ${endDate.toLocaleDateString('de-DE')}`;
  drawFormField('Leihfrist', `${startStr} bis ${endStr}`);
  drawFormField('Leihkosten (€)', `${data.totalAmount.toLocaleString('de-DE')} €`);
  
  y += 8;

  // Helper: Draw clause - extract number from text and make it red/bold
  const drawClause = (id: string) => {
    const clause = options.clauses.find(c => c.id === id);
    if (!clause || !clause.text) return;
    
    // Platzhalter im Text ersetzen
    const processedText = replacePlaceholders(clause.text);
    
    // Check if text starts with a number pattern like "1.1 " or "2.1 "
    const numberMatch = processedText.match(/^(\d+\.\d+)\s+(.*)$/s);
    
    if (numberMatch) {
      const [, clauseNumber, restText] = numberMatch;
      
      // Draw number in RED and BOLD
      setFont(doc, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(RED.r, RED.g, RED.b);
      doc.text(clauseNumber, marginLeft, y);
      
      // Draw rest of text in normal gray, offset by number width
      const numberWidth = doc.getTextWidth(clauseNumber) + 2;
      setFont(doc, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b);
      const lines = doc.splitTextToSize(restText, contentWidth - numberWidth);
      doc.text(lines, marginLeft + numberWidth, y);
      y += lines.length * 4 + 3;
    } else {
      // No number prefix found, just render text normally
      setFont(doc, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b);
      const lines = doc.splitTextToSize(processedText, contentWidth);
      doc.text(lines, marginLeft, y);
      y += lines.length * 4 + 3;
    }
  };

  // --- SECTION 1: ZUSTAND ---
  // Finde alle Klauseln für Sektion 1
  const section1Clauses = options.clauses.filter(c => c.id.startsWith('1_')).sort((a, b) => a.id.localeCompare(b.id));
  const section1Title = section1Clauses.find(c => c.title)?.title || '1 Zustand';
  drawSectionHeading(section1Title);

  section1Clauses.forEach(c => drawClause(c.id));

  // Zustand bei Übergabe - IMMER anzeigen
  setFont(doc, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b);
  doc.text('Zustand bei Übergabe:', marginLeft, y);
  y += 5;
  
  setFont(doc, 'normal');
  const itemsWithCondition = data.items.filter(item => item.condition && item.condition.trim());
  
  if (itemsWithCondition.length > 0) {
    // Dokumentierte Mängel pro Artikel anzeigen
    itemsWithCondition.forEach(item => {
      const conditionText = `• ${item.item_name}: ${item.condition}`;
      const condLines = doc.splitTextToSize(conditionText, contentWidth - 5);
      doc.text(condLines, marginLeft + 3, y);
      y += condLines.length * 4 + 2;
    });
    y += 2;
    // Rechtlicher Hinweis für zusätzliche Mängel
    const additionalNotice = 'Der Mieter ist verpflichtet, den Leihgegenstand unmittelbar nach Aufbau auf weitere Mängel zu prüfen. Festgestellte Mängel, die über die oben dokumentierten hinausgehen, sind unverzüglich mit Fotodokumentation dem Verleiher zu melden.';
    const noticeLines = doc.splitTextToSize(additionalNotice, contentWidth - 5);
    doc.text(noticeLines, marginLeft + 3, y);
    y += noticeLines.length * 4 + 2;
  } else {
    // Standardtext wenn keine Mängel dokumentiert
    const defaultConditionText = 'Keine sichtbaren Mängel bei Übergabe festgestellt. Der Mieter ist verpflichtet, den Leihgegenstand unmittelbar nach Aufbau auf Mängel zu prüfen. Festgestellte Mängel sind unverzüglich mit Fotodokumentation dem Verleiher zu melden.';
    const defaultLines = doc.splitTextToSize(defaultConditionText, contentWidth - 5);
    doc.text(defaultLines, marginLeft + 3, y);
    y += defaultLines.length * 4 + 2;
  }

  y += 6;

  // --- SECTION 2: HAFTUNG ---
  const section2Clauses = options.clauses.filter(c => c.id.startsWith('2_')).sort((a, b) => a.id.localeCompare(b.id));
  if (section2Clauses.length > 0) {
    const section2Title = section2Clauses.find(c => c.title)?.title || '2 Haftung';
    drawSectionHeading(section2Title);
    section2Clauses.forEach(c => drawClause(c.id));
  }

  y += 6;

  // --- SECTION 3: RÜCKGABE (noch auf Seite 1) ---
  const section3Clauses = options.clauses.filter(c => c.id.startsWith('3_')).sort((a, b) => a.id.localeCompare(b.id));
  if (section3Clauses.length > 0) {
    const section3Title = section3Clauses.find(c => c.title)?.title || '3 Rückgabe';
    drawSectionHeading(section3Title);
    section3Clauses.forEach(c => drawClause(c.id));
  }

  // ============ PAGE 2 ============
  doc.addPage();
  y = 20;

  // --- SECTION 4: LEIHKOSTEN ---
  const section4Clauses = options.clauses.filter(c => c.id.startsWith('4_')).sort((a, b) => a.id.localeCompare(b.id));
  if (section4Clauses.length > 0) {
    const section4Title = section4Clauses.find(c => c.title)?.title || '4 Leihkosten';
    drawSectionHeading(section4Title);
    section4Clauses.forEach(c => drawClause(c.id));
  }
  
  // --- WEITERE SEKTIONEN (5+) dynamisch ---
  const additionalSections = new Set<string>();
  options.clauses.forEach(c => {
    const sectionNum = c.id.split('_')[0];
    if (parseInt(sectionNum) > 4) {
      additionalSections.add(sectionNum);
    }
  });
  
  Array.from(additionalSections).sort((a, b) => parseInt(a) - parseInt(b)).forEach(sectionNum => {
    const sectionClauses = options.clauses.filter(c => c.id.startsWith(`${sectionNum}_`)).sort((a, b) => a.id.localeCompare(b.id));
    if (sectionClauses.length > 0) {
      y += 6;
      const sectionTitle = sectionClauses.find(c => c.title)?.title || `${sectionNum} Abschnitt`;
      drawSectionHeading(sectionTitle);
      sectionClauses.forEach(c => drawClause(c.id));
    }
  });
  y += 4;

  // --- PREISLISTE (Transparenz für den Kunden) ---
  const colItem = marginLeft;
  const colPrices = marginLeft + 70;
  const colCalc = marginLeft + 115;
  const colSum = marginLeft + 160;
  const rowHeight = 8;

  // Berechne Mietdauer für Preiskalkulation
  const rentalStartDate = new Date(data.rentalStart);
  const rentalEndDate = new Date(data.rentalEnd);
  const rentalDays = Math.ceil((rentalEndDate.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Hilfsfunktion: Berechnungstext erstellen
  const getCalcText = (item: typeof data.items[0]) => {
    const priceShort = item.price_short ?? 0;
    const priceWeek = item.price_week ?? 0;
    const hasShort = priceShort > 0;
    const hasWeek = priceWeek > 0;
    const qty = item.quantity;
    
    // Nur Tagespreis
    if (hasShort && !hasWeek) {
      return `${qty > 1 ? qty + '× ' : ''}${priceShort.toLocaleString('de-DE')}€ × ${rentalDays}T`;
    }
    
    // Nur Pauschale
    if (hasWeek && !hasShort) {
      const fullWeeks = Math.floor(rentalDays / 7);
      const remainingDays = rentalDays % 7;
      if (remainingDays === 0) {
        return `${qty > 1 ? qty + '× ' : ''}${fullWeeks}× Pauschale`;
      } else if (fullWeeks === 0) {
        return `${qty > 1 ? qty + '× ' : ''}1× Pauschale`;
      } else {
        return `${qty > 1 ? qty + '× ' : ''}${fullWeeks}× Pausch. + ${remainingDays}T`;
      }
    }
    
    // Beide Preise - zeige was günstiger ist
    if (hasShort && hasWeek) {
      const dailyTotal = priceShort * rentalDays;
      const fullWeeks = Math.floor(rentalDays / 7);
      const remainingDays = rentalDays % 7;
      
      let weeklyTotal = Infinity;
      let weeklyDesc = '';
      if (remainingDays === 0) {
        weeklyTotal = fullWeeks * priceWeek;
        weeklyDesc = `${fullWeeks}× Pauschale`;
      } else if (fullWeeks === 0) {
        weeklyTotal = priceWeek;
        weeklyDesc = `1× Pauschale`;
      } else {
        const optionA = fullWeeks * priceWeek + remainingDays * priceShort;
        const optionB = (fullWeeks + 1) * priceWeek;
        if (optionA <= optionB) {
          weeklyTotal = optionA;
          weeklyDesc = `${fullWeeks}× Pausch. + ${remainingDays}T`;
        } else {
          weeklyTotal = optionB;
          weeklyDesc = `${fullWeeks + 1}× Pauschale`;
        }
      }
      
      if (rentalDays <= 3 || dailyTotal <= weeklyTotal) {
        return `${qty > 1 ? qty + '× ' : ''}${priceShort.toLocaleString('de-DE')}€ × ${rentalDays}T`;
      } else {
        return `${qty > 1 ? qty + '× ' : ''}${weeklyDesc}`;
      }
    }
    
    return '';
  };

  // Table header (RED background, white text)
  doc.setFillColor(RED.r, RED.g, RED.b);
  doc.rect(marginLeft, y, contentWidth, rowHeight, 'F');
  setFont(doc, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Artikel', colItem + 3, y + 5.5);
  doc.text('Einzelpreise', colPrices, y + 5.5);
  doc.text('Berechnung', colCalc, y + 5.5);
  doc.text('Summe', colSum, y + 5.5);
  y += rowHeight;

  // Table rows - Artikel mit Berechnung
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b);
  
  data.items.forEach((item, idx) => {
    // Alternating row colors
    if (idx % 2 === 0) {
      doc.setFillColor(252, 252, 252);
    } else {
      doc.setFillColor(245, 245, 245);
    }
    doc.rect(marginLeft, y, contentWidth, rowHeight, 'F');
    
    // Draw cell borders
    doc.setDrawColor(220, 220, 220);
    doc.line(colPrices - 3, y, colPrices - 3, y + rowHeight);
    doc.line(colCalc - 3, y, colCalc - 3, y + rowHeight);
    doc.line(colSum - 3, y, colSum - 3, y + rowHeight);
    
    setFont(doc, 'normal');
    doc.setFontSize(8);
    
    // Artikel
    const itemText = item.quantity > 1 ? `${item.quantity}x ${item.item_name}` : item.item_name;
    doc.text(itemText, colItem + 3, y + 5.5);
    
    // Einzelpreise (Tag / Pauschale)
    const priceShort = item.price_short ?? 0;
    const priceWeek = item.price_week ?? 0;
    let pricesText = '';
    if (priceShort > 0 && priceWeek > 0) {
      pricesText = `${priceShort.toLocaleString('de-DE')}€/T | ${priceWeek.toLocaleString('de-DE')}€/P`;
    } else if (priceShort > 0) {
      pricesText = `${priceShort.toLocaleString('de-DE')}€/Tag`;
    } else if (priceWeek > 0) {
      pricesText = `${priceWeek.toLocaleString('de-DE')}€/Pausch.`;
    } else {
      pricesText = 'n.v.';
    }
    doc.text(pricesText, colPrices, y + 5.5);
    
    // Berechnung
    const calcText = getCalcText(item);
    doc.text(calcText, colCalc, y + 5.5);
    
    // Summe
    setFont(doc, 'bold');
    doc.text(`${item.total_price.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`, colSum, y + 5.5);
    
    y += rowHeight;
  });

  // Lieferung (falls gewählt)
  if (data.includeDelivery && data.deliveryCost > 0) {
    doc.setFillColor(250, 250, 250);
    doc.rect(marginLeft, y, contentWidth, rowHeight, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.line(colPrices - 3, y, colPrices - 3, y + rowHeight);
    doc.line(colCalc - 3, y, colCalc - 3, y + rowHeight);
    doc.line(colSum - 3, y, colSum - 3, y + rowHeight);
    
    setFont(doc, 'normal');
    doc.setFontSize(8);
    doc.text('Zustellung & Abholung', colItem + 3, y + 5.5);
    doc.text('pauschal', colPrices, y + 5.5);
    doc.text('einmalig', colCalc, y + 5.5);
    setFont(doc, 'bold');
    doc.text(`${data.deliveryCost.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`, colSum, y + 5.5);
    y += rowHeight;
  }

  y += 4;
  
  // Leihdauer-Anzeige
  const pricingExplanation = `Leihdauer: ${rentalDays} Tag${rentalDays > 1 ? 'e' : ''}`;

  // Summenbox
  doc.setFillColor(RED.r, RED.g, RED.b);
  doc.rect(marginLeft, y, contentWidth, rowHeight + 4, 'F');
  setFont(doc, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(pricingExplanation, colItem + 3, y + 6);
  doc.text(`Gesamtbetrag: ${data.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`, colSum - 15, y + 6);
  y += rowHeight + 4;

  y += 8;

  // Overdue info (kompakter)
  setFont(doc, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
  doc.text(`Hinweis: Bei \u00DCberschreitung der Leihfrist werden ${options.overduePerDay.toLocaleString('de-DE')} \u20AC je Tag zus\u00E4tzlich berechnet.`, marginLeft, y);
  y += 10;

  // --- ZAHLUNGSMODALITÄTEN ---
  drawSectionHeading('Zahlungsmodalitäten');
  y += 2;

  // Payment row
  doc.setFillColor(245, 245, 245);
  doc.rect(marginLeft, y, contentWidth, rowHeight, 'F');
  setFont(doc, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  doc.text('Datum', marginLeft + 3, y + 5);
  doc.text('Betrag', marginLeft + 50, y + 5);
  doc.text('Zahlungsart', marginLeft + 100, y + 5);
  y += rowHeight;

  doc.setDrawColor(200, 200, 200);
  doc.rect(marginLeft, y, contentWidth, rowHeight, 'S');
  setFont(doc, 'normal');
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b);
  doc.text(new Date(data.createdAt).toLocaleDateString('de-DE'), marginLeft + 3, y + 5);
  doc.text(`${data.totalAmount.toLocaleString('de-DE')} €`, marginLeft + 50, y + 5);
  doc.text('Überweisung nach Rechnungserhalt', marginLeft + 100, y + 5);
  y += rowHeight + 15;

  // --- SIGNATURE SECTION (Pickup) ---
  drawSectionHeading('Unterschriften bei Übergabe');
  y += 4;

  // Vorausgefülltes Datum
  const pickupDate = new Date();
  const pickupDateStr = `Marchtrenk, ${pickupDate.toLocaleDateString('de-DE')}`;
  
  setFont(doc, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b);
  doc.text(pickupDateStr, marginLeft, y);
  y += 12;

  // Zwei Unterschriftslinien nebeneinander
  doc.setDrawColor(100, 100, 100);
  doc.line(marginLeft, y, marginLeft + 70, y);
  doc.line(marginLeft + 95, y, marginLeft + contentWidth, y);
  y += 4;
  
  doc.setFontSize(8);
  doc.text('Unterschrift Kunde', marginLeft, y);
  doc.text('Unterschrift Feuerwehr Marchtrenk', marginLeft + 95, y);

  // ============ PAGE 3: RÜCKGABE-PROTOKOLL ============
  doc.addPage();
  y = 20;

  // Header
  setFont(doc, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(RED.r, RED.g, RED.b);
  doc.text('Rückgabe-Protokoll', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Contract reference
  setFont(doc, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
  doc.text(`Vertragsnummer: ${data.contractNumber}`, pageWidth / 2, y, { align: 'center' });
  doc.text(`Kunde: ${data.customerName}`, pageWidth / 2, y + 5, { align: 'center' });
  y += 20;

  // Return date field
  setFont(doc, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  doc.text('Rückgabedatum:', marginLeft, y);
  
  if (data.returnedAt) {
    // Datum ausgefüllt anzeigen
    setFont(doc, 'normal');
    doc.text(data.returnedAt, marginLeft + 40, y);
  } else {
    // Leeres Feld zum Ausfüllen
    doc.setDrawColor(200, 200, 200);
    doc.rect(marginLeft + 40, y - 4, 50, 8, 'S');
  }
  y += 15;

  // Condition checkboxes
  drawSectionHeading('Zustand bei Rückgabe');
  y += 2;

  setFont(doc, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  doc.setDrawColor(100, 100, 100);

  const conditions = [
    { key: 'Wie lt. Vertrag erhalten', label: 'Wie lt. Vertrag erhalten - keine Schäden' },
    { key: 'Leichte Gebrauchsspuren', label: 'Leichte Gebrauchsspuren - Reinigung erforderlich' },
    { key: 'Beschädigt', label: 'Beschädigt - siehe Schadensbeschreibung unten' },
    { key: 'Stark beschädigt', label: 'Stark beschädigt / Totalschaden' }
  ];

  conditions.forEach(condition => {
    const isSelected = data.conditionReturn === condition.key;
    
    if (isSelected) {
      // Gefüllte Checkbox mit Häkchen
      doc.setFillColor(34, 139, 34); // Grün
      doc.rect(marginLeft, y, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('✓', marginLeft + 0.8, y + 3.2);
      doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
      doc.setFontSize(10);
      setFont(doc, 'bold');
      doc.text(condition.label, marginLeft + 8, y + 3);
      setFont(doc, 'normal');
    } else {
      // Leere Checkbox
      doc.rect(marginLeft, y, 4, 4);
      doc.text(condition.label, marginLeft + 8, y + 3);
    }
    y += 8;
  });

  y += 10;

  // Damage description
  drawSectionHeading('Festgestellte Schäden / Mängel');

  // Wenn Mängel erfasst wurden, diese anzeigen
  if (data.damageNotes && data.damageNotes.trim()) {
    // Ausgefüllt: Mängel mit rotem Rahmen hervorheben
    setFont(doc, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
    
    const damageLines = doc.splitTextToSize(data.damageNotes, contentWidth - 10);
    const boxHeight = Math.max(damageLines.length * 5 + 8, 25);
    
    // Roter Rahmen für Aufmerksamkeit
    doc.setDrawColor(RED.r, RED.g, RED.b);
    doc.setFillColor(255, 245, 245);
    doc.rect(marginLeft, y - 2, contentWidth, boxHeight, 'FD');
    
    doc.text(damageLines, marginLeft + 5, y + 4);
    y += boxHeight + 5;
  } else {
    // Leer: Linien zum Ausfüllen
    doc.setDrawColor(200, 200, 200);
    for (let i = 0; i < 4; i++) {
      doc.line(marginLeft, y, marginLeft + contentWidth, y);
      y += 7;
    }
    y += 3;
  }

  y += 5;

  // Additional costs
  drawSectionHeading('Zusätzliche Kosten');
  y += 2;

  setFont(doc, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);

  // Wenn zusätzliche Kosten erfasst wurden, diese anzeigen
  if (data.additionalCosts && data.additionalCosts > 0) {
    // Ausgefüllt: Kosten anzeigen
    doc.setFillColor(255, 250, 240);
    doc.setDrawColor(200, 180, 150);
    doc.rect(marginLeft, y - 2, contentWidth, 20, 'FD');
    
    setFont(doc, 'bold');
    doc.text('Nachforderung:', marginLeft + 5, y + 5);
    doc.text(`${data.additionalCosts.toLocaleString('de-DE')} €`, marginLeft + 50, y + 5);
    
    if (data.additionalCostsReason) {
      setFont(doc, 'normal');
      doc.setFontSize(9);
      const reasonLines = doc.splitTextToSize(`Grund: ${data.additionalCostsReason}`, contentWidth - 15);
      doc.text(reasonLines, marginLeft + 5, y + 12);
    }
    y += 25;
  } else {
    // Leer: Felder zum Ausfüllen
    const costItems = [
      'Reinigungskosten:',
      'Reparaturkosten:',
      'Verspätungsgebühr (_____ Tage):',
      'Sonstige Kosten:'
    ];

    costItems.forEach(item => {
      doc.text(item, marginLeft, y);
      doc.rect(marginLeft + 70, y - 4, 40, 7, 'S');
      doc.text('€', marginLeft + 112, y);
      y += 10;
    });

    y += 3;

    // Total additional costs
    doc.setFillColor(245, 245, 245);
    doc.rect(marginLeft, y, contentWidth, 10, 'F');
    setFont(doc, 'bold');
    doc.text('Gesamte Nachforderung:', marginLeft + 3, y + 7);
    doc.rect(marginLeft + 70, y + 2, 40, 7, 'S');
    doc.text('€', marginLeft + 112, y + 7);
    y += 15;
  }

  // Notes section (2 Zeilen)
  drawSectionHeading('Sonstige Anmerkungen');

  doc.setDrawColor(200, 200, 200);
  for (let i = 0; i < 2; i++) {
    doc.line(marginLeft, y, marginLeft + contentWidth, y);
    y += 7;
  }

  y += 8;

  // Return signatures - same layout as pickup
  drawSectionHeading('Unterschriften bei Rückgabe');
  y += 4;

  // Wenn bereits zurückgegeben, Datum eintragen - sonst leer lassen
  setFont(doc, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b);
  
  if (data.returnedAt) {
    const returnDate = new Date(data.returnedAt).toLocaleDateString('de-DE');
    doc.text(`Marchtrenk, ${returnDate}`, marginLeft, y);
  } else {
    doc.text('Marchtrenk, ____________________', marginLeft, y);
  }
  y += 12;

  // Zwei Unterschriftslinien nebeneinander (wie bei Übergabe)
  doc.setDrawColor(100, 100, 100);
  doc.line(marginLeft, y, marginLeft + 70, y);
  doc.line(marginLeft + 95, y, marginLeft + contentWidth, y);
  y += 4;
  
  doc.setFontSize(8);
  doc.text('Unterschrift Kunde', marginLeft, y);
  doc.text('Unterschrift Feuerwehr Marchtrenk', marginLeft + 95, y);

  // Open PDF in new tab
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}
