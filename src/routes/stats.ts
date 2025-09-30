import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { getUserId, Variables } from '../middleware/auth';

const stats = new Hono<{ Variables: Variables }>();

// GET /api/dashboard/stats - Obtener estadísticas del dashboard
stats.get('/', async (c) => {
  try {
    const userId = getUserId(c);

    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    // Configurar filtros de fecha (por defecto el mes actual)
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Configurar filtros de fecha con timezone correcto
    let startFilter = defaultStartDate;
    let endFilter = defaultEndDate;

    if (startDate) {
      startFilter = new Date(startDate);
      startFilter.setUTCHours(0, 0, 0, 0);
    }

    if (endDate) {
      endFilter = new Date(endDate);
      endFilter.setUTCHours(23, 59, 59, 999);
    }

    const dateFilter = {
      gte: startFilter,
      lte: endFilter,
    };

    // Obtener estadísticas en paralelo
    const [
      totalIncomeUSD,
      totalExpensesUSD,
      totalIncomeARS,
      totalExpensesARS,
      accountBalance,
      transactionCount,
      categoryStats,
      monthlyTrend,
    ] = await Promise.all([
      // Ingresos totales USD
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          date: dateFilter,
          account: {
            currency: 'USD'
          }
        },
        _sum: {
          amount: true,
        },
      }),

      // Gastos totales USD
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          date: dateFilter,
          account: {
            currency: 'USD'
          }
        },
        _sum: {
          amount: true,
        },
      }),

      // Ingresos totales ARS
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          date: dateFilter,
          account: {
            currency: 'ARS'
          }
        },
        _sum: {
          amount: true,
        },
      }),

      // Gastos totales ARS
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          date: dateFilter,
          account: {
            currency: 'ARS'
          }
        },
        _sum: {
          amount: true,
        },
      }),

      // Balance total de cuentas
      prisma.account.aggregate({
        where: {
          userId,
          isActive: true,
        },
        _sum: {
          balance: true,
        },
      }),

      // Número de transacciones
      prisma.transaction.count({
        where: {
          userId,
          date: dateFilter,
        },
      }),

      // Estadísticas por categoría (top 5 gastos)
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'EXPENSE',
          date: dateFilter,
          categoryId: { not: null },
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
        take: 5,
      }),

      // Tendencia mensual
      (async () => {
        try {
          const today = new Date();

          // Calcular desde hace 12 meses hasta ahora (incluyendo el mes actual)
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
          twelveMonthsAgo.setDate(1);
          twelveMonthsAgo.setUTCHours(0, 0, 0, 0);

          const transactions = await prisma.transaction.findMany({
            where: {
              userId,
              date: {
                gte: twelveMonthsAgo,
                lte: today
              }
            },
            select: {
              date: true,
              type: true,
              amount: true
            }
          });

          // Agrupar por mes
          const monthlyGroups: { [key: string]: { income: number, expenses: number } } = {};

          transactions.forEach(transaction => {
            const monthKey = transaction.date.toISOString().substring(0, 7); // YYYY-MM

            if (!monthlyGroups[monthKey]) {
              monthlyGroups[monthKey] = { income: 0, expenses: 0 };
            }

            const amount = Number(transaction.amount);
            if (transaction.type === 'INCOME') {
              monthlyGroups[monthKey].income += amount;
            } else if (transaction.type === 'EXPENSE') {
              monthlyGroups[monthKey].expenses += amount;
            }
          });

          // Convertir a formato esperado y ordenar
          const result = Object.entries(monthlyGroups)
            .map(([month, data]) => ({
              month: new Date(month + '-01'),
              income: data.income,
              expenses: data.expenses
            }))
            .sort((a, b) => a.month.getTime() - b.month.getTime());

          return result;
        } catch (error) {
          console.error('Error in monthly trend calculation:', error);
          return [];
        }
      })(),
    ]);

    // Procesar estadísticas de categorías
    const categoryStatsWithNames = await Promise.all(
      categoryStats.map(async (stat) => {
        const category = await prisma.category.findUnique({
          where: { id: stat.categoryId! },
          select: { name: true, color: true, icon: true },
        });
        return {
          ...stat,
          category,
        };
      })
    );

    const totalIncomeUSDAmount = Number(totalIncomeUSD._sum.amount || 0);
    const totalExpensesUSDAmount = Number(totalExpensesUSD._sum.amount || 0);
    const totalIncomeARSAmount = Number(totalIncomeARS._sum.amount || 0);
    const totalExpensesARSAmount = Number(totalExpensesARS._sum.amount || 0);
    const accountBalanceAmount = Number(accountBalance._sum.balance || 0);

    const statsData = {
      usd: {
        totalIncome: totalIncomeUSDAmount,
        totalExpenses: totalExpensesUSDAmount,
        netIncome: totalIncomeUSDAmount - totalExpensesUSDAmount,
      },
      ars: {
        totalIncome: totalIncomeARSAmount,
        totalExpenses: totalExpensesARSAmount,
        netIncome: totalIncomeARSAmount - totalExpensesARSAmount,
      },
      // Mantener compatibilidad con el código existente (total combinado)
      totalIncome: totalIncomeUSDAmount + totalIncomeARSAmount,
      totalExpenses: totalExpensesUSDAmount + totalExpensesARSAmount,
      netIncome: (totalIncomeUSDAmount + totalIncomeARSAmount) - (totalExpensesUSDAmount + totalExpensesARSAmount),
      accountBalance: accountBalanceAmount,
      transactionCount,
      topExpenseCategories: categoryStatsWithNames,
      monthlyTrend,
    };

    return c.json(statsData);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

export default stats;
