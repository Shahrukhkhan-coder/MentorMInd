import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Using initializeFirestore with forceLongPolling to improve connectivity in some environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

async function testConnection() {
  try {
    // Attempting a simple read to check connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('permission-denied') || error.message.includes('insufficient permissions'))) {
      // Permission denied is okay, it means we connected but rules blocked it
      console.log("Firebase connection verified (permission denied as expected).");
    } else if (error instanceof Error && error.message.includes('offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    } else {
      console.error("Firebase connection test error:", error);
    }
  }
}

testConnection();
