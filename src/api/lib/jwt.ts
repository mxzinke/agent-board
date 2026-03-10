import { SignJWT, jwtVerify } from 'jose';

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret && process.env.NODE_ENV !== 'development') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const secret = new TextEncoder().encode(rawSecret || 'dev-secret-do-not-use-in-production');

export interface JwtPayload {
  sub: string;
  username: string;
  suspended?: boolean;
  suspendReason?: string | null;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret);
  return { sub: payload.sub as string, username: payload.username as string };
}
