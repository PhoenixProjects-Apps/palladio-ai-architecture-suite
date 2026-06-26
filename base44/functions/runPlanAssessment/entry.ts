import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { fileUrl, tier } = await req.json();

    // Combine your strict custom instructions directly inside the execution environment context block
    const prompt = `
  You are an expert Australian architectural checker and compliance auditor. 
  Analyze this uploaded architectural plan or drawing against the National Construction Code (NCC), Australian Standards (such as AS 1684.2 and AS 3740), and local QDC guidelines. 
  
  ACTIVE AUDIT PHASE: Run a Tier ${tier === 'concept' ? '1 (Concept & Pricing Review)' : '2 (Construction & Compliance Documentation Review)'} protocol check.
  
  Format your final output to match this JSON configuration structure strictly:
  - plan_type (string)
  - overall_score (number out of 10)
  - overview (string summary)
  - spatial_analysis (string)
  - design_observations (array of strings)
  - compliance_flags (array of strings showing exact failures or safety flags)
  - recommendations (array of strings)
  
  If the uploaded file is clearly not a real development layout or architectural sheet drawing plan, set overall_score to 0.
  `;

    // Uses core internal tools to invoke the LLM with elevated service role permissions
    const executionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [fileUrl],
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          plan_type: { type: "string" },
          overall_score: { type: "number" },
          overview: { type: "string" },
          spatial_analysis: { type: "string" },
          design_observations: { type: "array", items: { type: "string" } },
          compliance_flags: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["plan_type", "overall_score", "overview", "spatial_analysis", "design_observations", "compliance_flags", "recommendations"]
      }
    });

    return Response.json({ assessmentReport: executionResult });
  } catch (error) {
    console.error("Plan Assessment Engine Error: ", error);
    return Response.json({ error: "Failed to generate plan analysis payload." }, { status: 500 });
  }
});