const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DATA_FILE = path.join(__dirname, 'orders.json');

app.use(express.static('.'));
app.use(express.json());

// Load orders
let orders = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        orders = JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (e) {
        console.error("Error loading orders:", e);
    }
}

io.on('connection', (socket) => {
    console.log('a user connected');

    // Send initial data
    socket.emit('update-orders', orders);

    socket.on('new-order', (order) => {
        orders.push(order);
        saveOrders();
        io.emit('update-orders', orders);
    });

    socket.on('update-order', (updatedOrder) => {
        // Full update of a single order
        // In firebase we did partial updates, but here likely we send the whole object?
        // Or we send partial? 
        // Let's assume the client sends the *whole* order object for simplicity 
        // OR a patch object.
        // For simplicity, let's look at how the client will use it.
        // Client: socket.emit('update-order', order)

        const index = orders.findIndex(o => o.id === updatedOrder.id);
        if (index !== -1) {
            // Merge or replace? 
            // If updatedOrder has all fields, replace.
            // If it has only some, merge.
            orders[index] = { ...orders[index], ...updatedOrder };
            saveOrders();
            io.emit('update-orders', orders);
        }
    });

    socket.on('delete-order', (id) => {
        orders = orders.filter(o => o.id !== id);
        saveOrders();
        io.emit('update-orders', orders);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

function saveOrders() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
}

server.listen(PORT, () => {
    console.log(`Offline Server running on http://localhost:${PORT}`);
});
