import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { getUserId, Variables } from '../middleware/auth';
import { z } from 'zod';

const budgets = new Hono<{ Variables: Variables }>();

// Validation schemas
const CreateBudgetSchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  amount: z.number().positive('Amount must be positive'),
  period: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
});

const GetBudgetsQuerySchema = z.object({
  period: z.enum(['MONTHLY', 'YEARLY']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET /api/budgets - Get budgets with optional filters
budgets.get('/', async (c) => {
  try {
    const userId = getUserId(c);
    const query = c.req.query();
    const validatedQuery = GetBudgetsQuerySchema.parse(query);

    const where: any = {
      userId,
    };

    // Only filter by isActive if explicitly provided
    const isActive = c.req.query('isActive');
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (validatedQuery.period) {
      where.period = validatedQuery.period;
    }

    // Filter by date range overlap
    if (validatedQuery.startDate && validatedQuery.endDate) {
      const filterStart = new Date(validatedQuery.startDate);
      const filterEnd = new Date(validatedQuery.endDate);

      where.AND = [
        {
          startDate: {
            lte: filterEnd, // Budget starts before or on filter end
          },
        },
        {
          OR: [
            {
              endDate: {
                gte: filterStart, // Budget ends after or on filter start
              },
            },
            {
              endDate: null, // Or budget has no end date
            },
          ],
        },
      ];
    } else if (validatedQuery.startDate) {
      const filterStart = new Date(validatedQuery.startDate);
      where.OR = [
        {
          endDate: {
            gte: filterStart,
          },
        },
        {
          endDate: null,
        },
      ];
    } else if (validatedQuery.endDate) {
      where.startDate = {
        lte: new Date(validatedQuery.endDate),
      };
    }

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return c.json(budgets);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    console.error('Error fetching budgets:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/budgets/:id - Get a specific budget
budgets.get('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');

    const budget = await prisma.budget.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        category: true,
      },
    });

    if (!budget) {
      return c.json({ error: 'Budget not found' }, 404);
    }

    return c.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /api/budgets - Create a budget
budgets.post('/', async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    const validatedData = CreateBudgetSchema.parse(body);

    // Verify category exists and belongs to user or is default
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
      return c.json({ error: 'Category not found' }, 404);
    }

    // Check if there's already an active budget for this category
    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId,
        categoryId: validatedData.categoryId,
        isActive: true,
      },
    });

    if (existingBudget) {
      return c.json({ error: 'An active budget already exists for this category' }, 409);
    }

    // Calculate start and end dates based on period
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    let endDate: Date;

    if (validatedData.period === 'MONTHLY') {
      startDate.setDate(1); // Start of current month
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of current month
      endDate.setHours(23, 59, 59, 999);
    } else {
      // YEARLY
      startDate.setMonth(0, 1); // January 1st of current year
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(0); // December 31st of current year
      endDate.setHours(23, 59, 59, 999);
    }

    const budget = await prisma.budget.create({
      data: {
        name: `${category.name} Budget`,
        amount: validatedData.amount,
        period: validatedData.period,
        startDate,
        endDate,
        userId,
        categoryId: validatedData.categoryId,
      },
      include: {
        category: true,
      },
    });

    return c.json(budget, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    console.error('Error creating budget:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default budgets;
