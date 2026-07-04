import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

export default Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      requestBody = {};
    }
    
    const pData = requestBody.presentation_data || requestBody || {};
    
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
      "base_construction_cost": formatCurrency(pData.base_construction_cost || pData.subtotal),
      "site_costs_and_prelims": formatCurrency(pData.site_costs_and_prelims || pData.site_difficulty_markup_cost),
      "builders_margin": formatCurrency(pData.builders_margin || 120000), 
      "subtotal_ex_gst": formatCurrency(pData.subtotal_ex_gst || pData.subtotal),
      "gst_amount": formatCurrency(pData.gst_amount || (pData.grand_total ? pData.grand_total * 0.1 : 0)),
      "total_estimated_investment": formatCurrency(pData.total_estimated_investment || pData.grand_total),
      "key_inclusions": pData.key_inclusions || "• Standard Approvals\n• Earthworks\n• Selected Materials",
      "key_exclusions": pData.key_exclusions || "• Landscaping\n• Pool Fencing\n• Window Furnishings",
      "call_to_action": pData.call_to_action || "Let's turn these numbers into reality.",
      "step_1": pData.step_1 || "Review this preliminary estimate.",
      "step_2": pData.step_2 || "Finalize architectural plans and engineering.",
      "step_3": pData.step_3 || "Generate a fixed-price master builder contract."
    };

    const deploymentId = Deno.env.get("APPSHEET_DEPLOYMENT_ID") || "AKfycbxgO7CnmwFjlYvGfHlOWMohn5AFumQoNb1dnIlw4WTbeP3ozc9s0LfjeEm1Z6vI3ekr";
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

    return new Response(JSON.stringify(result), { 
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Backend Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: String(error.message) }), { 
      status: 500,
      headers: { "Content-Type": "application/json" } 
    });
  }
});