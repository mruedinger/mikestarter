import { type Env, requireAccess } from '../../_utils';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = requireAccess(request, env);
  if (denied) {
    const headers = Object.fromEntries(request.headers);
    return new Response(
      JSON.stringify({ error: 'Cloudflare Access required', debug_headers: headers }, null, 2),
      { status: 401, headers: { 'content-type': 'application/json' } },
    );
  }

  const { results } = await env.DB.prepare(
    `SELECT id, name, amount_cents, venmo_handle, is_private, is_paid, created_at
     FROM pledges
     ORDER BY created_at DESC`,
  ).all<{
    id: number;
    name: string;
    amount_cents: number;
    venmo_handle: string;
    is_private: 0 | 1;
    is_paid: 0 | 1;
    created_at: number;
  }>();

  const total = results.reduce((sum, p) => sum + p.amount_cents, 0);
  return Response.json({ pledges: results, total_cents: total });
};
