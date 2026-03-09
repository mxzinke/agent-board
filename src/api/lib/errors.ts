import { HTTPException } from 'hono/http-exception';

export function notFound(message = 'Not found') {
  return new HTTPException(404, { message });
}

export function forbidden(message = 'Forbidden') {
  return new HTTPException(403, { message });
}

export function unauthorized(message = 'Unauthorized') {
  return new HTTPException(401, { message });
}

export function badRequest(message = 'Bad request') {
  return new HTTPException(400, { message });
}
