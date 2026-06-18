import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCCDh1wz5flDy6yZlbRCP3kuZ6j5vDUy8I",
  authDomain: "gen-lang-client-0267304983.firebaseapp.com",
  projectId: "gen-lang-client-0267304983",
  storageBucket: "gen-lang-client-0267304983.firebasestorage.app",
  messagingSenderId: "115453491491",
  appId: "1:115453491491:web:5563ff6a549d6856f9f496"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specified custom database ID
export const db = getFirestore(app, "ai-studio-df534f20-33f5-42c8-97ea-615ab4a6c93c");
