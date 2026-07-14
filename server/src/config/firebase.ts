import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp: admin.app.App | null = null;
let firebaseAuth: admin.auth.Auth | null = null;

const useFirebase = process.env.USE_FIREBASE === 'true';

if (useFirebase) {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      firebaseAuth = admin.auth();
      console.log('Firebase Admin initialized successfully using Application Default Credentials.');
    } else {
      console.warn('Firebase Admin requested but GOOGLE_APPLICATION_CREDENTIALS not specified. Falling back to local mode.');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

export { firebaseApp, firebaseAuth, useFirebase };
