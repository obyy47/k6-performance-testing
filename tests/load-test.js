import http from 'k6/http';
import { check, sleep } from 'k6';

// Load Test: Simulasi trafik harian normal dengan pola naik-bertahan-turun (stages)
export const options = {
    stages: [
        { duration: '10s', target: 10 }, // Ramp-up: naik perlahan ke 10 VUs
        { duration: '20s', target: 10 }, // Steady state: bertahan di 10 VUs selama 20 detik
        { duration: '10s', target: 0 },  // Ramp-down: turun kembali ke 0 VUs
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],   // Error wajib di bawah 1%
        http_req_duration: ['p(95)<800'], // Di bawah beban 10 VUs, p(95) wajib di bawah 800ms
        checks: ['rate>0.99'],            // Minimal 99% functional check harus lolos
    },
};

const BASE_URL = 'https://quickpizza.grafana.com';

export default function () {
    // 1. User membuka halaman utama
    const homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
        'Home status is 200': (r) => r.status === 200,
    });

    sleep(1);

    // 2. User me-request rekomendasi pizza (POST JSON)
    const payload = JSON.stringify({
        maxCaloriesPerSlice: 600,
        mustBeVegetarian: false,
        excludedIngredients: ['anchovies'],
        maxNumberOfToppings: 5,
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