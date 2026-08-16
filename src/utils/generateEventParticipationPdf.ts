import { loadImageAsBase64, loadStampWithTransparency, loadOptimizedBackground, createCompressedPdf } from './pdfBackground';
import type { EventParticipation } from '@/hooks/useEventParticipations';

// Helper function to fix German umlauts for jsPDF
function fixUmlauts(text: string): string {
  if (!text) return text;
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

interface PdfData {
  entry: EventParticipation;
  creatorName: string;
  approverName?: string;
  pdfBackgroundUrl?: string;
  pdfBackgroundOpacity?: number;
  signatureUrl?: string;
  stampUrl?: string;
  commanderName?: string;
}

export async function generateEventParticipationPdf(data: PdfData): Promise<void> {
  const {
    entry,
    creatorName,
    approverName,
    pdfBackgroundUrl = '',
    pdfBackgroundOpacity = 0.15,
    signatureUrl,
    stampUrl,
    commanderName = 'Kommandant'
  } = data;

  // Load images - use optimized loader for background, keep PNG for signature/stamp (need transparency)
  const backgroundData = pdfBackgroundUrl ? await loadOptimizedBackground(pdfBackgroundUrl) : null;
  const signatureData = signatureUrl ? await loadImageAsBase64(signatureUrl) : null;
  // Use special loader for stamp that removes white background
  const stampData = stampUrl ? await loadStampWithTransparency(stampUrl) : null;

  const doc = createCompressedPdf();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Apply background with opacity
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

  // Sender information (top left)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(fixUmlauts('Freiwillige Feuerwehr der Stadtgemeinde Marchtrenk'), margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(fixUmlauts('Linzerstrasse 43, 4614 Marchtrenk'), margin, 16);
  doc.text('+43 (0) 7243 58112 | office@feuerwehr-marchtrenk.at', margin, 20);
  doc.text('www.feuerwehr-marchtrenk.at', margin, 24);

  // Header line - positioned to not overlap with logo in top right
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(margin, 32, pageWidth - 75, 32);

  // Title
  let yPos = 46;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Teilnahme Veranstaltung', margin, yPos);

  // Reference number (right aligned)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Referenz: ${entry.reference_number}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 12;

  // Compact form fields
  const fieldHeight = 8;
  const labelWidth = 45;
  const colWidth = (pageWidth - margin * 2 - 10) / 2;

  const drawFieldCompact = (label: string, value: string, x: number, y: number, width: number) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(fixUmlauts(label), x, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const fixedValue = fixUmlauts(value);
    const truncatedValue = fixedValue.length > 35 ? fixedValue.substring(0, 35) + '...' : fixedValue;
    doc.text(truncatedValue, x + labelWidth, y);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Two-column layout for compact display
  // Row 1: Event Name (full width)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Veranstaltung:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.text(fixUmlauts(entry.event_name), margin + labelWidth, yPos);
  yPos += fieldHeight + 4;

  // Row 2: Date | Location
  drawFieldCompact('Datum:', formatDate(entry.event_date), margin, yPos, colWidth);
  if (entry.event_location) {
    drawFieldCompact('Ort:', entry.event_location, margin + colWidth + 10, yPos, colWidth);
  }
  yPos += fieldHeight + 2;

  // Row 3: Organizer | Participants
  if (entry.organizer) {
    drawFieldCompact('Veranstalter:', entry.organizer, margin, yPos, colWidth);
  }
  drawFieldCompact('Teilnehmer:', String(entry.max_participants), margin + colWidth + 10, yPos, colWidth);
  yPos += fieldHeight + 2;

  // Row 4: Costs | Transport
  // Check if amount was confirmed and differs from original
  // Use Number() to ensure proper comparison (DB might return strings)
  const confirmedAmt = entry.confirmed_amount !== null && entry.confirmed_amount !== undefined 
    ? Number(entry.confirmed_amount) 
    : null;
  const estimatedAmt = Number(entry.estimated_costs);
  const hasConfirmedAmount = entry.amount_confirmed === true && confirmedAmt !== null;
  const amountDiffers = hasConfirmedAmount && confirmedAmt !== estimatedAmt;
  
  if (amountDiffers && confirmedAmt !== null) {
    // Draw original amount struck through
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Kosten:', margin, yPos + 3);
    
    const originalText = formatCurrency(estimatedAmt);
    const confirmedText = formatCurrency(confirmedAmt);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    const originalX = margin + 25;
    doc.text(originalText, originalX, yPos + 3);
    // Draw strikethrough line
    const originalWidth = doc.getTextWidth(originalText);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(originalX, yPos + 2, originalX + originalWidth, yPos + 2);
    
    // Draw confirmed amount
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(confirmedText, originalX + originalWidth + 5, yPos + 3);
    
    // Show if it required reapproval
    if (entry.requires_reapproval && entry.reapproved_by) {
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text('(erneut genehmigt)', originalX + originalWidth + 5 + doc.getTextWidth(confirmedText) + 3, yPos + 3);
    }
  } else {
    drawFieldCompact('Kosten:', formatCurrency(confirmedAmt ?? estimatedAmt), margin, yPos, colWidth);
  }
  
  if (entry.transport_type) {
    drawFieldCompact('Transport:', entry.transport_type, margin + colWidth + 10, yPos, colWidth);
  }
  yPos += fieldHeight + 2;

  // Row 5: Overnight
  drawFieldCompact('Übernachtung:', entry.overnight_required ? 'Ja' : 'Nein', margin, yPos, colWidth);
  yPos += fieldHeight + 6;

  // Description (if exists, limited height)
  if (entry.description) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 4;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Beschreibung:', margin, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(fixUmlauts(entry.description), pageWidth - margin * 2);
    const maxDescLines = Math.min(descLines.length, 3);
    for (let i = 0; i < maxDescLines; i++) {
      doc.text(descLines[i], margin, yPos);
      yPos += 4;
    }
    if (descLines.length > 3) {
      doc.text('...', margin, yPos);
      yPos += 4;
    }
    yPos += 2;
  }

  // Notes (if exists, limited height)
  if (entry.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Anmerkungen:', margin, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    const notesLines = doc.splitTextToSize(fixUmlauts(entry.notes), pageWidth - margin * 2);
    const maxNotesLines = Math.min(notesLines.length, 2);
    for (let i = 0; i < maxNotesLines; i++) {
      doc.text(notesLines[i], margin, yPos);
      yPos += 4;
    }
    if (notesLines.length > 2) {
      doc.text('...', margin, yPos);
      yPos += 4;
    }
    yPos += 4;
  }

  // Amount change reason (if applicable)
  if (amountDiffers && entry.amount_change_reason) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 4;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150, 100, 50);
    doc.text('Betragsänderung:', margin, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    const reasonLines = doc.splitTextToSize(fixUmlauts(entry.amount_change_reason), pageWidth - margin * 2);
    const maxReasonLines = Math.min(reasonLines.length, 2);
    for (let i = 0; i < maxReasonLines; i++) {
      doc.text(reasonLines[i], margin, yPos);
      yPos += 4;
    }
    yPos += 4;
  }

  // Divider line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Applicant info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(fixUmlauts(`Antragsteller: ${creatorName}`), margin, yPos);
  doc.text(`Eingereicht: ${entry.submitted_at ? formatDate(entry.submitted_at) : '-'}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 15;

  // Check if approver is different from commander (i.V. case)
  const isSubstitute = approverName && approverName !== commanderName;

  // Signature section
  const signatureY = yPos;
  const signatureWidth = 45;
  const signatureHeight = 18;
  
  // Signature line
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.5);
  doc.line(margin, signatureY + signatureHeight, margin + signatureWidth, signatureY + signatureHeight);
  
  // Add signature image if available
  if (signatureData) {
    try {
      doc.addImage(signatureData, 'AUTO', margin + 2, signatureY + 2, signatureWidth - 4, signatureHeight - 4);
    } catch (e) {
      console.error('Failed to add signature:', e);
    }
  }
  
  // Commander name or i.V. text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  
  let nameYPos = signatureY + signatureHeight + 5;
  
  if (isSubstitute && entry.status === 'approved') {
    // Show i.V. with approver name above the commander name
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(fixUmlauts(`i.V. ${approverName}`), margin, nameYPos);
    nameYPos += 4;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(fixUmlauts(commanderName), margin, nameYPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Kommandant', margin, nameYPos + 4);
  
  // Approval info on the right side
  if (entry.status === 'approved' && entry.approved_at) {
    doc.setFontSize(8);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text('GENEHMIGT', pageWidth - margin, signatureY + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`am ${formatDate(entry.approved_at)}`, pageWidth - margin, signatureY + 10, { align: 'right' });
  }

  // Add stamp if available - positioned to overlap with signature area
  if (stampData) {
    try {
      const stampSize = 28;
      // Position stamp to the right of the signature line, overlapping slightly
      const stampX = margin + signatureWidth - 8;
      const stampY = signatureY + 2; // Align with top of signature area
      
      // Apply transparency to stamp background
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stampGState = new (doc as any).GState({ opacity: 0.85 });
      doc.setGState(stampGState);
      doc.addImage(stampData, 'PNG', stampX, stampY, stampSize, stampSize);
      doc.restoreGraphicsState();
    } catch (e) {
      console.error('Failed to add stamp:', e);
    }
  }

  // Footer
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString('de-DE')} | Feuerwehr Marchtrenk | Seite 1 von 1`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  // Save
  const filename = `Teilnahme_Veranstaltung_${entry.reference_number}.pdf`;
  // Use blob method for better browser compatibility
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function generateEventParticipationPdfPreview(data: PdfData): Promise<string> {
  const {
    entry,
    creatorName,
    approverName,
    pdfBackgroundUrl = '',
    pdfBackgroundOpacity = 0.15,
    signatureUrl,
    stampUrl,
    commanderName = 'Kommandant'
  } = data;

  const backgroundData = pdfBackgroundUrl ? await loadImageAsBase64(pdfBackgroundUrl) : null;
  const signatureData = signatureUrl ? await loadImageAsBase64(signatureUrl) : null;
  // Use special loader for stamp that removes white background
  const stampData = stampUrl ? await loadStampWithTransparency(stampUrl) : null;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

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

  // Sender information
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(fixUmlauts('Freiwillige Feuerwehr der Stadtgemeinde Marchtrenk'), margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(fixUmlauts('Linzerstrasse 43, 4614 Marchtrenk'), margin, 16);
  doc.text('+43 (0) 7243 58112 | office@feuerwehr-marchtrenk.at', margin, 20);
  doc.text('www.feuerwehr-marchtrenk.at', margin, 24);

  // Header line - positioned to not overlap with logo
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(margin, 32, pageWidth - 75, 32);

  let yPos = 46;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Teilnahme Veranstaltung', margin, yPos);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Referenz: ${entry.reference_number}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 12;

  const fieldHeight = 8;
  const labelWidth = 45;
  const colWidth = (pageWidth - margin * 2 - 10) / 2;

  const drawFieldCompact = (label: string, value: string, x: number, y: number) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(fixUmlauts(label), x, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const fixedValue = fixUmlauts(value);
    const truncatedValue = fixedValue.length > 35 ? fixedValue.substring(0, 35) + '...' : fixedValue;
    doc.text(truncatedValue, x + labelWidth, y);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Event Name (full width)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Veranstaltung:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.text(fixUmlauts(entry.event_name), margin + labelWidth, yPos);
  yPos += fieldHeight + 4;

  drawFieldCompact('Datum:', formatDate(entry.event_date), margin, yPos);
  if (entry.event_location) {
    drawFieldCompact('Ort:', entry.event_location, margin + colWidth + 10, yPos);
  }
  yPos += fieldHeight + 2;

  if (entry.organizer) {
    drawFieldCompact('Veranstalter:', entry.organizer, margin, yPos);
  }
  drawFieldCompact('Teilnehmer:', String(entry.max_participants), margin + colWidth + 10, yPos);
  yPos += fieldHeight + 2;

  // Check if amount was confirmed and differs from original (Preview)
  const confirmedAmtP = entry.confirmed_amount !== null && entry.confirmed_amount !== undefined 
    ? Number(entry.confirmed_amount) 
    : null;
  const estimatedAmtP = Number(entry.estimated_costs);
  const hasConfirmedAmountPreview = entry.amount_confirmed === true && confirmedAmtP !== null;
  const amountDiffersPreview = hasConfirmedAmountPreview && confirmedAmtP !== estimatedAmtP;
  
  if (amountDiffersPreview && confirmedAmtP !== null) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Kosten:', margin, yPos + 3);
    
    const originalTextP = formatCurrency(estimatedAmtP);
    const confirmedTextP = formatCurrency(confirmedAmtP);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    const originalXP = margin + 25;
    doc.text(originalTextP, originalXP, yPos + 3);
    const originalWidthP = doc.getTextWidth(originalTextP);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(originalXP, yPos + 2, originalXP + originalWidthP, yPos + 2);
    
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(confirmedTextP, originalXP + originalWidthP + 5, yPos + 3);
    
    if (entry.requires_reapproval && entry.reapproved_by) {
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text('(erneut genehmigt)', originalXP + originalWidthP + 5 + doc.getTextWidth(confirmedTextP) + 3, yPos + 3);
    }
  } else {
    drawFieldCompact('Kosten:', formatCurrency(confirmedAmtP ?? estimatedAmtP), margin, yPos);
  }
  
  if (entry.transport_type) {
    drawFieldCompact('Transport:', entry.transport_type, margin + colWidth + 10, yPos);
  }
  yPos += fieldHeight + 2;

  drawFieldCompact('Übernachtung:', entry.overnight_required ? 'Ja' : 'Nein', margin, yPos);
  yPos += fieldHeight + 6;

  if (entry.description) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 4;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Beschreibung:', margin, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(fixUmlauts(entry.description), pageWidth - margin * 2);
    const maxDescLines = Math.min(descLines.length, 3);
    for (let i = 0; i < maxDescLines; i++) {
      doc.text(descLines[i], margin, yPos);
      yPos += 4;
    }
    if (descLines.length > 3) {
      doc.text('...', margin, yPos);
      yPos += 4;
    }
    yPos += 2;
  }

  if (entry.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Anmerkungen:', margin, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    const notesLines = doc.splitTextToSize(fixUmlauts(entry.notes), pageWidth - margin * 2);
    const maxNotesLines = Math.min(notesLines.length, 2);
    for (let i = 0; i < maxNotesLines; i++) {
      doc.text(notesLines[i], margin, yPos);
      yPos += 4;
    }
    if (notesLines.length > 2) {
      doc.text('...', margin, yPos);
      yPos += 4;
    }
    yPos += 4;
  }

  // Amount change reason in preview (if applicable)
  if (amountDiffersPreview && entry.amount_change_reason) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 4;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150, 100, 50);
    doc.text('Betragsänderung:', margin, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    const reasonLinesP = doc.splitTextToSize(entry.amount_change_reason, pageWidth - margin * 2);
    const maxReasonLinesP = Math.min(reasonLinesP.length, 2);
    for (let i = 0; i < maxReasonLinesP; i++) {
      doc.text(reasonLinesP[i], margin, yPos);
      yPos += 4;
    }
    yPos += 4;
  }

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(fixUmlauts(`Antragsteller: ${creatorName}`), margin, yPos);
  doc.text(`Eingereicht: ${entry.submitted_at ? formatDate(entry.submitted_at) : '-'}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 15;

  const isSubstitute = approverName && approverName !== commanderName;

  const signatureY = yPos;
  const signatureWidth = 45;
  const signatureHeight = 18;
  
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.5);
  doc.line(margin, signatureY + signatureHeight, margin + signatureWidth, signatureY + signatureHeight);
  
  if (signatureData) {
    try {
      doc.addImage(signatureData, 'AUTO', margin + 2, signatureY + 2, signatureWidth - 4, signatureHeight - 4);
    } catch (e) {
      console.error('Failed to add signature:', e);
    }
  }
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  
  let nameYPos = signatureY + signatureHeight + 5;
  
  if (isSubstitute && entry.status === 'approved') {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(fixUmlauts(`i.V. ${approverName}`), margin, nameYPos);
    nameYPos += 4;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(fixUmlauts(commanderName), margin, nameYPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Kommandant', margin, nameYPos + 4);
  
  // Add stamp if available - positioned to overlap with signature area
  if (stampData) {
    try {
      const stampSize = 28;
      // Position stamp to the right of the signature line, overlapping slightly
      const stampX = margin + signatureWidth - 8;
      const stampY = signatureY + 2; // Align with top of signature area
      
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stampGState = new (doc as any).GState({ opacity: 0.85 });
      doc.setGState(stampGState);
      doc.addImage(stampData, 'PNG', stampX, stampY, stampSize, stampSize);
      doc.restoreGraphicsState();
    } catch (e) {
      console.error('Failed to add stamp:', e);
    }
  }

  if (entry.status === 'approved' && entry.approved_at) {
    doc.setFontSize(8);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text('GENEHMIGT', pageWidth - margin, signatureY + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`am ${formatDate(entry.approved_at)}`, pageWidth - margin, signatureY + 10, { align: 'right' });
  }

  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString('de-DE')} | Feuerwehr Marchtrenk | Seite 1 von 1`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  return doc.output('dataurlstring');
}