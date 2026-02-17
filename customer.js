// DOM Elements
const ordersGrid = document.getElementById('customer-orders-grid');

// State
let orders = [];

// Init
function init() {
    loadOrders();
    renderOrders();

    // Listen for changes from POS tab
    window.addEventListener('storage', (e) => {
        if (e.key === 'oderwall_orders') {
            loadOrders();
            renderOrders();
        }
    });
}

function loadOrders() {
    const storedOrders = localStorage.getItem('oderwall_orders');
    if (storedOrders) {
        orders = JSON.parse(storedOrders);
    } else {
        orders = [];
    }
}

function renderOrders() {
    ordersGrid.innerHTML = '';

    // Show only pending orders, mapped to max 3
    const pendingOrders = orders.filter(o => o.status === 'pending').slice(-3); // Get last 3

    if (pendingOrders.length === 0) {
        ordersGrid.innerHTML = `
            <div class="no-orders-msg">
                <i class="fa-solid fa-mug-hot"></i>
                <p>Waiting for new orders...</p>
            </div>
        `;
        return;
    }

    pendingOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'customer-order-card';
        // Generate a random simple QR placeholder text or logic if needed, 
        // using FontAwesome qr icon for now as placeholder for the image to come later.

        const itemsList = order.items.map(i => `${i.quantity}x ${i.name}`).join('<br>');

        orderCard.innerHTML = `
            <div class="order-header-centered">
                <h3>Order #${order.id.toString().slice(-4)}</h3>
            </div>
            <div class="order-items-centered">
                ${itemsList}
            </div>
            <div class="qr-code-section">
                <!-- Unique ID for QR container -->
                <div id="qrcode-${order.id}" class="qr-placeholder"></div>
                <p>Scan to Pay</p>
            </div>
            <div class="order-total-centered">
                ₹${order.total}
            </div>
        `;
        ordersGrid.appendChild(orderCard);

        // Generate QR Code
        // UPI URL Format
        // upi://pay?pa=ashfaq072025@okicici&pn=Ashfaq&am=AMT&cu=INR&aid=uGICAgKDXxvXyWA
        const upiUrl = `upi://pay?pa=ashfaq072025@okicici&pn=Ashfaq&am=${order.total}&cu=INR&aid=uGICAgKDXxvXyWA`;

        // Render QR
        const qrContainer = document.getElementById(`qrcode-${order.id}`);
        if (qrContainer) {
            new QRCode(qrContainer, {
                text: upiUrl,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    });
}

init();
