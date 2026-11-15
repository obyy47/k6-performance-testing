import http from 'k6/http';
import { check, group } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/3.0.4/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export const QUICKPIZZA_URL = __ENV.QUICKPIZZA_URL || 'https://quickpizza.grafana.com';
export const PLACEHOLDER_URL = __ENV.PLACEHOLDER_URL || 'https://jsonplaceholder.typicode.com';
const FALLBACK_TOKEN = 'abcdef0123456789';

/**
 * 1. GET Request: Browse QuickPizza homepage or search menu by tag
 */
export function browseMenu(searchTag = '') {
    return group('Browse Menu (GET)', function () {
        const url = searchTag
            ? `${QUICKPIZZA_URL}/?menu=${encodeURIComponent(searchTag)}`
            : `${QUICKPIZZA_URL}/`;

        const res = http.get(url, {
            tags: { name: searchTag ? 'GET /?menu={tag}' : 'GET /' },
        });

        check(res, {
            'GET menu status is 200': (r) => r.status === 200,
            'GET menu body contains QuickPizza': (r) => r.body && r.body.includes('QuickPizza'),
        });

        return res;
    });
}

/**
 * 2. POST Request + Token Correlation: Authenticate and extract session token
 */
export function loginAndGetToken() {
    return group('Authenticate User (POST Login)', function () {
        const loginPayload = JSON.stringify({
            username: __ENV.QP_USERNAME || 'default',
            password: __ENV.QP_PASSWORD || 'default',
        });

        const res = http.post(`${QUICKPIZZA_URL}/api/users/token/login`, loginPayload, {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'POST /api/users/token/login' },
        });

        let extractedToken = '';
        if (res.status === 200) {
            try {
                extractedToken = res.json('token') || '';
            } catch (_) {
                extractedToken = '';
            }
        }

        check(res, {
            'POST login status is 200': (r) => r.status === 200,
            'POST login returned auth token': () => extractedToken.length > 0,
        });

        return extractedToken || FALLBACK_TOKEN;
    });
}

/**
 * 3. POST Request (Authenticated): Generate / create a custom pizza order
 */
export function createPizzaOrder(token, orderSpec = {}) {
    return group('Create Pizza Order (POST)', function () {
        const payload = JSON.stringify({
            customName: orderSpec.custom_name || orderSpec.customName || 'QuickPizza Special',
            maxCaloriesPerSlice: orderSpec.max_calories || orderSpec.maxCaloriesPerSlice || 600,
            mustBeVegetarian:
                orderSpec.is_vegetarian !== undefined
                    ? orderSpec.is_vegetarian
                    : Boolean(orderSpec.mustBeVegetarian),
            excludedIngredients:
                orderSpec.excluded_ingredients || orderSpec.excludedIngredients || ['anchovies'],
            minNumberOfToppings: orderSpec.min_toppings || orderSpec.minNumberOfToppings || 2,
            maxNumberOfToppings: orderSpec.max_toppings || orderSpec.maxNumberOfToppings || 5,
        });

        const res = http.post(`${QUICKPIZZA_URL}/api/pizza`, payload, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${token}`,
            },
            tags: { name: 'POST /api/pizza' },
        });

        check(res, {
            'POST /api/pizza status is 200': (r) => r.status === 200,
            'POST /api/pizza has pizza name': (r) => {
                try {
                    return r.json('pizza.name') !== undefined;
                } catch (_) {
                    return false;
                }
            },
            'POST /api/pizza has ingredients': (r) => {
                try {
                    const ingredients = r.json('pizza.ingredients');
                    return Array.isArray(ingredients) && ingredients.length > 0;
                } catch (_) {
                    return false;
                }
            },
        });

        return res;
    });
}

/**
 * 4. PUT Request: Full replacement update of an existing order record
 */
export function updateOrderPut(postId = 1, customName = 'Updated Pizza Order', updateNote = 'Full order update') {
    return group('Full Order Update (PUT)', function () {
        const safeId = ((Number(postId) - 1) % 100) + 1;
        const payload = JSON.stringify({
            id: safeId,
            title: customName,
            body: updateNote,
            userId: 1,
        });

        const res = http.put(`${PLACEHOLDER_URL}/posts/${safeId}`, payload, {
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            tags: { name: 'PUT /posts/{id}' },
        });

        check(res, {
            'PUT /posts/{id} status is 200': (r) => r.status === 200,
            'PUT /posts/{id} returns updated id': (r) => {
                try {
                    return Number(r.json('id')) === safeId;
                } catch (_) {
                    return false;
                }
            },
        });

        return res;
    });
}

/**
 * 5. PATCH Request: Partial update of an order note / delivery status
 */
export function patchOrderNote(postId = 1, patchNote = 'Patched: add extra chili flakes') {
    return group('Partial Order Patch (PATCH)', function () {
        const safeId = ((Number(postId) - 1) % 100) + 1;
        const payload = JSON.stringify({
            body: patchNote,
        });

        const res = http.patch(`${PLACEHOLDER_URL}/posts/${safeId}`, payload, {
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            tags: { name: 'PATCH /posts/{id}' },
        });

        check(res, {
            'PATCH /posts/{id} status is 200': (r) => r.status === 200,
            'PATCH /posts/{id} returns patched body': (r) => {
                try {
                    return r.json('body') === patchNote;
                } catch (_) {
                    return false;
                }
            },
        });

        return res;
    });
}

/**
 * 6. DELETE Request: Cancel / remove a draft order
 */
export function deleteOrder(postId = 1) {
    return group('Cancel Order (DELETE)', function () {
        const safeId = ((Number(postId) - 1) % 100) + 1;

        const res = http.del(`${PLACEHOLDER_URL}/posts/${safeId}`, null, {
            tags: { name: 'DELETE /posts/{id}' },
        });

        check(res, {
            'DELETE /posts/{id} status is 200': (r) => r.status === 200,
        });

        return res;
    });
}

/**
 * Standardized summary exporter: writes HTML report + prints terminal summary
 */
export function createSummaryHandler(reportName) {
    return function handleSummary(data) {
        return {
            [`reports/${reportName}-summary.html`]: htmlReport(data),
            stdout: textSummary(data, { indent: ' ', enableColors: true }),
        };
    };
}
