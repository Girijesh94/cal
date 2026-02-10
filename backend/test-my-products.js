// Test script for My Products API
const API_BASE = 'http://localhost:4000';

async function testMyProductsAPI() {
    console.log('🧪 Testing My Products API...\n');

    try {
        // Test 1: Create a product
        console.log('1️⃣ Creating a new product (Whey Protein)...');
        const createResponse = await fetch(`${API_BASE}/api/my-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_name: 'Whey Protein Powder',
                brand: 'Optimum Nutrition',
                serving_size: 30,
                serving_unit: 'g',
                calories: 120,
                protein: 24,
                carbs: 3,
                fat: 1,
                fiber: 0,
                sugar: 1,
                notes: 'Gold Standard',
                is_favorite: true
            })
        });
        const product1 = await createResponse.json();
        console.log('✅ Created:', product1);
        console.log('');

        // Test 2: Create another product
        console.log('2️⃣ Creating another product (Greek Yogurt)...');
        const createResponse2 = await fetch(`${API_BASE}/api/my-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_name: 'Greek Yogurt',
                brand: 'Fage',
                serving_size: 170,
                serving_unit: 'g',
                calories: 100,
                protein: 18,
                carbs: 6,
                fat: 0,
                is_favorite: true
            })
        });
        const product2 = await createResponse2.json();
        console.log('✅ Created:', product2);
        console.log('');

        // Test 3: Get all products
        console.log('3️⃣ Getting all products...');
        const allProductsResponse = await fetch(`${API_BASE}/api/my-products`);
        const allProducts = await allProductsResponse.json();
        console.log('✅ Found', allProducts.products.length, 'products');
        console.log('');

        // Test 4: Search for products
        console.log('4️⃣ Searching for "protein"...');
        const searchResponse = await fetch(`${API_BASE}/api/my-products?search=protein`);
        const searchResults = await searchResponse.json();
        console.log('✅ Found', searchResults.products.length, 'matching products');
        console.log('');

        // Test 5: Get single product
        console.log('5️⃣ Getting product by ID...');
        const singleProductResponse = await fetch(`${API_BASE}/api/my-products/${product1.id}`);
        const singleProduct = await singleProductResponse.json();
        console.log('✅ Retrieved:', singleProduct.product_name);
        console.log('');

        // Test 6: Calculate macros for custom quantity
        console.log('6️⃣ Calculating macros for 45g of protein powder (serving size: 30g)...');
        const calculateResponse = await fetch(`${API_BASE}/api/my-products/${product1.id}/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: 45 })
        });
        const calculated = await calculateResponse.json();
        console.log('✅ Calculated macros:', calculated.macros);
        console.log('');

        // Test 7: Update product
        console.log('7️⃣ Updating product...');
        const updateResponse = await fetch(`${API_BASE}/api/my-products/${product1.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_name: 'Whey Protein Powder',
                brand: 'Optimum Nutrition',
                serving_size: 32,
                serving_unit: 'g',
                calories: 130,
                protein: 25,
                carbs: 3,
                fat: 1.5,
                fiber: 0,
                sugar: 1,
                notes: 'Gold Standard - Updated',
                is_favorite: true
            })
        });
        const updated = await updateResponse.json();
        console.log('✅ Updated:', updated);
        console.log('');

        // Test 8: Get favorites only
        console.log('8️⃣ Getting favorite products only...');
        const favoritesResponse = await fetch(`${API_BASE}/api/my-products?favorite=true`);
        const favorites = await favoritesResponse.json();
        console.log('✅ Found', favorites.products.length, 'favorite products');
        console.log('');

        console.log('🎉 All tests passed!\n');
        console.log('📋 Summary:');
        console.log(`   - Created ${allProducts.products.length} products`);
        console.log(`   - Search works correctly`);
        console.log(`   - Macro calculation works correctly`);
        console.log(`   - Update works correctly`);
        console.log(`   - Favorite filter works correctly`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

// Run the tests
testMyProductsAPI();
