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
      accountBalanceUSD,
      accountBalanceARS,
      transactionCount,
      categoryStatsUSD,
      categoryStatsARS,
      monthlyTrendData,
    ] = await Promise.all([
      // Ingresos totales USD
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          date: dateFilter,
          currency: 'USD',
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
          currency: 'USD',
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
          currency: 'ARS',
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
          currency: 'ARS',
        },
        _sum: {
          amount: true,
        },
      }),

      // Balance de cuentas USD
      prisma.account.aggregate({
        where: {
          userId,
          isActive: true,
          currency: 'USD',
        },
        _sum: {
          balance: true,
        },
      }),

      // Balance de cuentas ARS
      prisma.account.aggregate({
        where: {
          userId,
          isActive: true,
          currency: 'ARS',
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

      // Top 5 categorías de gastos USD
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'EXPENSE',
          date: dateFilter,
          currency: 'USD',
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

      // Top 5 categorías de gastos ARS
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'EXPENSE',
          date: dateFilter,
          currency: 'ARS',
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

      // Tendencia mensual (últimos 12 meses)
      (async () => {
        try {
          const today = new Date();
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
          twelveMonthsAgo.setDate(1);
          twelveMonthsAgo.setUTCHours(0, 0, 0, 0);

          const transactions = await prisma.transaction.findMany({
            where: {
              userId,
              date: {
                gte: twelveMonthsAgo,
                lte: today,
              },
            },
            select: {
              date: true,
              type: true,
              amount: true,
              currency: true,
            },
          });

          // Agrupar por mes y currency
          const monthlyGroups: {
            [key: string]: {
              usd: { income: number; expenses: number };
              ars: { income: number; expenses: number };
            };
          } = {};

          transactions.forEach((transaction) => {
            const monthKey = transaction.date.toISOString().substring(0, 7); // YYYY-MM

            if (!monthlyGroups[monthKey]) {
              monthlyGroups[monthKey] = {
                usd: { income: 0, expenses: 0 },
                ars: { income: 0, expenses: 0 },
              };
            }

            const amount = Number(transaction.amount);
            const currency = transaction.currency.toLowerCase() as 'usd' | 'ars';

            if (transaction.type === 'INCOME') {
              monthlyGroups[monthKey][currency].income += amount;
            } else if (transaction.type === 'EXPENSE') {
              monthlyGroups[monthKey][currency].expenses += amount;
            }
          });

          // Convertir a formato esperado y ordenar
          const result = Object.entries(monthlyGroups)
            .map(([month, data]) => ({
              month: new Date(month + '-01'),
              usd: {
                income: data.usd.income,
                expenses: data.usd.expenses,
              },
              ars: {
                income: data.ars.income,
                expenses: data.ars.expenses,
              },
            }))
            .sort((a, b) => a.month.getTime() - b.month.getTime());

          return result;
        } catch (error) {
          console.error('Error in monthly trend calculation:', error);
          return [];
        }
      })(),
    ]);

    // Procesar estadísticas de categorías USD
    const categoryStatsUSDWithNames = await Promise.all(
      categoryStatsUSD.map(async (stat) => {
        const category = await prisma.category.findUnique({
          where: { id: stat.categoryId! },
          select: { name: true, color: true, icon: true },
        });
        return {
          categoryId: stat.categoryId,
          amount: Number(stat._sum.amount || 0),
          category,
        };
      })
    );

    // Procesar estadísticas de categorías ARS
    const categoryStatsARSWithNames = await Promise.all(
      categoryStatsARS.map(async (stat) => {
        const category = await prisma.category.findUnique({
          where: { id: stat.categoryId! },
          select: { name: true, color: true, icon: true },
        });
        return {
          categoryId: stat.categoryId,
          amount: Number(stat._sum.amount || 0),
          category,
        };
      })
    );

    // Calcular totales
    const totalIncomeUSDAmount = Number(totalIncomeUSD._sum.amount || 0);
    const totalExpensesUSDAmount = Number(totalExpensesUSD._sum.amount || 0);
    const totalIncomeARSAmount = Number(totalIncomeARS._sum.amount || 0);
    const totalExpensesARSAmount = Number(totalExpensesARS._sum.amount || 0);
    const accountBalanceUSDAmount = Number(accountBalanceUSD._sum.balance || 0);
    const accountBalanceARSAmount = Number(accountBalanceARS._sum.balance || 0);

    const statsData = {
      usd: {
        totalIncome: totalIncomeUSDAmount,
        totalExpenses: totalExpensesUSDAmount,
        netIncome: totalIncomeUSDAmount - totalExpensesUSDAmount,
        accountBalance: accountBalanceUSDAmount,
        topExpenseCategories: categoryStatsUSDWithNames,
      },
      ars: {
        totalIncome: totalIncomeARSAmount,
        totalExpenses: totalExpensesARSAmount,
        netIncome: totalIncomeARSAmount - totalExpensesARSAmount,
        accountBalance: accountBalanceARSAmount,
        topExpenseCategories: categoryStatsARSWithNames,
      },
      transactionCount,
      monthlyTrend: monthlyTrendData,
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
