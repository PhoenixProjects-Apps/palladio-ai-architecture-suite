// Shared lookup of official Queensland title data (Lot / Plan / site area)
// using the Queensland Government public spatial services:
// - Location/QldCompositeLocator (address -> coordinates)
// - PlanningCadastre/LandParcelPropertyFramework, layer 4 "Cadastral parcels"
//   (Digital Cadastre DataBase, updated nightly)

const QLD_LOCATOR_URL = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Location/QldCompositeLocator/GeocodeServer/findAddressCandidates';
const QLD_PARCELS_URL = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/PlanningCadastre/LandParcelPropertyFramework/MapServer/4/query';

export const QLD_GEOCODER_SOURCE = {
  name: 'Queensland Geocoder (Lot on Plan lookup)',
  link: 'https://geocode.information.qld.gov.au/validate'
};

export function formatSiteArea(areaM2) {
  if (typeof areaM2 !== 'number' || !isFinite(areaM2) || areaM2 <= 0) return '';
  return `${Math.round(areaM2).toLocaleString('en-AU')} m²`;
}

export async function lookupQldCadastre(address) {
  const addr = String(address || '').trim();
  if (!addr) return null;

  // 1. Geocode the address to a point
  const geoRes = await fetch(`${QLD_LOCATOR_URL}?Address=${encodeURIComponent(addr)}&maxCandidates=1&f=json`);
  if (!geoRes.ok) return null;
  const geo = await geoRes.json().catch(() => null);
  const candidate = (geo?.candidates || [])[0];
  if (!candidate || !candidate.location || (candidate.score ?? 0) < 80) return null;

  // 2. Find the cadastral parcel containing that point
  const parcelRes = await fetch(
    `${QLD_PARCELS_URL}?geometry=${encodeURIComponent(JSON.stringify(candidate.location))}` +
    `&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&returnGeometry=false&outFields=lot,plan,lotplan,tenure,lot_area&f=json`
  );
  if (!parcelRes.ok) return null;
  const parcelJson = await parcelRes.json().catch(() => null);
  const parcels = (parcelJson?.features || []).map((f) => f.attributes).filter((p) => p && p.lot && p.plan);
  if (parcels.length === 0) return null;

  // The geocode point can sit on a shared boundary or road reserve:
  // take the smallest intersecting lot as the most likely property parcel.
  parcels.sort((a, b) => (a.lot_area ?? Infinity) - (b.lot_area ?? Infinity));
  const parcel = parcels[0];

  return {
    lot_no: String(parcel.lot || ''),
    rp_no: String(parcel.plan || ''),
    lot_rp: `Lot ${parcel.lot} on ${parcel.plan}`,
    site_area: formatSiteArea(parcel.lot_area),
    tenure: String(parcel.tenure || ''),
    matched_address: String(candidate.address || '')
  };
}