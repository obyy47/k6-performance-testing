import { sleep } from 'k6';
import { Trend } from 'k6/metrics';
import {
    browseMenu,
    loginAndGetToken,
    createPizzaOrder,
    updateOrderPut,
    deleteOrder,
    createSummaryHandler,
} from '../utils/helpers.js';

const browseFlowDuration = new Trend('flow_browse_duration', true);
const checkoutFlowDuration = new Trend('flow_checkout_duration', true);
const orderManageFlowDuration = new Trend('flow_order_manage_duration', true);

// Stress Test: Mendorong beban bertahap melampaui kapasitas normal (hingga 60 VUs)
// dengan campuran workload agresif:
// - 50% Browse menu (GET /)
// - 40% Checkout flow (POST login -> POST /api/pizza)
// - 10% Order modification & cancellation (PUT -> DELETE)
export const options = {
    stages: [
        { duration: '10s', target: 15 }, // Beban normal
        { duration: '15s', target: 35 }, // Beban tinggi
        { duration: '15s', target: 60 }, // Beban puncak / stress
        { duration: '10s', target: 0 },  // Recovery / pendinginan kembali ke 0
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],    // Toleransi error maksimal 5% saat kondisi ekstrem
        http_req_duration: ['p(95)<2500'], // Toleransi p(95) maksimal 2.5 detik saat stress
        checks: ['rate>0.99'],             // Minimal 99% functional check lolos
    },
};

export default function () {
    const roll = Math.random();
    const flowStart = Date.now();

    if (roll < 0.50) {
        // 50% Browse
        browseMenu();
        browseFlowDuration.add(Date.now() - flowStart);
        sleep(0.5);
    } else if (roll < 0.90) {
        // 40% Checkout (Login + Create Order)
        const token = loginAndGetToken();
        createPizzaOrder(token, {
            custom_name: 'Stress Test Meat Overload',
            max_calories: 800,
            is_vegetarian: false,
            excluded_ingredients: [],
            min_toppings: 3,
            max_toppings: 6,
        });
        checkoutFlowDuration.add(Date.now() - flowStart);
        sleep(0.5);
    } else {
        // 10% Order Update & Cancellation (PUT + DELETE)
        const orderId = (__VU % 10) + 1;
        updateOrderPut(orderId, 'Stress Test Modified Order', 'High-load order revision');
        sleep(0.2);
        deleteOrder(orderId);
        orderManageFlowDuration.add(Date.now() - flowStart);
        sleep(0.5);
    }
}

export const handleSummary = createSummaryHandler('stress');
