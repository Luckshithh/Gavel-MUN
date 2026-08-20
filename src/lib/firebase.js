import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

// Initialize Firebase
let app;
let database;
let auth;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  auth = getAuth(app);
  
  // Authenticate anonymously so we can use secure database rules
  signInAnonymously(auth).catch((error) => {
    console.error("Firebase Anonymous Auth failed:", error);
  });
} catch (e) {
  console.error("Firebase initialization error (make sure your .env file is set up correctly):", e);
}

/**
 * Saves state to Firebase Realtime Database
 */
export const syncStateToDB = (committeeId, path, data) => {
  if (!database) {
    console.warn("Firebase not initialized. Cannot sync state.");
    return;
  }
  const stateRef = ref(database, `committees/${committeeId}/${path}`);
  
  if (data === null || data === undefined) {
    remove(stateRef).catch(e => {
      console.error("Error removing data:", e);
    });
  } else {
    set(stateRef, data).catch(e => {
      console.error("Error setting data:", e);
      if (e.message.includes('permission_denied')) {
        alert("Firebase Permission Denied! Ensure your Firebase Security Rules allow authenticated users to read/write.");
      }
    });
  }
};

/**
 * Listens to state changes from Firebase Realtime Database
 */
export const listenToDBState = (committeeId, path, callback) => {
  if (!database) {
    console.warn("Firebase not initialized. Cannot listen to state.");
    callback(null);
    return () => {};
  }
  
  const stateRef = ref(database, `committees/${committeeId}/${path}`);
  
  const unsubscribe = onValue(stateRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error listening to database:", error);
    if (error.message.includes('permission_denied')) {
        console.error("Firebase Permission Denied! Ensure your Firebase Security Rules allow authenticated users to read/write.");
    }
    callback(null);
  });
  
  // Return an unsubscribe function
  return () => unsubscribe();
};
