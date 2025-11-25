import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { getUserId, Variables } from '../middleware/auth';
import { z } from 'zod';

const accounts = new Hono<{ Variables: Variables }>();

// Schemas de validación
const CreateAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'OTHER']),
  balance: z.number().default(0),
  currency: z.enum(['USD', 'ARS']).default('ARS'),
});

const UpdateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'OTHER']).optional(),
  balance: z.number().optional(),
  currency: z.enum(['USD', 'ARS']).optional(),
});

// GET /api/accounts - Obtener todas las cuentas
accounts.get('/', async (c) => {
  try {
    const userId = getUserId(c);

    const accounts = await prisma.account.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return c.json(accounts);
  } catch (error) {
    console.error('Error al obtener cuentas:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// GET /api/accounts/balance - Obtener balance total por moneda
accounts.get('/balance', async (c) => {
  try {
    const userId = getUserId(c);
    const currency = c.req.query('currency');

    if (!currency || !['USD', 'ARS'].includes(currency)) {
      return c.json({ error: 'Currency parameter is required (USD or ARS)' }, 400);
    }

    const result = await prisma.account.aggregate({
      where: {
        userId,
        currency: currency as 'USD' | 'ARS',
        isActive: true,
      },
      _sum: {
        balance: true,
      },
    });

    const balance = Number(result._sum.balance || 0);

    return c.json({
      currency,
      balance,
    });
  } catch (error) {
    console.error('Error al obtener balance:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// GET /api/accounts/:id - Obtener una cuenta específica
accounts.get('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');

    const account = await prisma.account.findFirst({
      where: {
        id,
        userId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    if (!account) {
      return c.json({ error: 'Cuenta no encontrada' }, 404);
    }

    return c.json(account);
  } catch (error) {
    console.error('Error al obtener cuenta:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// POST /api/accounts - Crear una cuenta
accounts.post('/', async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    const validatedData = CreateAccountSchema.parse(body);

    // Verificar si ya existe una cuenta con el mismo nombre
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId,
        name: validatedData.name,
        isActive: true,
      },
    });

    if (existingAccount) {
      return c.json({ error: 'Ya existe una cuenta con ese nombre' }, 409);
    }

    const account = await prisma.account.create({
      data: {
        ...validatedData,
        userId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    return c.json(account, 201);
  } catch (error) {
    console.error('Error al crear cuenta:', error);
    return c.json({ error: 'Error al crear la cuenta' }, 500);
  }
});

// PUT /api/accounts/:id - Actualizar una cuenta
accounts.put('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const body = await c.req.json();
    const validatedData = UpdateAccountSchema.parse(body);

    // Verificar que la cuenta existe y pertenece al usuario
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        userId,
        isActive: true,
      },
    });

    if (!existingAccount) {
      return c.json({ error: 'Cuenta no encontrada' }, 404);
    }

    // Si se está cambiando el nombre, verificar que no exista otra cuenta con ese nombre
    if (validatedData.name && validatedData.name !== existingAccount.name) {
      const duplicateAccount = await prisma.account.findFirst({
        where: {
          userId,
          name: validatedData.name,
          isActive: true,
          id: { not: id },
        },
      });

      if (duplicateAccount) {
        return c.json({ error: 'Ya existe una cuenta con ese nombre' }, 409);
      }
    }

    const account = await prisma.account.update({
      where: { id },
      data: validatedData,
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    return c.json(account);
  } catch (error) {
    console.error('Error al actualizar cuenta:', error);
    return c.json({ error: 'Error al actualizar la cuenta' }, 500);
  }
});

// DELETE /api/accounts/:id - Eliminar una cuenta
accounts.delete('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');

    // Verificar que la cuenta existe y pertenece al usuario
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        userId,
        isActive: true,
      },
    });

    if (!existingAccount) {
      return c.json({ error: 'Cuenta no encontrada' }, 404);
    }

    // Verificar si la cuenta tiene transacciones
    const transactionCount = await prisma.transaction.count({
      where: {
        accountId: id,
      },
    });

    if (transactionCount > 0) {
      // Solo marcar como inactiva si tiene transacciones
      await prisma.account.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Eliminar físicamente si no tiene transacciones
      await prisma.account.delete({
        where: { id },
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    return c.json({ error: 'Error al eliminar la cuenta' }, 500);
  }
});

export default accounts;
