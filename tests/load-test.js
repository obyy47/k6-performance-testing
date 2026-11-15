import { sleep } from 'k6';
import { Trend } from 'k6/metrics';
import {
    browseMenu,
    loginAndGetToken,
    createPizzaOrder,
    updateOrderPut,
    patchOrderNote,
    createSummaryHandler,
} from '../utils/helpers.js';

// Custom metrics per business flow
const browseFlowDuration = new Trend('flow_browse_duration', true);
const checkoutFlowDuration = new Trend('flow_checkout_duration', true);
const cartUpdateFlowDuration = new Trend('flow_cart_update_duration', true);

// Load Test: Simulasi trafik harian normal (15 VUs) dengan pembagian beban realistis:
// - 70% Browse menu (GET /)
// - 20% Checkout flow (GET / -> POST login -> POST /api/pizza)
// - 10% Cart update flow (PUT /posts/{id} -> PATCH /posts/{id})
export const options = {
    stages: [
        { duration: '10s', target: 15 }, // Ramp-up: naik perlahan ke 15 VUs
        { duration: '25s', target: 15 }, // Steady state: bertahan di 15 VUs selama 25 detik
        { duration: '10s', target: 0 },  // Ramp-down: turun kembali ke 0 VUs
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],    // Error wajib di bawah 1%
        http_req_duration: ['p(95)<1500'], // p(95) keseluruhan wajib di bawah 1500ms
        checks: ['rate>0.99'],             // Minimal 99% functional check lolos
    },
};

export default function () {
    const roll = Math.random();
    const flowStart = Date.now();

    if (roll < 0.70) {
        // 70% Traffic: User hanya melihat-lihat menu
        browseMenu();
        browseFlowDuration.add(Date.now() - flowStart);
        sleep(1);
    } else if (roll < 0.90) {
        // 20% Traffic: User melihat menu, login, dan checkout order pizza
        browseMenu();
        sleep(0.5);
        const token = loginAndGetToken();
        createPizzaOrder(token, {
            custom_name: 'Load Test Pepperoni Special',
            max_calories: 650,
            is_vegetarian: false,
            excluded_ingredients: ['anchovies'],
            min_toppings: 2,
            max_toppings: 5,
        });
        checkoutFlowDuration.add(Date.now() - flowStart);
        sleep(1);
    } else {
        // 10% Traffic: User memperbarui keranjang / catatan pesanan (PUT + PATCH)
        const orderId = (__VU % 10) + 1;
        updateOrderPut(orderId, 'Load Test Order Update', 'Updated crust & topping preferences');
        sleep(0.3);
        patchOrderNote(orderId, 'Patched delivery instruction: ring doorbell');
        cartUpdateFlowDuration.add(Date.now() - flowStart);
        sleep(1);
    }
}

export const handleSummary = createSummaryHandler('load');
