
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";



import {
  getFirestore,
  collection,
   addDoc,
   onSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  updateDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";



const firebaseConfig = {
  apiKey: "AIzaSyApBhc1ZspmKNnfAep0JvBN6JXhZRU1KxM",
  authDomain: "lesegoelectricalapp.firebaseapp.com",
  projectId: "lesegoelectricalapp",
  storageBucket: "lesegoelectricalapp.firebasestorage.app",
  messagingSenderId: "37217848854",
  appId: "1:37217848854:web:3e102ea06bc055d31cef37"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("Lesego Firebase initialized");


export {

  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  updateDoc,
  addDoc,
  onSnapshot,
setDoc
};

