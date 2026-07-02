import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

export default Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const requestBody = await req.json();
  const formatCurrency = (val) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val);
  
  const { result, silentCosts, city, state, floorArea, roofArea } = requestBody;
  
  if (!result) {
    return new Response(JSON.stringify({ error: "Missing estimator result" }), { status: 400 });
  }

  try {
    const totalCost = result.grand_total + (silentCosts?.total || 0);
    
    // Map raw AI numbers to template tags
    const presentationData = {
      total_cost: formatCurrency(totalCost),
      address: city && state ? `${city}, ${state}` : 'Address TBA',
      floor_area: floorArea || '0',
      roof_area: roofArea || '0',
      bedrooms: 'TBA',
      bathrooms: 'TBA',
      living_areas: 'TBA',
    };

    const appsScriptUrl = "https://script.google.com/macros/s/AKfycbxgO7CnmwFjlYvGfHlOWMohn5AFumQoNb1dnIlw4WTbeP3ozc9s0LfjeEm1Z6vI3ekr/exec";
    
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(presentationData)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Apps Script Error:", err);
      return new Response(JSON.stringify({ error: "Failed to generate presentation", details: err }), { status: 500 });
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      url: result.pdf_download_url || result.presentation_url // Falling back to presentation_url if pdf_download_url is missing
    }), { status: 200 });

  } catch (error) {
    console.error("Presentation Generation Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});