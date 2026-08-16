import type { Supplier } from '@/hooks/useSuppliers';
import { loadOptimizedBackground, createCompressedPdf } from './pdfBackground';

interface ExportOptions {
  suppliers: Supplier[];
  profiles?: { id: string; full_name: string }[];
  pdfBackgroundUrl?: string;
  pdfBackgroundOpacity?: number;
}

// Helper functions
function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ==================== PDF EXPORT ====================
export async function exportSuppliersToPdf({ suppliers, profiles = [], pdfBackgroundUrl = '', pdfBackgroundOpacity = 0.15 }: ExportOptions): Promise<void> {
  // Load optimized background image if configured
  const backgroundData = pdfBackgroundUrl ? await loadOptimizedBackground(pdfBackgroundUrl) : null;

  const doc = createCompressedPdf();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  const getBereichsleiterName = (id: string | null) => {
    if (!id) return '-';
    const profile = profiles.find((p) => p.id === id);
    return profile?.full_name || '-';
  };

  // Helper to apply background with opacity
  const applyBackground = () => {
    if (!backgroundData) return;
    
    doc.saveGraphicsState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF GState constructor ist nicht korrekt typisiert
    const gState = new (doc as any).GState({ opacity: pdfBackgroundOpacity });
    doc.setGState(gState);
    
    try {
      doc.addImage(backgroundData, 'AUTO', 0, 0, pageWidth, pageHeight);
    } catch (e) {
      console.error('Failed to add background:', e);
    }
    
    doc.restoreGraphicsState();
  };

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - 20) {
      doc.addPage();
      if (backgroundData) applyBackground();
      yPos = 20;
      return true;
    }
    return false;
  };

  // Apply background to first page
  if (backgroundData) applyBackground();

  // Header line (kürzer, endet vor dem Logo)
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(margin, 15, pageWidth - 80, 15);

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('LIEFERANTENÜBERSICHT', margin, yPos + 5);
  yPos += 12;

  // Subtitle badge
  doc.setFillColor(59, 130, 246);
  const countText = `${suppliers.length} Lieferanten`;
  const countWidth = doc.getTextWidth(countText) + 10;
  doc.roundedRect(margin, yPos - 4, countWidth, 8, 1.5, 1.5, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(countText, margin + 5, yPos + 1);
  
  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Erstellt am ${formatDate(new Date())}`, margin + countWidth + 8, yPos + 1);
  doc.setTextColor(30, 30, 30);
  yPos += 12;

  // Separator line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Suppliers
  suppliers.forEach((supplier, index) => {
    checkPageBreak(45);

    // Supplier header (transparent, nur Rahmen)
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos - 4, contentWidth, 12, 2, 2, 'S');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${supplier.name}`, margin + 4, yPos + 4);
    yPos += 14;

    // Details table
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lineHeight = 5;

    const details: [string, string][] = [];

    if (supplier.customer_number) {
      details.push(['Kundennummer:', supplier.customer_number]);
    }
    if (supplier.link) {
      details.push(['Website:', truncateText(supplier.link, 50)]);
    }
    if (supplier.order_email) {
      details.push(['E-Mail:', supplier.order_email]);
    }
    if (supplier.order_phone) {
      details.push(['Telefon:', supplier.order_phone]);
    }
    if (supplier.offered_articles) {
      details.push(['Sortiment:', truncateText(supplier.offered_articles, 60)]);
    }
    if (supplier.minimum_order_value && supplier.minimum_order_value > 0) {
      details.push(['Mindestbestellwert:', `${supplier.minimum_order_value.toFixed(2)} €`]);
    }
    if (supplier.discount_percent) {
      details.push(['Rabatt:', `${supplier.discount_percent}%`]);
    }
    if (supplier.payment_terms) {
      details.push(['Zahlungsbedingungen:', truncateText(supplier.payment_terms, 50)]);
    }
    if (supplier.assigned_bereichsleiter_id) {
      details.push(['Zuständig:', getBereichsleiterName(supplier.assigned_bereichsleiter_id)]);
    }

    details.forEach(([label, value]) => {
      checkPageBreak(lineHeight + 2);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 4, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 45, yPos);
      yPos += lineHeight;
    });

    yPos += 8;
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(200, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Erstellt am ${formatDate(new Date())} | Feuerwehr Marchtrenk | Seite ${i} von ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save - use blob method for better browser compatibility
  const filename = `Lieferanten_${formatDate(new Date()).replace(/\./g, '-')}.pdf`;
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

// ==================== CSV/EXCEL EXPORT ====================
export function exportSuppliersToExcel({ suppliers, profiles = [] }: ExportOptions): void {
  const getBereichsleiterName = (id: string | null) => {
    if (!id) return '';
    const profile = profiles.find((p) => p.id === id);
    return profile?.full_name || '';
  };

  // Build CSV content
  const headers = [
    'Name',
    'Kundennummer',
    'Website',
    'E-Mail',
    'Telefon',
    'Sortiment',
    'Mindestbestellwert',
    'Rabatt (%)',
    'Zahlungsbedingungen',
    'Sonderkonditionen',
    'Zuständiger Bereichsleiter',
    'Bestelltage'
  ];

  const escapeCSV = (value: string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // If contains comma, newline, or quote, wrap in quotes and escape inner quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = suppliers.map((s) => [
    escapeCSV(s.name),
    escapeCSV(s.customer_number),
    escapeCSV(s.link),
    escapeCSV(s.order_email),
    escapeCSV(s.order_phone),
    escapeCSV(s.offered_articles),
    s.minimum_order_value ? s.minimum_order_value.toFixed(2) : '',
    s.discount_percent ? String(s.discount_percent) : '',
    escapeCSV(s.payment_terms),
    escapeCSV(s.special_conditions),
    escapeCSV(getBereichsleiterName(s.assigned_bereichsleiter_id)),
    escapeCSV((s.order_days ?? []).join(', '))
  ]);

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    headers.join(';'), // Use semicolon for German Excel
    ...rows.map((row) => row.join(';'))
  ].join('\n');

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Lieferanten_${formatDate(new Date()).replace(/\./g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
