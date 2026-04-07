// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, GithubAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBtOBq3HC-4AiDqPdCFprfxx1IzXgSVDQo",
  authDomain: "photogrammetry-app.firebaseapp.com",
  projectId: "photogrammetry-app",
  storageBucket: "photogrammetry-app.firebasestorage.app",
  messagingSenderId: "659923999952",
  appId: "1:659923999952:web:f6bd25de23ef69132512d5",
  measurementId: "G-BM6C9YZVZG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);  
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');