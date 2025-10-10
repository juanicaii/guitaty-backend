import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { getUserId, Variables } from '../middleware/auth';
import { z } from 'zod';

const transactions = new Hono<{ Variables: Variables }>();

// Schemas de validación
const CreateTransactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  date: z.string().transform((val) => new Date(val)),
  accountId: z.string(),
  categoryId: z.string().optional(),
});

const UpdateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  date: z.string().transform((val) => new Date(val)).optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
});

// GET /api/transactions - Obtener todas las transacciones con filtros
transactions.get('/', async (c) => {
  try {
    const userId = getUserId(c);

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const accountId = c.req.query('accountId');
    const categoryId = c.req.query('categoryId');
    const type = c.req.query('type');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const search = c.req.query('search');

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = { userId };

    if (accountId && accountId !== 'all') where.accountId = accountId;
    if (categoryId && categoryId !== 'all') where.categoryId = categoryId;
    if (type && type !== 'all') where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        where.date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }
    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Obtener transacciones con paginación
    const [transactionsData, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              type: true,
              currency: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
          receipt: {
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return c.json({
      data: transactionsData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// GET /api/transactions/:id - Obtener una transacción específica
transactions.get('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        receipt: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
          },
        },
      },
    });

    if (!transaction) {
      return c.json({ error: 'Transacción no encontrada' }, 404);
    }

    return c.json(transaction);
  } catch (error) {
    console.error('Error al obtener transacción:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// POST /api/transactions - Crear una transacción
transactions.post('/', async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    const validatedData = CreateTransactionSchema.parse(body);

    // Verificar que la cuenta pertenece al usuario
    const account = await prisma.account.findFirst({
      where: {
        id: validatedData.accountId,
        userId,
        isActive: true,
      },
    });

    if (!account) {
      return c.json({ error: 'Cuenta no encontrada' }, 404);
    }

    // Verificar categoría si se proporciona
    if (validatedData.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: validatedData.categoryId,
          OR: [
            { userId },
            { isDefault: true },
          ],
        },
      });

      if (!category) {
        return c.json({ error: 'Categoría no encontrada' }, 404);
      }
    }

    // Crear la transacción
    const transaction = await prisma.transaction.create({
      data: {
        ...validatedData,
        userId,
        currency: account.currency,
        processed: true,
        aiExtracted: false,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        receipt: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
          },
        },
      },
    });

    // Actualizar el balance de la cuenta
    if (validatedData.type !== 'TRANSFER') {
      const balanceChange = validatedData.type === 'EXPENSE' ? -validatedData.amount : validatedData.amount;

      await prisma.account.update({
        where: { id: validatedData.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });
    }

    return c.json(transaction, 201);
  } catch (error) {
    console.error('Error al crear transacción:', error);
    return c.json({ error: 'Error al crear la transacción' }, 500);
  }
});

// PUT /api/transactions/:id - Actualizar una transacción
transactions.put('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const body = await c.req.json();
    const validatedData = UpdateTransactionSchema.parse(body);

    // Obtener la transacción actual
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingTransaction) {
      return c.json({ error: 'Transacción no encontrada' }, 404);
    }

    // Verificar cuenta si se está cambiando
    if (validatedData.accountId && validatedData.accountId !== existingTransaction.accountId) {
      const account = await prisma.account.findFirst({
        where: {
          id: validatedData.accountId,
          userId,
          isActive: true,
        },
      });

      if (!account) {
        return c.json({ error: 'Cuenta no encontrada' }, 404);
      }
    }

    // Verificar categoría si se proporciona
    if (validatedData.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: validatedData.categoryId,
          OR: [
            { userId },
            { isDefault: true },
          ],
        },
      });

      if (!category) {
        return c.json({ error: 'Categoría no encontrada' }, 404);
      }
    }

    // Actualizar la transacción
    const transaction = await prisma.transaction.update({
      where: { id },
      data: validatedData,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        receipt: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
          },
        },
      },
    });

    // Si cambió el monto o tipo, actualizar balances de las cuentas
    if (validatedData.amount !== undefined || validatedData.type !== undefined || validatedData.accountId !== undefined) {
      // Solo procesar si la transacción original no era TRANSFER
      if (existingTransaction.type !== 'TRANSFER') {
        // Revertir el efecto de la transacción original
        const originalBalanceChange = existingTransaction.type === 'EXPENSE' ? Number(existingTransaction.amount) : -Number(existingTransaction.amount);
        await prisma.account.update({
          where: { id: existingTransaction.accountId },
          data: {
            balance: {
              increment: originalBalanceChange,
            },
          },
        });
      }

      // Aplicar el efecto de la transacción actualizada
      const newAmount = validatedData.amount ?? Number(existingTransaction.amount);
      const newType = validatedData.type ?? existingTransaction.type;
      const newAccountId = validatedData.accountId ?? existingTransaction.accountId;

      // Solo aplicar cambio si el nuevo tipo no es TRANSFER
      if (newType !== 'TRANSFER') {
        const newBalanceChange = newType === 'EXPENSE' ? -newAmount : newAmount;

        await prisma.account.update({
          where: { id: newAccountId },
          data: {
            balance: {
              increment: newBalanceChange,
            },
          },
        });
      }
    }

    return c.json(transaction);
  } catch (error) {
    console.error('Error al actualizar transacción:', error);
    return c.json({ error: 'Error al actualizar la transacción' }, 500);
  }
});

// DELETE /api/transactions/:id - Eliminar una transacción
transactions.delete('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');

    // Obtener la transacción
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!transaction) {
      return c.json({ error: 'Transacción no encontrada' }, 404);
    }

    // Eliminar la transacción
    await prisma.transaction.delete({
      where: { id },
    });

    // Revertir el efecto en el balance de la cuenta (solo si no es TRANSFER)
    if (transaction.type !== 'TRANSFER') {
      const balanceChange = transaction.type === 'EXPENSE' ? Number(transaction.amount) : -Number(transaction.amount);

      await prisma.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    return c.json({ error: 'Error al eliminar la transacción' }, 500);
  }
});

export default transactions;
