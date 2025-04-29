import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRPcDhFIKBTMDzidFcbaK5NSAUhtnbwJo",
  authDomain: "smart-home-automation-bd6ac.firebaseapp.com",
  projectId: "smart-home-automation-bd6ac",
  storageBucket: "smart-home-automation-bd6ac.firebasestorage.app",
  messagingSenderId: "100930225373",
  appId: "1:100930225373:web:a3bec3e55d1095ef4f0734",
  measurementId: "G-7SRRG0PWMC",
  databaseURL: "https://smart-home-automation-bd6ac-default-rtdb.asia-southeast1.firebasedatabase.app/:null",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { auth };