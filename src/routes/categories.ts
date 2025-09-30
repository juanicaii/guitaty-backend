import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { getUserId, Variables } from '../middleware/auth';
import { z } from 'zod';

const categories = new Hono<{ Variables: Variables }>();

// Schemas de validación
const CreateCategorySchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  icon: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
});

// GET /api/categories - Obtener todas las categorías
categories.get('/', async (c) => {
  try {
    const userId = getUserId(c);

    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId },
          { isDefault: true },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    return c.json(categories);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// GET /api/categories/:id - Obtener una categoría específica
categories.get('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');

    const category = await prisma.category.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isDefault: true },
        ],
      },
    });

    if (!category) {
      return c.json({ error: 'Categoría no encontrada' }, 404);
    }

    return c.json(category);
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// POST /api/categories - Crear una categoría
categories.post('/', async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    const validatedData = CreateCategorySchema.parse(body);

    // Verificar si ya existe una categoría con el mismo nombre para el usuario
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId,
        name: validatedData.name,
      },
    });

    if (existingCategory) {
      return c.json({ error: 'Ya existe una categoría con ese nombre' }, 409);
    }

    const category = await prisma.category.create({
      data: {
        ...validatedData,
        userId,
        isDefault: false,
      },
    });

    return c.json(category, 201);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return c.json({ error: 'Error al crear la categoría' }, 500);
  }
});

// PUT /api/categories/:id - Actualizar una categoría
categories.put('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const body = await c.req.json();
    const validatedData = UpdateCategorySchema.parse(body);

    // Verificar que la categoría existe y pertenece al usuario
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCategory) {
      return c.json({ error: 'Categoría no encontrada o no autorizada' }, 404);
    }

    // No permitir editar categorías por defecto
    if (existingCategory.isDefault) {
      return c.json({ error: 'No se pueden editar categorías por defecto' }, 403);
    }

    // Si se está cambiando el nombre, verificar que no exista otra categoría con ese nombre
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          userId,
          name: validatedData.name,
          id: { not: id },
        },
      });

      if (duplicateCategory) {
        return c.json({ error: 'Ya existe una categoría con ese nombre' }, 409);
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: validatedData,
    });

    return c.json(category);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    return c.json({ error: 'Error al actualizar la categoría' }, 500);
  }
});

// DELETE /api/categories/:id - Eliminar una categoría
categories.delete('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');

    // Verificar que la categoría existe y pertenece al usuario
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCategory) {
      return c.json({ error: 'Categoría no encontrada' }, 404);
    }

    // No permitir eliminar categorías por defecto
    if (existingCategory.isDefault) {
      return c.json({ error: 'No se pueden eliminar categorías por defecto' }, 403);
    }

    // Verificar si la categoría tiene transacciones
    const transactionCount = await prisma.transaction.count({
      where: {
        categoryId: id,
      },
    });

    if (transactionCount > 0) {
      return c.json(
        { error: 'No se puede eliminar una categoría que tiene transacciones asociadas' },
        409
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return c.json({ error: 'Error al eliminar la categoría' }, 500);
  }
});

export default categories;
