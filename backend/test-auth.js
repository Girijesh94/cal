const http = require('http');

const API_URL = 'http://localhost:4000';

const makeRequest = (path, method = 'GET', body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

async function runTests() {
    console.log('--- Starting Auth Verification ---');
    let user1Token, user2Token;

    // 1. Register User 1
    const r1 = await makeRequest('/api/register', 'POST', { username: 'testuser1', password: 'password123' });
    console.log('Register User 1:', r1.status);

    // 2. Login User 1
    const l1 = await makeRequest('/api/login', 'POST', { username: 'testuser1', password: 'password123' });
    console.log('Login User 1:', l1.status);
    user1Token = l1.data.token;

    // 3. Register User 2
    const r2 = await makeRequest('/api/register', 'POST', { username: 'testuser2', password: 'password123' });
    console.log('Register User 2:', r2.status);

    // 4. Login User 2
    const l2 = await makeRequest('/api/login', 'POST', { username: 'testuser2', password: 'password123' });
    console.log('Login User 2:', l2.status);
    user2Token = l2.data.token;

    // 5. User 1 adds a meal
    const date = new Date().toISOString().slice(0, 10);
    const addMealReq = await makeRequest('/api/meals', 'POST', {
        date,
        meal: 'Test Breakfast',
        calories: 500,
        protein: 30,
        carbs: 40,
        fat: 20
    }, user1Token);
    console.log('User 1 Add Meal:', addMealReq.status);

    // 6. User 1 fetches meals
    const getMealsU1 = await makeRequest(`/api/meals?date=${date}`, 'GET', null, user1Token);
    console.log('User 1 Meals Count:', getMealsU1.data.entries.length);

    // 7. User 2 fetches meals
    const getMealsU2 = await makeRequest(`/api/meals?date=${date}`, 'GET', null, user2Token);
    console.log('User 2 Meals Count:', getMealsU2.data.entries ? getMealsU2.data.entries.length : 0);

    if (getMealsU1.data.entries.length > 0 && getMealsU2.data.entries.length === 0) {
        console.log('✅ Verification Successful: Data is properly isolated between users.');
    } else {
        console.log('❌ Verification Failed.');
    }
}

runTests().catch(console.error);
