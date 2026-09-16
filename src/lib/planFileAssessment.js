import { base44 } from '@/api/base44Client';

const PLAN_ASSESSMENT_SCHEMA = {
  type: "object",
  properties: {
    project_info: {
      type: "object",
      properties: {
        project_name: { type: "string" },
        client_name: { type: "string" },
        address: { type: "string" },
        lot_no: { type: "string" },
        rp_no: { type: "string" },
        site_area: { type: "string" },
        council_overlays: { type: "string" }
      }
    },
    plan_type: { type: "string", description: "string matching the drawing classification" },
    overall_score: { type: "integer", description: "0-10" },
    overview: { type: "string", description: "high-level overview text" },
    spatial_analysis: { type: "string", description: "spatial utilisation details" },
    design_observations: { type: "array", items: { type: "string" }, description: "bullet points of observations" },
    compliance_flags: { type: "array", items: { type: "string" }, description: "list of explicit construction code issues or safety flags found" },
    recommendations: { type: "array", items: { type: "string" }, description: "remediation suggestions" }
  },
  required: ["project_info", "plan_type", "overall_score", "overview", "spatial_analysis", "design_observations", "compliance_flags", "recommendations"]
};

// Runs the plan file assessment directly from the client. The page consumes the
// token and uploads the file before calling this, matching the previous
// server-side gate behaviour.
export async function runPlanFileAssessment({ fileUrl, tier, projectDetails }) {
  if (!fileUrl) throw new Error("A valid file URL is required");

  const tierLabel = tier === 'construction'
    ? 'Tier 2 (Construction & Compliance Documentation Review)'
    : 'Tier 1 (Concept & Pricing Review)';

  const pd = projectDetails || {};
  const sanitize = (str) => (str ? String(str).substring(0, 200) : '');
  const pdLines = [];
  if (pd.projectName) pdLines.push(`- Project Name: ${sanitize(pd.projectName)}`);
  if (pd.clientName) pdLines.push(`- Client Name: ${sanitize(pd.clientName)}`);
  if (pd.address) pdLines.push(`- Site Address: ${sanitize(pd.address)}`);
  if (pd.lotNo) pdLines.push(`- Lot No.: ${sanitize(pd.lotNo)}`);
  if (pd.rpNo) pdLines.push(`- RP No.: ${sanitize(pd.rpNo)}`);
  if (pd.siteArea) pdLines.push(`- Site Area: ${sanitize(pd.siteArea)}`);
  if (pd.councilOverlays) pdLines.push(`- Council Overlays: ${sanitize(pd.councilOverlays)}`);
  const projectContext = pdLines.length ? `\n\nProject context:\n${pdLines.join('\n')}` : '';

  const instruction = `Please perform a ${tierLabel} assessment on the attached architectural plan.${projectContext}\n\nIf the attached file is clearly not a development layout or architectural sheet drawing, set overall_score to 0.`;

  const llmResult = await base44.integrations.Core.InvokeLLM({
    prompt: instruction,
    file_urls: [fileUrl],
    response_json_schema: PLAN_ASSESSMENT_SCHEMA
  });

  return { output: llmResult };
}