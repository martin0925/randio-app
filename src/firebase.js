import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'


const firebaseConfig = {
  apiKey: "AIzaSyB6VxL7p01MaUEF2wyd1PW_NKoMhN896k4",
  authDomain: "randio-app.firebaseapp.com",
  projectId: "randio-app",
  storageBucket: "randio-app.firebasestorage.app",
  messagingSenderId: "734128383908",
  appId: "1:734128383908:web:6daf4ba42fd1a33ee58331"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
