import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// SharedArray memuat file JSON sekali ke memori agar hemat RAM saat VUs tinggi
const pizzaOrders = new SharedArray('pizza orders', function () {
    return JSON.parse(open('../data/pizza-orders.json'));
});

export const options = {
    stages: [
        { duration: '10s', target: 15 },
        { duration: '20s', target: 15 },
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<800'],
        checks: ['rate>0.99'], // Minimal 99% functional check harus lolos
    },
};

const BASE_URL = 'https://quickpizza.grafana.com';

export default function () {
    // Pilih skenario payload acak untuk setiap iterasi user
    const randomOrder = pizzaOrders[Math.floor(Math.random() * pizzaOrders.length)];

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Token abcdef0123456789', // Public demo token from the QuickPizza docs
        },
    };

    const res = http.post(`${BASE_URL}/api/pizza`, JSON.stringify(randomOrder), params);

    check(res, {
        'POST /api/pizza status is 200': (r) => r.status === 200,
        'Pizza generated successfully': (r) => r.json('pizza.name') !== undefined,
    });

    sleep(1);
}