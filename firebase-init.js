import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAIkgVQ2vwi5NZZcH2jmexNkXTsOJg3SXU",
  authDomain: "sora-1102.firebaseapp.com",
  projectId: "sora-1102",
  storageBucket: "sora-1102.firebasestorage.app",
  messagingSenderId: "310837588219",
  appId: "1:310837588219:web:5c135df72b3c76269f405e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
