import { loadImageAsBase64, loadOptimizedBackground, createCompressedPdf } from './pdfBackground';
import { loadRobotoFonts, setFont } from './fonts/roboto-font';

// Fahrzeug-Icons importieren
import vehicleKdo from '@/assets/uploads/vehicle-kdo.png';
import vehicleTlf from '@/assets/uploads/vehicle-tlf.png';
import vehicleGtlf from '@/assets/uploads/vehicle-gtlf.png';
import vehicleRlf from '@/assets/uploads/vehicle-rlf.png';
import vehicleDlk from '@/assets/uploads/vehicle-dlk.png';
import vehicleLast from '@/assets/uploads/vehicle-last.png';
import vehicleSrf from '@/assets/uploads/vehicle-srf.png';
import vehicleKrf from '@/assets/uploads/vehicle-krf.png';

// Mapping von Fahrzeugnamen zu Icons
const VEHICLE_ICONS: Record<string, string> = {
  'KDO': vehicleKdo,
  'Tank 1': vehicleTlf,
  'Tank 2': vehicleGtlf,
  'Tank 3': vehicleGtlf,
  'DLK': vehicleDlk,
  'Rüst 1': vehicleSrf,
  'Rüst 2': vehicleKrf,
};

// Fahrzeugdaten - Reihenfolge wie gewünscht
const VEHICLES = [
  {
    name: 'KDO',
    positions: ['Maschinist (MA)', 'Einsatzleiter (EL)', 'Mann']
  },
  {
    name: 'Tank 2',
    positions: ['Maschinist (MA)', 'Fahrzeugkommandant (FK)', 'AS-Mann 1 (AS)', 'AS-Mann 2 (AS)', 'AS-Mann 3 (AS)', 'Mann 1', 'Mann 2']
  },
  {
    name: 'Tank 3',
    positions: ['Maschinist (MA)', 'Fahrzeugkommandant (FK)', 'AS-Mann 1 (AS)', 'AS-Mann 2 (AS)', 'AS-Mann 3 (AS)', 'Mann 1', 'Mann 2']
  },
  {
    name: 'DLK',
    positions: ['Maschinist (MA)', 'Fahrzeugkommandant (FK)', 'AS-Mann 1 (AS)']
  },
  {
    name: 'Tank 1',
    positions: ['Maschinist (MA)', 'Fahrzeugkommandant (FK)', 'AS-Mann 1 (AS)']
  },
  {
    name: 'Rüst 1',
    positions: ['Maschinist (MA)', 'Fahrzeugkommandant (FK)', 'Mann 1']
  },
  {
    name: 'Rüst 2',
    positions: ['Maschinist (MA)', 'Fahrzeugkommandant (FK)', 'Mann 1', 'Mann 2', 'Mann 3']
  }
];

// Farbcodierung nach Positionstyp
const getPositionColor = (position: string): { r: number; g: number; b: number } => {
  if (position.includes('(FK)') || position.includes('(EL)') || position.includes('kommandant')) {
    return { r: 180, g: 30, b: 30 }; // Rot - Führung
  } else if (position.includes('(MA)') || position.includes('Maschinist') || position.includes('führer')) {
    return { r: 210, g: 105, b: 30 }; // Orange - Maschinist
  } else if (position.includes('(AS)') || position.includes('AS-')) {
    return { r: 30, g: 100, b: 180 }; // Blau - Atemschutz
  } else {
    return { r: 80, g: 80, b: 80 }; // Grau - Mannschaft
  }
};

// Zeichne ein Feuerwehrfahrzeug-Icon
const drawFireTruckIcon = (doc: jsPDF, x: number, y: number, size: number = 6) => {
  // Hauptkarosserie (Rechteck)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, size * 1.8, size * 0.7, 0.5, 0.5, 'FD');
  
  // Kabine vorne (kleiner)
  doc.roundedRect(x + size * 1.3, y - size * 0.15, size * 0.5, size * 0.85, 0.3, 0.3, 'FD');
  
  // Räder
  doc.setFillColor(255, 255, 255);
  doc.circle(x + size * 0.35, y + size * 0.7, size * 0.2, 'F');
  doc.circle(x + size * 1.1, y + size * 0.7, size * 0.2, 'F');
  doc.circle(x + size * 1.55, y + size * 0.7, size * 0.2, 'F');
  
  // Blaulicht
  doc.setFillColor(100, 150, 255);
  doc.roundedRect(x + size * 1.4, y - size * 0.3, size * 0.25, size * 0.15, 0.1, 0.1, 'F');
};

export async function generateCrewListPdfPreview(pdfBackgroundUrl?: string): Promise<void> {
  const doc = createCompressedPdf();
  await loadRobotoFonts(doc);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  
  // Colors - FF Marchtrenk Corporate (Rot)
  const primaryRed = { r: 200, g: 30, b: 30 };
  
  // Background vorab laden
  const backgroundData = pdfBackgroundUrl ? await loadOptimizedBackground(pdfBackgroundUrl) : null;
  
  const drawBackground = () => {
    if (backgroundData) {
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gState = new (doc as any).GState({ opacity: 1.0 });
      doc.setGState(gState);
      doc.addImage(backgroundData, 'AUTO', 0, 0, pageWidth, pageHeight);
      doc.restoreGraphicsState();
    }
  };
  
  drawBackground();
  
  // === HEADER - Exakt wie Formulargenerator ===
  doc.setFontSize(9);
  setFont(doc, 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Freiwillige Feuerwehr Marchtrenk', margin, 14);
  setFont(doc, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Linzerstraße 43, 4614 Marchtrenk', margin, 18);
  doc.setTextColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.text('Tel: +43 (0) 7243 58112', margin, 22);
  
  // Red header lines - exakt wie Formulargenerator
  doc.setDrawColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.setLineWidth(1.2);
  doc.line(margin, 28, pageWidth - 85, 28);
  doc.setDrawColor(220, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(margin, 30, pageWidth - 85, 30);
  
  // "Besatzungsliste" label above title
  let yPos = 42;
  doc.setFontSize(10);
  setFont(doc, 'normal');
  doc.setTextColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.text('Besatzungsliste', margin, yPos);
  
  yPos += 10;
  
  // Event name - groß und unterstrichen
  doc.setFontSize(22);
  setFont(doc, 'bold');
  doc.setTextColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.text('Übung Waldbrand 2026', margin, yPos);
  
  // Unterstreichung wie im Formulargenerator
  const titleWidth = doc.getTextWidth('Übung Waldbrand 2026');
  doc.setDrawColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos + 2, margin + titleWidth, yPos + 2);
  
  yPos += 12;
  
  // Date
  doc.setFontSize(10);
  setFont(doc, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('15. März 2026, 08:00 Uhr', margin, yPos);
  
  yPos += 12;
  
  // Preload all vehicle icons
  const vehicleIconCache: Record<string, string | null> = {};
  for (const vehicleName of Object.keys(VEHICLE_ICONS)) {
    const iconUrl = VEHICLE_ICONS[vehicleName];
    if (iconUrl && !vehicleIconCache[iconUrl]) {
      vehicleIconCache[iconUrl] = await loadImageAsBase64(iconUrl);
    }
  }
  
  // Helper function to draw a vehicle box - FULL WIDTH
  const drawVehicleBox = (vehicle: typeof VEHICLES[0], startY: number): number => {
    const positions = vehicle.positions;
    const headerHeight = 14; // Etwas höher für das Icon
    const cellHeight = 16; // Größere Eingabefelder
    const cellPadding = 4;
    const cellGap = 4;
    
    // Calculate rows needed (2 columns)
    const numRows = Math.ceil(positions.length / 2);
    const contentHeight = numRows * (cellHeight + cellGap) + cellPadding * 2;
    const totalHeight = headerHeight + contentHeight;
    
    // Vehicle name header - RED background with rounded corners
    doc.setFillColor(primaryRed.r, primaryRed.g, primaryRed.b);
    doc.setDrawColor(primaryRed.r - 30, primaryRed.g, primaryRed.b);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, startY, contentWidth, headerHeight, 3, 3, 'FD');
    
    // Weiße Icon-Box links - mit Abstand zum roten Rand
    const iconBoxWidth = 26;
    const iconBoxHeight = headerHeight - 6;
    const iconBoxX = margin + 3;
    const iconBoxY = startY + 3;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(iconBoxX, iconBoxY, iconBoxWidth, iconBoxHeight, 2, 2, 'F');
    
    // Vehicle icon - horizontal zentriert in der weißen Box
    const iconUrl = VEHICLE_ICONS[vehicle.name];
    const iconData = iconUrl ? vehicleIconCache[iconUrl] : null;
    if (iconData) {
      try {
        const iconWidth = iconBoxWidth - 4;
        const iconHeight = iconBoxHeight - 2;
        const iconX = iconBoxX + (iconBoxWidth - iconWidth) / 2;
        const iconY = iconBoxY + (iconBoxHeight - iconHeight) / 2;
        doc.addImage(iconData, 'PNG', iconX, iconY, iconWidth, iconHeight);
      } catch (e) {
        // Fallback
      }
    }
    
    // Vehicle name text - white, centered
    doc.setFontSize(13);
    setFont(doc, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(vehicle.name.toUpperCase(), margin + iconBoxWidth + 6 + (contentWidth - iconBoxWidth - 6) / 2, startY + 9.5, { align: 'center' });
    
    // Content area - white with rounded bottom corners
    const contentY = startY + headerHeight - 1;
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(primaryRed.r, primaryRed.g, primaryRed.b);
    doc.setLineWidth(1);
    doc.roundedRect(margin, contentY, contentWidth, contentHeight + 1, 3, 3, 'FD');
    // Cover top corners to make them square
    doc.setFillColor(252, 252, 252);
    doc.rect(margin + 0.5, contentY, contentWidth - 1, 4, 'F');
    
    // Draw position cells in 2-column grid
    const colWidth = (contentWidth - cellPadding * 2 - cellGap) / 2;
    let cellY = contentY + cellPadding + 2;
    
    for (let i = 0; i < positions.length; i += 2) {
      // Left cell
      const leftX = margin + cellPadding;
      drawPositionCell(leftX, cellY, colWidth, cellHeight, positions[i]);
      
      // Right cell (if exists)
      if (positions[i + 1]) {
        const rightX = margin + cellPadding + colWidth + cellGap;
        drawPositionCell(rightX, cellY, colWidth, cellHeight, positions[i + 1]);
      }
      
      cellY += cellHeight + cellGap;
    }
    
    return totalHeight + 2;
  };
  
  // Helper to draw a single position cell with color coding
  const drawPositionCell = (x: number, y: number, width: number, height: number, label: string) => {
    const color = getPositionColor(label);
    
    // Cell background - white with colored border, rounded corners
    doc.setDrawColor(color.r, color.g, color.b);
    doc.setLineWidth(1.2);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, height, 2, 2, 'FD');
    
    // Colored top bar for label
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(x, y, width, 5, 2, 2, 'F');
    doc.rect(x, y + 2, width, 3, 'F'); // Square bottom of top bar
    
    // Position label - white text on colored bar
    doc.setFontSize(7);
    setFont(doc, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(label, x + 3, y + 4);
    
    // Line for writing name - in the white area
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(x + 3, y + height - 3, x + width - 3, y + height - 3);
  };
  
  // Draw selected vehicles - FULL WIDTH, single column
  const selectedVehicles = [VEHICLES[0], VEHICLES[1], VEHICLES[3]]; // KDO 1, Tank 2, DLK
  
  for (const vehicle of selectedVehicles) {
    // Check if we need a new page
    const estimatedHeight = 14 + Math.ceil(vehicle.positions.length / 2) * 20 + 15;
    if (yPos + estimatedHeight > pageHeight - 20) {
      doc.addPage();
      
      // Hintergrund auf neuer Seite
      drawBackground();
      
      // Voller Header auf Folgeseite
      doc.setFontSize(9);
      setFont(doc, 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Freiwillige Feuerwehr Marchtrenk', margin, 14);
      setFont(doc, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Linzerstraße 43, 4614 Marchtrenk', margin, 18);
      doc.setTextColor(primaryRed.r, primaryRed.g, primaryRed.b);
      doc.text('Tel: +43 (0) 7243 58112', margin, 22);
      
      // Rote Linien
      doc.setDrawColor(primaryRed.r, primaryRed.g, primaryRed.b);
      doc.setLineWidth(1.2);
      doc.line(margin, 28, pageWidth - 85, 28);
      doc.setDrawColor(220, 80, 80);
      doc.setLineWidth(0.3);
      doc.line(margin, 30, pageWidth - 85, 30);
      
      // Fortsetzungstitel
      doc.setFontSize(10);
      setFont(doc, 'normal');
      doc.setTextColor(primaryRed.r, primaryRed.g, primaryRed.b);
      doc.text('Besatzungsliste - Fortsetzung', margin, 38);
      
      yPos = 45;
    }
    
    const boxHeight = drawVehicleBox(vehicle, yPos);
    yPos += boxHeight + 6;
  }
  
  // Legende
  yPos += 4;
  doc.setFontSize(7);
  setFont(doc, 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Legende:', margin, yPos);
  
  const legendItems = [
    { label: 'FK/EL = Führung', color: { r: 180, g: 30, b: 30 } },
    { label: 'MA = Maschinist', color: { r: 210, g: 105, b: 30 } },
    { label: 'AS = Atemschutz', color: { r: 30, g: 100, b: 180 } },
    { label: 'Mann = Mannschaft', color: { r: 80, g: 80, b: 80 } }
  ];
  
  let legendX = margin + 18;
  for (const item of legendItems) {
    doc.setFillColor(item.color.r, item.color.g, item.color.b);
    doc.roundedRect(legendX, yPos - 2.5, 3, 3, 0.5, 0.5, 'F');
    doc.setFontSize(6);
    setFont(doc, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(item.label, legendX + 4, yPos);
    legendX += 32;
  }
  
  // Footer
  const footerY = pageHeight - 10;
  doc.setDrawColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
  
  doc.setFontSize(7);
  setFont(doc, 'normal');
  doc.setTextColor(120, 120, 120);
  
  const today = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  doc.text(`Erstellt am ${today}`, margin, footerY);
  doc.text('Seite 1 von 1', pageWidth - margin, footerY, { align: 'right' });
  
  // Open PDF
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, '_blank');
}

// ============================================
// ZWEISPALTIGE VERSION
// ============================================
export interface CrewListData {
  eventName: string;
  eventDate?: string;
  eventTime?: string;
  vehicles: { name: string; positions: { label: string; prefillName?: string }[] }[];
  pdfBackgroundUrl?: string;
}

export async function generateCrewListPdfTwoColumn(data: CrewListData): Promise<void> {
  const { eventName, eventDate, eventTime, vehicles: inputVehicles, pdfBackgroundUrl } = data;
  
  const doc = createCompressedPdf();
  await loadRobotoFonts(doc);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const gap = 6; // Abstand zwischen den Spalten
  const colWidth = (pageWidth - margin * 2 - gap) / 2;
  
  // Colors
  const primaryRed = { r: 200, g: 30, b: 30 };
  
  // Background vorab laden (für alle Seiten)
  const backgroundData = pdfBackgroundUrl ? await loadOptimizedBackground(pdfBackgroundUrl) : null;
  
  // Hintergrund auf erster Seite
  const drawBackground = () => {
    if (backgroundData) {
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gState = new (doc as any).GState({ opacity: 1.0 });
      doc.setGState(gState);
      doc.addImage(backgroundData, 'AUTO', 0, 0, pageWidth, pageHeight);
      doc.restoreGraphicsState();
    }
  };
  
  drawBackground();
  
  // === HEADER ===
  doc.setFontSize(9);
  setFont(doc, 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Freiwillige Feuerwehr Marchtrenk', margin, 14);
  setFont(doc, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Linzerstraße 43, 4614 Marchtrenk', margin, 18);
  doc.setTextColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.text('Tel: +43 (0) 7243 58112', margin, 22);
  
  // Red header lines
  doc.setDrawColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.setLineWidth(1.2);
  doc.line(margin, 28, pageWidth - 85, 28);
  doc.setDrawColor(220, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(margin, 30, pageWidth - 85, 30);
  
  // Title
  let yPos = 42;
  doc.setFontSize(10);
  setFont(doc, 'normal');
  doc.setTextColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.text('Besatzungsliste', margin, yPos);
  
  yPos += 10;
  doc.setFontSize(20);
  setFont(doc, 'bold');
  doc.setTextColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.text(eventName, margin, yPos);
  
  const titleWidth = doc.getTextWidth(eventName);
  doc.setDrawColor(primaryRed.r, primaryRed.g, primaryRed.b);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos + 2, margin + titleWidth, yPos + 2);
  
  // Datum und Uhrzeit
  yPos += 10;
  if (eventDate || eventTime) {
    doc.setFontSize(9);
    setFont(doc, 'normal');
    doc.setTextColor(80, 80, 80);
    
    let dateTimeStr = '';
    if (eventDate) {
      const d = new Date(eventDate);
      dateTimeStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    if (eventTime) {
      dateTimeStr += (dateTimeStr ? ', ' : '') + eventTime + ' Uhr';
    }
    doc.text(dateTimeStr, margin, yPos);
  }
  
  yPos += 10;
  
  // Preload all vehicle icons
  const vehicleIconCache: Record<string, string | null> = {};
  for (const vehicleName of Object.keys(VEHICLE_ICONS)) {
    const iconUrl = VEHICLE_ICONS[vehicleName];
    if (iconUrl && !vehicleIconCache[iconUrl]) {
      vehicleIconCache[iconUrl] = await loadImageAsBase64(iconUrl);
    }
  }
  
  // Helper: Draw compact vehicle box for two-column layout
  const drawCompactVehicleBox = (
    vehicle: typeof VEHICLES[0], 
    startX: number, 
    startY: number, 
    boxWidth: number
  ): number => {
    const positions = vehicle.positions;
    const headerHeight = 14; // Höher für Icon-Box
    const cellHeight = 13; // Etwas höher
    const cellPadding = 3;
    const cellGap = 3;
    
    // Single column for positions in compact mode
    const contentHeight = positions.length * (cellHeight + cellGap) + cellPadding;
    const totalHeight = headerHeight + contentHeight;
    
    // Header - roter Hintergrund
    doc.setFillColor(primaryRed.r, primaryRed.g, primaryRed.b);
    doc.setDrawColor(primaryRed.r - 30, primaryRed.g, primaryRed.b);
    doc.setLineWidth(0.5);
    doc.roundedRect(startX, startY, boxWidth, headerHeight, 2, 2, 'FD');
    
    // Weiße Icon-Box links - mit Abstand zum roten Rand
    const iconBoxWidth = 20;
    const iconBoxHeight = headerHeight - 6;
    const iconBoxX = startX + 3;
    const iconBoxY = startY + 3;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(iconBoxX, iconBoxY, iconBoxWidth, iconBoxHeight, 1.5, 1.5, 'F');
    
    // Vehicle icon - horizontal zentriert in der weißen Box
    const iconUrl = VEHICLE_ICONS[vehicle.name];
    const iconData = iconUrl ? vehicleIconCache[iconUrl] : null;
    if (iconData) {
      try {
        const iconWidth = iconBoxWidth - 4;
        const iconHeight = iconBoxHeight - 2;
        const iconX = iconBoxX + (iconBoxWidth - iconWidth) / 2;
        const iconY = iconBoxY + (iconBoxHeight - iconHeight) / 2;
        doc.addImage(iconData, 'PNG', iconX, iconY, iconWidth, iconHeight);
      } catch (e) {
        // Fallback
      }
    }
    
    // Vehicle name - zentriert
    doc.setFontSize(11);
    setFont(doc, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(vehicle.name.toUpperCase(), startX + iconBoxWidth + 6 + (boxWidth - iconBoxWidth - 6) / 2, startY + 9.5, { align: 'center' });
    
    // Content area
    const contentY = startY + headerHeight - 1;
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(primaryRed.r, primaryRed.g, primaryRed.b);
    doc.setLineWidth(0.8);
    doc.roundedRect(startX, contentY, boxWidth, contentHeight + 1, 2, 2, 'FD');
    doc.setFillColor(252, 252, 252);
    doc.rect(startX + 0.4, contentY, boxWidth - 0.8, 3, 'F');
    
    // Position cells - single column
    let cellY = contentY + cellPadding + 1;
    const cellWidth = boxWidth - cellPadding * 2;
    
    for (const position of positions) {
      drawCompactPositionCell(startX + cellPadding, cellY, cellWidth, cellHeight, position.label, position.prefillName);
      cellY += cellHeight + cellGap;
    }
    
    return totalHeight + 2;
  };
  
  // Helper: Draw compact position cell
  const drawCompactPositionCell = (x: number, y: number, width: number, height: number, label: string, prefillName?: string) => {
    const color = getPositionColor(label);
    
    doc.setDrawColor(color.r, color.g, color.b);
    doc.setLineWidth(1);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD');
    
    // Colored left bar
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(x, y, 3, height, 1.5, 1.5, 'F');
    doc.rect(x + 1.5, y, 1.5, height, 'F');
    
    // Label
    doc.setFontSize(6);
    setFont(doc, 'bold');
    doc.setTextColor(color.r, color.g, color.b);
    doc.text(label, x + 5, y + 4);
    
    // Prefilled name (if provided)
    if (prefillName) {
      doc.setFontSize(8);
      setFont(doc, 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(prefillName, x + 5, y + height - 3);
    }
    
    // Line for name
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(x + 5, y + height - 2, x + width - 3, y + height - 2);
  };
  
  // Fahrzeuge aus den übergebenen Daten verwenden
  const selectedVehicles = inputVehicles;
  
  // Seitenzähler
  let currentPage = 1;
  
  // Track positions for both columns
  let leftY = yPos;
  let rightY = yPos;
  const leftX = margin;
  const rightX = margin + colWidth + gap;
  
  // Distribute vehicles alternating between columns, balancing heights
  for (let i = 0; i < selectedVehicles.length; i++) {
    const vehicle = selectedVehicles[i];
    const estimatedHeight = 10 + vehicle.positions.length * 15 + 5;
    
    // Choose column with less height
    const useLeftColumn = leftY <= rightY;
    const startX = useLeftColumn ? leftX : rightX;
    const startY = useLeftColumn ? leftY : rightY;
    
    // Check page break
    if (startY + estimatedHeight > pageHeight - 25) {
      doc.addPage();
      currentPage++;
      
      // Hintergrund auf neuer Seite
      drawBackground();
      
      // Voller Header auf Folgeseite
      doc.setFontSize(9);
      setFont(doc, 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Freiwillige Feuerwehr Marchtrenk', margin, 14);
      setFont(doc, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Linzerstraße 43, 4614 Marchtrenk', margin, 18);
      doc.setTextColor(primaryRed.r, primaryRed.g, primaryRed.b);
      doc.text('Tel: +43 (0) 7243 58112', margin, 22);
      
      // Rote Linien
      doc.setDrawColor(primaryRed.r, primaryRed.g, primaryRed.b);
      doc.setLineWidth(1.2);
      doc.line(margin, 28, pageWidth - 85, 28);
      doc.setDrawColor(220, 80, 80);
      doc.setLineWidth(0.3);
      doc.line(margin, 30, pageWidth - 85, 30);
      
      // Fortsetzungstitel
      doc.setFontSize(10);
      setFont(doc, 'normal');
      doc.setTextColor(primaryRed.r, primaryRed.g, primaryRed.b);
      doc.text('Besatzungsliste - Fortsetzung', margin, 38);
      
      leftY = 45;
      rightY = 45;
    }
    
    const boxHeight = drawCompactVehicleBox(vehicle, startX, useLeftColumn ? leftY : rightY, colWidth);
    
    if (useLeftColumn) {
      leftY += boxHeight + 5;
    } else {
      rightY += boxHeight + 5;
    }
  }
  
  // Legend at bottom
  const legendY = Math.max(leftY, rightY) + 6;
  doc.setFontSize(6);
  setFont(doc, 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Legende:', margin, legendY);
  
  const legendItems = [
    { label: 'FK/EL', color: { r: 180, g: 30, b: 30 } },
    { label: 'MA', color: { r: 210, g: 105, b: 30 } },
    { label: 'AS', color: { r: 30, g: 100, b: 180 } },
    { label: 'Mann', color: { r: 80, g: 80, b: 80 } }
  ];
  
  let legendX = margin + 16;
  for (const item of legendItems) {
    doc.setFillColor(item.color.r, item.color.g, item.color.b);
    doc.roundedRect(legendX, legendY - 2, 2.5, 2.5, 0.4, 0.4, 'F');
    doc.setFontSize(5);
    setFont(doc, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(item.label, legendX + 3.5, legendY);
    legendX += 18;
  }
  
  // Footer auf allen Seiten hinzufügen
  const totalPages = doc.getNumberOfPages();
  const today = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    
    const footerY = pageHeight - 10;
    doc.setDrawColor(primaryRed.r, primaryRed.g, primaryRed.b);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    
    doc.setFontSize(7);
    setFont(doc, 'normal');
    doc.setTextColor(120, 120, 120);
    
    doc.text(`Erstellt am ${today}`, margin, footerY);
    doc.text(`Seite ${page} von ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }
  
  // Open PDF
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, '_blank');
}
