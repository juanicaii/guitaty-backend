import { Context, Next } from 'hono';
import { verifyToken } from '@clerk/backend';

export type Variables = {
  userId: string;
};

/**
 * Middleware de autenticación con Clerk
 */
export async function authMiddleware(c: Context<{ Variables: Variables }>, next: Next) {
  try {
    // Obtener el token del header Authorization
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No autorizado - Token requerido' }, 401);
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar el token con Clerk
    const decoded = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    if (!decoded || !decoded.sub) {
      return c.json({ error: 'Token inválido' }, 401);
    }

    // Guardar el userId (sub) en el contexto
    c.set('userId', decoded.sub);
    await next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return c.json({ error: 'No autorizado - Token inválido o expirado' }, 401);
  }
}

/**
 * Helper para obtener el userId del contexto
 */
export function getUserId(c: Context<{ Variables: Variables }>): string {
  const userId = c.get('userId');
  if (!userId) {
    throw new Error('No autorizado');
  }
  return userId;
}
