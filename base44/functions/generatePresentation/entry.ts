import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Content-Type": "application/json" } });

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      requestBody = {};
    }

    const dryRun = requestBody?.dry_run === true;
    const pData = requestBody?.presentation_data || requestBody || {};

    // ---- Financial figures: explicit, validated, never fabricated ----
    // The estimator must send the deterministic calculator's actual figures:
    // subtotal ex GST, builder's margin, GST amount and total investment.
    // No hardcoded margin fallback and no guessed GST.
    const requiredFields = ["subtotal_ex_gst", "builders_margin", "gst_amount", "total_estimated_investment"];
    const missing = requiredFields.filter((f) => typeof pData[f] !== "number" || !Number.isFinite(pData[f]));
    if (missing.length > 0) {
      return Response.json({
        success: false,
        error: `Missing or invalid financial fields: ${missing.join(", ")}. The estimate export requires the actual subtotal (ex GST), builder's margin, GST amount and total investment from the estimator.`
      }, { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const subtotalExGst = pData.subtotal_ex_gst;
    const buildersMargin = pData.builders_margin;
    const gstAmount = pData.gst_amount;
    const totalInvestment = pData.total_estimated_investment;

    // Reconciliation (tolerance $1.00 for currency rounding): the payload must
    // add up — subtotal ex GST + GST = total estimated investment.
    if (Math.abs(subtotalExGst + gstAmount - totalInvestment) > 1) {
      return Response.json({
        success: false,
        error: "Financial figures do not reconcile: subtotal ex GST plus GST must equal the total estimated investment."
      }, { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // When a GST component is present, the total is GST-inclusive and the GST
    // component must equal total * 10/110 (NOT total * 0.10).
    if (gstAmount > 0 && Math.abs(gstAmount - (totalInvestment * 10 / 110)) > 1) {
      return Response.json({
        success: false,
        error: "GST amount is inconsistent with a GST-inclusive total (expected total * 10/110)."
      }, { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const formatCurrency = (val) => {
      if (typeof val === 'number') return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val);
      return val || "$0.00";
    };

    const formattedData = {
      "title": pData.title || "Preliminary Construction Estimate",
      "subtitle": pData.subtitle || "Custom Tailored for Your Vision",
      "project_type": pData.project_type || "New Build",
      "location_profile": pData.location_profile || "Queensland",
      "total_floor_area_sqm": pData.total_floor_area_sqm || "318 sqm",
      "level_of_finish": pData.level_of_finish || "Medium/Premium",
      "base_construction_cost": formatCurrency(pData.base_construction_cost ?? pData.subtotal),
      "site_costs_and_prelims": formatCurrency(pData.site_costs_and_prelims ?? pData.site_difficulty_markup_cost),
      // Actual figures from the deterministic calculator — never defaulted.
      "builders_margin": formatCurrency(buildersMargin),
      "subtotal_ex_gst": formatCurrency(subtotalExGst),
      "gst_amount": formatCurrency(gstAmount),
      "total_estimated_investment": formatCurrency(totalInvestment),
      "key_inclusions": pData.key_inclusions || "• Standard Approvals\n• Earthworks\n• Selected Materials",
      "key_exclusions": pData.key_exclusions || "• Landscaping\n• Pool Fencing\n• Window Furnishings",
      "call_to_action": pData.call_to_action || "Let's turn these numbers into reality.",
      "step_1": pData.step_1 || "Review this preliminary estimate.",
      "step_2": pData.step_2 || "Finalize architectural plans and engineering.",
      "step_3": pData.step_3 || "Generate a fixed-price master builder contract."
    };

    // Test/dry-run mode: return the exact payload that would be sent, without
    // calling the external presentation service.
    if (dryRun) {
      return Response.json({ success: true, dry_run: true, presentation_data: formattedData });
    }

    // Apps Script web-app deployment that renders the Google Slides deck
    // (same deployment previously selected via an optional env override that
    // was never configured).
    const deploymentId = "AKfycbxgO7CnmwFjlYvGfHlOWMohn5AFumQoNb1dnIlw4WTbeP3ozc9s0LfjeEm1Z6vI3ekr";
    const scriptUrl = `https://script.google.com/macros/s/${deploymentId}/exec`;

    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ presentation_data: formattedData }),
      redirect: "follow"
    });

    if (!response.ok) {
       const errText = await response.text();
       throw new Error(`Apps Script HTTP ${response.status}: ${errText}`);
    }

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Apps Script returned non-JSON. Response preview: ${responseText.substring(0, 150)}`);
    }

    if (result.success === false) {
       throw new Error(`Apps Script Internal Error: ${result.error}`);
    }

    if (result.success && result.presentation_url && !result.pdf_download_url) {
      const parts = result.presentation_url.split('/d/');
      if (parts.length > 1) {
        const id = parts[1].split('/')[0];
        result.pdf_download_url = `https://docs.google.com/presentation/d/${id}/export/pdf`;
      }
    }

    return Response.json(result, { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Backend Error:", error.message);
    return Response.json({ success: false, error: String(error.message) }, { status: 500, headers: { "Content-Type": "application/json" } });
  }
}