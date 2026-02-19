const socket = io();

// DOM Elements
const ordersGrid = document.getElementById('kitchen-orders-grid');
const summaryGrid = document.getElementById('kitchen-summary-grid');
const clockElement = document.getElementById('clock');

// State
let orders = [];

// Init
function init() {
    startClock();

    // Socket.io Listener
    socket.on('update-orders', (data) => {
        orders = data;
        renderOrders();
        renderSummary();
    });
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString();
    }, 1000);
}

// loadOrders and saveOrders removed - handled by socket


function renderSummary() {
    if (!summaryGrid) return;
    summaryGrid.innerHTML = '';

    // Filter only cooking orders
    const cookingOrders = orders.filter(o => o.status === 'cooking');

    if (cookingOrders.length === 0) {
        summaryGrid.innerHTML = '<div class="summary-empty">No active orders</div>';
        return;
    }

    // Aggregate items (Only pending/cooking items)
    const itemCounts = {};
    cookingOrders.forEach(order => {
        order.items.forEach(item => {
            if (item.status !== 'ready') {
                if (itemCounts[item.name]) {
                    itemCounts[item.name] += item.quantity;
                } else {
                    itemCounts[item.name] = item.quantity;
                }
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

        const itemsList = order.items.map((item, index) => {
            const isReady = item.status === 'ready';
            const statusClass = isReady ? 'item-ready' : '';

            // Swipe Structure
            // .swipe-wrapper
            //   .swipe-bg (Green Check + Text)
            //   .swipe-content (The item details)

            return `
            <div class="kitchen-item-wrapper ${statusClass}" id="item-${order.id}-${index}">
                <div class="swipe-bg">
                    <i class="fa-solid fa-check"></i> Dispatched
                </div>
                <div class="swipe-content" ontouchstart="handleTouchStart(event, ${order.id}, ${index})" 
                     ontouchmove="handleTouchMove(event)" 
                     ontouchend="handleTouchEnd(event, ${order.id}, ${index})"
                     onmousedown="handleMouseDown(event, ${order.id}, ${index})">
                    <span class="qty">${item.quantity}x</span>
                    <span class="name">${item.name}</span>
                    ${isReady ? '<i class="fa-solid fa-check" style="color:#10b981; margin-left:auto;"></i>' : '<i class="fa-solid fa-angles-right" style="color:#ccc; margin-left:auto; opacity:0.5; font-size:0.8em"></i>'}
                </div>
            </div>
        `}).join('');

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
                    <i class="fa-solid fa-check-double"></i> Dispatch All
                </button>
            </div>
        `;
        ordersGrid.appendChild(orderCard);
    });
}

function getTimeElapsed(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diffMins = Math.floor((now - start) / 60000);
    return `${diffMins}m ago`;
}

// Swipe Logic State
let startX = 0;
let currentX = 0;
let activeElement = null;
let isDragging = false;

window.handleTouchStart = function (e, orderId, itemIndex) {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.items[itemIndex].status === 'ready') return;

    activeElement = e.currentTarget;
    startX = e.touches[0].clientX;
    isDragging = true;
    activeElement.style.transition = 'none';
};

window.handleTouchMove = function (e) {
    if (!isDragging || !activeElement) return;
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;

    // Only allow sliding right
    if (diff > 0) {
        // Limit slide
        const translateX = Math.min(diff, 200);
        activeElement.style.transform = `translateX(${translateX}px)`;
    }
};

window.handleTouchEnd = function (e, orderId, itemIndex) {
    if (!isDragging || !activeElement) return;
    isDragging = false;
    activeElement.style.transition = 'transform 0.3s ease-out';

    const diff = currentX - startX;
    const threshold = 100; // px to confirm

    if (diff > threshold) {
        // Trigger Action
        activeElement.style.transform = `translateX(100%)`; // Slide out completely or stay?
        // Let's reset visually after a moment or mark as done immediately triggers re-render
        markItemReady(orderId, itemIndex);
    } else {
        // Reset
        activeElement.style.transform = `translateX(0)`;
    }

    startX = 0;
    currentX = 0;
    activeElement = null;
};

// Mouse Support for Desktop Testing
window.handleMouseDown = function (e, orderId, itemIndex) {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.items[itemIndex].status === 'ready') return;

    activeElement = e.currentTarget;
    startX = e.clientX;
    isDragging = true;
    activeElement.style.transition = 'none';

    // Attach global move/up listeners
    const onMouseMove = (ev) => {
        if (!isDragging) return;
        currentX = ev.clientX;
        const diff = currentX - startX;
        if (diff > 0) {
            const translateX = Math.min(diff, 200);
            activeElement.style.transform = `translateX(${translateX}px)`;
        }
    };

    const onMouseUp = (ev) => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        activeElement.style.transition = 'transform 0.3s ease-out';
        const diff = currentX - startX;
        if (diff > 100) {
            markItemReady(orderId, itemIndex);
        } else {
            activeElement.style.transform = `translateX(0)`;
        }
        activeElement = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
};


window.markItemReady = function (orderId, itemIndex) {
    // Check if other items ready?
    // We need current state.
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.items[itemIndex].status = 'ready';
        // Optimistic check: if all *other* items are ready (or this is the last one)
        const allOthersReady = order.items.every((item, idx) => idx === itemIndex || item.status === 'ready');
        if (allOthersReady) {
            order.status = 'ready';
        }

        socket.emit('update-order', order);
    }
};

window.markOrderReady = function (id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    order.status = 'ready';
    if (order.items) {
        order.items.forEach(item => item.status = 'ready');
    }

    socket.emit('update-order', order);
};

init();
