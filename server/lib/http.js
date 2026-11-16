import { ZodError } from 'zod';

/** An error the client is allowed to see. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Please sign in to continue.') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have access to this.') => new HttpError(403, msg);
export const notFound = (msg = 'Not found.') => new HttpError(404, msg);
export const conflict = (msg, details) => new HttpError(409, msg, details);

/** Wrap async route handlers so thrown errors reach the error middleware. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Parse with a zod schema; turn failures into a readable 400. */
export function parse(schema, data) {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const fields = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  throw badRequest('Please check the highlighted fields.', { fields });
}

export function errorHandler(log) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, _next) => {
    if (err instanceof ZodError) err = badRequest('Invalid request.');
    if (err?.type === 'entity.parse.failed') err = badRequest('Malformed JSON body.');
    if (err?.type === 'entity.too.large') err = new HttpError(413, 'Request body too large.');
    const status = err instanceof HttpError ? err.status : err?.status && err.status < 500 ? err.status : 500;
    if (status >= 500) log.error(`${req.method} ${req.originalUrl}`, err);
    res.status(status).json({
      error: status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  };
}

export const cents = (dollars) => Math.round(Number(dollars) * 100);
export const dollars = (c) => Math.round(c) / 100;
