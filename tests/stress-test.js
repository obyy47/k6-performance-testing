import http from 'k6/http';
import { check, sleep } from 'k6';

// Stress Test: Mendorong beban bertahap melampaui kapasitas normal untuk menguji ketahanan server
export const options = {
    stages: [
        { duration: '10s', target: 10 }, // Beban normal
        { duration: '15s', target: 30 }, // Beban tinggi (3x lipat normal)
        { duration: '15s', target: 50 }, // Beban puncak / stress (5x lipat normal)
        { duration: '10s', target: 0 },  // Recovery / pendinginan kembali ke 0
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],    // Toleransi error maksimal 5% saat kondisi ekstrem
        http_req_duration: ['p(95)<1500'], // Toleransi p(95) maksimal 1.5 detik saat stress
        checks: ['rate>0.99'],             // Minimal 99% functional check harus lolos
    },
};

const BASE_URL = 'https://quickpizza.grafana.com';

export default function () {
    const homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
        'Home status is 200': (r) => r.status === 200,
    });

    sleep(0.5); // Think time lebih singkat untuk simulasi trafik agresif

    const payload = JSON.stringify({
        maxCaloriesPerSlice: 700,
        mustBeVegetarian: false,
        excludedIngredients: [],
        maxNumberOfToppings: 5,
        minNumberOfToppings: 1,
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

    sleep(0.5);
}