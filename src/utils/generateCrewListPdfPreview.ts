import { loadOptimizedBackground, createCompressedPdf } from './pdfBackground';
import { loadRobotoFonts, setFont } from './fonts/roboto-font';

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
  const margin = 12;
  const gap = 5;
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
  
  yPos = infoBoxY + infoBoxHeight + 6;
  
  // Fahrzeuge sortieren: Normale zuerst, Bereitschaft zuletzt
  const sortedVehicles = [...inputVehicles].sort((a, b) => {
    if (a.isStandby && !b.isStandby) return 1;
    if (!a.isStandby && b.isStandby) return -1;
    return 0;
  });
  
  // Helper: Draw compact vehicle box - KOMPAKT ohne Icons
  const drawCompactVehicleBox = (
    vehicle: typeof sortedVehicles[0], 
    startX: number, 
    startY: number, 
    boxWidth: number
  ): number => {
    const positions = vehicle.positions;
    const isStandby = vehicle.isStandby || false;
    const headerHeight = 10; // Kompakter
    const cellHeight = 10; // Kompakter
    const cellPadding = 2;
    const cellGap = 2;
    
    const contentHeight = positions.length * (cellHeight + cellGap) + cellPadding;
    const totalHeight = headerHeight + contentHeight;
    
    // Bereitschafts-Streifen (links, 3px)
    if (isStandby) {
      doc.setFillColor(standbyOrange.r, standbyOrange.g, standbyOrange.b);
      doc.roundedRect(startX, startY, 3, totalHeight, 1.5, 1.5, 'F');
      doc.rect(startX + 1.5, startY, 1.5, totalHeight, 'F');
    }
    
    const headerX = isStandby ? startX + 3 : startX;
    const headerWidth = isStandby ? boxWidth - 3 : boxWidth;
    
    // Header - DUNKELGRAU
    doc.setFillColor(headerGray.r, headerGray.g, headerGray.b);
    doc.setDrawColor(headerGray.r - 10, headerGray.g - 10, headerGray.b - 10);
    doc.setLineWidth(0.4);
    if (isStandby) {
      doc.roundedRect(headerX, startY, headerWidth, headerHeight, 0, 1.5, 'FD');
    } else {
      doc.roundedRect(headerX, startY, headerWidth, headerHeight, 1.5, 1.5, 'FD');
    }
    
    // Fahrzeugname - weiß auf dunkelgrau, zentriert
    doc.setFontSize(9);
    setFont(doc, 'bold');
    doc.setTextColor(255, 255, 255);
    
    if (isStandby) {
      // BEREITSCHAFT Badge rechts
      const bereitschaftText = 'BEREITSCHAFT';
      doc.setFontSize(6);
      const bereitschaftWidth = doc.getTextWidth(bereitschaftText);
      
      const badgeX = headerX + headerWidth - bereitschaftWidth - 5;
      const badgeY = startY + 3;
      doc.setFillColor(standbyOrange.r, standbyOrange.g, standbyOrange.b);
      doc.roundedRect(badgeX - 1.5, badgeY - 1.5, bereitschaftWidth + 3, 5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(bereitschaftText, badgeX, badgeY + 2);
      
      // Fahrzeugname links
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(vehicle.name.toUpperCase(), headerX + 4, startY + 6.5);
    } else {
      doc.text(vehicle.name.toUpperCase(), headerX + headerWidth / 2, startY + 6.5, { align: 'center' });
    }
    
    // Content area - weiß mit Rahmen
    const contentY = startY + headerHeight - 0.5;
    const contentX = isStandby ? startX + 3 : startX;
    const contentWidthActual = isStandby ? boxWidth - 3 : boxWidth;
    
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    if (isStandby) {
      doc.roundedRect(contentX, contentY, contentWidthActual, contentHeight + 0.5, 0, 1.5, 'FD');
    } else {
      doc.roundedRect(contentX, contentY, contentWidthActual, contentHeight + 0.5, 1.5, 1.5, 'FD');
    }
    doc.setFillColor(255, 255, 255);
    doc.rect(contentX + 0.3, contentY, contentWidthActual - 0.6, 2, 'F');
    
    // Position cells - SCHLICHT, einheitlich grau
    let cellY = contentY + cellPadding;
    const cellWidth = contentWidthActual - cellPadding * 2;
    
    for (const position of positions) {
      drawCompactPositionCell(contentX + cellPadding, cellY, cellWidth, cellHeight, position.label, position.prefillName);
      cellY += cellHeight + cellGap;
    }
    
    return totalHeight + 1;
  };
  
  // Helper: Draw compact position cell - SCHLICHT & KOMPAKT
  const drawCompactPositionCell = (x: number, y: number, width: number, height: number, label: string, prefillName?: string) => {
    const borderColor = { r: 200, g: 200, b: 200 };
    
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.setLineWidth(0.3);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, height, 1, 1, 'FD');
    
    // Label oben links - gut lesbar
    doc.setFontSize(7);
    setFont(doc, 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(label, x + 2, y + 4);
    
    // Prefilled name oder Linie
    if (prefillName) {
      doc.setFontSize(7);
      setFont(doc, 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(prefillName, x + 2, y + height - 2);
    } else {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.line(x + 2, y + height - 2, x + width - 2, y + height - 2);
    }
  };
  
  // Track positions for both columns
  let leftY = yPos;
  let rightY = yPos;
  const leftX = margin;
  const rightX = margin + colWidth + gap;
  
  // Fahrzeuge verteilen (bereits sortiert: normale zuerst, Bereitschaft zuletzt)
  for (let i = 0; i < sortedVehicles.length; i++) {
    const vehicle = sortedVehicles[i];
    const estimatedHeight = 8 + vehicle.positions.length * 12 + 3;
    
    const useLeftColumn = leftY <= rightY;
    const startX = useLeftColumn ? leftX : rightX;
    const startY = useLeftColumn ? leftY : rightY;
    
    // Seitenumbruch prüfen
    if (startY + estimatedHeight > pageHeight - 25) {
      doc.addPage();
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
      leftY += boxHeight + 3;
    } else {
      rightY += boxHeight + 3;
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
