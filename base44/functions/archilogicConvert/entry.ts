import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });
    
    try {
      const urlObj = new URL(file_url);
      if (!['firebasestorage.googleapis.com', 'storage.googleapis.com'].includes(urlObj.hostname)) {
        return Response.json({ error: 'Invalid file_url domain' }, { status: 400 });
      }
    } catch {
      return Response.json({ error: 'Invalid file_url format' }, { status: 400 });
    }

    try {
      const consumeRes = await base44.functions.invoke('consumeToken', { amount: 1 });
      if (!consumeRes.data || !consumeRes.data.success) {
        return Response.json({ error: "Insufficient tokens" }, { status: 403 });
      }
    } catch (err) {
      return Response.json({ error: err.response?.data?.error || "Insufficient tokens" }, { status: 403 });
    }

    const apiKey = Deno.env.get('ARCHILOGIC_API_KEY');
    const secretKey = Deno.env.get('ARCHILOGIC_SECRET_KEY');
    if (!apiKey || !secretKey) {
      console.error('Missing Archilogic credentials');
      return Response.json({ error: 'Archilogic credentials not configured' }, { status: 500 });
    }

    // Step 1: Use LLM vision to analyze the 2D floor plan image and extract room polygons
    console.log('Analyzing floor plan image with LLM...');
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an architectural floor plan analyzer. Analyze the provided 2D floor plan image and extract every room/space visible. For each room, provide its name and a polygon outline as a list of [x, z] coordinates in meters, where the origin [0,0] is the bottom-left corner of the floor plan. Estimate realistic room dimensions (typical residential rooms are 3-6 meters wide). Adjacent rooms should share wall corners (overlapping vertices). Return a JSON object with a "rooms" array; each room has a "name" (string, e.g. "Living Room") and "polygon" (array of [x, z] number pairs, minimum 3 points, ordered clockwise).`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          rooms: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                polygon: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2,
                  },
                },
              },
              required: ['name', 'polygon'],
            },
          },
        },
        required: ['rooms'],
      },
    });

    const rooms = llmResponse.rooms || [];
    console.log('LLM extracted rooms:', rooms.length, JSON.stringify(rooms.map(r => r.name)));

    if (!rooms.length) {
      return Response.json({ error: 'Could not detect any rooms in the floor plan image. Please try a clearer image.' }, { status: 400 });
    }

    // Step 2: Convert room polygons to an Archilogic space graph layout
    const layout = buildArchilogicLayout(rooms);
    console.log('Built Archilogic layout with', layout.spatialStructure.spatialGraph.vertices.length, 'vertices,', layout.spatialStructure.spatialGraph.edges.length, 'edges,', layout.spatialStructure.spaces.length, 'spaces');

    // Step 3: Create floor via Archilogic API (try API key first, then secret token)
    console.log('Creating Archilogic floor...');
    const floorBody = JSON.stringify({
      name: `Palladio floor plan - ${new Date().toISOString().slice(0, 10)}`,
      private: true,
      layout: layout,
    });

    let createRes = await fetch('https://api.archilogic.com/v2/floor', {
      method: 'POST',
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
      body: floorBody,
    });

    if (!createRes.ok) {
      console.log('API key auth failed, retrying with secret token...');
      createRes = await fetch('https://api.archilogic.com/v2/floor', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: floorBody,
      });
    }

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('Archilogic create floor failed:', createRes.status, errText);
      return Response.json({ error: `Archilogic rejected the floor plan: ${errText}` }, { status: createRes.status });
    }

    const createData = await createRes.json();
    const floorId = createData.floorId;
    console.log('Archilogic floor created:', floorId);

    return Response.json({ floorId, status: 'processing' });
  } catch (error) {
    console.error('archilogicConvert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildArchilogicLayout(rooms) {
  const vertices = [];
  const edges = [];
  const spaces = [];
  const vertexMap = new Map();

  function getOrCreateVertex(x, z) {
    const key = `${Math.round(x * 1000) / 1000},${Math.round(z * 1000) / 1000}`;
    if (vertexMap.has(key)) return vertexMap.get(key);
    const id = `v${vertices.length + 1}`;
    vertices.push({ type: 'spatialGraph:vertex', id, position: [x, z] });
    vertexMap.set(key, id);
    return id;
  }

  rooms.forEach((room, roomIdx) => {
    const poly = room.polygon;
    if (!poly || poly.length < 3) return;
    const edgeIds = [];
    for (let i = 0; i < poly.length; i++) {
      const [x1, z1] = poly[i];
      const [x2, z2] = poly[(i + 1) % poly.length];
      const v1 = getOrCreateVertex(x1, z1);
      const v2 = getOrCreateVertex(x2, z2);
      const edgeId = `e${edges.length + 1}`;
      edges.push({ type: 'spatialGraph:edge', id: edgeId, vertices: [v1, v2] });
      edgeIds.push(edgeId);
    }
    spaces.push({
      type: 'layout:space',
      id: crypto.randomUUID(),
      name: room.name || `Room ${roomIdx + 1}`,
      boundaries: [{ edges: edgeIds }],
    });
  });

  return {
    schemaVersion: '2.0.0',
    sharedResources: {
      products: [],
      geometries: [],
      materials: [],
      relations: [],
    },
    spatialStructure: {
      type: 'spatialStructure:layout',
      id: crypto.randomUUID(),
      name: 'Floor Plan',
      spatialGraph: { vertices, edges },
      spaces,
      elements: [],
    },
  };
}