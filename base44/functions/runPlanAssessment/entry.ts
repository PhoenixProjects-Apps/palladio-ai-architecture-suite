import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const fileUrl = body?.fileUrl;
    const tier = body?.tier;

    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "Missing required fileUrl parameter." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const prompt = `
    You are an expert Australian architectural checker and compliance auditor. 
    Analyze this uploaded architectural plan or drawing against the National Construction Code (NCC), Australian Standards (such as AS 1684.2 and AS 3740), and local QDC guidelines. 
    
    ACTIVE AUDIT PHASE: Run a Tier ${tier === 'concept' ? '1 (Concept & Pricing Review)' : '2 (Construction & Compliance Documentation Review)'} protocol check.
    
    You must output your complete analysis as a perfectly formatted JSON object with no additional markdown formatting blocks, backticks, or prose. The keys must match exactly:
    {
      "plan_type": "string matching drawing classification",
      "overall_score": 8, 
      "overview": "high level overview text",
      "spatial_analysis": "spatial utilization details",
      "design_observations": ["bullet points of observations"],
      "compliance_flags": ["list of explicit construction code issues or safety flags found"],
      "recommendations": ["remediation suggestions"]
    }
    
    If the uploaded file is clearly not a development layout or architectural sheet plan drawing, set overall_score to 0.
    `;

    // Invoke integration layer via secure service role parameters
    const executionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [fileUrl],
      add_context_from_internet: true
    });

    let parsedPayload;
    try {
      const sanitizedText = String(executionResult)
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      parsedPayload = JSON.parse(sanitizedText);
    } catch (parseError) {
      console.error("Critical JSON Conversion Failure. Raw AI Response was:", executionResult);
      return new Response(JSON.stringify({
        error: "AI responded with an invalid text structure.",
        raw: String(executionResult)
      }), {
        status: 422,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Explicit standard constructor instantiation resolves Deno runtime edge cases
    return new Response(JSON.stringify({ assessmentReport: parsedPayload }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("CRITICAL BACKEND ERROR DETECTED:", error);

    return new Response(JSON.stringify({
      error: "Internal Assessment Engine Exception"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});