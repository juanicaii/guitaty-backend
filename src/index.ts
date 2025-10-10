import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth';
import accounts from './routes/accounts';
import categories from './routes/categories';
import transactions from './routes/transactions';
import stats from './routes/stats';
import subscriptions from './routes/subscriptions';
import { startSubscriptionProcessor } from './services/subscriptionProcessor';

const app = new Hono();

// Start subscription processor
startSubscriptionProcessor();

// Middlewares globales
app.use('*', logger());
app.use('*', cors({
  origin:"*"
}));

// Ruta de health check
app.get('/', (c) => {
  return c.json({
    message: 'Personal Finance API',
    version: '1.0.0',
    status: 'ok'
  });
});

// Aplicar autenticación a todas las rutas de API
app.use('/api/*', authMiddleware);

// Rutas de API
app.route('/api/accounts', accounts);
app.route('/api/categories', categories);
app.route('/api/transactions', transactions);
app.route('/api/subscriptions', subscriptions);
app.route('/api/dashboard/stats', stats);

// Ruta 404
app.notFound((c) => {
  return c.json({ error: 'Ruta no encontrada' }, 404);
});

// Manejo de errores global
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Error interno del servidor' }, 500);
});

const port = Number(process.env.PORT) || 3000;

console.log(`🚀 Servidor corriendo en http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
