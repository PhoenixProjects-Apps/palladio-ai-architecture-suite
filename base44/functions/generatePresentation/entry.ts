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
    const base44 = createClientFromRequest(req);
    
    // Get token
    const driveConnection = await base44.asServiceRole.connectors.getConnection("googledrive");
    const slidesConnection = await base44.asServiceRole.connectors.getConnection("googleslides");
    
    // 1. Copy the template using Drive API
    const copyUrl = `https://www.googleapis.com/drive/v3/files/${templateId}/copy`;
    const copyRes = await fetch(copyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driveConnection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Property Presentation - ${new Date().toLocaleDateString()}`
      })
    });

    if (!copyRes.ok) {
      const err = await copyRes.text();
      console.error("Drive Copy Error:", err);
      return new Response(JSON.stringify({ error: "Failed to copy template", details: err }), { status: 500 });
    }

    const newFile = await copyRes.json();
    const newPresentationId = newFile.id;

    // 2. Prepare the updates for the new presentation
    const requests = [];

    // Simple text replacements
    const textReplacements = [
      { find: '{{total_cost}}', replace: presentationData.total_cost || '$0' },
      { find: '{{address}}', replace: presentationData.address || 'Address TBA' },
      { find: '{{floor_area}}', replace: presentationData.floor_area || '0' },
      { find: '{{roof_area}}', replace: presentationData.roof_area || '0' },
      { find: '{{bedrooms}}', replace: presentationData.bedrooms || 'TBA' },
      { find: '{{bathrooms}}', replace: presentationData.bathrooms || 'TBA' },
      { find: '{{living_areas}}', replace: presentationData.living_areas || 'TBA' },
    ];

    for (const replacement of textReplacements) {
      requests.push({
        replaceAllText: {
          containsText: {
            text: replacement.find,
            matchCase: true,
          },
          replaceText: String(replacement.replace),
        }
      });
    }

    // 3. Apply the updates using Slides API
    const updateUrl = `https://slides.googleapis.com/v1/presentations/${newPresentationId}:batchUpdate`;
    const updateRes = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slidesConnection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests })
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      console.error("Slides Update Error:", err);
      return new Response(JSON.stringify({ error: "Failed to update slides", details: err }), { status: 500 });
    }

    // 4. Export as PDF from Google Drive
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${newPresentationId}/export?mimeType=application/pdf`;
    const exportRes = await fetch(exportUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${driveConnection.accessToken}`,
      }
    });

    if (!exportRes.ok) {
      const err = await exportRes.text();
      console.error("Drive Export Error:", err);
      return new Response(JSON.stringify({ error: "Failed to export PDF", details: err }), { status: 500 });
    }

    // Convert PDF to File object
    const pdfBuffer = await exportRes.arrayBuffer();
    const pdfFile = new File([pdfBuffer], 'presentation.pdf', { type: 'application/pdf' });

    // 5. Upload to Base44 built-in storage
    const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
    
    // 6. Delete the temporary presentation from Google Drive
    const deleteUrl = `https://www.googleapis.com/drive/v3/files/${newPresentationId}`;
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${driveConnection.accessToken}`,
      }
    });

    // 7. Return the new built-in storage URL
    return new Response(JSON.stringify({
      success: true,
      url: uploadRes.file_url
    }), { status: 200 });

  } catch (error) {
    console.error("Presentation Generation Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});