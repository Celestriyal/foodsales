const socket = io();

const MENU_VERSION = '1.1'; // Increment this to force menu update for users

const defaultMenu = [
    { id: 1, name: 'Veg Atho', price: 110, category: 'Main' },
    { id: 2, name: 'Egg Atho', price: 130, category: 'Main' },
    { id: 3, name: 'Chicken Atho', price: 150, category: 'Main' },
    { id: 4, name: 'Veg Banga', price: 100, category: 'Main' },
    { id: 5, name: 'Egg Banga', price: 110, category: 'Main' },
    { id: 6, name: 'Chicken Banga', price: 130, category: 'Main' },
    { id: 7, name: 'Paneer Momos', price: 100, category: 'Starter' },
    { id: 8, name: 'Chicken Momos', price: 120, category: 'Starter' },
    { id: 9, name: 'Banana stem soup', price: 60, category: 'Soup' },
    { id: 10, name: 'Water Bottle', price: 20, category: 'Extras' }
];

// State
let menu = [];
let cart = [];
let orders = [];
let dbFileHandle = null;

// DOM Elements
const menuGrid = document.getElementById('menu-grid');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const cartCountElement = document.getElementById('cart-count');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsList = document.getElementById('settings-list');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const connectDbBtn = document.getElementById('connect-db-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const checkoutBtn = document.getElementById('checkout-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');
const pendingOrdersList = document.getElementById('pending-orders-list');
const pendingCount = document.getElementById('pending-count');
const ongoingOrdersList = document.getElementById('ongoing-orders-list');
const ongoingCount = document.getElementById('ongoing-count');
const searchInput = document.getElementById('order-search');

// Payment Modals DOM
const paymentModal = document.getElementById('payment-modal');
const closePaymentBtn = document.getElementById('close-payment-btn');
const changeModal = document.getElementById('change-modal');
const closeChangeBtn = document.getElementById('close-change-btn');
const calcTotal = document.getElementById('calc-total');
const calcGiven = document.getElementById('calc-given');
const calcChange = document.getElementById('calc-change');
const confirmCashBtn = document.getElementById('confirm-cash-btn');
const giveLaterCheck = document.getElementById('give-later-check');
const giveLaterInputContainer = document.getElementById('give-later-input-container');
const giveLaterAmount = document.getElementById('give-later-amount');

// Pending Changes DOM
const pendingChangeBtn = document.getElementById('pending-change-btn');
const pendingChangeBadge = document.getElementById('pending-change-badge');
const pendingChangeModal = document.getElementById('pending-change-modal');
const closePendingChangeBtn = document.getElementById('close-pending-change-btn');
const pendingChangeList = document.getElementById('pending-change-list');

// History DOM
const historyBtn = document.getElementById('history-btn');
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyList = document.getElementById('history-list');

let currentOrderIdForPayment = null;

// Socket listener registered immediately (before init) to avoid race condition on page load
// The server emits 'update-orders' on connect — if the listener was inside init() it could miss it
socket.on('update-orders', (data) => {
    orders = data;
    renderPendingOrders();
    renderOngoingOrders();
    renderPendingChangeList();
});

// Initialization
function init() {
    loadMenu();
    renderMenu();
    updateCartUI();
    setupEventListeners();

    // Explicitly request current orders from server after everything is set up
    // This guarantees we get data even if socket connected before listener was ready
    socket.emit('get-orders');
}

// Load Menu from LocalStorage or use Default
function loadMenu() {
    const storedVersion = localStorage.getItem('oderwall_menu_version');
    const storedMenu = localStorage.getItem('oderwall_menu');

    // Force update if version mismatch
    if (storedVersion !== MENU_VERSION) {
        console.log(`Menu version mismatch. Updating from ${storedVersion} to ${MENU_VERSION}`);
        menu = JSON.parse(JSON.stringify(defaultMenu)); // Deep copy
        saveMenu();
        localStorage.setItem('oderwall_menu_version', MENU_VERSION);
    } else if (storedMenu) {
        menu = JSON.parse(storedMenu);
    } else {
        menu = JSON.parse(JSON.stringify(defaultMenu)); // Deep copy
        saveMenu();
        localStorage.setItem('oderwall_menu_version', MENU_VERSION);
    }
}

// Replaces loadOrders (unused now)
function loadOrders() {
    // Legacy support or placeholder
}

// Modified saveOrders to sync with Server
function saveOrders() {
    // This is a fallback, but ideally we emit specific events.
    // If used, be careful.
}

function saveMenu() {
    localStorage.setItem('oderwall_menu', JSON.stringify(menu));
}

// Render Menu Grid
function renderMenu() {
    menuGrid.innerHTML = '';
    menu.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'menu-item';
        itemElement.onclick = () => addToCart(item.id); // Make whole card clickable
        itemElement.innerHTML = `
            <div class="menu-img-placeholder">
                <i class="fa-solid fa-bowl-food"></i>
            </div>
            <div class="menu-details">
                <h3>${item.name}</h3>
                <div class="price">₹${item.price}</div>
            </div>
            <div class="add-overlay">
                <i class="fa-solid fa-plus"></i>
            </div>
        `;
        menuGrid.appendChild(itemElement);
    });
}

// Cart Logic
window.addToCart = function (id) {
    const item = menu.find(i => i.id === id);
    const existingCartItem = cart.find(i => i.id === id);

    if (existingCartItem) {
        existingCartItem.quantity++;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    updateCartUI();
};

window.removeFromCart = function (id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
};

window.updateQuantity = function (id, change) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            updateCartUI();
        }
    }
};

function clearCart() {
    if (cart.length > 0) {
        if (confirm('Are you sure you want to clear the entire order?')) {
            cart = [];
            updateCartUI();
        }
    }
}

function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart-msg">
                <i class="fa-solid fa-basket-shopping"></i>
                <p>Your cart is empty</p>
            </div>
        `;
    } else {
        cart.forEach(item => {
            total += item.price * item.quantity;
            count += item.quantity;

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <span class="cart-item-title">${item.name}</span>
                    <span class="cart-item-price">₹${item.price} x ${item.quantity}</span>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span class="cart-item-qty">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);
        });
    }

    cartTotalElement.textContent = `₹${total.toFixed(2)}`;
    cartCountElement.textContent = count;
}

// Settings Logic
function openSettings() {
    renderSettingsList();
    settingsModal.classList.remove('hidden');
}

function closeSettings() {
    settingsModal.classList.add('hidden');
}

function renderSettingsList() {
    settingsList.innerHTML = '';

    // UPI ID Setting
    const upiRow = document.createElement('div');
    upiRow.className = 'setting-item';

    // Default UPI Logic
    let currentUpi = localStorage.getItem('oderwall_upi_id');
    if (!currentUpi) {
        currentUpi = 'gpay-12196007337@okbizaxis';
        localStorage.setItem('oderwall_upi_id', currentUpi);
    }

    upiRow.innerHTML = `
        <label>UPI ID (for QR)</label>
        <input type="text" id="setting-upi-id" value="${currentUpi}" placeholder="gpay-12196007337@okbizaxis" style="width: 250px; text-align: left;">
    `;
    settingsList.appendChild(upiRow);

    // Menu Items Header
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.padding = '0.5rem 0';
    headerRow.style.fontWeight = 'bold';
    headerRow.style.borderBottom = '1px solid #eee';
    headerRow.style.marginBottom = '0.5rem';
    headerRow.innerHTML = `
        <span style="flex:2">Item Name</span>
        <span style="flex:1; text-align:right; margin-right: 40px;">Price</span>
    `;
    settingsList.appendChild(headerRow);

    // Menu Prices & Management
    menu.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'setting-item';
        row.innerHTML = `
            <input type="text" id="name-${index}" value="${item.name}" style="flex:2; text-align:left; margin-right:0.5rem;">
            <div class="setting-row-inputs">
                <input type="number" id="price-${index}" value="${item.price}" min="0" style="width:80px">
                <button class="delete-btn" onclick="removeMenuItem(${index})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        settingsList.appendChild(row);
    });

    // Add Item Button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-item-btn';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add New Item';
    addBtn.onclick = addMenuItem;
    settingsList.appendChild(addBtn);
}

window.addMenuItem = function () {
    captureCurrentSettings(); // Save current inputs to state first
    const newItem = {
        id: Date.now(),
        name: 'New Item',
        price: 0,
        category: 'Main' // Default category
    };
    menu.push(newItem);
    renderSettingsList(); // Re-render with new item

    // Scroll to bottom
    setTimeout(() => {
        const inputs = settingsList.querySelectorAll('input[type="text"]');
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 100);
};

window.removeMenuItem = function (index) {
    if (confirm('Are you sure you want to delete this item?')) {
        captureCurrentSettings(); // Save current inputs to state first
        menu.splice(index, 1);
        renderSettingsList();
    }
};

function captureCurrentSettings() {
    // Helper to sync inputs to state before re-rendering
    menu.forEach((item, index) => {
        const nameInput = document.getElementById(`name-${index}`);
        const priceInput = document.getElementById(`price-${index}`);
        if (nameInput) item.name = nameInput.value;
        if (priceInput) item.price = parseFloat(priceInput.value) || 0;
    });
}

function saveSettings() {
    // Save UPI ID
    const upiInput = document.getElementById('setting-upi-id');
    if (upiInput) {
        localStorage.setItem('oderwall_upi_id', upiInput.value.trim());
    }

    // Capture final state from inputs
    captureCurrentSettings();

    // Remove empty items? Optional. For now, we trust the delete button.

    saveMenu();
    renderMenu(); // Re-render menu grid
    updateCartPrices();
    closeSettings();
}

function updateCartPrices() {
    cart.forEach(cartItem => {
        const menuItem = menu.find(m => m.id === cartItem.id);
        if (menuItem) {
            cartItem.price = menuItem.price;
            cartItem.name = menuItem.name; // Update name too if changed
        }
    });
    updateCartUI();
}

// Event Listeners
function setupEventListeners() {
    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
    if (connectDbBtn) connectDbBtn.addEventListener('click', connectToDatabase);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportToCSV);
    clearCartBtn.addEventListener('click', clearCart);

    // Close modal when clicking outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettings();
        }
    });

    checkoutBtn.addEventListener('click', placeOrder);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            renderPendingOrders(term);
            renderOngoingOrders(term);
        });
    }

    // Payment Modal Listeners
    closePaymentBtn.addEventListener('click', () => paymentModal.classList.add('hidden'));
    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) paymentModal.classList.add('hidden');
    });

    // Pending Change Modal Listeners
    pendingChangeBtn.addEventListener('click', () => {
        renderPendingChangeList();
        pendingChangeModal.classList.remove('hidden');
    });
    closePendingChangeBtn.addEventListener('click', () => pendingChangeModal.classList.add('hidden'));
    pendingChangeModal.addEventListener('click', (e) => {
        if (e.target === pendingChangeModal) pendingChangeModal.classList.add('hidden');
    });

    // Change Modal Listeners
    closeChangeBtn.addEventListener('click', () => {
        changeModal.classList.add('hidden');
        giveLaterCheck.checked = false; // Reset
        giveLaterInputContainer.style.display = 'none';
    });
    changeModal.addEventListener('click', (e) => {
        if (e.target === changeModal) changeModal.classList.add('hidden');
    });

    confirmCashBtn.addEventListener('click', () => {
        if (currentOrderIdForPayment) {
            // Check for Pending Change
            if (giveLaterCheck.checked) {
                const pendingAmt = parseFloat(giveLaterAmount.value);
                if (isNaN(pendingAmt) || pendingAmt <= 0) {
                    alert('Please enter a valid pending change amount or uncheck "Give Change Later".');
                    return;
                }

                // Find order and update BEFORE sending to kitchen?
                // Actually sendToKitchen toggles status. We need to attach data to order first.
                // But orders are in 'orders' array. currentOrderIdForPayment matches.
                const orderIdx = orders.findIndex(o => o.id === currentOrderIdForPayment);
                if (orderIdx > -1) {
                    orders[orderIdx].pendingChange = true;
                    orders[orderIdx].pendingChangeAmount = pendingAmt;
                    socket.emit('update-order', orders[orderIdx]);
                }
            }

            sendToKitchen(currentOrderIdForPayment); // For cash, this finalizes payment

            // Reset Modal state
            changeModal.classList.add('hidden');
            giveLaterCheck.checked = false;
            giveLaterInputContainer.style.display = 'none';
            giveLaterAmount.value = '';

            currentOrderIdForPayment = null;
            currentOrderIdForPayment = null;
            renderPendingChangeList(); // Update list
        }
    });

    // History Modal Listeners
    if (historyBtn) {
        historyBtn.addEventListener('click', openHistory);
    }
    closeHistoryBtn.addEventListener('click', () => historyModal.classList.add('hidden'));
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) historyModal.classList.add('hidden');
    });
}

function placeOrder() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    // Open Payment Method Modal
    paymentModal.classList.remove('hidden');
}

window.confirmPaymentMethod = function (method) {
    const total = cartTotalElement.textContent.replace('₹', '');
    const newOrder = {
        id: Date.now(),
        items: cart.map(item => ({ ...item, status: 'pending' })),
        total: total,
        status: 'pending',
        paymentMethod: method, // 'cash' or 'gpay'
        timestamp: new Date().toISOString()
    };

    // Add to local orders array immediately
    orders.push(newOrder);

    // Re-render the pending list RIGHT NOW — don't wait for socket roundtrip
    renderPendingOrders();

    // Also sync to server for other devices (kitchen/customer screens)
    socket.emit('new-order', newOrder);

    cart = [];
    updateCartUI();
    paymentModal.classList.add('hidden');

    if (method === 'cash') {
        // Open Change Modal immediately for this new order
        openChangeCalculator(newOrder.id, newOrder.total);
    }
};

// ... (renderPendingOrders, renderOngoingOrders remain mostly same)

window.sendToKitchen = function (id) {
    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex > -1) {
        orders[orderIndex].status = 'cooking';
        orders[orderIndex].items.forEach(item => item.status = 'cooking');

        // Render immediately — don't wait for socket roundtrip
        renderPendingOrders();
        renderOngoingOrders();
        renderPendingChangeList(); // update pending-change badge if applicable

        // Sync to server for kitchen/customer screens
        socket.emit('update-order', orders[orderIndex]);
    }
};

window.completeOrder = function (id) {
    const order = orders.find(o => o.id === id);
    if (order) {
        if (confirm('Mark order as completed?')) {
            socket.emit('complete-order', id); // server archives to history.json
        }
    }
};

// History Functions
function openHistory() {
    historyModal.classList.remove('hidden');
    historyList.innerHTML = '<div class="empty-msg"><p>Loading...</p></div>';
    socket.emit('get-history');
}

socket.on('history-data', (data) => {
    if (!historyList) return;
    historyList.innerHTML = '';

    if (!data || data.length === 0) {
        historyList.innerHTML = '<div class="empty-msg"><p>No completed orders yet.</p></div>';
        return;
    }

    // Show newest first
    [...data].reverse().forEach(order => {
        const date = order.completedAt
            ? new Date(order.completedAt).toLocaleString()
            : 'Unknown time';
        const itemsSummary = order.items
            ? order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
            : '-';
        const row = document.createElement('div');
        row.className = 'order-list-item';
        row.innerHTML = `
            <div class="order-list-info">
                <div style="font-weight:700">Order #${order.id.toString().slice(-4)}
                    <span style="font-size:0.8em; font-weight:normal; color:#666">
                        (${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'GPAY'})
                    </span>
                </div>
                <div style="font-size:0.85rem; color:#666">${itemsSummary}</div>
                <div style="font-weight:600; color:var(--secondary-color)">₹${order.total}</div>
                <div style="font-size:0.75rem; color:#999; margin-top:2px">${date}</div>
            </div>
        `;
        historyList.appendChild(row);
    });
});


// Change Calculator Functions
window.openChangeCalculator = function (id, total) {
    currentOrderIdForPayment = id;
    calcTotal.textContent = `₹${total}`;
    calcGiven.value = '';
    calcChange.textContent = '₹0';
    calcChange.classList.remove('highlight');
    changeModal.classList.remove('hidden');
    setTimeout(() => calcGiven.focus(), 100);
};

window.calculateChange = function () {
    const total = parseFloat(calcTotal.textContent.replace('₹', ''));
    const given = parseFloat(calcGiven.value);
    const isGiveLater = giveLaterCheck.checked;

    if (!isNaN(given)) {
        const change = given - total;
        calcChange.textContent = `₹${change.toFixed(2)}`;

        // Logic: 
        // 1. Normal: Change >= 0 -> enable
        // 2. Give Later: Change can be anything (usually negative/partial), 
        //    but we check if a valid pending amount is entered if needed?
        //    Actually, "Give Change Later" usually means "I have change to return but can't give now"
        //    OR "Customer didn't give enough, pay later?" -> User said "give change later" implies creating a pending change record.

        // Use case: Bill 110. Customer gives 500. Change 390. Shop has no change.
        // Shop checks "Give Change Later". Enters 390 (or less?). 
        // Let's assume the entered "Pending Amount" is what is documented as owed.

        if (change >= 0) {
            calcChange.classList.add('highlight');
            confirmCashBtn.disabled = false;
            confirmCashBtn.style.opacity = '1';
        } else {
            calcChange.classList.remove('highlight');
            confirmCashBtn.disabled = true;
            confirmCashBtn.style.opacity = '0.5';
        }

        if (isGiveLater) {
            // If giving change later, we allow proceeding even if we haven't given change physically.
            // But we usually still need 'given' amount to be >= total to mark as "Paid" (with change pending).
            // Wait, user said "give change later". So technically the order is PAID, but *we* owe *them*.
            // So 'given' must be >= 'total'.

            if (change >= 0) {
                confirmCashBtn.disabled = false;
                confirmCashBtn.style.opacity = '1';
                // Auto-fill pending amount if empty? 
                if (giveLaterAmount.value === '') {
                    giveLaterAmount.value = change;
                }
            }
        }

    } else {
        calcChange.textContent = '₹0';
        confirmCashBtn.disabled = true;
        confirmCashBtn.style.opacity = '0.5';
    }
};

window.toggleGiveLater = function () {
    if (giveLaterCheck.checked) {
        giveLaterInputContainer.style.display = 'block';
        // Trigger calc to auto-fill
        calculateChange();
    } else {
        giveLaterInputContainer.style.display = 'none';
        giveLaterAmount.value = '';
    }
};

// Pending Orders Logic (Created -> Paid)
function renderPendingOrders(searchTerm = '') {
    if (!pendingOrdersList) return;
    pendingOrdersList.innerHTML = '';
    const pending = orders.filter(o => o.status === 'pending');

    // Update count
    if (pendingCount) pendingCount.textContent = pending.length;

    const filtered = pending.filter(o =>
        o.id.toString().includes(searchTerm) ||
        o.items.some(i => i.name.toLowerCase().includes(searchTerm))
    );

    if (filtered.length === 0) {
        pendingOrdersList.innerHTML = `<div class="empty-msg"><p>No pending orders</p></div>`;
        return;
    }

    filtered.forEach(order => {
        const row = document.createElement('div');
        row.className = 'order-list-item';

        const itemsSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

        row.innerHTML = `
            <div class="order-list-info">
                <div style="font-weight:700">Order #${order.id.toString().slice(-4)} <span style="font-size:0.8em; font-weight:normal; color:#666">(${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'GPAY'})</span></div>
                <div style="font-size:0.9rem; color: #666;">${itemsSummary}</div>
                <div style="font-weight:600; color: var(--secondary-color);">Total: ₹${order.total}</div>
            </div>
        `;

        if (order.paymentMethod === 'cash') {
            row.innerHTML += `
                <button class="pay-btn" onclick="openChangeCalculator(${order.id}, ${order.total})">
                    Pay / Change <i class="fa-solid fa-calculator"></i>
                </button>
            `;
        } else {
            // Default GPay or undefined (assume GPay/standard)
            row.innerHTML += `
                <button class="mark-done-btn" onclick="sendToKitchen(${order.id})">Send to Kitchen <i class="fa-solid fa-fire-burner"></i></button>
            `;
        }
        pendingOrdersList.appendChild(row);
    });
}

// Ongoing Orders Logic (Cooking -> Ready -> Completed)
function renderOngoingOrders(searchTerm = '') {
    if (!ongoingOrdersList) return;
    ongoingOrdersList.innerHTML = '';
    const ongoing = orders.filter(o => o.status === 'cooking' || o.status === 'ready');

    // Sort: Ready first, then by ID (newest first? or oldest first?)
    // Kitchen FIFO: Oldest first for cooking.
    ongoing.sort((a, b) => {
        if (a.status === 'ready' && b.status !== 'ready') return -1;
        if (a.status !== 'ready' && b.status === 'ready') return 1;
        return a.id - b.id;
    });

    if (ongoingCount) ongoingCount.textContent = ongoing.length;

    const filtered = ongoing.filter(o =>
        o.id.toString().includes(searchTerm)
    );

    if (filtered.length === 0) {
        ongoingOrdersList.innerHTML = `<div class="empty-msg"><p>No kitchen orders</p></div>`;
        return;
    }

    filtered.forEach(order => {
        const row = document.createElement('div');
        row.className = 'order-list-item';
        // Add specific border or bg if Ready
        if (order.status === 'ready') {
            row.style.borderLeft = '5px solid #10b981';
            row.style.background = '#ecfdf5';
        }

        const itemsSummary = order.items.map(i => {
            // Check if item is ready
            const statusIcon = (i.status === 'ready') ? '<i class="fa-solid fa-check" style="color:#10b981"></i>' : '';
            const statusStyle = (i.status === 'ready') ? 'color:#059669; text-decoration:line-through; opacity:0.7' : '';
            return `<span style="${statusStyle}">${i.quantity}x ${i.name} ${statusIcon}</span>`;
        }).join('<br>');

        // Status Badge
        let statusBadge = `<span class="status-badge status-cooking">Cooking...</span>`;
        if (order.items.some(i => i.status === 'ready') && order.status !== 'ready') {
            statusBadge = `<span class="status-badge status-cooking" style="background:#fef3c7; color:#d97706">Partially Ready</span>`;
        }
        let actionBtn = '';

        if (order.status === 'ready') {
            statusBadge = `<span class="status-badge status-ready"><i class="fa-solid fa-check"></i> Ready!</span>`;
            actionBtn = `<button class="mark-done-btn" style="background:#10b981; margin-left:10px" onclick="completeOrder(${order.id})"><i class="fa-solid fa-check-double"></i></button>`;
        }

        row.innerHTML = `
            <div class="order-list-info" style="flex:1">
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <span style="font-weight:700">Order #${order.id.toString().slice(-4)}</span>
                    ${statusBadge}
                </div>
                <div style="font-size:0.9rem; color: #666; margin-top:0.5rem; line-height:1.4">${itemsSummary}</div>
            </div>
            ${actionBtn}
        `;
        ongoingOrdersList.appendChild(row);
    });
}

// Pending Change List Logic
function renderPendingChangeList() {
    if (!pendingChangeList) return;
    pendingChangeList.innerHTML = '';

    const pendingChangeOrders = orders.filter(o => o.pendingChange === true);

    // Update Badge
    if (pendingChangeBadge) {
        if (pendingChangeOrders.length > 0) {
            pendingChangeBadge.textContent = pendingChangeOrders.length;
            pendingChangeBadge.style.display = 'block';
        } else {
            pendingChangeBadge.style.display = 'none';
        }
    }

    if (pendingChangeOrders.length === 0) {
        pendingChangeList.innerHTML = `<div class="empty-msg"><p>No pending changes</p></div>`;
        return;
    }

    pendingChangeOrders.forEach(order => {
        const row = document.createElement('div');
        row.className = 'setting-item'; // Reuse existing style
        row.style.flexDirection = 'column';
        row.style.alignItems = 'flex-start';
        row.style.borderBottom = '1px solid #eee';
        row.style.padding = '1rem 0';

        const date = new Date(order.timestamp).toLocaleString();

        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:0.5rem;">
                <span style="font-weight:bold;">Order #${order.id.toString().slice(-4)}</span>
                <span style="color:#ef4444; font-weight:bold;">Pending: ₹${order.pendingChangeAmount}</span>
            </div>
            <div style="font-size:0.85rem; color:#666; margin-bottom:0.5rem;">
                ${date}
            </div>
            <button class="primary-btn" style="width:100%; padding:0.5rem;" onclick="clearPendingChange(${order.id})">
                <i class="fa-solid fa-check"></i> Mark as Returned
            </button>
        `;
        pendingChangeList.appendChild(row);
    });
}

window.clearPendingChange = function (id) {
    if (confirm('Are you sure you have returned the change to the customer?')) {
        const orderIdx = orders.findIndex(o => o.id === id);
        if (orderIdx > -1) {
            delete orders[orderIdx].pendingChange;
            delete orders[orderIdx].pendingChangeAmount;

            socket.emit('update-order', orders[orderIdx]);
            renderPendingChangeList();
        }
    }
};

// Export to CSV Function
function exportToCSV() {
    if (orders.length === 0) {
        alert("No orders to export.");
        return;
    }

    // Headers
    let csvContent = "Order No,Ordered Menu,Price,Payment Method,Paid?,Timestamp\n";

    orders.forEach(order => {
        // Format Items: "2x Burger | 1x Coke"
        const menuItems = order.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');

        // Determine Paid Status
        // Pending = No, anything else (sent to kitchen+) = Yes
        const isPaid = (order.status !== 'pending') ? "Yes" : "No";

        // Format Price (remove symbol if present, though stored as number/string usually)
        const price = order.total;

        // Date
        const date = new Date(order.timestamp).toLocaleString();

        // Escape commas in menu items if any (wrap in quotes)
        const escapedMenu = `"${menuItems}"`;

        const row = [
            order.id.toString().slice(-4), // Fix: Only last 4 digits
            escapedMenu,
            price,
            order.paymentMethod ? order.paymentMethod.toUpperCase() : 'GPAY',
            isPaid,
            `"${date}"`
        ].join(",");

        csvContent += row + "\n";
    });

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `oderwall_sales_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Auto-Save Functions
async function connectToDatabase() {
    console.log("Connect to Database clicked");

    if (!window.showSaveFilePicker) {
        alert("Your browser does not support the File System Access API.\nPlease use a Chromium-based browser (Chrome, Edge, Brave) on Desktop.");
        return;
    }

    try {
        const opts = {
            suggestedName: 'oderwall_sales.csv',
            types: [{
                description: 'CSV File',
                accept: { 'text/csv': ['.csv'] },
            }],
        };
        dbFileHandle = await window.showSaveFilePicker(opts);
        alert('Database Connected! Orders will be saved automatically.');
    } catch (err) {
        console.error(err);
        if (err.name !== 'AbortError') {
            alert('Failed to connect: ' + err.message);
        }
    }
}

async function saveOrderToCSV(order) {
    if (!dbFileHandle) return;

    try {
        // Create a writable stream to the file
        // We need to read current size to append
        const file = await dbFileHandle.getFile();
        const writable = await dbFileHandle.createWritable({ keepExistingData: true });

        // Move to end of file
        const size = file.size;

        let dataToWrite = "";

        // Add header if empty file
        if (size === 0) {
            dataToWrite += "Order No,Ordered Menu,Price,Payment Method,Paid?,Timestamp\n";
        }

        await writable.seek(size);

        // Format Items
        const menuItems = order.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
        const date = new Date().toLocaleString();

        const row = [
            order.id.toString().slice(-4), // Fix: Only last 4 digits
            `"${menuItems}"`, // Escape items
            order.total,
            order.paymentMethod ? order.paymentMethod.toUpperCase() : 'GPAY',
            "Yes", // Paid
            `"${date}"`
        ].join(",") + "\n";

        await writable.write(dataToWrite + row);
        await writable.close();

    } catch (err) {
        console.error('Error saving to CSV:', err);
        alert('Error saving to database file. Please reconnect mechanism.');
    }
}

// Start App
init();
