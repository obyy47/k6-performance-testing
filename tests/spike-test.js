import { sleep } from 'k6';
import { Trend } from 'k6/metrics';
import {
    browseMenu,
    loginAndGetToken,
    createPizzaOrder,
    createSummaryHandler,
} from '../utils/helpers.js';

const browseFlowDuration = new Trend('flow_browse_duration', true);
const checkoutFlowDuration = new Trend('flow_checkout_duration', true);

// Spike Test: Lonjakan trafik ekstrem mendadak (simulasi promo flash sale: 5 -> 100 VUs dalam 5 detik)
// - 70% Browse katalog promo (GET /)
// - 30% Checkout cepat (POST login -> POST /api/pizza)
export const options = {
    stages: [
        { duration: '10s', target: 5 },   // Trafik normal sebelum promo mulai
        { duration: '5s', target: 100 },  // SPIKE! Lonjakan mendadak 20x ke 100 VUs dalam 5 detik
        { duration: '15s', target: 100 }, // Bertahan di puncak keramaian selama 15 detik
        { duration: '5s', target: 5 },    // Trafik langsung anjlok kembali ke normal
        { duration: '10s', target: 0 },   // Recovery selesai
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],    // Toleransi error maksimal 5% saat gelombang kejut
        http_req_duration: ['p(95)<3000'], // Toleransi p(95) maksimal 3 detik saat spike
        checks: ['rate>0.99'],             // Minimal 99% functional check lolos
    },
};

export default function () {
    const roll = Math.random();
    const flowStart = Date.now();

    if (roll < 0.70) {
        // 70% User mengecek halaman promo
        browseMenu();
        browseFlowDuration.add(Date.now() - flowStart);
        sleep(0.5);
    } else {
        // 30% User langsung login dan checkout promo
        const token = loginAndGetToken();
        createPizzaOrder(token, {
            custom_name: 'Flash Sale Special Pizza',
            max_calories: 750,
            is_vegetarian: false,
            excluded_ingredients: [],
            min_toppings: 1,
            max_toppings: 6,
        });
        checkoutFlowDuration.add(Date.now() - flowStart);
        sleep(0.5);
    }
}

export const handleSummary = createSummaryHandler('spike');
