# Personal Finance API Documentation

## Table of Contents
- [Base Information](#base-information)
- [Authentication](#authentication)
- [Accounts](#accounts)
- [Categories](#categories)
- [Transactions](#transactions)
- [Subscriptions](#subscriptions)
- [Dashboard Stats](#dashboard-stats)
- [Automated Processes](#automated-processes)

---

## Base Information

**Base URL:** `http://localhost:3000/api`

**Content-Type:** `application/json`

**Authentication:** All endpoints require Clerk authentication token

---

## Authentication

All API endpoints require authentication via Clerk. Include your Clerk session token in the request headers.

```http
Authorization: Bearer <clerk-session-token>
```

---

## Accounts

### Get All Accounts

**Endpoint:** `GET /api/accounts`

**Description:** Retrieve all accounts for the authenticated user

**Query Parameters:** None

**Response (200):**
```json
[
  {
    "id": "cm123abc456",
    "name": "Main Checking",
    "type": "CHECKING",
    "balance": "1500.50",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "userId": "user_123abc",
    "currency": "USD",
    "_count": {
      "transactions": 42
    }
  }
]
```

**Account Types:**
- `CHECKING`
- `SAVINGS`
- `CREDIT_CARD`
- `CASH`
- `INVESTMENT`
- `OTHER`

**Currencies:**
- `USD`
- `ARS`

---

### Get Account by ID

**Endpoint:** `GET /api/accounts/:id`

**Description:** Retrieve a specific account by ID

**URL Parameters:**
- `id` (string, required) - Account ID

**Response (200):**
```json
{
  "id": "cm123abc456",
  "name": "Main Checking",
  "type": "CHECKING",
  "balance": "1500.50",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "userId": "user_123abc",
  "currency": "USD",
  "_count": {
    "transactions": 42
  }
}
```

**Response (404):**
```json
{
  "error": "Cuenta no encontrada"
}
```

---

### Create Account

**Endpoint:** `POST /api/accounts`

**Description:** Create a new account

**Request Body:**
```json
{
  "name": "Main Checking",
  "type": "CHECKING",
  "balance": 1500.50,
  "currency": "USD"
}
```

**Body Parameters:**
- `name` (string, required) - Account name
- `type` (enum, required) - Account type (CHECKING, SAVINGS, CREDIT_CARD, CASH, INVESTMENT, OTHER)
- `balance` (number, optional, default: 0) - Initial balance
- `currency` (enum, optional, default: "USD") - Currency (USD, ARS)

**Response (201):**
```json
{
  "id": "cm123abc456",
  "name": "Main Checking",
  "type": "CHECKING",
  "balance": "1500.50",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "userId": "user_123abc",
  "currency": "USD",
  "_count": {
    "transactions": 0
  }
}
```

**Response (409):**
```json
{
  "error": "Ya existe una cuenta con ese nombre"
}
```

**Response (500):**
```json
{
  "error": "Error al crear la cuenta"
}
```

---

### Update Account

**Endpoint:** `PUT /api/accounts/:id`

**Description:** Update an existing account

**URL Parameters:**
- `id` (string, required) - Account ID

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Account Name",
  "type": "SAVINGS",
  "balance": 2000.00,
  "currency": "USD"
}
```

**Response (200):**
```json
{
  "id": "cm123abc456",
  "name": "Updated Account Name",
  "type": "SAVINGS",
  "balance": "2000.00",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T14:20:00.000Z",
  "userId": "user_123abc",
  "currency": "USD",
  "_count": {
    "transactions": 42
  }
}
```

**Response (404):**
```json
{
  "error": "Cuenta no encontrada"
}
```

**Response (409):**
```json
{
  "error": "Ya existe una cuenta con ese nombre"
}
```

---

### Delete Account

**Endpoint:** `DELETE /api/accounts/:id`

**Description:** Delete an account (soft delete if has transactions, hard delete otherwise)

**URL Parameters:**
- `id` (string, required) - Account ID

**Response (200):**
```json
{
  "success": true
}
```

**Response (404):**
```json
{
  "error": "Cuenta no encontrada"
}
```

**Note:** If the account has transactions, it will be soft-deleted (isActive = false). If no transactions exist, it will be permanently deleted.

---

## Categories

### Get All Categories

**Endpoint:** `GET /api/categories`

**Description:** Retrieve all categories (user's custom + default system categories)

**Query Parameters:** None

**Response (200):**
```json
[
  {
    "id": "cat_123abc",
    "name": "Groceries",
    "color": "#FF5733",
    "icon": "🛒",
    "type": "EXPENSE",
    "isDefault": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "userId": null
  },
  {
    "id": "cat_456def",
    "name": "Freelance Work",
    "color": "#33C3FF",
    "icon": "💼",
    "type": "INCOME",
    "isDefault": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "userId": "user_123abc"
  }
]
```

**Transaction Types:**
- `INCOME`
- `EXPENSE`
- `TRANSFER`

---

### Get Category by ID

**Endpoint:** `GET /api/categories/:id`

**Description:** Retrieve a specific category by ID

**URL Parameters:**
- `id` (string, required) - Category ID

**Response (200):**
```json
{
  "id": "cat_456def",
  "name": "Freelance Work",
  "color": "#33C3FF",
  "icon": "💼",
  "type": "INCOME",
  "isDefault": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "userId": "user_123abc"
}
```

**Response (404):**
```json
{
  "error": "Categoría no encontrada"
}
```

---

### Create Category

**Endpoint:** `POST /api/categories`

**Description:** Create a new custom category

**Request Body:**
```json
{
  "name": "Freelance Work",
  "color": "#33C3FF",
  "icon": "💼",
  "type": "INCOME"
}
```

**Body Parameters:**
- `name` (string, required) - Category name
- `type` (enum, required) - Transaction type (INCOME, EXPENSE, TRANSFER)
- `color` (string, optional) - Hex color code
- `icon` (string, optional) - Emoji or icon identifier

**Response (201):**
```json
{
  "id": "cat_456def",
  "name": "Freelance Work",
  "color": "#33C3FF",
  "icon": "💼",
  "type": "INCOME",
  "isDefault": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "userId": "user_123abc"
}
```

**Response (409):**
```json
{
  "error": "Ya existe una categoría con ese nombre"
}
```

---

### Update Category

**Endpoint:** `PUT /api/categories/:id`

**Description:** Update a custom category (cannot update default categories)

**URL Parameters:**
- `id` (string, required) - Category ID

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Category Name",
  "color": "#FF0000",
  "icon": "🎯",
  "type": "EXPENSE"
}
```

**Response (200):**
```json
{
  "id": "cat_456def",
  "name": "Updated Category Name",
  "color": "#FF0000",
  "icon": "🎯",
  "type": "EXPENSE",
  "isDefault": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T14:20:00.000Z",
  "userId": "user_123abc"
}
```

**Response (403):**
```json
{
  "error": "No se pueden editar categorías por defecto"
}
```

**Response (404):**
```json
{
  "error": "Categoría no encontrada o no autorizada"
}
```

**Response (409):**
```json
{
  "error": "Ya existe una categoría con ese nombre"
}
```

---

### Delete Category

**Endpoint:** `DELETE /api/categories/:id`

**Description:** Delete a custom category (cannot delete default categories or categories with transactions)

**URL Parameters:**
- `id` (string, required) - Category ID

**Response (200):**
```json
{
  "success": true
}
```

**Response (403):**
```json
{
  "error": "No se pueden eliminar categorías por defecto"
}
```

**Response (404):**
```json
{
  "error": "Categoría no encontrada"
}
```

**Response (409):**
```json
{
  "error": "No se puede eliminar una categoría que tiene transacciones asociadas"
}
```

---

## Transactions

### Get All Transactions

**Endpoint:** `GET /api/transactions`

**Description:** Retrieve all transactions with pagination and optional filters

**Query Parameters:**
- `page` (number, optional, default: 1) - Page number
- `limit` (number, optional, default: 20) - Items per page
- `accountId` (string, optional) - Filter by account ID (use "all" to skip filter)
- `categoryId` (string, optional) - Filter by category ID (use "all" to skip filter)
- `type` (string, optional) - Filter by type: INCOME, EXPENSE, or TRANSFER (use "all" to skip filter)
- `startDate` (string ISO, optional) - Filter from date
- `endDate` (string ISO, optional) - Filter to date
- `search` (string, optional) - Search in transaction description

**Example:**
```
GET /api/transactions?page=1&limit=20&type=EXPENSE&startDate=2024-01-01&endDate=2024-01-31
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "tx_123abc",
      "amount": "45.99",
      "description": "Grocery shopping at Walmart",
      "type": "EXPENSE",
      "date": "2024-01-15T14:30:00.000Z",
      "currency": "ARS",
      "processed": true,
      "aiExtracted": false,
      "metadata": null,
      "createdAt": "2024-01-15T14:35:00.000Z",
      "updatedAt": "2024-01-15T14:35:00.000Z",
      "userId": "user_123abc",
      "accountId": "cm123abc456",
      "categoryId": "cat_123abc",
      "receiptId": null,
      "account": {
        "id": "cm123abc456",
        "name": "Main Checking",
        "type": "CHECKING",
        "currency": "ARS"
      },
      "category": {
        "id": "cat_123abc",
        "name": "Groceries",
        "color": "#FF5733",
        "icon": "🛒"
      },
      "receipt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Get Transaction by ID

**Endpoint:** `GET /api/transactions/:id`

**Description:** Retrieve a specific transaction by ID

**URL Parameters:**
- `id` (string, required) - Transaction ID

**Response (200):**
```json
{
  "id": "tx_123abc",
  "amount": "45.99",
  "description": "Grocery shopping at Walmart",
  "type": "EXPENSE",
  "date": "2024-01-15T14:30:00.000Z",
  "currency": "ARS",
  "processed": true,
  "aiExtracted": false,
  "metadata": null,
  "createdAt": "2024-01-15T14:35:00.000Z",
  "updatedAt": "2024-01-15T14:35:00.000Z",
  "userId": "user_123abc",
  "accountId": "cm123abc456",
  "categoryId": "cat_123abc",
  "receiptId": null,
  "account": {
    "id": "cm123abc456",
    "name": "Main Checking",
    "type": "CHECKING",
    "currency": "ARS"
  },
  "category": {
    "id": "cat_123abc",
    "name": "Groceries",
    "color": "#FF5733",
    "icon": "🛒"
  },
  "receipt": null
}
```

**Response (404):**
```json
{
  "error": "Transacción no encontrada"
}
```

---

### Create Transaction

**Endpoint:** `POST /api/transactions`

**Description:** Create a new transaction (automatically updates account balance)

**Request Body:**
```json
{
  "amount": 45.99,
  "description": "Grocery shopping at Walmart",
  "type": "EXPENSE",
  "date": "2024-01-15T14:30:00.000Z",
  "accountId": "cm123abc456",
  "categoryId": "cat_123abc"
}
```

**Body Parameters:**
- `amount` (number, required) - Transaction amount (must be positive)
- `type` (enum, required) - Transaction type (INCOME, EXPENSE, TRANSFER)
- `date` (string ISO, required) - Transaction date
- `accountId` (string, required) - Account ID
- `description` (string, optional) - Transaction description
- `categoryId` (string, optional) - Category ID

**Response (201):**
```json
{
  "id": "tx_123abc",
  "amount": "45.99",
  "description": "Grocery shopping at Walmart",
  "type": "EXPENSE",
  "date": "2024-01-15T14:30:00.000Z",
  "currency": "ARS",
  "processed": true,
  "aiExtracted": false,
  "metadata": null,
  "createdAt": "2024-01-15T14:35:00.000Z",
  "updatedAt": "2024-01-15T14:35:00.000Z",
  "userId": "user_123abc",
  "accountId": "cm123abc456",
  "categoryId": "cat_123abc",
  "receiptId": null,
  "account": {
    "id": "cm123abc456",
    "name": "Main Checking",
    "type": "CHECKING",
    "currency": "ARS"
  },
  "category": {
    "id": "cat_123abc",
    "name": "Groceries",
    "color": "#FF5733",
    "icon": "🛒"
  },
  "receipt": null
}
```

**Response (404):**
```json
{
  "error": "Cuenta no encontrada"
}
```
or
```json
{
  "error": "Categoría no encontrada"
}
```

**Note:**
- EXPENSE transactions decrease account balance
- INCOME transactions increase account balance

---

### Update Transaction

**Endpoint:** `PUT /api/transactions/:id`

**Description:** Update an existing transaction (automatically recalculates account balances)

**URL Parameters:**
- `id` (string, required) - Transaction ID

**Request Body:** (all fields optional)
```json
{
  "amount": 52.50,
  "description": "Updated description",
  "type": "EXPENSE",
  "date": "2024-01-16T10:00:00.000Z",
  "accountId": "cm123abc456",
  "categoryId": "cat_123abc"
}
```

**Response (200):**
```json
{
  "id": "tx_123abc",
  "amount": "52.50",
  "description": "Updated description",
  "type": "EXPENSE",
  "date": "2024-01-16T10:00:00.000Z",
  "currency": "ARS",
  "processed": true,
  "aiExtracted": false,
  "metadata": null,
  "createdAt": "2024-01-15T14:35:00.000Z",
  "updatedAt": "2024-01-16T15:20:00.000Z",
  "userId": "user_123abc",
  "accountId": "cm123abc456",
  "categoryId": "cat_123abc",
  "receiptId": null,
  "account": {
    "id": "cm123abc456",
    "name": "Main Checking",
    "type": "CHECKING",
    "currency": "ARS"
  },
  "category": {
    "id": "cat_123abc",
    "name": "Groceries",
    "color": "#FF5733",
    "icon": "🛒"
  },
  "receipt": null
}
```

**Response (404):**
```json
{
  "error": "Transacción no encontrada"
}
```

**Note:** When updating amount, type, or accountId, the system automatically:
1. Reverts the effect of the original transaction on the old account
2. Applies the new transaction effect on the new/same account

---

### Delete Transaction

**Endpoint:** `DELETE /api/transactions/:id`

**Description:** Delete a transaction (automatically reverts account balance changes)

**URL Parameters:**
- `id` (string, required) - Transaction ID

**Response (200):**
```json
{
  "success": true
}
```

**Response (404):**
```json
{
  "error": "Transacción no encontrada"
}
```

---

## Subscriptions

### Get All Subscriptions

**Endpoint:** `GET /api/subscriptions`

**Description:** Retrieve all subscriptions for the authenticated user

**Query Parameters:**
- `isActive` (string, optional) - Filter by active status ("true" or "false")

**Example:**
```
GET /api/subscriptions?isActive=true
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "sub_123abc",
      "name": "Netflix Premium",
      "description": "Monthly streaming subscription",
      "amount": "15.99",
      "billingCycle": "MONTHLY",
      "nextBillingDate": "2024-02-15T00:00:00.000Z",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "userId": "user_123abc",
      "accountId": "cm123abc456",
      "categoryId": "cat_entertainment"
    }
  ]
}
```

**Billing Cycles:**
- `MONTHLY` - Renews every month
- `YEARLY` - Renews every year

---

### Get Subscription by ID

**Endpoint:** `GET /api/subscriptions/:id`

**Description:** Retrieve a specific subscription by ID

**URL Parameters:**
- `id` (string, required) - Subscription ID

**Response (200):**
```json
{
  "id": "sub_123abc",
  "name": "Netflix Premium",
  "description": "Monthly streaming subscription",
  "amount": "15.99",
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2024-02-15T00:00:00.000Z",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "userId": "user_123abc",
  "accountId": "cm123abc456",
  "categoryId": "cat_entertainment"
}
```

**Response (404):**
```json
{
  "error": "Subscription not found"
}
```

---

### Create Subscription

**Endpoint:** `POST /api/subscriptions`

**Description:** Create a new subscription

**Request Body:**
```json
{
  "name": "Netflix Premium",
  "description": "Monthly streaming subscription",
  "amount": 15.99,
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2024-02-15T00:00:00.000Z",
  "accountId": "cm123abc456",
  "categoryId": "cat_entertainment"
}
```

**Body Parameters:**
- `name` (string, required, min 1) - Subscription name
- `amount` (number, required) - Subscription amount (must be positive)
- `billingCycle` (enum, required) - Billing cycle (MONTHLY, YEARLY)
- `nextBillingDate` (string ISO, required) - Next billing date
- `accountId` (string, required) - Account ID to charge
- `description` (string, optional) - Subscription description
- `categoryId` (string, optional) - Category ID

**Response (201):**
```json
{
  "id": "sub_123abc",
  "name": "Netflix Premium",
  "description": "Monthly streaming subscription",
  "amount": "15.99",
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2024-02-15T00:00:00.000Z",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "userId": "user_123abc",
  "accountId": "cm123abc456",
  "categoryId": "cat_entertainment"
}
```

**Response (404):**
```json
{
  "error": "Account not found"
}
```
or
```json
{
  "error": "Category not found"
}
```

---

### Update Subscription

**Endpoint:** `PUT /api/subscriptions/:id`

**Description:** Update an existing subscription

**URL Parameters:**
- `id` (string, required) - Subscription ID

**Request Body:** (all fields optional)
```json
{
  "name": "Netflix Premium HD",
  "description": "Updated streaming subscription",
  "amount": 19.99,
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2024-02-20T00:00:00.000Z",
  "accountId": "cm123abc456",
  "categoryId": "cat_entertainment",
  "isActive": true
}
```

**Response (200):**
```json
{
  "id": "sub_123abc",
  "name": "Netflix Premium HD",
  "description": "Updated streaming subscription",
  "amount": "19.99",
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2024-02-20T00:00:00.000Z",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T14:20:00.000Z",
  "userId": "user_123abc",
  "accountId": "cm123abc456",
  "categoryId": "cat_entertainment"
}
```

**Response (404):**
```json
{
  "error": "Subscription not found"
}
```

---

### Delete Subscription

**Endpoint:** `DELETE /api/subscriptions/:id`

**Description:** Permanently delete a subscription

**URL Parameters:**
- `id` (string, required) - Subscription ID

**Response (200):**
```json
{
  "success": true
}
```

**Response (404):**
```json
{
  "error": "Subscription not found"
}
```

---

## Dashboard Stats

### Get Dashboard Statistics

**Endpoint:** `GET /api/dashboard/stats`

**Description:** Retrieve financial statistics and analytics for the authenticated user

**Query Parameters:**
- `startDate` (string ISO, optional) - Start date for filtering (default: first day of current month)
- `endDate` (string ISO, optional) - End date for filtering (default: last day of current month)

**Example:**
```
GET /api/dashboard/stats?startDate=2024-01-01&endDate=2024-01-31
```

**Response (200):**
```json
{
  "usd": {
    "totalIncome": 5000.00,
    "totalExpenses": 3500.00,
    "netIncome": 1500.00,
    "accountBalance": 8250.50,
    "topExpenseCategories": [
      {
        "categoryId": "cat_123abc",
        "amount": 1200.50,
        "category": {
          "name": "Groceries",
          "color": "#FF5733",
          "icon": "🛒"
        }
      },
      {
        "categoryId": "cat_456def",
        "amount": 850.00,
        "category": {
          "name": "Utilities",
          "color": "#33C3FF",
          "icon": "💡"
        }
      }
    ]
  },
  "ars": {
    "totalIncome": 250000.00,
    "totalExpenses": 180000.00,
    "netIncome": 70000.00,
    "accountBalance": 145000.00,
    "topExpenseCategories": [
      {
        "categoryId": "cat_789ghi",
        "amount": 85000.00,
        "category": {
          "name": "Alquiler",
          "color": "#FF6B6B",
          "icon": "🏠"
        }
      },
      {
        "categoryId": "cat_123abc",
        "amount": 45000.00,
        "category": {
          "name": "Supermercado",
          "color": "#4ECDC4",
          "icon": "🛒"
        }
      }
    ]
  },
  "transactionCount": 87,
  "monthlyTrend": [
    {
      "month": "2023-12-01T00:00:00.000Z",
      "usd": {
        "income": 4800.00,
        "expenses": 3200.00
      },
      "ars": {
        "income": 220000.00,
        "expenses": 165000.00
      }
    },
    {
      "month": "2024-01-01T00:00:00.000Z",
      "usd": {
        "income": 5000.00,
        "expenses": 3500.00
      },
      "ars": {
        "income": 250000.00,
        "expenses": 180000.00
      }
    }
  ]
}
```

**Response Fields:**
- `usd` - Complete statistics for USD currency
  - `totalIncome` - Total income in USD for the date range
  - `totalExpenses` - Total expenses in USD for the date range
  - `netIncome` - Net income in USD (totalIncome - totalExpenses)
  - `accountBalance` - Sum of all active USD account balances
  - `topExpenseCategories` - Top 5 expense categories in USD (array of objects with categoryId, amount, and category details)
- `ars` - Complete statistics for ARS currency
  - `totalIncome` - Total income in ARS for the date range
  - `totalExpenses` - Total expenses in ARS for the date range
  - `netIncome` - Net income in ARS (totalIncome - totalExpenses)
  - `accountBalance` - Sum of all active ARS account balances
  - `topExpenseCategories` - Top 5 expense categories in ARS (array of objects with categoryId, amount, and category details)
- `transactionCount` - Total number of transactions in the date range (all currencies)
- `monthlyTrend` - Income and expenses for the last 12 months, separated by currency (array of objects with month, usd, and ars data)

---

## Automated Processes

### Subscription Processing

**Schedule:** Runs automatically every day at midnight (00:00)

**Process:**
1. Finds all active subscriptions where `nextBillingDate <= current date`
2. For each due subscription:
   - Creates an EXPENSE transaction with the subscription amount
   - Updates the account balance (decreases by subscription amount)
   - Calculates the next billing date:
     - MONTHLY: adds 1 month
     - YEARLY: adds 1 year
   - Updates the subscription's `nextBillingDate`

**Transaction Metadata:**
When a subscription creates a transaction, it includes metadata:
```json
{
  "metadata": {
    "subscriptionId": "sub_123abc",
    "subscriptionName": "Netflix Premium",
    "billingCycle": "MONTHLY"
  }
}
```

**Manual Trigger:**
The subscription processor can be manually triggered by calling the `processSubscriptions()` function from the service layer (not exposed as an API endpoint).

---

## Error Handling

All endpoints follow consistent error response format:

**Client Errors (4xx):**
- `400` - Bad Request (validation errors)
- `403` - Forbidden (authorization issues)
- `404` - Not Found
- `409` - Conflict (duplicate resource)

**Server Errors (5xx):**
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "error": "Error message description"
}
```

---

## Best Practices

1. **Date Formats:** Always use ISO 8601 format for dates (`2024-01-15T14:30:00.000Z`)
2. **Pagination:** When fetching large datasets (transactions), always use pagination parameters
3. **Filtering:** Use specific filters (accountId, categoryId, type, dates) to optimize queries
4. **Currency:** Be aware of currency separation in stats - use `usd` and `ars` fields for currency-specific data
5. **Subscriptions:** Set `nextBillingDate` correctly to ensure proper automated processing
6. **Account Balance:** Never modify account balance directly - it's automatically updated through transactions

---

## Rate Limiting

Currently, no rate limiting is implemented. This may be added in future versions.

---

## Support

For issues or questions, refer to the backend repository or contact the development team.

---

**Version:** 1.0.0
**Last Updated:** 2024-10-10
