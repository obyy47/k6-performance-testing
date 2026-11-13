import http from 'k6/http';
import { check, sleep } from 'k6';

// Smoke Test: Beban minimal (2 VUs) untuk memastikan API sehat dan skrip bebas bug
export const options = {
    vus: 2,
    duration: '10s',
    thresholds: {
        http_req_failed: ['rate<0.01'],    // Tingkat error wajib di bawah 1%
        http_req_duration: ['p(95)<2000'], // p(95) di bawah 2000ms (2 detik) untuk server publik
        checks: ['rate>0.99'],             // Minimal 99% functional check harus lolos
    },
};

const BASE_URL = 'https://quickpizza.grafana.com';

export default function () {
    // 1. Cek halaman utama (GET Request)
    const homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
        'Home status is 200': (r) => r.status === 200,
    });

    sleep(1);

    // 2. Simulasi kirim data order rekomendasi pizza (POST Request)
    const payload = JSON.stringify({
        maxCaloriesPerSlice: 500,
        mustBeVegetarian: false,
        excludedIngredients: ['anchovies'],
        maxNumberOfToppings: 4,
        minNumberOfToppings: 2,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Token abcdef0123456789', // Public demo token from the QuickPizza docs
        },
    };

    const pizzaRes = http.post(`${BASE_URL}/api/pizza`, payload, params);

    check(pizzaRes, {
        'POST /api/pizza status is 200': (r) => r.status === 200,
        'Response has pizza name': (r) => r.json('pizza.name') !== undefined,
    });

    sleep(1);
}