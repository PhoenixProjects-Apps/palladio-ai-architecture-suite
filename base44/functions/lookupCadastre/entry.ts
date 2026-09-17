import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { lookupQldCadastre } from '../../shared/qldCadastre.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { address } = await req.json().catch(() => ({}));
    if (!address) return Response.json({ error: 'Address is required' }, { status: 400 });

    // Official Queensland cadastre lookup (no AI, no token cost)
    const cadastre = await lookupQldCadastre(address).catch(() => null);
    return Response.json({ data: cadastre });
  } catch (error) {
    console.error('lookupCadastre error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}