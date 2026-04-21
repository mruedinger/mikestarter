import {
  type Env,
  clearEditCookie,
  jsonError,
  parseEditCookie,
  validatePledge,
  verifyTurnstile,
} from '../../_utils';

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = Number(params.id);
  const cookie = parseEditCookie(request);
  if (!cookie || cookie.id !== id) return jsonError(403, 'Not allowed');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const v = validatePledge(body);
  if ('error' in v) return jsonError(400, v.error);

  if (env.TURNSTILE_SECRET_KEY) {
    const ok = await verifyTurnstile(
      env.TURNSTILE_SECRET_KEY,
      (body as { turnstile_token?: unknown }).turnstile_token,
      request.headers.get('cf-connecting-ip'),
    );
    if (!ok) return jsonError(400, 'Bot check failed. Please reload and try again.');
  }

  const result = await env.DB.prepare(
    `UPDATE pledges
     SET name = ?, amount_cents = ?, venmo_handle = ?, is_private = ?
     WHERE id = ? AND edit_token = ?`,
  )
    .bind(v.name, v.amount_cents, v.venmo_handle, v.is_private ? 1 : 0, id, cookie.token)
    .run();

  if (result.meta.changes === 0) return jsonError(403, 'Not allowed');
  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = Number(params.id);
  const cookie = parseEditCookie(request);
  if (!cookie || cookie.id !== id) return jsonError(403, 'Not allowed');

  const result = await env.DB.prepare(
    `DELETE FROM pledges WHERE id = ? AND edit_token = ?`,
  )
    .bind(id, cookie.token)
    .run();

  if (result.meta.changes === 0) return jsonError(403, 'Not allowed');

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json', 'set-cookie': clearEditCookie() },
  });
};
