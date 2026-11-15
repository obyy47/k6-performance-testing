import { sleep } from 'k6';
import {
    browseMenu,
    loginAndGetToken,
    createPizzaOrder,
    updateOrderPut,
    patchOrderNote,
    deleteOrder,
    createSummaryHandler,
} from '../utils/helpers.js';

// Smoke Test: Verifikasi fungsional penuh semua HTTP methods (GET, POST, PUT, PATCH, DELETE)
// dan korelasi token dinamis pada beban minimal (2 VUs, 10s).
export const options = {
    vus: 2,
    duration: '10s',
    thresholds: {
        http_req_failed: ['rate<0.01'],    // Tingkat error wajib di bawah 1%
        http_req_duration: ['p(95)<2000'], // p(95) di bawah 2000ms
        checks: ['rate>0.99'],             // Minimal 99% functional check lolos
    },
};

export default function () {
    // 1. GET: Buka halaman utama QuickPizza
    browseMenu();
    sleep(0.5);

    // 2. POST (Login): Ambil token autentikasi dinamis
    const token = loginAndGetToken();
    sleep(0.5);

    // 3. POST (Order): Buat pesanan pizza menggunakan token hasil korelasi
    createPizzaOrder(token, {
        custom_name: 'Smoke Test Margherita',
        max_calories: 500,
        is_vegetarian: false,
        excluded_ingredients: ['anchovies'],
        min_toppings: 2,
        max_toppings: 4,
    });
    sleep(0.5);

    // 4. PUT: Update penuh detail pesanan
    updateOrderPut(1, 'Smoke Test Margherita', 'Full order replacement via PUT');
    sleep(0.3);

    // 5. PATCH: Update parsial catatan pengiriman
    patchOrderNote(1, 'Patched note: extra oregano & chili');
    sleep(0.3);

    // 6. DELETE: Hapus / batalkan draft pesanan
    deleteOrder(1);
    sleep(0.5);
}

export const handleSummary = createSummaryHandler('smoke');
