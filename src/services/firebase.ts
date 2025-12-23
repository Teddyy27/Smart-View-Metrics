import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Commented out for localhost
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCpZtD6LvgMB6IUc-qU_EDJGbVVmkDjn1c",
  authDomain: "smart-home-5bf1a.firebaseapp.com",
  databaseURL: "https://smart-home-5bf1a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-home-5bf1a",
  storageBucket: "smart-home-5bf1a.firebasestorage.app",
  messagingSenderId: "674955453955",
  appId: "1:674955453955:web:dd7c548f653807e9b99036",
  measurementId: "G-9HZV46DCVF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const auth = getAuth(app);
export const db = getDatabase(app);

export { auth };