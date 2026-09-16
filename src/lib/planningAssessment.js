import { base44 } from '@/api/base44Client';
import { isGoldCoastPropertyContext } from '@/lib/goldCoastDevelopmentI';

const GOLD_COAST_DEVELOPMENT_I_URL = 'https://developmenti.goldcoast.qld.gov.au/';

const PLANNING_ASSESSMENT_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["LIKELY PERMITTED", "APPROVAL REQUIRED", "LIKELY REFUSED", "COMPLEX - SEEK ADVICE"] },
    verdict_reason: { type: "string", description: "Short explanation of the verdict" },
    zoning_assessment: { type: "string", description: "Markdown text about zoning compatibility" },
    planning_controls: { type: "string", description: "Markdown text about relevant codes" },
    overlays: { type: "string", description: "Markdown text about overlays (heritage, bushfire, etc)" },
    issues: { type: "array", items: { type: "string" }, description: "List of issues" },
    neighbour_impact: { type: "string", description: "Markdown text about impact on neighbours" },
    application_requirements: { type: "string", description: "Markdown text about what to submit" },
    recommendations: { type: "array", items: { type: "string" }, description: "List of recommendations" },
    red_flags: { type: "array", items: { type: "string" }, description: "List of red flags" },
    disclaimer: { type: "string", description: "Standard disclaimer" }
  },
  required: ["verdict", "verdict_reason", "zoning_assessment", "planning_controls", "overlays", "issues", "neighbour_impact", "application_requirements", "recommendations", "red_flags", "disclaimer"]
};

export function buildPlanningAssessmentPrompt({ address, devType, description, propertyData }) {
  const pd = propertyData || {};

  const overlaysString = Array.isArray(pd.overlays)
    ? pd.overlays.join(', ')
    : (pd.overlays || 'N/A');

  const negativeChecksString = Array.isArray(pd.negative_overlay_checks)
    ? pd.negative_overlay_checks.join('; ')
    : (pd.negative_overlay_checks || 'N/A');

  const councilOverlaysText =
    pd.council_overlays_text ||
    [
      pd.zoning ? `Zoning: ${pd.zoning}` : null,
      pd.neighbourhood_plan ? `Neighbourhood / Local Plan: ${pd.neighbourhood_plan}` : null,
      overlaysString && overlaysString !== 'N/A' ? `Positive Overlays: ${overlaysString}` : null,
      negativeChecksString && negativeChecksString !== 'N/A' ? `Negative Overlay Checks: ${negativeChecksString}` : null,
      pd.overlay_confidence ? `Overlay Confidence: ${pd.overlay_confidence}` : null
    ].filter(Boolean).join('; ');

  const isGoldCoast = isGoldCoastPropertyContext(address, pd);

  return `You are a town planning assessor. Apply standard town planning assessment rules to assess this proposed development:

Address: ${address}
Development Type: ${devType}
Description: ${description}

Known property context:
- Lot / RP: ${pd.lot_rp || 'N/A'}
- Lot No.: ${pd.lot_no || 'N/A'}
- RP No.: ${pd.rp_no || 'N/A'}
- Site Area: ${pd.site_area || 'N/A'}
- Zoning: ${pd.zoning || 'N/A'}
- Zoning Confidence: ${pd.zoning_confidence || 'N/A'}
- Neighbourhood / Local Plan: ${pd.neighbourhood_plan || 'N/A'}
- Council Overlays Summary: ${councilOverlaysText}
- Positive Overlays: ${overlaysString}
- Negative Overlay Checks: ${negativeChecksString}

Important:
Do not treat "No flood, bushfire, or heritage overlays detected" as meaning no planning overlays exist.
If overlay_confidence is LOW or overlays include "UNVERIFIED", explicitly flag that manual council mapping verification is required.
${isGoldCoast ? `
Gold Coast official source context:
- City of Gold Coast Development.i: ${GOLD_COAST_DEVELOPMENT_I_URL}
- Use Development.i as an official local source for development application history, referral agency assessments, building/application information, and basic property information.
- Cite City of Gold Coast Development.i where relevant.
- Keep City Plan/ePlan zoning and overlays as separate formal planning scheme verification sources; do not state that Development.i replaces City Plan overlay/zoning verification.
- If data is incomplete or confidence is low, recommend opening Development.i for manual property/application verification.
` : ''}
`;
}

// Runs the planning assessment directly from the client. The page consumes the
// token before calling this, matching the previous server-side gate behaviour.
export async function runPlanningAssessment({ address, devType, description, propertyData }) {
  const prompt = buildPlanningAssessmentPrompt({ address, devType, description, propertyData });

  const assessment = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: PLANNING_ASSESSMENT_SCHEMA
  });

  return { output: assessment };
}