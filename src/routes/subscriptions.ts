import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { getUserId, Variables } from '../middleware/auth';
import { z } from 'zod';

const subscriptions = new Hono<{ Variables: Variables }>();

// Validation schemas
const CreateSubscriptionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  nextBillingDate: z.string().transform((val) => new Date(val)),
  accountId: z.string(),
  categoryId: z.string().optional(),
});

const UpdateSubscriptionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  nextBillingDate: z.string().transform((val) => new Date(val)).optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/subscriptions - Get all subscriptions
subscriptions.get('/', async (c) => {
  try {
    const userId = getUserId(c);
    const isActive = c.req.query('isActive');

    const where: any = { userId };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const subscriptionsData = await prisma.subscription.findMany({
      where,
      orderBy: {
        nextBillingDate: 'asc',
      },
    });

    return c.json({ data: subscriptionsData });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/subscriptions/:id - Get a specific subscription
subscriptions.get('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');

    const subscription = await prisma.subscription.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!subscription) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    return c.json(subscription);
  } catch (error) {
    console.error('Error getting subscription:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /api/subscriptions - Create a subscription
subscriptions.post('/', async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    const validatedData = CreateSubscriptionSchema.parse(body);

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: validatedData.accountId,
        userId,
        isActive: true,
      },
    });

    if (!account) {
      return c.json({ error: 'Account not found' }, 404);
    }

    // Verify category if provided
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
        return c.json({ error: 'Category not found' }, 404);
      }
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        ...validatedData,
        userId,
      },
    });

    return c.json(subscription, 201);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return c.json({ error: 'Error creating subscription' }, 500);
  }
});

// PUT /api/subscriptions/:id - Update a subscription
subscriptions.put('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const body = await c.req.json();
    const validatedData = UpdateSubscriptionSchema.parse(body);

    // Get existing subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingSubscription) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    // Verify account if changing
    if (validatedData.accountId && validatedData.accountId !== existingSubscription.accountId) {
      const account = await prisma.account.findFirst({
        where: {
          id: validatedData.accountId,
          userId,
          isActive: true,
        },
      });

      if (!account) {
        return c.json({ error: 'Account not found' }, 404);
      }
    }

    // Verify category if provided
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
        return c.json({ error: 'Category not found' }, 404);
      }
    }

    // Update subscription
    const subscription = await prisma.subscription.update({
      where: { id },
      data: validatedData,
    });

    return c.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return c.json({ error: 'Error updating subscription' }, 500);
  }
});

// DELETE /api/subscriptions/:id - Delete a subscription
subscriptions.delete('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');

    // Get subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!subscription) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    // Delete subscription
    await prisma.subscription.delete({
      where: { id },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return c.json({ error: 'Error deleting subscription' }, 500);
  }
});

export default subscriptions;
