import type { Order } from '@/hooks/useOrders';
import type { OrderVote } from '@/hooks/useOrderVotes';
import { loadOptimizedBackground, createCompressedPdf } from './pdfBackground';

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
  order: Order;
  supplierName?: string;
  creatorName?: string;
  bereichsleiterName?: string;
  votes?: OrderVote[];
  kommandomitgliederCount?: number;
  wasOverridden?: boolean;
  overriderName?: string;
  overrideReason?: string;
  pdfBackgroundUrl?: string;
  pdfBackgroundOpacity?: number;
}

export async function generateOrderPdf(data: PdfData): Promise<void> {
  const {
    order,
    supplierName,
    creatorName,
    bereichsleiterName,
    votes = [],
    kommandomitgliederCount = 0,
    wasOverridden = false,
    overriderName,
    overrideReason,
    pdfBackgroundUrl = '',
    pdfBackgroundOpacity = 0.15
  } = data;

  // Load optimized background image if configured
  const backgroundData = pdfBackgroundUrl ? await loadOptimizedBackground(pdfBackgroundUrl) : null;

  const doc = createCompressedPdf();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = 20;

  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const addLine = (y: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
  };

  // Helper to add sender info header to a page
  const addSenderHeader = () => {
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
    // Reset text color
    doc.setTextColor(30, 30, 30);
  };

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      // Apply background to new page
      if (backgroundData) {
        applyBackground();
        addSenderHeader();
      }
      yPos = 35;
    }
  };

  // Helper to apply background with opacity
  const applyBackground = () => {
    if (!backgroundData) return;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
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
  };

  // Apply background to first page
  if (backgroundData) {
    applyBackground();
  }

  // === HEADER ===
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

  // Header line (positioned below sender info and not overlapping logo)
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(margin, 32, pageWidth - 85, 32);

  // Title - adjusted position below header line
  yPos = 42;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('BESTELLUNGSFREIGABE', margin, yPos);
  yPos += 12;

  // Status badge with background
  const statusText = order.status === 'genehmigt' ? 'GENEHMIGT' : 
                     order.status === 'freigegeben_kommandant' ? 'FREIGEGEBEN (KDT)' : 
                     order.status === 'abgelehnt' ? 'ABGELEHNT' :
                     order.status.toUpperCase().replace('_', ' ');
  const statusColor = order.status === 'abgelehnt' ? [220, 38, 38] : [34, 197, 94];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  const statusWidth = doc.getTextWidth(statusText) + 8;
  doc.roundedRect(margin, yPos - 4, statusWidth, 8, 1.5, 1.5, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, margin + 4, yPos + 1);
  doc.setTextColor(30, 30, 30);
  yPos += 12;

  // Separator line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // === BESTELLDETAILS BOX === (transparent, nur Rahmen)
  const detailsBoxHeight = 58;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos - 2, contentWidth, detailsBoxHeight, 3, 3, 'S');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Bestelldetails', margin + 5, yPos + 6);
  yPos += 14;

  // Details grid
  doc.setFontSize(10);
  const labelX = margin + 5;
  const valueX = margin + 45;
  const lineHeight = 6.5;

  // Row 1: Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Bezeichnung:', labelX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(order.title, contentWidth - 50);
  doc.text(titleLines[0], valueX, yPos);
  yPos += lineHeight;

  // Row 2: Amount
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Betrag:', labelX, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(formatCurrency(order.amount), valueX, yPos);
  yPos += lineHeight;

  // Row 3: Invoice To
  if (order.invoice_to) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Rechnung an:', labelX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(order.invoice_to === 'gemeinde' ? 'Gemeinde' : 'Feuerwehr', valueX, yPos);
    yPos += lineHeight;
  }

  // Row 4: Supplier
  if (supplierName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Lieferant:', labelX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(supplierName, valueX, yPos);
    yPos += lineHeight;
  }

  // Row 5: Creator
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Erstellt von:', labelX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(creatorName || 'Unbekannt', valueX, yPos);
  yPos += lineHeight;

  // Row 6: Created at
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Erstellt am:', labelX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(formatDate(order.created_at), valueX, yPos);
  yPos += lineHeight;

  // Row 7: Bereichsleiter
  if (bereichsleiterName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Bereichsleiter:', labelX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(bereichsleiterName, valueX, yPos);
    yPos += 6;
  }

  // Description
  if (order.description) {
    yPos += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Beschreibung', margin, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    const descriptionLines = doc.splitTextToSize(order.description.replace(/<[^>]*>/g, ''), contentWidth - 5);
    checkPageBreak(descriptionLines.length * 5);
    doc.text(descriptionLines, margin, yPos);
    yPos += descriptionLines.length * 5 + 5;
  }

  yPos += 8;

  // === FREIGABE-STATUS BOX ===
  const hasApprovals = order.bereichsleiter_approved_at || order.kommandant_approved_at || order.kommandomitglied_approved_at;
  if (hasApprovals) {
    const approvalCount = [order.bereichsleiter_approved_at, order.kommandant_approved_at, order.kommandomitglied_approved_at].filter(Boolean).length;
    const approvalBoxHeight = 12 + (approvalCount * 7);
    
    checkPageBreak(approvalBoxHeight + 10);
    
    // Transparent, nur Rahmen
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos - 2, contentWidth, approvalBoxHeight, 3, 3, 'S');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('Freigabe-Status', margin + 5, yPos + 5);
    yPos += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 101, 52);

    if (order.bereichsleiter_approved_at) {
      doc.text('\u2713 Freigegeben durch Bereichsleitung: ' + formatDate(order.bereichsleiter_approved_at), margin + 5, yPos);
      yPos += 6;
    }

    if (order.kommandant_approved_at) {
      doc.text('\u2713 Freigegeben durch Kommandant: ' + formatDate(order.kommandant_approved_at), margin + 5, yPos);
      yPos += 6;
    }

    if (order.kommandomitglied_approved_at) {
      doc.text('\u2713 Freigegeben durch Kommandomitglieder: ' + formatDate(order.kommandomitglied_approved_at), margin + 5, yPos);
      yPos += 6;
    }
    
    yPos += 5;
  }
  
  doc.setTextColor(30, 30, 30);

  // Kommandomitglied Voting Section
  if (order.requires_kommandomitglied_approval && (votes.length > 0 || wasOverridden)) {
    yPos += 6;
    addLine(yPos);
    yPos += 10;

    checkPageBreak(40);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Abstimmungsergebnis Kommandomitglieder', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Override notice
    if (wasOverridden) {
      doc.setFillColor(255, 243, 224);
      doc.rect(margin, yPos - 4, contentWidth, 16, 'F');
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.text('Kommandant-Direktentscheidung', margin + 2, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`${overriderName || 'Kommandant'} hat die Abstimmung überstimmt.`, margin + 2, yPos);
      yPos += 5;
      if (overrideReason) {
        doc.text(`Begründung: ${overrideReason}`, margin + 2, yPos);
        yPos += 5;
      }
      doc.setTextColor(0, 0, 0);
      yPos += 6;
    }

    // Vote summary
    const approveCount = votes.filter(v => v.vote === 'approve').length;
    const rejectCount = votes.filter(v => v.vote === 'reject').length;
    const requiredVotes = Math.floor(kommandomitgliederCount / 2) + 1;

    doc.setFont('helvetica', 'bold');
    doc.text(`Abstimmungsstatus: ${votes.length} von ${kommandomitgliederCount} Stimmen`, margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Zustimmungen: ${approveCount}`, margin, yPos);
    yPos += 5;
    doc.text(`Ablehnungen: ${rejectCount}`, margin, yPos);
    yPos += 5;
    doc.text(`Benötigte Mehrheit: ${requiredVotes} Stimmen`, margin, yPos);
    yPos += 10;

    // Individual votes
    if (votes.length > 0) {
      checkPageBreak(10 + votes.length * 8);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Einzelne Stimmen:', margin, yPos);
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      for (const vote of votes) {
        checkPageBreak(10);
        
        const voteDate = new Date(vote.created_at);
        const formattedVoteDate = voteDate.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const formattedVoteTime = voteDate.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit'
        });

        const voteIcon = vote.vote === 'approve' ? '✓' : '✗';
        const voteColor = vote.vote === 'approve' ? [22, 163, 74] : [220, 38, 38];
        
        doc.setTextColor(voteColor[0], voteColor[1], voteColor[2]);
        doc.text(voteIcon, margin, yPos);
        doc.setTextColor(0, 0, 0);
        
        const voterText = `${vote.voter?.full_name || 'Unbekannt'} - ${formattedVoteDate}, ${formattedVoteTime} Uhr`;
        doc.text(voterText, margin + 8, yPos);
        
        if (vote.reason) {
          yPos += 5;
          doc.setTextColor(100, 100, 100);
          const reasonLines = doc.splitTextToSize(`Begründung: ${vote.reason}`, contentWidth - 10);
          doc.text(reasonLines, margin + 8, yPos);
          yPos += reasonLines.length * 4;
          doc.setTextColor(0, 0, 0);
        }
        
        yPos += 6;
      }
    }
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  
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
      `Erstellt am ${new Date().toLocaleDateString('de-DE')} | Feuerwehr Marchtrenk | Seite ${i} von ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF - use blob method for better browser compatibility
  const filename = `Bestellung_${order.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
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
