const ROSE = [244, 63, 94];
const AMBER = [217, 119, 6];
const EMERALD = [16, 185, 129];
const RED = [220, 38, 38];
const DARK = [15, 17, 23];
const GRAY = [120, 130, 145];
const BODY = [40, 40, 40];

export async function exportPlanningToPdf(result, meta = {}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'p' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  const newPageIfNeeded = (needed) => {
    if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
  };

  const heading = (text, color) => {
    newPageIfNeeded(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...color);
    doc.text(text, margin, y + 5);
    y += 9;
  };

  const body = (text) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...BODY);
    const lines = doc.splitTextToSize(text || '', contentW);
    lines.forEach((ln) => {
      newPageIfNeeded(6);
      doc.text(ln, margin, y + 5);
      y += 5.5;
    });
    y += 3;
  };

  const bullets = (items, color = BODY) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...color);
    (items || []).forEach((item) => {
      const lines = doc.splitTextToSize(item || '', contentW - 6);
      lines.forEach((ln, i) => {
        newPageIfNeeded(6);
        if (i === 0) doc.text('•', margin, y + 5);
        doc.text(ln, margin + 6, y + 5);
        y += 5.5;
      });
      y += 1.5;
    });
    y += 3;
  };

  const table = (rows) => {
    const data = Array.isArray(rows) ? rows : [];
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    if (!keys.length) return;
    const colCount = keys.length;
    const colW = contentW / colCount;
    const rowH = 7;
    const minRowH = 6;

    newPageIfNeeded(rowH + 4);
    doc.setFillColor(...DARK);
    doc.rect(margin, y, contentW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...ROSE);
    keys.forEach((k, i) => {
      const lines = doc.splitTextToSize(String(k).replace(/_/g, ' '), colW - 3);
      doc.text(lines[0] || '', margin + i * colW + 2, y + 5);
    });
    y += rowH;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    data.forEach((row, idx) => {
      const cellLines = keys.map((k) =>
        doc.splitTextToSize(String(row[k] ?? ''), colW - 3)
      );
      const maxLines = Math.max(1, ...cellLines.map((l) => l.length));
      const thisRowH = Math.max(minRowH, maxLines * 4.2 + 2.5);
      newPageIfNeeded(thisRowH);
      if (idx % 2 === 1) {
        doc.setFillColor(244, 246, 248);
        doc.rect(margin, y, contentW, thisRowH, 'F');
      }
      doc.setTextColor(...BODY);
      cellLines.forEach((lines, i) => {
        lines.forEach((ln, li) => {
          doc.text(ln, margin + i * colW + 2, y + 4.5 + li * 4.2);
        });
      });
      y += thisRowH;
    });
    y += 4;
  };

  // Header band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...ROSE);
  doc.text('Palladio AI — Town Planning Assessment', margin, 14);
  y = 30;

  // Verdict
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  const verdictLines = doc.splitTextToSize(result.verdict || 'Town Planning Assessment', contentW);
  verdictLines.forEach((ln) => {
    newPageIfNeeded(7);
    doc.text(ln, margin, y);
    y += 6;
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  const reasonLines = doc.splitTextToSize(result.verdict_reason || '', contentW);
  reasonLines.forEach((ln) => {
    newPageIfNeeded(6);
    doc.text(ln, margin, y + 2);
    y += 5.5;
  });
  y += 6;

  // Proposal / property details
  const pd = meta.propertyData || {};
  const detailRows = [
    meta.address && `Address: ${meta.address}`,
    pd.lot_rp && `Lot / RP: ${pd.lot_rp}`,
    pd.site_area && `Site Area: ${pd.site_area}`,
    pd.zoning && `Zoning: ${pd.zoning}`,
    meta.devType && `Development Type: ${meta.devType}`,
    meta.description && `Description: ${meta.description}`,
  ].filter(Boolean);
  if (detailRows.length) {
    heading('Proposal Details', ROSE);
    detailRows.forEach((r) => {
      const lines = doc.splitTextToSize(r, contentW);
      lines.forEach((ln) => {
        newPageIfNeeded(6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...BODY);
        doc.text(ln, margin, y + 5);
        y += 5.5;
      });
    });
    y += 4;
  }

  if (pd.overlays?.length) {
    heading('Property Overlays', ROSE);
    bullets(pd.overlays);
  }

  heading('Zoning Assessment', ROSE); body(result.zoning_assessment);
  heading('Planning Controls', ROSE); body(result.planning_controls);
  if (result.overlays) { heading('Overlays', ROSE); body(result.overlays); }

  if (result.issues?.length) { heading('Key Issues', AMBER); bullets(result.issues, AMBER); }
  if (result.red_flags?.length) { heading('Red Flags', RED); bullets(result.red_flags, RED); }

  heading('Neighbour Impact', ROSE); body(result.neighbour_impact);
  heading('Application Requirements', ROSE); body(result.application_requirements);
  if (result.recommendations?.length) { heading('Recommendations', EMERALD); bullets(result.recommendations, EMERALD); }

  if (pd.forms_and_applications?.length) {
    heading('Relevant Forms & Applications', ROSE);
    table(pd.forms_and_applications);
  }

  if (result.disclaimer) {
    newPageIfNeeded(12);
    doc.setDrawColor(...GRAY);
    doc.line(margin, y, margin + contentW, y);
    y += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    const dLines = doc.splitTextToSize(result.disclaimer, contentW);
    dLines.forEach((ln) => {
      newPageIfNeeded(5);
      doc.text(ln, margin, y + 4);
      y += 4.5;
    });
  }

  doc.save('town-planning-assessment.pdf');
}