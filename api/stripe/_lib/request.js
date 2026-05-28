/**
 * @param {import('http').IncomingMessage} request
 */
export async function parseJsonBody(request) {
  if (request.body && typeof request.body === 'object') {
    return request.body;
  }
  if (typeof request.body === 'string' && request.body.length > 0) {
    return JSON.parse(request.body);
  }
  return {};
}

/**
 * @param {import('http').IncomingMessage} request
 * @param {import('http').ServerResponse} response
 */
export function rejectMethod(request, response, allowed) {
  response.setHeader('Allow', allowed.join(', '));
  response.status(405).json({ error: 'Method not allowed' });
}
