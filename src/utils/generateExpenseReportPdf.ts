import { loadImageAsBase64, loadOptimizedBackground, createCompressedPdf } from '@/utils/pdfBackground';
import { loadRobotoFonts, setFont } from '@/utils/fonts/roboto-font';
import type { ExpenseReportWithItems } from '@/hooks/useExpenseReports';
import type { ExpenseCategory } from '@/hooks/useExpenseCategories';

// FF Marchtrenk Logo for header
import ffmLogo from '@/assets/uploads/ffm-logo-header.png';

// Umlauts are supported when Roboto font is loaded
// Only use fixUmlauts as fallback for standard fonts
function fixUmlauts(text: string, forceConvert = false): string {
  if (!forceConvert) {
    // Roboto supports umlauts, so return text as-is
    return text;
  }
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE');
}

export interface ExpenseReportPdfData {
  report: ExpenseReportWithItems;
  categories: ExpenseCategory[];
  pdfBackgroundUrl?: string;
  pdfBackgroundOpacity?: number;
}

// Generate PDF and return blob URL for preview (same as other PDFs)
export async function generateExpenseReportPdfPreview(data: ExpenseReportPdfData): Promise<string> {
  const doc = await createExpenseReportPdfDoc(data);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

// Internal function to create the PDF document
async function createExpenseReportPdfDoc(data: ExpenseReportPdfData): Promise<jsPDF> {
  const {
    report,
    categories,
    pdfBackgroundUrl,
    pdfBackgroundOpacity = 0.15
  } = data;

  const doc = createCompressedPdf();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Load fonts (with fallback to Helvetica if loading fails)
  try {
    await loadRobotoFonts(doc);
  } catch (fontError) {
    console.warn('[PDF] Font loading failed, using Helvetica fallback:', fontError);
  }

  // Load logo for reuse on all pages
  let logoBase64: string | null = null;
  const logoWidth = 70;
  const logoHeight = 18;
  const headerTextMaxWidth = pageWidth - margin - logoWidth - 15; // 15mm gap between text and logo
  
  try {
    logoBase64 = await loadImageAsBase64(ffmLogo);
  } catch (logoError) {
    console.warn('[PDF] Logo loading failed:', logoError);
  }

  // Helper function to add page header (logo + title + reference)
  const addPageHeader = (isFirstPage: boolean) => {
    let headerY = margin;
    
    // Add logo on every page
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', pageWidth - margin - logoWidth, margin - 5, logoWidth, logoHeight);
    }
    
    headerY += 10;
    
    // Title
    setFont(doc, 'bold');
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text('Veranstaltungsabrechnung', margin, headerY);
    headerY += 8;
    
    // Event name (shorter on continuation pages)
    setFont(doc, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    const eventNameLines = doc.splitTextToSize(fixUmlauts(report.event_name), headerTextMaxWidth);
    const displayEventLines = isFirstPage ? eventNameLines : eventNameLines.slice(0, 1);
    doc.text(displayEventLines, margin, headerY);
    headerY += displayEventLines.length * 5 + 2;
    
    // Reference number (bold) on continuation pages
    if (!isFirstPage) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      setFont(doc, 'bold');
      doc.text(`Beleg-Nr.: ${report.reference_number}`, margin, headerY);
      headerY += 6;
    } else {
      // Event date on first page
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const dateRange = report.event_date_to 
        ? `${formatDate(report.event_date_from)} - ${formatDate(report.event_date_to)}`
        : formatDate(report.event_date_from);
      doc.text(dateRange, margin, headerY);
      headerY += 8;
    }
    
    return headerY;
  };

  // ===============================
  // FIRST PAGE HEADER
  // ===============================
  y = addPageHeader(true);

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ===============================
  // EVENT INFO
  // ===============================
  doc.setTextColor(0, 0, 0);
  setFont(doc, 'bold');
  doc.setFontSize(11);
  
  // Beleg-Nr.
  doc.text('Beleg-Nr.:', margin, y);
  setFont(doc, 'bold');
  doc.text(report.reference_number, margin + 50, y);
  y += 6;
  
  // Erstelldatum
  setFont(doc, 'normal');
  doc.text('Erstellt am:', margin, y);
  setFont(doc, 'normal');
  doc.text(formatDate(report.created_at), margin + 50, y);
  y += 6;

  setFont(doc, 'bold');
  doc.text('Verantwortlich:', margin, y);
  setFont(doc, 'normal');
  doc.text(fixUmlauts(report.responsible_person), margin + 50, y);
  y += 6;

  // Payment orders (can be multiple)
  if (report.payment_orders && report.payment_orders.length > 0) {
    setFont(doc, 'bold');
    doc.text('Auszahlungsanw.:', margin, y);
    setFont(doc, 'normal');
    const poRefs = report.payment_orders.map(po => po.payment_order.reference_number).join(', ');
    doc.text(poRefs, margin + 50, y);
    y += 6;
  }

  // Participants - 3 column layout
  if (report.participants) {
    y += 4;
    setFont(doc, 'bold');
    doc.setFontSize(10);
    doc.text('Teilnehmer:', margin, y);
    y += 5;
    
    setFont(doc, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    
    // Split participants by comma and trim
    const participantNames = report.participants
      .split(',')
      .map(name => fixUmlauts(name.trim()))
      .filter(name => name.length > 0);
    
    // 3 column layout
    const colCount = 3;
    const colWidth = contentWidth / colCount;
    const lineHeight = 4;
    const maxRows = 8; // Max rows before truncating
    
    const rowCount = Math.ceil(participantNames.length / colCount);
    const displayRows = Math.min(rowCount, maxRows);
    
    for (let row = 0; row < displayRows; row++) {
      for (let col = 0; col < colCount; col++) {
        const idx = row * colCount + col;
        if (idx < participantNames.length) {
          const name = participantNames[idx];
          // Truncate long names
          const maxChars = 28;
          const displayName = name.length > maxChars ? name.substring(0, maxChars) + '...' : name;
          doc.text(displayName, margin + col * colWidth, y);
        }
      }
      y += lineHeight;
    }
    
    // Show count if truncated
    if (rowCount > maxRows) {
      const remaining = participantNames.length - (maxRows * colCount);
      if (remaining > 0) {
        doc.setTextColor(100, 100, 100);
        doc.text(`... (+${remaining} weitere)`, margin, y);
        y += lineHeight;
      }
    }
    
    doc.setTextColor(0, 0, 0);
    y += 2;
  }

  y += 8;

  // ===============================
  // ITEMS TABLE
  // ===============================
  setFont(doc, 'bold');
  doc.setFontSize(11);
  doc.text('Einzelpositionen', margin, y);
  y += 6;

  // Table header
  const colWidths = [15, 70, 45, 35]; // Pos, Bezeichnung, Kategorie, Betrag
  const tableX = margin;
  
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(tableX, y, contentWidth, 8, 'F');
  
  setFont(doc, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Pos.', tableX + 3, y + 5.5);
  doc.text('Bezeichnung', tableX + colWidths[0] + 3, y + 5.5);
  doc.text('Kategorie', tableX + colWidths[0] + colWidths[1] + 3, y + 5.5);
  doc.text('Betrag', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] - 3, y + 5.5, { align: 'right' });
  y += 10;

  // Table rows
  doc.setTextColor(0, 0, 0);
  setFont(doc, 'normal');
  doc.setFontSize(10);
  const rowHeight = 8;
  const maxYBeforeNewPage = pageHeight - 80; // Leave space for totals and signatures

  // Helper function to add table header on new page
  const addTableHeader = () => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(tableX, y, contentWidth, 8, 'F');
    
    setFont(doc, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text('Pos.', tableX + 3, y + 5.5);
    doc.text('Bezeichnung', tableX + colWidths[0] + 3, y + 5.5);
    doc.text('Kategorie', tableX + colWidths[0] + colWidths[1] + 3, y + 5.5);
    doc.text('Betrag', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] - 3, y + 5.5, { align: 'right' });
    y += 10;
    
    doc.setTextColor(0, 0, 0);
    setFont(doc, 'normal');
    doc.setFontSize(10);
  };

  report.items.forEach((item, index) => {
    // Check if we need a new page
    if (y > maxYBeforeNewPage) {
      doc.addPage();
      y = addPageHeader(false); // Add header on new page
      y += 5;
      addTableHeader();
    }
    
    const category = categories.find(c => c.id === item.category_id);
    const categoryName = category?.name || item.category_custom || '-';
    
    // Alternate row background
    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 251); // slate-50
      doc.rect(tableX, y - 1, contentWidth, rowHeight, 'F');
    }

    // Position number - vertically centered
    const textY = y + (rowHeight / 2) - 1;
    doc.text(item.position_number.toString(), tableX + 7.5, textY, { align: 'center' });
    
    const descLines = doc.splitTextToSize(fixUmlauts(item.description), colWidths[1] - 6);
    doc.text(descLines[0], tableX + colWidths[0] + 3, textY);
    
    const catLines = doc.splitTextToSize(fixUmlauts(categoryName), colWidths[2] - 6);
    doc.text(catLines[0], tableX + colWidths[0] + colWidths[1] + 3, textY);
    
    doc.text(formatCurrency(item.amount) + ' EUR', tableX + contentWidth - 3, textY, { align: 'right' });
    
    y += rowHeight;
  });

  // Empty rows - only show a few if there's space, don't overflow page
  const emptyRows = Math.min(3, Math.max(0, 10 - report.items.length));
  for (let i = 0; i < emptyRows; i++) {
    if (y > maxYBeforeNewPage) break; // Don't add empty rows if near page end
    const rowIndex = report.items.length + i;
    if (rowIndex % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(tableX, y - 1, contentWidth, rowHeight, 'F');
    }
    const textY = y + (rowHeight / 2) - 1;
    doc.setTextColor(200, 200, 200);
    doc.text((report.items.length + i + 1).toString(), tableX + 7.5, textY, { align: 'center' });
    doc.text('EUR', tableX + contentWidth - 3, textY, { align: 'right' });
    y += rowHeight;
  }

  y += 5;

  // ===============================
  // TOTALS
  // ===============================
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const totalsX = pageWidth - margin - 80;
  
  setFont(doc, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  // Ausgaben gesamt
  doc.text('Ausgaben gesamt:', totalsX, y);
  setFont(doc, 'bold');
  doc.text(formatCurrency(report.total_amount) + ' EUR', pageWidth - margin, y, { align: 'right' });
  y += 7;

  // Erhalten (Vorschuss)
  setFont(doc, 'normal');
  doc.text('Erhalten (Vorschuss):', totalsX, y);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(formatCurrency(report.advance_amount) + ' EUR', pageWidth - margin, y, { align: 'right' });
  y += 7;

  // Rest / Rueckgabe
  doc.setTextColor(0, 0, 0);
  setFont(doc, 'bold');
  const balanceLabel = report.balance_amount > 0 ? 'Nachzahlung:' : 'Rueckgabe:';
  doc.text(balanceLabel, totalsX, y);
  
  if (report.balance_amount > 0) {
    doc.setTextColor(239, 68, 68); // red-500
  } else {
    doc.setTextColor(16, 185, 129); // emerald-500
  }
  doc.setFontSize(12);
  doc.text(formatCurrency(Math.abs(report.balance_amount)) + ' EUR', pageWidth - margin, y, { align: 'right' });
  y += 15;

  // ===============================
  // NOTES
  // ===============================
  if (report.notes) {
    doc.setTextColor(100, 100, 100);
    setFont(doc, 'normal');
    doc.setFontSize(9);
    doc.text('Anmerkungen:', margin, y);
    y += 4;
    const noteLines = doc.splitTextToSize(fixUmlauts(report.notes), contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 5;
  }

  // ===============================
  // SIGNATURES
  // ===============================
  // Position signatures at bottom - Kassier left, Verantwortlicher right
  const sigY = Math.max(y + 20, pageHeight - 45);
  
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  setFont(doc, 'normal');
  doc.setFontSize(9);

  // Kassier signature (left)
  const kassierX = margin;
  doc.line(kassierX, sigY, kassierX + 60, sigY);
  doc.text('Unterschrift Kassier', kassierX + 30, sigY + 5, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('(Name, Datum)', kassierX + 30, sigY + 9, { align: 'center' });

  // Verantwortlicher signature (right)
  const verantwortlicherX = pageWidth - margin - 60;
  doc.setDrawColor(0, 0, 0);
  doc.line(verantwortlicherX, sigY, verantwortlicherX + 60, sigY);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text('Unterschrift Verantwortlicher', verantwortlicherX + 30, sigY + 5, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('(Name, Datum)', verantwortlicherX + 30, sigY + 9, { align: 'center' });

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    if (totalPages > 1) {
      doc.text(`Seite ${i} von ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
    // Footer
    doc.text('www.feuerwehr-marchtrenk.at', pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return doc;
}

// Main export function - generates and saves PDF
export async function generateExpenseReportPdf(data: ExpenseReportPdfData): Promise<void> {
  const doc = await createExpenseReportPdfDoc(data);
  const fileName = `Veranstaltungsabrechnung_${data.report.reference_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  
  try {
    doc.save(fileName);
  } catch (saveError) {
    console.warn('[PDF] Direct save failed, trying blob approach:', saveError);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
