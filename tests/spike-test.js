import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/3.0.4/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Spike Test: Lonjakan trafik ekstrem mendadak (simulasi flash sale / war tiket)
export const options = {
    stages: [
        { duration: '10s', target: 5 },   // Trafik normal sebelum promo mulai
        { duration: '5s', target: 120 },  // SPIKE! Lonjakan mendadak ke 120 VUs dalam 5 detik
        { duration: '15s', target: 120 }, // Bertahan di puncak keramaian selama 15 detik
        { duration: '5s', target: 5 },    // Trafik langsung anjlok kembali ke normal
        { duration: '10s', target: 0 },   // Recovery selesai
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],    // Toleransi error maksimal 5% saat gelombang kejut
        http_req_duration: ['p(95)<2000'], // Toleransi p(95) maksimal 2 detik saat spike
        checks: ['rate>0.99'],             // Minimal 99% functional check harus lolos
    },
};

const BASE_URL = 'https://quickpizza.grafana.com';

export default function () {
    const homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
        'Home status is 200': (r) => r.status === 200,
    });

    sleep(0.5);

    const payload = JSON.stringify({
        maxCaloriesPerSlice: 800,
        mustBeVegetarian: false,
        excludedIngredients: [],
        maxNumberOfToppings: 6,
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

// Otomatis generate laporan HTML & tetap tampilkan ringkasan di terminal
export function handleSummary(data) {
    return {
        'reports/spike-summary.html': htmlReport(data),
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
}