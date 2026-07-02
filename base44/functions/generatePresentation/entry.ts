import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

export default Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const requestBody = await req.json();
  
  // Use the new app-owned template ID!
  const templateId = "1x45E4JzxSXx-fK1MrXg7BgtcITcGuBfTETh9Cz8M7dQ";
  const presentationData = requestBody.presentation_data;
  
  if (!presentationData) {
    return new Response(JSON.stringify({ error: "Missing presentation_data" }), { status: 400 });
  }

  try {
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