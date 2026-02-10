# My Products API Documentation

This API allows you to store and manage macros for products you use everyday. This is a temporary solution until the ML model is fully trained.

## Database Schema

The `my_products` table stores:
- `id`: Auto-incrementing primary key
- `product_name`: Unique product name (required)
- `brand`: Optional brand name
- `serving_size`: Size of one serving (required, must be > 0)
- `serving_unit`: Unit of measurement (default: 'g')
- `calories`: Calories per serving (required)
- `protein`: Protein in grams per serving (required)
- `carbs`: Carbohydrates in grams per serving (required)
- `fat`: Fat in grams per serving (required)
- `fiber`: Fiber in grams per serving (optional, default: 0)
- `sugar`: Sugar in grams per serving (optional, default: 0)
- `notes`: Optional notes about the product
- `is_favorite`: Mark as favorite (0 or 1)
- `created_at`: Timestamp when created
- `updated_at`: Timestamp when last updated

## API Endpoints

### 1. Get All Products (with optional search and filter)

**GET** `/api/my-products`

**Query Parameters:**
- `search` (optional): Search by product name or brand
- `favorite` (optional): Set to `'true'` to get only favorites

**Example:**
```bash
# Get all products
curl http://localhost:4000/api/my-products

# Search for products
curl http://localhost:4000/api/my-products?search=protein

# Get only favorites
curl http://localhost:4000/api/my-products?favorite=true
```

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "product_name": "Whey Protein Powder",
      "brand": "Optimum Nutrition",
      "serving_size": 30,
      "serving_unit": "g",
      "calories": 120,
      "protein": 24,
      "carbs": 3,
      "fat": 1,
      "fiber": 0,
      "sugar": 1,
      "notes": "Gold Standard",
      "is_favorite": 1,
      "created_at": "2026-02-09 16:30:00",
      "updated_at": "2026-02-09 16:30:00"
    }
  ]
}
```

---

### 2. Get Single Product by ID

**GET** `/api/my-products/:id`

**Example:**
```bash
curl http://localhost:4000/api/my-products/1
```

**Response:**
```json
{
  "id": 1,
  "product_name": "Whey Protein Powder",
  "brand": "Optimum Nutrition",
  "serving_size": 30,
  "serving_unit": "g",
  "calories": 120,
  "protein": 24,
  "carbs": 3,
  "fat": 1,
  "fiber": 0,
  "sugar": 1,
  "notes": "Gold Standard",
  "is_favorite": 1,
  "created_at": "2026-02-09 16:30:00",
  "updated_at": "2026-02-09 16:30:00"
}
```

---

### 3. Create New Product

**POST** `/api/my-products`

**Request Body:**
```json
{
  "product_name": "Whey Protein Powder",
  "brand": "Optimum Nutrition",
  "serving_size": 30,
  "serving_unit": "g",
  "calories": 120,
  "protein": 24,
  "carbs": 3,
  "fat": 1,
  "fiber": 0,
  "sugar": 1,
  "notes": "Gold Standard",
  "is_favorite": true
}
```

**Example:**
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
    "fiber": 0,
    "sugar": 1,
    "notes": "Gold Standard",
    "is_favorite": true
  }'
```

**Response:**
```json
{
  "id": 1,
  "product_name": "Whey Protein Powder",
  "brand": "Optimum Nutrition",
  "serving_size": 30,
  "serving_unit": "g",
  "calories": 120,
  "protein": 24,
  "carbs": 3,
  "fat": 1,
  "fiber": 0,
  "sugar": 1,
  "notes": "Gold Standard",
  "is_favorite": 1
}
```

---

### 4. Update Product

**PUT** `/api/my-products/:id`

**Request Body:** (same as create)

**Example:**
```bash
curl -X PUT http://localhost:4000/api/my-products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Whey Protein Powder",
    "brand": "Optimum Nutrition",
    "serving_size": 32,
    "serving_unit": "g",
    "calories": 130,
    "protein": 25,
    "carbs": 3,
    "fat": 1.5,
    "fiber": 0,
    "sugar": 1,
    "notes": "Gold Standard - Updated",
    "is_favorite": true
  }'
```

---

### 5. Delete Product

**DELETE** `/api/my-products/:id`

**Example:**
```bash
curl -X DELETE http://localhost:4000/api/my-products/1
```

**Response:**
```json
{
  "deleted": true
}
```

---

### 6. Calculate Macros for Custom Quantity

**POST** `/api/my-products/:id/calculate`

This endpoint calculates macros based on a custom quantity of the product.

**Request Body:**
```json
{
  "quantity": 45
}
```

**Example:**
```bash
# Calculate macros for 45g of protein powder (when serving size is 30g)
curl -X POST http://localhost:4000/api/my-products/1/calculate \
  -H "Content-Type: application/json" \
  -d '{"quantity": 45}'
```

**Response:**
```json
{
  "product_name": "Whey Protein Powder",
  "brand": "Optimum Nutrition",
  "quantity": 45,
  "unit": "g",
  "macros": {
    "calories": 180,
    "protein": 36,
    "carbs": 4.5,
    "fat": 1.5,
    "fiber": 0,
    "sugar": 1.5
  }
}
```

---

## Usage Examples

### Example 1: Add Common Products

```bash
# Add Greek Yogurt
curl -X POST http://localhost:4000/api/my-products \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Greek Yogurt",
    "brand": "Fage",
    "serving_size": 170,
    "serving_unit": "g",
    "calories": 100,
    "protein": 18,
    "carbs": 6,
    "fat": 0,
    "is_favorite": true
  }'

# Add Oatmeal
curl -X POST http://localhost:4000/api/my-products \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Rolled Oats",
    "brand": "Quaker",
    "serving_size": 40,
    "serving_unit": "g",
    "calories": 150,
    "protein": 5,
    "carbs": 27,
    "fat": 3,
    "fiber": 4,
    "is_favorite": true
  }'
```

### Example 2: Calculate Macros for Different Quantities

```bash
# Calculate for 60g of oats (1.5 servings)
curl -X POST http://localhost:4000/api/my-products/2/calculate \
  -H "Content-Type: application/json" \
  -d '{"quantity": 60}'
```

---

## Migration Plan

Once your ML model is fully trained and ready:

1. Export your products data if needed:
   ```sql
   SELECT * FROM my_products;
   ```

2. Drop the table:
   ```sql
   DROP TABLE my_products;
   ```

3. Remove the API endpoints from `server.js` (lines marked with "MY PRODUCTS ENDPOINTS")

4. Remove the table creation from `db.js`

---

## Notes

- Product names must be unique
- All macro values are per serving
- The `calculate` endpoint automatically scales macros based on quantity
- Favorites appear first in the product list
- Use the search feature to quickly find products
