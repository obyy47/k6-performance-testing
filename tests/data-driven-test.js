import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import {
    browseMenu,
    loginAndGetToken,
    createPizzaOrder,
    updateOrderPut,
    patchOrderNote,
    createSummaryHandler,
} from '../utils/helpers.js';

// SharedArray memuat file JSON sekali ke memori agar hemat RAM saat VUs tinggi
const pizzaOrders = new SharedArray('pizza orders', function () {
    return JSON.parse(open('../data/pizza-orders.json'));
});

// Data-Driven Test: Menjalankan 10 skenario order unik dari data/pizza-orders.json
// melalui alur end-to-end: GET /?menu={tag} -> POST login -> POST /api/pizza -> PUT -> PATCH
export const options = {
    stages: [
        { duration: '5s', target: 10 },  // Ramp-up ke 10 VUs (1 VU per baris dataset)
        { duration: '20s', target: 10 }, // Steady state: mengeksekusi variasi payload dataset
        { duration: '5s', target: 0 },   // Ramp-down
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],    // Error wajib di bawah 1%
        http_req_duration: ['p(95)<1500'], // p(95) wajib di bawah 1500ms
        checks: ['rate>0.99'],             // Minimal 99% functional check lolos
    },
};

export default function () {
    // Distribusi deterministik berdasarkan nomor iterasi agar ke-10 skenario teruji merata
    const idx = exec.scenario.iterationInTest % pizzaOrders.length;
    const order = pizzaOrders[idx];

    // 1. GET /?menu={search_tag}
    browseMenu(order.search_tag);
    sleep(0.3);

    // 2. POST /api/users/token/login (korelasi token)
    const token = loginAndGetToken();
    sleep(0.3);

    // 3. POST /api/pizza (payload kustom dari dataset)
    createPizzaOrder(token, order);
    sleep(0.3);

    // 4. PUT /posts/{post_id} (update penuh dengan catatan dari dataset)
    updateOrderPut(order.post_id, order.custom_name, order.update_note);
    sleep(0.3);

    // 5. PATCH /posts/{post_id} (konfirmasi status order)
    patchOrderNote(order.post_id, `Confirmed: ${order.custom_name}`);
    sleep(0.5);
}

export const handleSummary = createSummaryHandler('data-driven');
