import { loadImageAsBase64, loadOptimizedBackground, createCompressedPdf } from './pdfBackground';
import { loadRobotoFonts, setFont } from './fonts/roboto-font';
import type jsPDF from 'jspdf';

// Fahrzeug-Icons importieren
import vehicleKdo from '@/assets/uploads/vehicle-kdo.png';
import vehicleTlf from '@/assets/uploads/vehicle-tlf.png';
import vehicleGtlf from '@/assets/uploads/vehicle-gtlf.png';
import vehicleDlk from '@/assets/uploads/vehicle-dlk.png';
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

// ============================================
// ZWEISPALTIGE VERSION - ANGEPASST AN FORMULARGENERATOR
// ============================================
export interface CrewListData {
  eventName: string;
  eventDate?: string;
  eventTime?: string;
  description?: string; // NEU: Beschreibung/Treffpunkt
  vehicles: { 
    name: string; 
    positions: { label: string; prefillName?: string }[];
    isStandby?: boolean; // NEU: Bereitschaftsfahrzeug
  }[];
  pdfBackgroundUrl?: string;
}

export async function generateCrewListPdfTwoColumn(data: CrewListData): Promise<void> {
  const { eventName, eventDate, eventTime, description, vehicles: inputVehicles, pdfBackgroundUrl } = data;
  
  const doc = createCompressedPdf();
  await loadRobotoFonts(doc);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const gap = 6;
  const colWidth = (pageWidth - margin * 2 - gap) / 2;
  
  // Farbpalette wie Formulargenerator - schlichter
  const accentRed = { r: 200, g: 30, b: 30 };
  const headerGray = { r: 50, g: 50, b: 50 }; // Dunkelgrau statt Rot
  const standbyOrange = { r: 230, g: 126, b: 34 }; // Orange für Bereitschaft
  
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
  
  // === HEADER - wie Formulargenerator ===
  doc.setFontSize(9);
  setFont(doc, 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Freiwillige Feuerwehr Marchtrenk', margin, 14);
  setFont(doc, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Linzerstraße 43, 4614 Marchtrenk', margin, 18);
  doc.setTextColor(accentRed.r, accentRed.g, accentRed.b);
  doc.text('Tel: +43 (0) 7243 58112', margin, 22);
  
  // Rote Header-Linien
  doc.setDrawColor(accentRed.r, accentRed.g, accentRed.b);
  doc.setLineWidth(1.2);
  doc.line(margin, 28, pageWidth - 85, 28);
  doc.setDrawColor(220, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(margin, 30, pageWidth - 85, 30);
  
  // "Besatzungsliste" Label
  let yPos = 42;
  doc.setFontSize(10);
  setFont(doc, 'normal');
  doc.setTextColor(accentRed.r, accentRed.g, accentRed.b);
  doc.text('Besatzungsliste', margin, yPos);
  
  // Event-Name Titel
  yPos += 10;
  doc.setFontSize(20);
  setFont(doc, 'bold');
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(eventName, pageWidth - margin * 2 - 40);
  doc.text(titleLines, margin, yPos);
  yPos += titleLines.length * 8;
  
  // Beschreibung (optional) - dezent unter dem Titel
  if (description && description.trim()) {
    yPos += 2;
    doc.setFontSize(9);
    setFont(doc, 'normal');
    doc.setTextColor(80, 80, 80);
    const descLines = doc.splitTextToSize(description, pageWidth - margin * 2);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 4 + 2;
  }
  
  // Trennlinie
  yPos += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);
  yPos += 4;
  
  // Info-Box wie Formulargenerator
  const infoBoxY = yPos;
  const infoBoxHeight = 20;
  
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, infoBoxY, pageWidth - margin * 2, infoBoxHeight, 2, 2, 'F');
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, infoBoxY, pageWidth - margin * 2, infoBoxHeight, 2, 2, 'S');
  
  doc.setFontSize(9);
  const infoY = infoBoxY + 7;
  const col1X = margin + 5;
  const col2X = margin + (pageWidth - margin * 2) / 2;
  
  // Datum
  if (eventDate) {
    setFont(doc, 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('DATUM', col1X, infoY);
    setFont(doc, 'normal');
    doc.setTextColor(40, 40, 40);
    const d = new Date(eventDate);
    const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(dateStr, col1X, infoY + 5);
  }
  
  // Uhrzeit
  if (eventTime) {
    setFont(doc, 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('UHRZEIT', col2X, infoY);
    setFont(doc, 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(eventTime + ' Uhr', col2X, infoY + 5);
  }
  
  yPos = infoBoxY + infoBoxHeight + 8;
  
  // Preload vehicle icons
  const vehicleIconCache: Record<string, string | null> = {};
  for (const vehicleName of Object.keys(VEHICLE_ICONS)) {
    const iconUrl = VEHICLE_ICONS[vehicleName];
    if (iconUrl && !vehicleIconCache[iconUrl]) {
      vehicleIconCache[iconUrl] = await loadImageAsBase64(iconUrl);
    }
  }
  
  // Helper: Draw compact vehicle box - NEUER STIL
  const drawCompactVehicleBox = (
    vehicle: typeof inputVehicles[0], 
    startX: number, 
    startY: number, 
    boxWidth: number
  ): number => {
    const positions = vehicle.positions;
    const isStandby = vehicle.isStandby || false;
    const headerHeight = 14;
    const cellHeight = 13;
    const cellPadding = 3;
    const cellGap = 3;
    
    const contentHeight = positions.length * (cellHeight + cellGap) + cellPadding;
    const totalHeight = headerHeight + contentHeight;
    
    // Bereitschafts-Streifen (links, 4px)
    if (isStandby) {
      doc.setFillColor(standbyOrange.r, standbyOrange.g, standbyOrange.b);
      doc.roundedRect(startX, startY, 4, totalHeight, 2, 2, 'F');
      doc.rect(startX + 2, startY, 2, totalHeight, 'F');
    }
    
    const headerX = isStandby ? startX + 4 : startX;
    const headerWidth = isStandby ? boxWidth - 4 : boxWidth;
    
    // Header - DUNKELGRAU statt Rot (wie Formulargenerator)
    doc.setFillColor(headerGray.r, headerGray.g, headerGray.b);
    doc.setDrawColor(headerGray.r - 10, headerGray.g - 10, headerGray.b - 10);
    doc.setLineWidth(0.5);
    if (isStandby) {
      // Rechts abgerundet, links eckig
      doc.roundedRect(headerX, startY, headerWidth, headerHeight, 0, 2, 'FD');
    } else {
      doc.roundedRect(headerX, startY, headerWidth, headerHeight, 2, 2, 'FD');
    }
    
    // Weiße Icon-Box links
    const iconBoxWidth = 20;
    const iconBoxHeight = headerHeight - 6;
    const iconBoxX = headerX + 3;
    const iconBoxY = startY + 3;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(iconBoxX, iconBoxY, iconBoxWidth, iconBoxHeight, 1.5, 1.5, 'F');
    
    // Vehicle icon
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
    
    // Fahrzeugname - weiß auf dunkelgrau
    doc.setFontSize(11);
    setFont(doc, 'bold');
    doc.setTextColor(255, 255, 255);
    
    // Bereitschafts-Label im Header
    if (isStandby) {
      const vehicleNameWidth = doc.getTextWidth(vehicle.name.toUpperCase());
      const bereitschaftText = 'BEREITSCHAFT';
      doc.setFontSize(7);
      const bereitschaftWidth = doc.getTextWidth(bereitschaftText);
      
      // Badge für BEREITSCHAFT
      const badgeX = headerX + headerWidth - bereitschaftWidth - 8;
      const badgeY = startY + 4;
      doc.setFillColor(standbyOrange.r, standbyOrange.g, standbyOrange.b);
      doc.roundedRect(badgeX - 2, badgeY - 2, bereitschaftWidth + 4, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(bereitschaftText, badgeX, badgeY + 2.5);
      
      // Fahrzeugname links vom Badge
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(vehicle.name.toUpperCase(), headerX + iconBoxWidth + 8, startY + 9.5);
    } else {
      doc.text(vehicle.name.toUpperCase(), headerX + iconBoxWidth + 6 + (headerWidth - iconBoxWidth - 6) / 2, startY + 9.5, { align: 'center' });
    }
    
    // Content area - weiß mit Rahmen
    const contentY = startY + headerHeight - 1;
    const contentX = isStandby ? startX + 4 : startX;
    const contentWidthActual = isStandby ? boxWidth - 4 : boxWidth;
    
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    if (isStandby) {
      doc.roundedRect(contentX, contentY, contentWidthActual, contentHeight + 1, 0, 2, 'FD');
    } else {
      doc.roundedRect(contentX, contentY, contentWidthActual, contentHeight + 1, 2, 2, 'FD');
    }
    doc.setFillColor(255, 255, 255);
    doc.rect(contentX + 0.4, contentY, contentWidthActual - 0.8, 3, 'F');
    
    // Position cells - SCHLICHT, einheitlich grau
    let cellY = contentY + cellPadding + 1;
    const cellWidth = contentWidthActual - cellPadding * 2;
    
    for (const position of positions) {
      drawCompactPositionCell(contentX + cellPadding, cellY, cellWidth, cellHeight, position.label, position.prefillName);
      cellY += cellHeight + cellGap;
    }
    
    return totalHeight + 2;
  };
  
  // Helper: Draw compact position cell - SCHLICHT
  const drawCompactPositionCell = (x: number, y: number, width: number, height: number, label: string, prefillName?: string) => {
    // Einheitlich grau statt bunt
    const borderColor = { r: 180, g: 180, b: 180 };
    const labelBg = { r: 100, g: 100, b: 100 };
    
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.setLineWidth(0.5);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD');
    
    // Grauer Balken links für Label
    doc.setFillColor(labelBg.r, labelBg.g, labelBg.b);
    doc.roundedRect(x, y, 3, height, 1.5, 1.5, 'F');
    doc.rect(x + 1.5, y, 1.5, height, 'F');
    
    // Label
    doc.setFontSize(6);
    setFont(doc, 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label, x + 5, y + 4);
    
    // Prefilled name
    if (prefillName) {
      doc.setFontSize(8);
      setFont(doc, 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(prefillName, x + 5, y + height - 3);
    }
    
    // Linie für Namen
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(x + 5, y + height - 2, x + width - 3, y + height - 2);
  };
  
  // Seitenxähler
  let currentPage = 1;
  
  // Track positions for both columns
  let leftY = yPos;
  let rightY = yPos;
  const leftX = margin;
  const rightX = margin + colWidth + gap;
  
  // Fahrzeuge verteilen
  for (let i = 0; i < inputVehicles.length; i++) {
    const vehicle = inputVehicles[i];
    const estimatedHeight = 10 + vehicle.positions.length * 15 + 5;
    
    const useLeftColumn = leftY <= rightY;
    const startX = useLeftColumn ? leftX : rightX;
    const startY = useLeftColumn ? leftY : rightY;
    
    // Seitenumbruch prüfen
    if (startY + estimatedHeight > pageHeight - 25) {
      doc.addPage();
      currentPage++;
      
      drawBackground();
      
      // Header auf Folgeseite
      doc.setFontSize(9);
      setFont(doc, 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Freiwillige Feuerwehr Marchtrenk', margin, 14);
      setFont(doc, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Linzerstraße 43, 4614 Marchtrenk', margin, 18);
      doc.setTextColor(accentRed.r, accentRed.g, accentRed.b);
      doc.text('Tel: +43 (0) 7243 58112', margin, 22);
      
      doc.setDrawColor(accentRed.r, accentRed.g, accentRed.b);
      doc.setLineWidth(1.2);
      doc.line(margin, 28, pageWidth - 85, 28);
      doc.setDrawColor(220, 80, 80);
      doc.setLineWidth(0.3);
      doc.line(margin, 30, pageWidth - 85, 30);
      
      doc.setFontSize(10);
      setFont(doc, 'normal');
      doc.setTextColor(accentRed.r, accentRed.g, accentRed.b);
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
  
  // Footer auf allen Seiten
  const totalPages = doc.getNumberOfPages();
  const today = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    
    const footerY = pageHeight - 10;
    doc.setDrawColor(accentRed.r, accentRed.g, accentRed.b);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    
    doc.setFontSize(7);
    setFont(doc, 'normal');
    doc.setTextColor(120, 120, 120);
    
    doc.text(`Erstellt am ${today}`, margin, footerY);
    doc.text(`Seite ${page} von ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }
  
  // PDF öffnen
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, '_blank');
}

// Legacy export für Rückwärtskompatibilität
export async function generateCrewListPdfPreview(pdfBackgroundUrl?: string): Promise<void> {
  await generateCrewListPdfTwoColumn({
    eventName: 'Übung Waldbrand 2026',
    eventDate: '2026-03-15',
    eventTime: '08:00',
    vehicles: [
      { name: 'KDO', positions: [{ label: 'Maschinist (MA)' }, { label: 'Einsatzleiter (EL)' }, { label: 'Mann' }] },
      { name: 'Tank 2', positions: [{ label: 'Maschinist (MA)' }, { label: 'Fahrzeugkommandant (FK)' }, { label: 'AS-Mann 1 (AS)' }, { label: 'AS-Mann 2 (AS)' }] },
      { name: 'DLK', positions: [{ label: 'Maschinist (MA)' }, { label: 'Fahrzeugkommandant (FK)' }, { label: 'AS-Mann 1 (AS)' }] }
    ],
    pdfBackgroundUrl
  });
}
