# Personal Finance Backend

Backend API construido con Hono, Bun y TypeScript que replica las funcionalidades del dashboard de finanzas personales.

## Características

- 🚀 **Hono** - Framework web rápido y ligero
- 🔥 **Bun** - Runtime de JavaScript rápido
- 📊 **Prisma** - ORM para PostgreSQL
- 🔒 **Autenticación** - Middleware de autenticación básico
- ✅ **Validación** - Zod para validación de datos

## Endpoints API

### Accounts
- `GET /api/accounts` - Obtener todas las cuentas
- `GET /api/accounts/:id` - Obtener una cuenta específica
- `POST /api/accounts` - Crear una cuenta
- `PUT /api/accounts/:id` - Actualizar una cuenta
- `DELETE /api/accounts/:id` - Eliminar una cuenta

### Categories
- `GET /api/categories` - Obtener todas las categorías
- `GET /api/categories/:id` - Obtener una categoría específica
- `POST /api/categories` - Crear una categoría
- `PUT /api/categories/:id` - Actualizar una categoría
- `DELETE /api/categories/:id` - Eliminar una categoría

### Transactions
- `GET /api/transactions` - Obtener todas las transacciones (con paginación y filtros)
- `GET /api/transactions/:id` - Obtener una transacción específica
- `POST /api/transactions` - Crear una transacción
- `PUT /api/transactions/:id` - Actualizar una transacción
- `DELETE /api/transactions/:id` - Eliminar una transacción

## Instalación

```bash
# Instalar dependencias
bun install

# Copiar archivo de entorno
cp .env.example .env

# Configurar DATABASE_URL en .env

# Generar cliente de Prisma
bunx prisma generate

# Ejecutar migraciones (si tienes un schema existente)
bunx prisma db push
```

## Desarrollo

```bash
# Modo desarrollo con hot reload
bun run dev

# Producción
bun run start
```

## Autenticación

Actualmente usa un sistema de autenticación básico con header `x-user-id`. Para integrar con Clerk u otro sistema, modifica el archivo `src/middleware/auth.ts`.

### Ejemplo de uso

```bash
# Ejemplo con curl
curl -H "x-user-id: user_123" http://localhost:3000/api/accounts
```

## Variables de Entorno

```env
DATABASE_URL="postgresql://user:password@localhost:5432/personal_finance"
PORT=3000
NODE_ENV=development
```

## Estructura del Proyecto

```
backend/
├── src/
│   ├── lib/
│   │   └── prisma.ts          # Cliente de Prisma
│   ├── middleware/
│   │   └── auth.ts             # Middleware de autenticación
│   ├── routes/
│   │   ├── accounts.ts         # Rutas de cuentas
│   │   ├── categories.ts       # Rutas de categorías
│   │   └── transactions.ts     # Rutas de transacciones
│   └── index.ts                # Punto de entrada
├── prisma/
│   └── schema.prisma           # Schema de Prisma
├── package.json
└── tsconfig.json
```

## Notas

- El backend comparte el mismo schema de Prisma que el proyecto Next.js
- Los balances de las cuentas se actualizan automáticamente con las transacciones
- Las categorías por defecto son de solo lectura
- Las cuentas con transacciones se marcan como inactivas en lugar de eliminarse
