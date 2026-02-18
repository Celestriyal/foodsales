// DOM Elements
const ordersGrid = document.getElementById('kitchen-orders-grid');
const summaryGrid = document.getElementById('kitchen-summary-grid');
const clockElement = document.getElementById('clock');

// State
let orders = [];

// Init
function init() {
    loadOrders();
    renderOrders();
    renderSummary(); // Initial render
    startClock();

    // Listen for changes
    window.addEventListener('storage', (e) => {
        if (e.key === 'oderwall_orders') {
            loadOrders();
            renderOrders();
            renderSummary(); // Update summary
        }
    });
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString();
    }, 1000);

    // Poll for orders every 2 seconds (Fallback for storage event issues)
    setInterval(() => {
        loadOrders();
        renderOrders();
        renderSummary(); // Update summary
    }, 2000);
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

function renderSummary() {
    if (!summaryGrid) return;
    summaryGrid.innerHTML = '';

    // Filter only cooking orders
    const cookingOrders = orders.filter(o => o.status === 'cooking');

    if (cookingOrders.length === 0) {
        summaryGrid.innerHTML = '<div class="summary-empty">No active orders</div>';
        return;
    }

    // Aggregate items
    const itemCounts = {};
    cookingOrders.forEach(order => {
        order.items.forEach(item => {
            if (itemCounts[item.name]) {
                itemCounts[item.name] += item.quantity;
            } else {
                itemCounts[item.name] = item.quantity;
            }
        });
    });

    // Render aggregated items
    Object.entries(itemCounts).forEach(([name, count]) => {
        const summaryItem = document.createElement('div');
        summaryItem.className = 'summary-item';
        summaryItem.innerHTML = `
            <span class="summary-qty">${count}</span>
            <span class="summary-name">${name}</span>
        `;
        summaryGrid.appendChild(summaryItem);
    });
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
        renderSummary(); // Update summary
    }
};

init();
