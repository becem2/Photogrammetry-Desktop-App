// Central Firebase bootstrap for auth and Firestore access.
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, GithubAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Hard-coded config currently used by the app's Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyBtOBq3HC-4AiDqPdCFprfxx1IzXgSVDQo",
  authDomain: "photogrammetry-app.firebaseapp.com",
  projectId: "photogrammetry-app",
  storageBucket: "photogrammetry-app.firebasestorage.app",
  messagingSenderId: "659923999952",
  appId: "1:659923999952:web:f6bd25de23ef69132512d5",
  measurementId: "G-BM6C9YZVZG"
};

// Create the shared app, auth, database, and provider instances.
const app = initializeApp(firebaseConfig);  
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');