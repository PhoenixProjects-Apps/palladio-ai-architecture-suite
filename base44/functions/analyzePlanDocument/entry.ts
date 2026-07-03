import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUrl = body?.file_url;
    if (!fileUrl) return Response.json({ error: "Missing file_url" }, { status: 400 });

    const prompt = `Analyze this uploaded planning document (e.g. council report, property title, scheme code). 
Extract the key information, provide a concise summary, and identify any potential compliance issues, red flags, or specific requirements mentioned.`;

    const responseSchema = {
      type: "object",
      properties: {
        summary: { type: "string" },
        key_information: { type: "array", items: { type: "string" } },
        compliance_issues: { type: "array", items: { type: "string" } },
        requirements: { type: "array", items: { type: "string" } }
      }
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: responseSchema
    });

    return Response.json({ output: result }, { status: 200 });
  } catch (error) {
    console.error("analyzePlanDocument error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});