// ─── Firebase config ─────────────────────────────────────────────────────────
// Keep in sync with gymbuddy-mobile/src/lib/firebase.ts.
// firebaseConfig must be identical in both files so web and mobile share the
// same Firebase project, users, and auth tokens.
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAW9zdx8-K1pvRRy8SLVqy2vIWyY6Mm-x0",
  authDomain: "soultrust-gymbuddy.firebaseapp.com",
  projectId: "soultrust-gymbuddy",
  storageBucket: "soultrust-gymbuddy.firebasestorage.app",
  messagingSenderId: "1038994855355",
  appId: "1:1038994855355:web:211f1105f6f7449d16609e",
  measurementId: "G-QX7TRZEW4Y",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const auth = getAuth(app);
