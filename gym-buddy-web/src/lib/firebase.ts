// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
