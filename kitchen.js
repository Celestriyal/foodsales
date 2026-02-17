// DOM Elements
const ordersGrid = document.getElementById('kitchen-orders-grid');
const clockElement = document.getElementById('clock');

// State
let orders = [];

// Init
function init() {
    loadOrders();
    renderOrders();
    startClock();

    // Listen for changes
    window.addEventListener('storage', (e) => {
        if (e.key === 'oderwall_orders') {
            loadOrders();
            renderOrders();
        }
    });
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString();
    }, 1000);
}

function loadOrders() {
    const storedOrders = localStorage.getItem('oderwall_orders');
    if (storedOrders) {
        orders = JSON.parse(storedOrders);
    } else {
        orders = [];
    }
}

function saveOrders() {
    localStorage.setItem('oderwall_orders', JSON.stringify(orders));
}

function renderOrders() {
    ordersGrid.innerHTML = '';

    // Show only 'cooking' orders
    const cookingOrders = orders.filter(o => o.status === 'cooking');

    if (cookingOrders.length === 0) {
        ordersGrid.innerHTML = `
            <div class="no-orders-msg">
                <i class="fa-solid fa-bell-concierge"></i>
                <p>No orders to cook.</p>
            </div>
        `;
        return;
    }

    cookingOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'kitchen-order-card';

        const itemsList = order.items.map(i => `
            <div class="kitchen-item">
                <span class="qty">${i.quantity}x</span>
                <span class="name">${i.name}</span>
            </div>
        `).join('');

        orderCard.innerHTML = `
            <div class="kitchen-card-header">
                <h3>Order #${order.id.toString().slice(-4)}</h3>
                <span class="timer">${getTimeElapsed(order.timestamp)}</span>
            </div>
            <div class="kitchen-card-body">
                ${itemsList}
            </div>
            <div class="kitchen-card-footer">
                <button class="ready-btn" onclick="markOrderReady(${order.id})">
                    <i class="fa-solid fa-check"></i> Dispatched
                </button>
            </div>
        `;
        ordersGrid.appendChild(orderCard);
    });
}

function getTimeElapsed(startTime) {
    // Simple placeholder for now, could be improved to dynamic timer
    const start = new Date(startTime);
    const now = new Date();
    const diffMins = Math.floor((now - start) / 60000);
    return `${diffMins}m ago`;
}

window.markOrderReady = function (id) {
    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex > -1) {
        orders[orderIndex].status = 'ready';
        saveOrders();
        renderOrders();
    }
};

init();
