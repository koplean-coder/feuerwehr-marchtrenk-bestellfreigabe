import { loadOptimizedBackground, createCompressedPdf } from './pdfBackground';
import { loadRobotoFonts, setFont, isRobotoLoaded } from './fonts/roboto-font';

export interface CategoryOption {
  name: string;
  shortName?: string;
  hasAsOption: boolean;
  requiresCheckbox?: boolean; // true = Checkbox, false = Textfeld (default: true)
}

export interface EventSignupFormData {
  eventName: string;
  description?: string;
  location: string;
  dateTime: string;
  vehicles?: string;
  adjustment: string;
  adjustmentNote?: string;
  registrationDeadline: string;
  categories?: CategoryOption[];
  prefillNames?: string[];
  creatorName: string;
  pdfBackgroundUrl?: string;
  pdfBackgroundOpacity?: number;
  diagonalHeaders?: boolean;
  signatureEnabled?: boolean;
  signatureTitle?: string;
  participantCount?: number;
}

export async function generateEventSignupFormPdf(data: EventSignupFormData): Promise<void> {
  const {
    eventName,
    description,
    location,
    dateTime,
    vehicles,
    adjustment,
    adjustmentNote = 'muss getragen werden, wenn vorhanden',
    registrationDeadline,
    categories,
    prefillNames = [],
    creatorName,
    pdfBackgroundUrl = '',
    pdfBackgroundOpacity = 1.0,
    diagonalHeaders = false,
    signatureEnabled = true,
    signatureTitle = 'UNTERSCHRIFT',
    participantCount
  } = data;

  const backgroundData = pdfBackgroundUrl ? await loadOptimizedBackground(pdfBackgroundUrl) : null;

  const doc = createCompressedPdf();
  
  // Lade Roboto-Schriftart für UTF-8 Unterstützung (Umlaute)
  await loadRobotoFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const hasCategories = categories && categories.length > 0;

  // Column calculations - ohne Nr-Spalte, mehr Platz fuer Namen
  const colName = signatureEnabled ? 55 : 70;
  const colSignature = signatureEnabled ? 40 : 0;
  
  const categoryColWidths: number[] = [];
  let totalCategoryWidth = 0;
  
  if (hasCategories) {
    categories.forEach(cat => {
      const width = cat.hasAsOption ? 18 : 13;
      categoryColWidths.push(width);
      totalCategoryWidth += width;
    });
  }
  
  const usedWidth = colName + colSignature + totalCategoryWidth;
  // Immer auf contentWidth skalieren, damit die Tabelle die volle Breite nutzt
  // Bei signatureEnabled=false werden Name & Kategorien proportional vergrößert
  const scale = contentWidth / usedWidth;
  const scaledColName = colName * scale;
  const scaledColSignature = colSignature * scale;
  const scaledCategoryWidths = categoryColWidths.map(w => w * scale);
  // Bei diagonalen Headers: Höhe basierend auf längstem Kategorienamen
  let maxCategoryLength = 0;
  if (hasCategories && diagonalHeaders) {
    categories.forEach(cat => {
      const len = (cat.shortName || cat.name).length;
      if (len > maxCategoryLength) maxCategoryLength = len;
    });
  }
  // Basis 25, +1 pro Zeichen über 10
  const headerHeight = diagonalHeaders ? Math.max(25, 20 + maxCategoryLength * 0.8) : 10;
  const rowHeight = 8;
  const footerHeight = 18;

  // Helper: Draw background
  const drawBackground = () => {
    if (backgroundData) {
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gState = new (doc as any).GState({ opacity: pdfBackgroundOpacity });
      doc.setGState(gState);
      try {
        doc.addImage(backgroundData, 'AUTO', 0, 0, pageWidth, pageHeight);
      } catch (e) {
        console.error('Failed to add background:', e);
      }
      doc.restoreGraphicsState();
    }
  };

  // Helper: Draw table header
  const drawTableHeader = (startY: number): number => {
    doc.setFillColor(50, 50, 50);
    doc.rect(margin, startY, contentWidth, headerHeight, 'F');
    
    setFont(doc, 'bold');
    doc.setTextColor(255, 255, 255);
    
    let colX = margin;
    
    if (diagonalHeaders) {
      doc.setFontSize(9);
      
      // Name - horizontal zentriert in Spaltenbreite, am unteren Rand
      doc.text('NAME', colX + scaledColName / 2, startY + headerHeight - 3, { align: 'center' });
      colX += scaledColName;
      
      // Categories - diagonal (größere Schrift da mehr Platz im hohen Header)
      if (hasCategories) {
        categories.forEach((cat, idx) => {
          const catWidth = scaledCategoryWidths[idx];
          const displayName = cat.shortName || cat.name;
          
          // Schriftgröße anpassen basierend auf Textlänge - größer als vorher
          let fontSize = 11;
          if (displayName.length > 20) {
            fontSize = 8;
          } else if (displayName.length > 15) {
            fontSize = 9;
          } else if (displayName.length > 10) {
            fontSize = 10;
          }
          doc.setFontSize(fontSize);
          
          // Text am linken Rand der Spalte starten, diagonal nach oben-rechts
          // So wird Text nicht am rechten Tabellenrand abgeschnitten
          // Bei +AS Option: Text inkl. +AS als ein String
          const fullText = cat.hasAsOption ? `${displayName} +AS` : displayName;
          doc.text(fullText, colX + 3, startY + headerHeight - 3, { angle: 45 });
          
          doc.setFontSize(11);
          colX += catWidth;
        });
      }
      
      // Unterschrift - horizontal zentriert in der tatsächlichen Spaltenbreite bis zum Tabellenrand
      if (signatureEnabled) {
        doc.setFontSize(9); // Gleiche Größe wie NAME
        const actualSignatureWidth = margin + contentWidth - colX;
        doc.text(signatureTitle.toUpperCase(), colX + actualSignatureWidth / 2, startY + headerHeight - 3, { align: 'center' });
      }
    } else {
      doc.setFontSize(8);
      
      // Name
      doc.text('NAME', colX + 3, startY + 6.5);
      colX += scaledColName;
      
      // Categories
      if (hasCategories) {
        categories.forEach((cat, idx) => {
          const catWidth = scaledCategoryWidths[idx];
          const displayName = cat.shortName || cat.name;
          
          if (cat.hasAsOption) {
            doc.setFontSize(6);
            // Zeilenumbruch für lange Kategorienamen
            const maxWidth = catWidth - 2;
            const lines = doc.splitTextToSize(displayName, maxWidth);
            if (lines.length > 1) {
              lines.forEach((line: string, lineIdx: number) => {
                doc.text(line, colX + catWidth / 2, startY + 2 + lineIdx * 2.5, { align: 'center' });
              });
            } else {
              doc.text(displayName, colX + catWidth / 2, startY + 4, { align: 'center' });
            }
            doc.setFontSize(5);
            doc.setTextColor(200, 200, 200);
            doc.text('+AS', colX + catWidth / 2, startY + 8, { align: 'center' });
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
          } else {
            doc.setFontSize(6);
            // Zeilenumbruch für lange Kategorienamen
            const maxWidth = catWidth - 2;
            const lines = doc.splitTextToSize(displayName, maxWidth);
            if (lines.length > 1) {
              lines.forEach((line: string, lineIdx: number) => {
                doc.text(line, colX + catWidth / 2, startY + 3 + lineIdx * 2.5, { align: 'center' });
              });
            } else {
              doc.text(displayName, colX + catWidth / 2, startY + 6.5, { align: 'center' });
            }
            doc.setFontSize(8);
          }
          
          colX += catWidth;
        });
      }
      
      // Unterschrift
      if (signatureEnabled) {
        doc.text(signatureTitle.toUpperCase(), colX + 2, startY + 6.5);
      }
    }
    
    return startY + headerHeight;
  };

  // Helper: Draw table rows
  const drawTableRows = (startY: number, numRows: number, rowOffset: number = 0): void => {
    for (let i = 0; i < numRows; i++) {
      const rowY = startY + i * rowHeight;
      const globalRowIndex = rowOffset + i;
      
      // Alternating colors
      doc.setFillColor(globalRowIndex % 2 === 0 ? 255 : 252, globalRowIndex % 2 === 0 ? 255 : 252, globalRowIndex % 2 === 0 ? 255 : 252);
      doc.rect(margin, rowY, contentWidth, rowHeight, 'F');
      
      // Border
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.rect(margin, rowY, contentWidth, rowHeight);
      
      // Prefill name if available
      if (prefillNames[globalRowIndex]) {
        doc.setFontSize(9);
        setFont(doc, 'normal');
        doc.setTextColor(40, 40, 40);
        doc.text(prefillNames[globalRowIndex], margin + 3, rowY + rowHeight / 2 + 1);
      }
      
      // Vertical lines
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      let colX = margin + scaledColName;
      doc.line(colX, rowY, colX, rowY + rowHeight);
      
      // Category checkboxes
      if (hasCategories) {
        categories.forEach((cat, idx) => {
          const catWidth = scaledCategoryWidths[idx];
          
          doc.setDrawColor(100, 100, 100);
          doc.setLineWidth(0.5);
          
          const checkSize = 4;
          const checkY = rowY + (rowHeight - checkSize) / 2;
          
          // Prüfen ob Checkbox oder Textfeld (default: Checkbox)
          const showCheckbox = cat.requiresCheckbox !== false;
          
          if (showCheckbox) {
            if (cat.hasAsOption) {
              const gap = 2;
              const totalCheckWidth = checkSize * 2 + gap;
              const startX = colX + (catWidth - totalCheckWidth) / 2;
              doc.rect(startX, checkY, checkSize, checkSize);
              doc.rect(startX + checkSize + gap, checkY, checkSize, checkSize);
            } else {
              doc.rect(colX + (catWidth - checkSize) / 2, checkY, checkSize, checkSize);
            }
          } else {
            // Textfeld: horizontale Linie zum Ausfüllen
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.3);
            const lineY = rowY + rowHeight - 2;
            const linePadding = 2;
            doc.line(colX + linePadding, lineY, colX + catWidth - linePadding, lineY);
          }
          
          colX += catWidth;
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.5);
          doc.line(colX, rowY, colX, rowY + rowHeight);
        });
      }
    }
  };

  // Helper: Draw footer
  const drawFooter = (pageNum: number, totalPages: number): void => {
    const footerY = pageHeight - margin - 6;
    
    doc.setDrawColor(200, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    
    doc.setFontSize(7);
    setFont(doc, 'normal');
    doc.setTextColor(120, 120, 120);
    
    const today = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    doc.text(`Erstellt: ${creatorName} | ${today}`, margin, footerY);
    doc.text(`Seite ${pageNum} von ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text('Freiwillige Feuerwehr Marchtrenk', pageWidth - margin, footerY, { align: 'right' });
  };

  // === PAGE 1 ===
  drawBackground();

  // Header
  doc.setFontSize(9);
  setFont(doc, 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Freiwillige Feuerwehr Marchtrenk', margin, 14);
  setFont(doc, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Linzerstraße 43, 4614 Marchtrenk', margin, 18);
  doc.text('Tel: +43 (0) 7243 58112', margin, 22);

  // Header line
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(1.2);
  doc.line(margin, 28, pageWidth - 85, 28);
  doc.setDrawColor(220, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(margin, 30, pageWidth - 85, 30);

  // "Anmeldung" label above title
  let yPos = 42;
  doc.setFontSize(22);
  setFont(doc, 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Anmeldung', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Event name title
  doc.setFontSize(22);
  setFont(doc, 'bold');
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(eventName, contentWidth - 40);
  doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
  yPos += titleLines.length * 9;

  // Description (optional) - dezent unter dem Titel
  if (description && description.trim()) {
    yPos += 2;
    doc.setFontSize(10);
    setFont(doc, 'normal');
    doc.setTextColor(80, 80, 80);
    
    // Zeilenumbrüche verarbeiten und Text umbrechen
    const descriptionParagraphs = description.split('\n');
    descriptionParagraphs.forEach((paragraph) => {
      if (paragraph.trim()) {
        const descLines = doc.splitTextToSize(paragraph.trim(), contentWidth - 60);
        descLines.forEach((line: string) => {
          doc.text(line, pageWidth / 2, yPos, { align: 'center' });
          yPos += 4.5;
        });
      } else {
        yPos += 2; // Leerzeile
      }
    });
    yPos += 2;
  }

  // Divider - reduced spacing
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);
  yPos += 4;

  // Info box - Höhe anpassen basierend auf vorhandenen Feldern
  const infoBoxY = yPos;
  let infoBoxHeight = 32; // Basis-Höhe für ORT + DATUM/ZEIT
  if (vehicles && adjustment) infoBoxHeight = 42;
  else if (vehicles || adjustment) infoBoxHeight = 32;
  // Zusätzliche Höhe für Teilnehmer-Limit
  if (participantCount && participantCount > 0) infoBoxHeight += 16;
  
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, infoBoxY, contentWidth, infoBoxHeight, 2, 2, 'F');
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, infoBoxY, contentWidth, infoBoxHeight, 2, 2, 'S');

  doc.setFontSize(9);
  const infoY = infoBoxY + 7;
  const col1X = margin + 5;
  const col2X = margin + contentWidth / 2;

  setFont(doc, 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('ORT', col1X, infoY);
  setFont(doc, 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text(location, col1X, infoY + 5);

  setFont(doc, 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('DATUM & ZEIT', col1X, infoY + 14);
  setFont(doc, 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text(dateTime, col1X, infoY + 19);

  // Adjustierung (nur wenn vorhanden)
  if (adjustment) {
    setFont(doc, 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('ADJUSTIERUNG', col2X, infoY);
    setFont(doc, 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(adjustment, col2X, infoY + 5);
    // Hinweis zur Adjustierung (kleiner, grau)
    if (adjustmentNote) {
      doc.setFontSize(7);
      setFont(doc, 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(`(${adjustmentNote})`, col2X, infoY + 9);
      doc.setFontSize(9);
    }
  }

  // Fahrzeuge (optional)
  if (vehicles) {
    const vehicleY = adjustment ? infoY + 14 : infoY;
    setFont(doc, 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('FAHRZEUGE', col2X, vehicleY);
    setFont(doc, 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(vehicles, col2X, vehicleY + 5);
  }

  // Max. Teilnehmer (nur wenn angegeben) - mit rotem Hintergrund und Warnung
  if (participantCount && participantCount > 0) {
    const maxY = infoBoxY + infoBoxHeight - 14;
    // Roter Hintergrund-Balken
    doc.setFillColor(200, 30, 30);
    doc.roundedRect(margin + 3, maxY - 3, contentWidth - 6, 12, 1, 1, 'F');
    // Achtung-Dreieck zeichnen
    doc.setFillColor(255, 255, 255);
    const triX = margin + 10;
    const triY = maxY + 4;
    doc.triangle(triX, triY - 5, triX - 3, triY + 1, triX + 3, triY + 1, 'F');
    // Ausrufezeichen im Dreieck
    doc.setFontSize(5);
    doc.setTextColor(200, 30, 30);
    doc.text('!', triX, triY - 0.5, { align: 'center' });
    // Text
    doc.setFontSize(9);
    setFont(doc, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`MAX. TEILNEHMER: ${participantCount}`, margin + 18, maxY + 4);
  }

  yPos = infoBoxY + infoBoxHeight + 6;

  // Deadline banner
  const deadlineHeight = 8;
  doc.setFillColor(200, 30, 30);
  doc.roundedRect(margin + contentWidth / 4, yPos, contentWidth / 2, deadlineHeight, 1, 1, 'F');
  doc.setFontSize(9);
  setFont(doc, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`ANMELDUNG BIS ${registrationDeadline.toUpperCase()}`, pageWidth / 2, yPos + 5.5, { align: 'center' });
  
  yPos += deadlineHeight + 10;

  // Berechne benötigte Zeilen
  // Wenn participantCount angegeben -> genau so viele Zeilen
  // Sonst -> automatisch 2 Seiten (ca. 50-60 Zeilen)
  let totalRowsNeeded: number;
  if (participantCount && participantCount > 0) {
    // Exakte Teilnehmeranzahl
    totalRowsNeeded = Math.max(participantCount, prefillNames.length);
  } else {
    // Automatisch 2 Seiten - ca. 55 Zeilen (25 auf Seite 1 + 30 auf Seite 2)
    const defaultRows = 55;
    totalRowsNeeded = Math.max(defaultRows, prefillNames.length + 5);
  }
  
  // Page 1 - Table
  yPos = drawTableHeader(yPos);
  const availableHeightPage1 = pageHeight - yPos - footerHeight - margin;
  const numRowsPage1 = Math.floor(availableHeightPage1 / rowHeight);
  const rowsOnPage1 = Math.min(numRowsPage1, totalRowsNeeded);
  drawTableRows(yPos, rowsOnPage1, 0);
  
  let totalRowsDrawn = rowsOnPage1;
  let currentPage = 1;
  
  // Zusätzliche Seiten falls benötigt
  while (totalRowsDrawn < totalRowsNeeded) {
    const remainingRows = totalRowsNeeded - totalRowsDrawn;
    
    doc.addPage();
    currentPage++;
    drawBackground();

    // Header für Folgeseiten
    doc.setFontSize(9);
    setFont(doc, 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Freiwillige Feuerwehr Marchtrenk', margin, 14);
    setFont(doc, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Linzerstraße 43, 4614 Marchtrenk', margin, 18);

    // Header line
    doc.setDrawColor(200, 30, 30);
    doc.setLineWidth(1.2);
    doc.line(margin, 24, pageWidth - 85, 24);
    doc.setDrawColor(220, 80, 80);
    doc.setLineWidth(0.3);
    doc.line(margin, 26, pageWidth - 85, 26);

    // Event name - Fortsetzung
    doc.setFontSize(14);
    setFont(doc, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`${eventName} - Fortsetzung`, margin, 38);
    
    let yPosNextPage = 46;
    yPosNextPage = drawTableHeader(yPosNextPage);
    
    const availableHeightNextPage = pageHeight - yPosNextPage - footerHeight - margin;
    const maxRowsNextPage = Math.floor(availableHeightNextPage / rowHeight);
    const rowsThisPage = Math.min(maxRowsNextPage, remainingRows);
    
    drawTableRows(yPosNextPage, rowsThisPage, totalRowsDrawn);
    totalRowsDrawn += rowsThisPage;
  }
  
  // Footer auf allen Seiten
  const totalPages = currentPage;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  // Open PDF
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, '_blank');
}

// Beispiel-PDFs
export async function generateExampleMeilenlaufPdf(pdfBackgroundUrl?: string): Promise<void> {
  await generateEventSignupFormPdf({
    eventName: 'Feuerwehr Meilenlauf 2026',
    location: 'Sportplatz Marchtrenk',
    dateTime: '20. September 2026, 09:00 Uhr',
    adjustment: 'FF Sportbekleidung',
    registrationDeadline: '10. September 2026',
    categories: [
      { name: '1 Meile', shortName: '1M', hasAsOption: false },
      { name: '3 Meilen', shortName: '3M', hasAsOption: false },
      { name: '10 Meilen', shortName: '10M', hasAsOption: false },
      { name: '10M Staffel', shortName: '10M St.', hasAsOption: true }
    ],
    creatorName: 'Max Mustermann',
    pdfBackgroundUrl,
    diagonalHeaders: true
  });
}

export async function generateExampleEventSignupFormPdf(pdfBackgroundUrl?: string): Promise<void> {
  await generateEventSignupFormPdf({
    eventName: 'DHL Linz Airport NIGHT RUN',
    location: 'Flughafen Linz Hoersching',
    dateTime: '12. Juni 2026, 24:00 Uhr',
    adjustment: 'FF Sportbekleidung',
    registrationDeadline: '15. April 2026',
    categories: [
      { name: '5 km', shortName: '5km', hasAsOption: false },
      { name: '10 km', shortName: '10km', hasAsOption: false },
      { name: 'Staffel', shortName: 'Staffel', hasAsOption: false }
    ],
    creatorName: 'Max Mustermann',
    pdfBackgroundUrl
  });
}

export async function generateExampleEventSignupFormPdfNoCategories(pdfBackgroundUrl?: string): Promise<void> {
  await generateEventSignupFormPdf({
    eventName: 'Jahreshauptversammlung 2026',
    location: 'Feuerwehrhaus Marchtrenk',
    dateTime: '15. Maerz 2026, 19:00 Uhr',
    adjustment: 'Ausgangsuniform',
    registrationDeadline: '10. Maerz 2026',
    creatorName: 'Max Mustermann',
    pdfBackgroundUrl
  });
}
