import { type Env, jsonError, parseEditCookie } from '../../_utils';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const cookie = parseEditCookie(request);
  if (!cookie) return jsonError(404, 'No pledge for this browser');

  const row = await env.DB.prepare(
    `SELECT id, name, amount_cents, venmo_handle, is_private
     FROM pledges
     WHERE id = ? AND edit_token = ?`,
  )
    .bind(cookie.id, cookie.token)
    .first();

  if (!row) return jsonError(404, 'No pledge for this browser');
  return Response.json(row);
};
