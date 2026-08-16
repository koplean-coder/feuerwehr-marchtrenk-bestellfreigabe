import { loadImageAsBase64, applyBackgroundToPage, loadOptimizedBackground, createCompressedPdf } from '@/utils/pdfBackground';
import { loadRobotoFonts, setFont } from '@/utils/fonts/roboto-font';

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

export interface ItemVoteData {
  voter_name: string;
  vote: 'approve' | 'reject' | 'abstain';
  reason: string | null;
}

export interface DecisionItemData {
  item_number: number;
  description: string;
  status: string;
  voting_result: string | null;
  voting_override_by: string | null;
  voting_override_reason: string | null;
  votes: ItemVoteData[];
  missingVoters: string[];
}

export interface CommandDecisionPdfData {
  decision: {
    id: string;
    reference_number: string;
    title: string;
    description?: string | null;
    status: string;
    created_at: string;
    submitted_at: string | null;
    voting_closed_at?: string | null;
    voting_result?: string | null;
    voting_override_by?: string | null;
    voting_override_reason?: string | null;
  };
  items?: DecisionItemData[];
  creatorName: string;
  // Legacy: votes at decision level (when no items)
  votes?: ItemVoteData[];
  missingVoters?: string[];
  closedByName?: string;
  overriddenByName?: string;
  pdfBackgroundUrl?: string;
  pdfBackgroundOpacity?: number;
  signatureUrl?: string;
  stampUrl?: string;
  commanderName?: string;
  // Optional: meeting confirmation info
  meetingConfirmation?: {
    meetingNumber: string;
    meetingDate: string;
    confirmedAt: string;
  };
}

export async function generateCommandDecisionPdf(data: CommandDecisionPdfData, options?: { returnBlob?: boolean }): Promise<Blob | void> {
  const {
    decision,
    items,
    creatorName,
    votes: legacyVotes,
    missingVoters: legacyMissingVoters,
    closedByName,
    overriddenByName,
    pdfBackgroundUrl,
    pdfBackgroundOpacity = 0.15,
    signatureUrl,
    stampUrl,
    commanderName = 'Kommandant'
  } = data;

  const doc = createCompressedPdf();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Load fonts
  await loadRobotoFonts(doc);

  // Load optimized background
  let backgroundBase64: string | null = null;
  if (pdfBackgroundUrl) {
    backgroundBase64 = await loadOptimizedBackground(pdfBackgroundUrl);
  }

  // Apply background
  if (backgroundBase64) {
    applyBackgroundToPage(doc, backgroundBase64, pdfBackgroundOpacity);
  }

  // Helper to check page break
  const checkPageBreak = (neededSpace: number) => {
    if (y + neededSpace > pageHeight - 30) {
      doc.addPage();
      if (backgroundBase64) {
        applyBackgroundToPage(doc, backgroundBase64, pdfBackgroundOpacity);
      }
      y = margin;
    }
  };

  // ===============================
  // HEADER
  // ===============================
  setFont(doc, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text('KOMMANDOABSTIMMUNG', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Reference and date
  setFont(doc, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Referenz: ${decision.reference_number}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Eingereicht am: ${decision.submitted_at ? new Date(decision.submitted_at).toLocaleDateString('de-DE') : '-'}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ===============================
  // TITLE SECTION
  // ===============================
  doc.setTextColor(0, 0, 0);
  setFont(doc, 'bold');
  doc.setFontSize(12);
  doc.text('Antragsteller:', margin, y);
  setFont(doc, 'normal');
  doc.text(fixUmlauts(creatorName), margin + 35, y);
  y += 8;

  setFont(doc, 'bold');
  doc.text('Titel:', margin, y);
  setFont(doc, 'normal');
  const titleLines = doc.splitTextToSize(fixUmlauts(decision.title), contentWidth - 20);
  doc.text(titleLines, margin + 15, y);
  y += titleLines.length * 5 + 10;

  // ===============================
  // BESCHLUSSPUNKTE (Items)
  // ===============================
  const hasItems = items && items.length > 0;
  const itemsToRender = hasItems ? items : [{
    item_number: 1,
    description: decision.description || decision.title,
    status: decision.status,
    voting_result: decision.voting_result || null,
    voting_override_by: decision.voting_override_by || null,
    voting_override_reason: decision.voting_override_reason || null,
    votes: legacyVotes || [],
    missingVoters: legacyMissingVoters || []
  }];

  for (const item of itemsToRender) {
    checkPageBreak(60);

    // Item box with styled header
    doc.setFillColor(247, 250, 252);
    doc.setDrawColor(30, 64, 175);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'FD');
    
    setFont(doc, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175);
    doc.text(`Beschlusspunkt ${item.item_number}`, margin + 5, y + 5.5);
    
    // Status badge on right
    const statusColors: Record<string, [number, number, number]> = {
      approved: [34, 197, 94],
      rejected: [239, 68, 68],
      voting: [249, 115, 22],
      pending: [100, 100, 100],
      submitted: [249, 115, 22]
    };
    const statusLabels: Record<string, string> = {
      approved: 'GENEHMIGT',
      rejected: 'ABGELEHNT',
      voting: 'ABSTIMMUNG',
      pending: 'AUSSTEHEND',
      submitted: 'ABSTIMMUNG'
    };
    const statusColor = statusColors[item.status] || [100, 100, 100];
    const statusLabel = statusLabels[item.status] || item.status.toUpperCase();
    
    doc.setFontSize(9);
    doc.setTextColor(...statusColor);
    doc.text(statusLabel, pageWidth - margin - 5, y + 5.5, { align: 'right' });
    y += 12;

    // The decision text with "Das Kommando möge beschließen..." format
    doc.setTextColor(0, 0, 0);
    setFont(doc, 'normal');
    doc.setFontSize(11);
    doc.text('Das Kommando moege beschliessen:', margin + 5, y);
    y += 8;

    // Description in a quote box
    const descLines = doc.splitTextToSize(fixUmlauts(item.description), contentWidth - 20);
    const boxHeight = descLines.length * 5 + 10;
    
    doc.setFillColor(255, 250, 240);
    doc.setDrawColor(249, 115, 22);
    doc.roundedRect(margin + 5, y - 2, contentWidth - 10, boxHeight, 2, 2, 'FD');
    
    setFont(doc, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`"${descLines.join('\n')}"`, margin + 10, y + 5);
    y += boxHeight + 5;

    doc.setTextColor(0, 0, 0);
    doc.text('zu beschliessen.', margin + 5, y);
    y += 12;

    // Voting results for this item
    if (item.votes && item.votes.length > 0) {
      checkPageBreak(30);
      
      const approveCount = item.votes.filter(v => v.vote === 'approve').length;
      const rejectCount = item.votes.filter(v => v.vote === 'reject').length;
      const abstainCount = item.votes.filter(v => v.vote === 'abstain').length;

      // Results bar
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(margin + 5, y, contentWidth - 10, 20, 2, 2, 'F');

      setFont(doc, 'bold');
      doc.setFontSize(10);
      doc.text('Abstimmungsergebnis:', margin + 10, y + 7);

      setFont(doc, 'normal');
      doc.setTextColor(34, 197, 94);
      doc.text(`Dafuer: ${approveCount}`, margin + 60, y + 7);
      
      doc.setTextColor(239, 68, 68);
      doc.text(`Dagegen: ${rejectCount}`, margin + 95, y + 7);
      
      doc.setTextColor(100, 100, 100);
      doc.text(`Enthaltung: ${abstainCount}`, margin + 135, y + 7);

      // Final result
      if (item.status === 'approved' || item.status === 'rejected') {
        const resultColor = item.status === 'approved' ? [34, 197, 94] : [239, 68, 68];
        const resultText = item.status === 'approved' ? 'ANGENOMMEN' : 'ABGELEHNT';
        doc.setTextColor(...(resultColor as [number, number, number]));
        setFont(doc, 'bold');
        doc.text(resultText, pageWidth - margin - 10, y + 7, { align: 'right' });
      }

      // Voter names (small)
      setFont(doc, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const voterNames = item.votes.map(v => {
        const voteSymbol = v.vote === 'approve' ? '✓' : v.vote === 'reject' ? '✗' : '○';
        return `${voteSymbol} ${fixUmlauts(v.voter_name)}`;
      }).join(', ');
      const voterLines = doc.splitTextToSize(voterNames, contentWidth - 20);
      doc.text(voterLines, margin + 10, y + 14);
      y += 22 + (voterLines.length > 1 ? (voterLines.length - 1) * 3 : 0);
    }

    // Missing voters
    if (item.missingVoters && item.missingVoters.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(249, 115, 22);
      doc.text(`Nicht abgestimmt: ${item.missingVoters.map(n => fixUmlauts(n)).join(', ')}`, margin + 5, y);
      y += 6;
    }

    // Override info
    if (item.voting_override_by && item.voting_override_reason) {
      checkPageBreak(20);
      doc.setFillColor(255, 247, 237);
      doc.setDrawColor(249, 115, 22);
      doc.roundedRect(margin + 5, y, contentWidth - 10, 15, 2, 2, 'FD');
      
      setFont(doc, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(249, 115, 22);
      doc.text('UEBERSTIMMT:', margin + 10, y + 6);
      
      setFont(doc, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      const overrideText = doc.splitTextToSize(fixUmlauts(item.voting_override_reason), contentWidth - 50);
      doc.text(overrideText, margin + 40, y + 6);
      y += 18;
    }

    y += 8; // Space between items
  }

  // ===============================
  // SIGNATURE AREA
  // ===============================
  const allDecided = itemsToRender.every(i => i.status === 'approved' || i.status === 'rejected');
  
  if (allDecided) {
    // Ensure signature is at bottom or on new page
    if (y > pageHeight - 80) {
      doc.addPage();
      if (backgroundBase64) {
        applyBackgroundToPage(doc, backgroundBase64, pdfBackgroundOpacity);
      }
      y = pageHeight - 70;
    } else {
      y = Math.max(y + 20, pageHeight - 70);
    }

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Date of completion
    setFont(doc, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const completionDate = decision.voting_closed_at 
      ? new Date(decision.voting_closed_at).toLocaleDateString('de-DE')
      : new Date().toLocaleDateString('de-DE');
    doc.text(`Abgeschlossen am: ${completionDate}`, margin, y);
    y += 15;

    // Signature and stamp area
    const signatureX = pageWidth - margin - 60;

    if (stampUrl) {
      try {
        const stampBase64 = await loadImageAsBase64(stampUrl);
        if (stampBase64) {
          doc.addImage(stampBase64, 'PNG', signatureX - 25, y - 5, 35, 35);
        }
      } catch (e) {
        console.error('Error loading stamp:', e);
      }
    }

    if (signatureUrl) {
      try {
        const signatureBase64 = await loadImageAsBase64(signatureUrl);
        if (signatureBase64) {
          doc.addImage(signatureBase64, 'PNG', signatureX + 5, y, 45, 22);
        }
      } catch (e) {
        console.error('Error loading signature:', e);
      }
    }

    // Signature line
    doc.setDrawColor(0, 0, 0);
    doc.line(signatureX, y + 25, signatureX + 50, y + 25);
    
    setFont(doc, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(fixUmlauts(commanderName), signatureX + 25, y + 32, { align: 'center' });
    doc.setTextColor(100, 100, 100);
    doc.text('Kommandant', signatureX + 25, y + 37, { align: 'center' });
  }

  // Save or return PDF
  const fileName = `Kommandoabstimmung_${decision.reference_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  
  if (options?.returnBlob) {
    return doc.output('blob');
  }
  
  doc.save(fileName);
}

// ===============================
// EXAMPLE PDF GENERATOR
// ===============================
export async function generateExampleCommandDecisionPdf(): Promise<void> {
  const exampleData: CommandDecisionPdfData = {
    decision: {
      id: 'example-1',
      reference_number: 'KA-2025-0001',
      title: 'Beschaffungsantrag Atemschutzausruestung',
      status: 'approved',
      created_at: new Date().toISOString(),
      submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      voting_closed_at: new Date().toISOString()
    },
    items: [
      {
        item_number: 1,
        description: 'Ankauf von 10 neuen Atemschutzgeraeten der Marke Draeger PSS 5000 zum Preis von maximal 25.000 EUR inkl. MwSt.',
        status: 'approved',
        voting_result: 'approved',
        voting_override_by: null,
        voting_override_reason: null,
        votes: [
          { voter_name: 'Hans Mueller', vote: 'approve', reason: null },
          { voter_name: 'Franz Huber', vote: 'approve', reason: null },
          { voter_name: 'Maria Gruber', vote: 'approve', reason: 'Dringend notwendig' },
          { voter_name: 'Josef Maier', vote: 'reject', reason: 'Budget pruefen' },
          { voter_name: 'Anna Schmidt', vote: 'abstain', reason: null }
        ],
        missingVoters: []
      },
      {
        item_number: 2,
        description: 'Reparatur der Tragkraftspritze TS 8/8 durch die Firma Rosenbauer zum Kostenvoranschlag von 3.200 EUR.',
        status: 'approved',
        voting_result: 'approved',
        voting_override_by: null,
        voting_override_reason: null,
        votes: [
          { voter_name: 'Hans Mueller', vote: 'approve', reason: null },
          { voter_name: 'Franz Huber', vote: 'approve', reason: null },
          { voter_name: 'Maria Gruber', vote: 'approve', reason: null },
          { voter_name: 'Josef Maier', vote: 'approve', reason: null },
          { voter_name: 'Anna Schmidt', vote: 'approve', reason: null }
        ],
        missingVoters: []
      },
      {
        item_number: 3,
        description: 'Teilnahme am Landesfeuerwehrleistungsbewerb 2025 in Linz mit maximal 2 Bewerbsgruppen.',
        status: 'rejected',
        voting_result: 'rejected',
        voting_override_by: null,
        voting_override_reason: null,
        votes: [
          { voter_name: 'Hans Mueller', vote: 'reject', reason: 'Zu wenig Teilnehmer' },
          { voter_name: 'Franz Huber', vote: 'reject', reason: null },
          { voter_name: 'Maria Gruber', vote: 'approve', reason: null },
          { voter_name: 'Josef Maier', vote: 'reject', reason: null }
        ],
        missingVoters: ['Anna Schmidt']
      }
    ],
    creatorName: 'Max Mustermann',
    commanderName: 'OBI Johann Brandner'
  };

  await generateCommandDecisionPdf(exampleData);
}
