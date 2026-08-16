import { loadImageAsBase64, loadStampWithTransparency, loadOptimizedBackground, createCompressedPdf } from './pdfBackground';
import type { PaymentOrder } from '@/hooks/usePaymentOrders';

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
  order: PaymentOrder;
  creatorName: string;
  approverName?: string;
  paidByName?: string;
  pdfBackgroundUrl?: string;
  pdfBackgroundOpacity?: number;
  signatureUrl?: string;
  stampUrl?: string;
  commanderName?: string;
}

export async function generatePaymentOrderPdf(data: PdfData): Promise<void> {
  console.log('[generatePaymentOrderPdf] Starting PDF generation', data.order?.id);
  
  const {
    order,
    creatorName,
    approverName,
    paidByName,
    pdfBackgroundUrl = '',
    pdfBackgroundOpacity = 0.15,
    signatureUrl,
    stampUrl,
    commanderName = 'Kommandant'
  } = data;

  if (!order) {
    throw new Error('Order data is required');
  }

  console.log('[generatePaymentOrderPdf] Loading images...');
  // Load images - use optimized loader for background, keep PNG for signature/stamp (need transparency)
  const backgroundData = pdfBackgroundUrl ? await loadOptimizedBackground(pdfBackgroundUrl) : null;
  const signatureData = signatureUrl ? await loadImageAsBase64(signatureUrl) : null;
  // Use special loader for stamp that removes white background
  const stampData = stampUrl ? await loadStampWithTransparency(stampUrl) : null;
  console.log('[generatePaymentOrderPdf] Images loaded:', { hasBackground: !!backgroundData, hasSignature: !!signatureData, hasStamp: !!stampData });

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

  // Sender information (top left, below where logo would be on right)
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

  // Header line - positioned below sender info and not overlapping logo
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(margin, 32, pageWidth - 75, 32);

  // Title - positioned below the header line, not overlapping logo
  let yPos = 50;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Auszahlungsanweisung', margin, yPos);
  yPos += 12;

  // Reference number
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Referenz: ${order.reference_number}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  // Form fields with transparent boxes
  const fieldHeight = 12;
  const labelWidth = 50;
  const valueWidth = pageWidth - margin * 2 - labelWidth;

  // Helper function for form fields
  const drawField = (label: string, value: string, y: number) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(fixUmlauts(label), margin, y + 4);
    
    // Value box (transparent with border)
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    const boxX = margin + labelWidth;
    const boxWidth = valueWidth;
    doc.line(boxX, y + 6, boxX + boxWidth, y + 6); // Underline style
    
    doc.setFont('helvetica', 'normal');
    doc.text(fixUmlauts(value), boxX + 2, y + 4);
  };

  // Amount
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  drawField('Betrag:', formatCurrency(order.amount), yPos);
  yPos += fieldHeight + 8;

  // Recipient
  drawField('Empfänger:', fixUmlauts(order.recipient_name), yPos);
  yPos += fieldHeight + 8;

  // Purpose
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(fixUmlauts('Zweck:'), margin, yPos + 4);
  
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin + labelWidth, yPos + 6, pageWidth - margin, yPos + 6);
  
  doc.setFont('helvetica', 'normal');
  const purposeLines = doc.splitTextToSize(fixUmlauts(order.purpose), valueWidth - 4);
  doc.text(purposeLines[0] || '', margin + labelWidth + 2, yPos + 4);
  yPos += fieldHeight + 8;

  // If purpose is longer, add more lines
  if (purposeLines.length > 1) {
    for (let i = 1; i < purposeLines.length && i < 3; i++) {
      doc.line(margin + labelWidth, yPos + 6, pageWidth - margin, yPos + 6);
      doc.text(purposeLines[i], margin + labelWidth + 2, yPos + 4);
      yPos += fieldHeight + 4;
    }
    yPos += 4;
  }

  // Payment method checkboxes
  yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Cash checkbox
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos - 3, 4, 4);
  if (order.payment_method === 'cash') {
    doc.setFont('helvetica', 'bold');
    doc.text('X', margin + 0.8, yPos);
    doc.setFont('helvetica', 'normal');
  }
  doc.text('in Bar', margin + 7, yPos);
  
  // Transfer checkbox
  doc.rect(margin + 35, yPos - 3, 4, 4);
  if (order.payment_method === 'transfer') {
    doc.setFont('helvetica', 'bold');
    doc.text('X', margin + 35.8, yPos);
    doc.setFont('helvetica', 'normal');
  }
  doc.text(fixUmlauts('per Ueberweisung'), margin + 42, yPos);
  
  // Invoice checkbox (Rechnung)
  doc.rect(margin + 85, yPos - 3, 4, 4);
  if (order.payment_method === 'direct_to_organizer') {
    doc.setFont('helvetica', 'bold');
    doc.text('X', margin + 85.8, yPos);
    doc.setFont('helvetica', 'normal');
  }
  doc.text('Rechnung', margin + 92, yPos);
  yPos += fieldHeight + 5;

  // IBAN if transfer or direct_to_organizer
  if ((order.payment_method === 'transfer' || order.payment_method === 'direct_to_organizer') && order.recipient_iban) {
    drawField('IBAN:', order.recipient_iban, yPos);
    yPos += fieldHeight + 8;
  }

  // Date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  drawField('Datum:', formatDate(order.approved_at || order.created_at), yPos);
  yPos += fieldHeight + 15;

  // Signature section - compact for single page
  const signatureY = yPos;
  const signatureWidth = 50;
  const signatureHeight = 18;
  
  // Signature line
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.5);
  doc.line(margin, signatureY + signatureHeight, margin + signatureWidth, signatureY + signatureHeight);
  
  // Add signature image if available - scaled to fit
  if (signatureData) {
    try {
      doc.addImage(signatureData, 'AUTO', margin + 2, signatureY + 2, signatureWidth - 4, signatureHeight - 4);
    } catch (e) {
      console.error('Failed to add signature:', e);
    }
  }
  
  // Commander name
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  const commanderNameY = signatureY + signatureHeight + 6;
  doc.text(fixUmlauts(commanderName), margin, commanderNameY);
  
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

  // Status info (if approved/paid) - compact layout
  yPos = signatureY + signatureHeight + 12;
  if (order.status === 'approved' || order.status === 'paid') {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    if (order.approved_at && approverName) {
      doc.text(fixUmlauts(`Genehmigt von ${approverName} am ${formatDate(order.approved_at)}`), margin, yPos);
      yPos += 4;
    }
    if (order.paid_at && paidByName) {
      doc.text(fixUmlauts(`Ausgezahlt von ${paidByName} am ${formatDate(order.paid_at)}`), margin, yPos);
      yPos += 4;
    }
  }

  // Empfangsbestaetigung - NUR bei Barauszahlung - kompaktes Layout
  if (order.payment_method === 'cash') {
    const receiptY = yPos + 8;
    
    // Trennlinie
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    doc.line(margin, receiptY, pageWidth - margin, receiptY);
    
    // Titel und Betrag auf einer Zeile
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    const formattedAmount = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.amount);
    doc.text(fixUmlauts(`EMPFANGSBESTAETIGUNG: ${formattedAmount} erhalten`), margin, receiptY + 7);
    
    // Unterschrift und Datum nebeneinander - kompakt
    const fieldY = receiptY + 12;
    const signatureFieldWidth = 55;
    const dateFieldWidth = 35;
    const dateFieldX = margin + signatureFieldWidth + 15;
    
    // Unterschriftslinie
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.4);
    doc.line(margin, fieldY + 8, margin + signatureFieldWidth, fieldY + 8);
    
    // Datumsfeld
    doc.line(dateFieldX, fieldY + 8, dateFieldX + dateFieldWidth, fieldY + 8);
    
    // Labels
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(fixUmlauts(`Unterschrift ${order.recipient_name}`), margin, fieldY + 13);
    doc.text('Datum', dateFieldX, fieldY + 13);
  }

  // Footer
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString('de-DE')} | Feuerwehr Marchtrenk | Seite 1 von 1`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Save - open in new tab as blob URL
  const filename = `Auszahlungsanweisung_${order.reference_number || 'unknown'}.pdf`;
  console.log('[generatePaymentOrderPdf] Saving PDF as:', filename);
  try {
    // Create blob URL and open in new tab
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
    console.log('[generatePaymentOrderPdf] PDF opened in new tab');
  } catch (saveError) {
    console.error('[generatePaymentOrderPdf] Error saving PDF:', saveError);
    throw saveError;
  }
}

// Generate PDF as data URL for preview
export async function generatePaymentOrderPdfPreview(data: PdfData): Promise<string> {
  const {
    order,
    creatorName,
    approverName,
    paidByName,
    pdfBackgroundUrl = '',
    pdfBackgroundOpacity = 0.15,
    signatureUrl,
    stampUrl,
    commanderName = 'Kommandant'
  } = data;

  // Load images
  const backgroundData = pdfBackgroundUrl ? await loadImageAsBase64(pdfBackgroundUrl) : null;
  const signatureData = signatureUrl ? await loadImageAsBase64(signatureUrl) : null;
  // Use special loader for stamp that removes white background
  const stampData = stampUrl ? await loadStampWithTransparency(stampUrl) : null;

  const doc = new jsPDF();
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

  // Header line - not overlapping logo
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(margin, 32, pageWidth - 75, 32);

  // Title
  let yPos = 50;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Auszahlungsanweisung', margin, yPos);
  yPos += 12;

  // Reference number
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Referenz: ${order.reference_number}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  // Form fields
  const fieldHeight = 12;
  const labelWidth = 50;
  const valueWidth = pageWidth - margin * 2 - labelWidth;

  const drawField = (label: string, value: string, y: number) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(fixUmlauts(label), margin, y + 4);
    
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    const boxX = margin + labelWidth;
    const boxWidth = valueWidth;
    doc.line(boxX, y + 6, boxX + boxWidth, y + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.text(fixUmlauts(value), boxX + 2, y + 4);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  drawField('Betrag:', formatCurrency(order.amount), yPos);
  yPos += fieldHeight + 8;
  drawField('Empfänger:', fixUmlauts(order.recipient_name), yPos);
  yPos += fieldHeight + 8;

  // Purpose
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(fixUmlauts('Zweck:'), margin, yPos + 4);
  
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin + labelWidth, yPos + 6, pageWidth - margin, yPos + 6);
  
  doc.setFont('helvetica', 'normal');
  const purposeLines = doc.splitTextToSize(fixUmlauts(order.purpose), valueWidth - 4);
  doc.text(purposeLines[0] || '', margin + labelWidth + 2, yPos + 4);
  yPos += fieldHeight + 8;

  if (purposeLines.length > 1) {
    for (let i = 1; i < purposeLines.length && i < 3; i++) {
      doc.line(margin + labelWidth, yPos + 6, pageWidth - margin, yPos + 6);
      doc.text(purposeLines[i], margin + labelWidth + 2, yPos + 4);
      yPos += fieldHeight + 4;
    }
    yPos += 4;
  }

  // Payment method
  yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos - 3, 4, 4);
  if (order.payment_method === 'cash') {
    doc.setFont('helvetica', 'bold');
    doc.text('X', margin + 0.8, yPos);
    doc.setFont('helvetica', 'normal');
  }
  doc.text('in Bar', margin + 7, yPos);
  
  doc.rect(margin + 35, yPos - 3, 4, 4);
  if (order.payment_method === 'transfer') {
    doc.setFont('helvetica', 'bold');
    doc.text('X', margin + 35.8, yPos);
    doc.setFont('helvetica', 'normal');
  }
  doc.text(fixUmlauts('per Ueberweisung'), margin + 42, yPos);
  
  // Invoice checkbox (Rechnung)
  doc.rect(margin + 85, yPos - 3, 4, 4);
  if (order.payment_method === 'direct_to_organizer') {
    doc.setFont('helvetica', 'bold');
    doc.text('X', margin + 85.8, yPos);
    doc.setFont('helvetica', 'normal');
  }
  doc.text('Rechnung', margin + 92, yPos);
  yPos += fieldHeight + 5;

  if ((order.payment_method === 'transfer' || order.payment_method === 'direct_to_organizer') && order.recipient_iban) {
    drawField('IBAN:', order.recipient_iban, yPos);
    yPos += fieldHeight + 8;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  drawField('Datum:', formatDate(order.approved_at || order.created_at), yPos);
  yPos += fieldHeight + 15;

  // Signature section - compact for single page
  const signatureY = yPos;
  const signatureWidth = 50;
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
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  const commanderNameYPreview = signatureY + signatureHeight + 6;
  doc.text(fixUmlauts(commanderName), margin, commanderNameYPreview);
  
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

  // Status info (if approved/paid) - compact layout
  yPos = signatureY + signatureHeight + 12;
  if (order.status === 'approved' || order.status === 'paid') {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    if (order.approved_at && approverName) {
      doc.text(fixUmlauts(`Genehmigt von ${approverName} am ${formatDate(order.approved_at)}`), margin, yPos);
      yPos += 4;
    }
    if (order.paid_at && paidByName) {
      doc.text(fixUmlauts(`Ausgezahlt von ${paidByName} am ${formatDate(order.paid_at)}`), margin, yPos);
      yPos += 4;
    }
  }

  // Empfangsbestaetigung - NUR bei Barauszahlung - kompaktes Layout
  if (order.payment_method === 'cash') {
    const receiptY = yPos + 8;
    
    // Trennlinie
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    doc.line(margin, receiptY, pageWidth - margin, receiptY);
    
    // Titel und Betrag auf einer Zeile
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    const formattedAmount = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.amount);
    doc.text(fixUmlauts(`EMPFANGSBESTAETIGUNG: ${formattedAmount} erhalten`), margin, receiptY + 7);
    
    // Unterschrift und Datum nebeneinander - kompakt
    const fieldY = receiptY + 12;
    const signatureFieldWidth = 55;
    const dateFieldWidth = 35;
    const dateFieldX = margin + signatureFieldWidth + 15;
    
    // Unterschriftslinie
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.4);
    doc.line(margin, fieldY + 8, margin + signatureFieldWidth, fieldY + 8);
    
    // Datumsfeld
    doc.line(dateFieldX, fieldY + 8, dateFieldX + dateFieldWidth, fieldY + 8);
    
    // Labels
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(fixUmlauts(`Unterschrift ${order.recipient_name}`), margin, fieldY + 13);
    doc.text('Datum', dateFieldX, fieldY + 13);
  }

  // Footer
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString('de-DE')} | Feuerwehr Marchtrenk | Seite 1 von 1`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Return as data URL
  return doc.output('dataurlstring');
}
