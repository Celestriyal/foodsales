// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAHbAp5Otv-Lsd9usDf5d4_2lj5vfaCqsg",
    authDomain: "foodsales-7b546.firebaseapp.com",
    databaseURL: "https://foodsales-7b546-default-rtdb.firebaseio.com",
    projectId: "foodsales-7b546",
    storageBucket: "foodsales-7b546.firebasestorage.app",
    messagingSenderId: "244545553361",
    appId: "1:244545553361:web:09fb4e1e23cdca5d9c16f0",
    measurementId: "G-X7DXP0DSYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const firestore = getFirestore(app);

export { db, firestore, ref, set, push, onValue, update, remove, collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit };
