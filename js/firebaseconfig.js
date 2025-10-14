// js/firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCZGNLHHjrquRD2If5HpKJR-MGbABSqzRo",
  authDomain: "kas-kelas-6ce90.firebaseapp.com",
  projectId: "kas-kelas-6ce90",
  storageBucket: "kas-kelas-6ce90.firebasestorage.app",
  messagingSenderId: "438772527157",
  appId: "1:438772527157:web:b4a854ef7edcbc6028c17c",
  measurementId: "G-3VENL0SGEQ"
};

// Inisialisasi Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("Firebase initialized ✅", app);
console.log("Auth & Firestore linked:", auth, db);

