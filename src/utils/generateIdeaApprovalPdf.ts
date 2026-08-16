import { loadImageAsBase64, loadStampWithTransparency, loadOptimizedBackground, createCompressedPdf } from './pdfBackground';

// Fix German umlauts for jsPDF
function fixUmlauts(text: string): string {
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

export interface VoteLog {
  id: string;
  user_id: string;
  user_name: string;
  action: 'added' | 'changed' | 'removed';
  previous_vote: string | null;
  new_vote: string | null;
  created_at: string;
}

export interface IdeaApprovalPdfData {
  idea: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    status: string;
    created_at: string;
    creator_name: string;
    vote_count: number;
    up_votes: number;
    down_votes: number;
    comment_count: number;
  };
  voteLogs: VoteLog[];
  totalEligibleVoters: number;
  approvedAt: string;
  approvedBy: string;
  pdfBackgroundUrl?: string;
  pdfBackgroundOpacity?: number;
  signatureUrl?: string;
  stampUrl?: string;
  commanderName?: string;
}

export async function generateIdeaApprovalPdf(data: IdeaApprovalPdfData): Promise<void> {
  const {
    idea,
    voteLogs,
    totalEligibleVoters,
    approvedAt,
    approvedBy,
    pdfBackgroundUrl = '',
    pdfBackgroundOpacity = 0.15,
    signatureUrl,
    stampUrl,
    commanderName = 'Kommandant'
  } = data;

  // Load images - use optimized loader for background, keep PNG for signature/stamp (need transparency)
  const backgroundData = pdfBackgroundUrl ? await loadOptimizedBackground(pdfBackgroundUrl) : null;
  const signatureData = signatureUrl ? await loadImageAsBase64(signatureUrl) : null;
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

  // Header line
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(margin, 32, pageWidth - 75, 32);

  // Title
  let yPos = 50;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Ideen-Freigabe', margin, yPos);
  yPos += 12;

  // Reference/Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  doc.text(`Genehmigt am: ${formatDate(approvedAt)}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  // Form fields helper
  const fieldHeight = 12;
  const labelWidth = 45;
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

  // Idea Title
  drawField('Titel:', idea.title, yPos);
  yPos += fieldHeight + 8;

  // Category
  drawField('Kategorie:', idea.category, yPos);
  yPos += fieldHeight + 8;

  // Creator
  drawField('Eingereicht von:', idea.creator_name || 'Unbekannt', yPos);
  yPos += fieldHeight + 8;

  // Created at
  drawField('Eingereicht am:', formatDate(idea.created_at), yPos);
  yPos += fieldHeight + 8;

  // Description
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(fixUmlauts('Beschreibung:'), margin, yPos + 4);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const descriptionText = idea.description || 'Keine Beschreibung vorhanden';
  const descriptionLines = doc.splitTextToSize(fixUmlauts(descriptionText), pageWidth - margin * 2);
  
  // Draw description box
  const descBoxHeight = Math.max(20, descriptionLines.length * 5 + 8);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - margin * 2, descBoxHeight);
  doc.text(descriptionLines, margin + 3, yPos + 6);
  yPos += descBoxHeight + 10;

  // Voting Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Abstimmungsergebnis', margin, yPos);
  yPos += 10;

  // Vote count box
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 2, pageWidth - margin * 2, 16, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Show detailed vote counts
  doc.setTextColor(34, 139, 34);
  doc.text(`Dafuer: ${idea.up_votes}`, margin + 5, yPos + 8);
  
  doc.setTextColor(220, 20, 60);
  doc.text(`Dagegen: ${idea.down_votes}`, margin + 40, yPos + 8);
  
  doc.setTextColor(100, 100, 100);
  doc.text(`von ${totalEligibleVoters} Berechtigten`, margin + 80, yPos + 8);
  
  doc.text(`Kommentare: ${idea.comment_count}`, margin + 130, yPos + 8);
  yPos += 22;

  // Vote Protocol
  if (voteLogs.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Abstimmungsprotokoll', margin, yPos);
    yPos += 8;

    // Table header
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos - 2, pageWidth - margin * 2, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Datum/Zeit', margin + 2, yPos + 4);
    doc.text('Benutzer', margin + 40, yPos + 4);
    doc.text('Aktion', margin + 95, yPos + 4);
    doc.text('Stimme', margin + 130, yPos + 4);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Limit to last 15 entries to fit on page
    const displayLogs = voteLogs.slice(-15);
    
    for (const log of displayLogs) {
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
        
        // Reapply background on new page
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
      }

      doc.setTextColor(80, 80, 80);
      const logDate = new Date(log.created_at).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(logDate, margin + 2, yPos);
      doc.text(fixUmlauts(log.user_name || 'Unbekannt').substring(0, 25), margin + 40, yPos);
      
      // Action text
      let actionText = '';
      switch (log.action) {
        case 'added': actionText = 'Abgestimmt'; break;
        case 'changed': actionText = 'Geaendert'; break;
        case 'removed': actionText = 'Entfernt'; break;
        default: actionText = log.action;
      }
      doc.text(actionText, margin + 95, yPos);
      
      // Vote value
      let voteValue = '';
      if (log.new_vote) {
        voteValue = log.new_vote === 'up' ? 'Dafuer' : 'Dagegen';
      } else if (log.previous_vote) {
        voteValue = `(${log.previous_vote === 'up' ? 'Dafuer' : 'Dagegen'})`;
      }
      doc.text(voteValue, margin + 130, yPos);
      
      yPos += 6;
    }

    if (voteLogs.length > 15) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`... und ${voteLogs.length - 15} weitere Eintraege`, margin + 2, yPos);
      yPos += 6;
    }
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Keine Abstimmungsprotokolle vorhanden', margin, yPos);
    yPos += 10;
  }

  yPos += 15;

  // Ensure signature section fits on current page
  if (yPos > pageHeight - 70) {
    doc.addPage();
    yPos = 30;
    
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
  }

  // Approval text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text('GENEHMIGT', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(fixUmlauts(`Freigegeben von ${approvedBy} am ${formatDate(approvedAt)}`), margin, yPos);
  yPos += 20;

  // Signature section
  const signatureY = yPos;
  const signatureWidth = 50;
  const signatureHeight = 20;

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
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Erstellt am ${new Date().toLocaleDateString('de-DE')} | Ideen-Pool Freigabe | Seite ${i} von ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save
  const safeTitle = idea.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_').substring(0, 30);
  const filename = `Ideen-Freigabe_${safeTitle}_${formatDate(approvedAt).replace(/\./g, '-')}.pdf`;
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
