import { db, ref, onValue } from './firebase-config.js';

// DOM Elements
const ordersGrid = document.getElementById('customer-orders-grid');

// State
let orders = [];

// Init
function init() {
    // Firebase Listener
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        orders = data ? Object.values(data) : [];
        renderOrders();
    });
}
// loadOrders removed

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

        const itemsList = order.items.map(i => `${i.quantity}x ${i.name}`).join('<br>');

        // Check Payment Method
        let qrSectionContent = '';
        if (order.paymentMethod === 'cash') {
            qrSectionContent = `
                <div class="qr-placeholder" style="font-size: 8rem; color: var(--secondary-color);">
                    <i class="fa-solid fa-cash-register"></i>
                </div>
                <p style="font-size: 1.5rem; font-weight: bold; margin-top: 1rem;">Please Pay at Counter</p>
            `;
        } else {
            // Default to GPay
            qrSectionContent = `
                <div id="qrcode-${order.id}" class="qr-placeholder"></div>
                <p>Scan to Pay</p>
            `;
        }

        orderCard.innerHTML = `
            <div class="order-header-centered">
                <h3>Order #${order.id.toString().slice(-4)}</h3>
            </div>
            <div class="order-items-centered">
                ${itemsList}
            </div>
            <div class="qr-code-section">
                ${qrSectionContent}
            </div>
            <div class="order-total-centered">
                ₹${order.total}
            </div>
        `;
        ordersGrid.appendChild(orderCard);

        // Generate QR Code only if GPay/Default
        if (order.paymentMethod !== 'cash') {
            // Get Configured UPI ID or Default
            const storedUpiId = localStorage.getItem('oderwall_upi_id');
            const upiId = storedUpiId && storedUpiId.trim() !== '' ? storedUpiId : 'ashfaq072025@okicici';

            const upiUrl = `upi://pay?pa=${upiId}&pn=Oderwall&am=${order.total}&cu=INR`;
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
        }
    });
}

init();
