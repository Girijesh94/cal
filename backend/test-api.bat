@echo off
echo Testing My Products API...
echo.

echo 1. Creating Whey Protein product...
curl -X POST http://localhost:4000/api/my-products -H "Content-Type: application/json" -d "{\"product_name\":\"Whey Protein Powder\",\"brand\":\"Optimum Nutrition\",\"serving_size\":30,\"serving_unit\":\"g\",\"calories\":120,\"protein\":24,\"carbs\":3,\"fat\":1,\"fiber\":0,\"sugar\":1,\"notes\":\"Gold Standard\",\"is_favorite\":true}"
echo.
echo.

echo 2. Creating Greek Yogurt product...
curl -X POST http://localhost:4000/api/my-products -H "Content-Type: application/json" -d "{\"product_name\":\"Greek Yogurt\",\"brand\":\"Fage\",\"serving_size\":170,\"serving_unit\":\"g\",\"calories\":100,\"protein\":18,\"carbs\":6,\"fat\":0,\"is_favorite\":true}"
echo.
echo.

echo 3. Getting all products...
curl http://localhost:4000/api/my-products
echo.
echo.

echo 4. Searching for 'protein'...
curl "http://localhost:4000/api/my-products?search=protein"
echo.
echo.

echo 5. Getting product ID 1...
curl http://localhost:4000/api/my-products/1
echo.
echo.

echo 6. Calculating macros for 45g of product ID 1...
curl -X POST http://localhost:4000/api/my-products/1/calculate -H "Content-Type: application/json" -d "{\"quantity\":45}"
echo.
echo.

echo 7. Getting favorite products only...
curl "http://localhost:4000/api/my-products?favorite=true"
echo.
echo.

echo Tests complete!
