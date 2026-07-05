const CYAN = [34, 211, 238];
const AMBER = [217, 119, 6];
const EMERALD = [16, 185, 129];
const DARK = [15, 17, 23];
const GRAY = [120, 130, 145];
const BODY = [40, 40, 40];

export async function exportAssessmentToPdf(result, tier) {
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

  const bullets = (items) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...BODY);
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

    // Header row
    newPageIfNeeded(rowH + 4);
    doc.setFillColor(...DARK);
    doc.rect(margin, y, contentW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...CYAN);
    keys.forEach((k, i) => {
      const lines = doc.splitTextToSize(String(k).replace(/_/g, ' '), colW - 3);
      doc.text(lines[0] || '', margin + i * colW + 2, y + 5);
    });
    y += rowH;

    // Body rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    data.forEach((row, idx) => {
      // compute max lines across columns for this row
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
  doc.setTextColor(...CYAN);
  doc.text('Palladio AI — Plan Assessment', margin, 14);
  y = 30;

  // Title + score
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  const titleLines = doc.splitTextToSize(result.plan_type || 'Plan Assessment', contentW);
  titleLines.forEach((ln) => {
    newPageIfNeeded(7);
    doc.text(ln, margin, y);
    y += 6;
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`Overall Score: ${result.overall_score ?? '-'}/10   |   Tier: ${tier === 'concept' ? 'Tier 1 (Concept)' : 'Tier 2 (Construction)'}`, margin, y + 2);
  y += 10;

  // Project information
  const pi = result.project_info || {};
  const piRows = [
    pi.project_name && `Project: ${pi.project_name}`,
    pi.client_name && `Client: ${pi.client_name}`,
    pi.address && `Address: ${pi.address}`,
    pi.lot_no && `Lot No.: ${pi.lot_no}`,
    pi.rp_no && `RP No.: ${pi.rp_no}`,
    pi.site_area && `Site Area: ${pi.site_area}`,
    pi.council_overlays && `Council Overlays: ${pi.council_overlays}`,
  ].filter(Boolean);
  if (piRows.length) {
    heading('Project Information', CYAN);
    piRows.forEach((r) => {
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

  heading('Overview', CYAN); body(result.overview);
  heading('Spatial Analysis', CYAN); body(result.spatial_analysis);
  heading('Design Observations', CYAN); bullets(result.design_observations);
  heading('Compliance & Flags', AMBER); bullets(result.compliance_flags);
  heading('Recommendations', EMERALD); bullets(result.recommendations);

  if (Array.isArray(result.estimating_blind_spots) && result.estimating_blind_spots.length) {
    heading('Estimating Blind Spots', AMBER);
    bullets(result.estimating_blind_spots);
  }

  if (Array.isArray(result.generated_window_door_schedule) && result.generated_window_door_schedule.length) {
    heading('Window & Door Schedule', CYAN);
    table(result.generated_window_door_schedule);
  }

  doc.save(`${tier}-assessment.pdf`);
}