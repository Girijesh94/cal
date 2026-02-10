# My Products Database - Temporary Macro Storage

## Overview

This feature adds a separate database table (`my_products`) to store macros for products you use everyday. This is a **temporary solution** until your ML model is fully trained and ready to calculate macros automatically.

## What Was Added

### 1. Database Schema (`db.js`)
- **New Table**: `my_products`
  - Stores product name, brand, serving size, and all macro information
  - Includes fields for calories, protein, carbs, fat, fiber, and sugar
  - Supports marking products as favorites
  - Tracks creation and update timestamps

### 2. API Endpoints (`server.js`)
Six new endpoints were added:

1. **GET `/api/my-products`** - Get all products (with optional search and favorite filter)
2. **GET `/api/my-products/:id`** - Get a single product by ID
3. **POST `/api/my-products`** - Create a new product
4. **PUT `/api/my-products/:id`** - Update an existing product
5. **DELETE `/api/my-products/:id`** - Delete a product
6. **POST `/api/my-products/:id/calculate`** - Calculate macros for a custom quantity

### 3. Documentation
- **MY_PRODUCTS_API.md** - Complete API documentation with examples
- **test-api.bat** - Windows batch script to test all endpoints

## How to Use

### Step 1: Restart the Backend Server

Since the backend doesn't have hot reload, you need to restart it:

1. Stop the current backend server (Ctrl+C in the terminal running `npm start`)
2. Start it again:
   ```bash
   cd backend
   npm start
   ```

### Step 2: Add Your Products

Use the API to add products you use everyday. Example:

```bash
curl -X POST http://localhost:4000/api/my-products \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Whey Protein Powder",
    "brand": "Optimum Nutrition",
    "serving_size": 30,
    "serving_unit": "g",
    "calories": 120,
    "protein": 24,
    "carbs": 3,
    "fat": 1,
    "is_favorite": true
  }'
```

Or use the test script:
```bash
cd backend
test-api.bat
```

### Step 3: Calculate Macros

When you want to calculate macros for a specific quantity:

```bash
curl -X POST http://localhost:4000/api/my-products/1/calculate \
  -H "Content-Type: application/json" \
  -d '{"quantity": 45}'
```

This will return the calculated macros based on the serving size.

### Step 4: Search and Manage

- **Search products**: `GET /api/my-products?search=protein`
- **Get favorites**: `GET /api/my-products?favorite=true`
- **Update product**: `PUT /api/my-products/:id`
- **Delete product**: `DELETE /api/my-products/:id`

## Integration with Your App

You can integrate this into your frontend to:

1. **Create a "My Products" page** where users can add/edit/delete their everyday products
2. **Add a quick-add feature** that lets users select from their saved products when logging meals
3. **Show favorites first** for frequently used items
4. **Auto-calculate macros** when users enter quantity

## Example Products to Add

Here are some common products you might want to add:

```json
// Protein Powder
{
  "product_name": "Whey Protein Powder",
  "brand": "Optimum Nutrition",
  "serving_size": 30,
  "serving_unit": "g",
  "calories": 120,
  "protein": 24,
  "carbs": 3,
  "fat": 1
}

// Greek Yogurt
{
  "product_name": "Greek Yogurt",
  "brand": "Fage",
  "serving_size": 170,
  "serving_unit": "g",
  "calories": 100,
  "protein": 18,
  "carbs": 6,
  "fat": 0
}

// Oatmeal
{
  "product_name": "Rolled Oats",
  "brand": "Quaker",
  "serving_size": 40,
  "serving_unit": "g",
  "calories": 150,
  "protein": 5,
  "carbs": 27,
  "fat": 3,
  "fiber": 4
}

// Peanut Butter
{
  "product_name": "Peanut Butter",
  "brand": "Jif",
  "serving_size": 32,
  "serving_unit": "g",
  "calories": 190,
  "protein": 8,
  "carbs": 7,
  "fat": 16,
  "fiber": 2,
  "sugar": 3
}

// Banana
{
  "product_name": "Banana",
  "serving_size": 118,
  "serving_unit": "g",
  "calories": 105,
  "protein": 1.3,
  "carbs": 27,
  "fat": 0.4,
  "fiber": 3.1,
  "sugar": 14
}
```

## Migration Plan (When ML Model is Ready)

Once your ML model is fully trained:

1. **Export data** (if you want to keep it):
   ```sql
   SELECT * FROM my_products;
   ```

2. **Remove the table** from `db.js`:
   - Delete the `CREATE TABLE my_products` section
   - Delete the two index creation statements

3. **Remove the API endpoints** from `server.js`:
   - Delete the entire "MY PRODUCTS ENDPOINTS" section

4. **Delete these files**:
   - `MY_PRODUCTS_API.md`
   - `test-api.bat`
   - `test-my-products.js`
   - This README

## Database Location

The database is stored at: `backend/data/macros.db`

The `my_products` table is in the same database as your meal entries.

## Notes

- Product names must be unique
- All macro values are per serving size
- The calculate endpoint automatically scales macros proportionally
- Favorites appear first in the product list
- Search works on both product name and brand

## Testing

Run the test script to verify everything works:

```bash
cd backend
test-api.bat
```

This will create sample products and test all endpoints.

## Questions?

See `MY_PRODUCTS_API.md` for detailed API documentation with more examples.
