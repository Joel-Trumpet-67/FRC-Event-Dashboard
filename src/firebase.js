/**
 * Firebase Realtime Database integration.
 *
 * Config is injected at build time from environment variables (GitHub Secrets).
 * If env vars are not set, isFirebaseConfigured will be false and the app
 * runs in local-only mode (localStorage only) — no errors thrown.
 *
 * Required env vars (set as GitHub Secrets + Vite build env):
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_DATABASE_URL   (e.g. https://your-project-default-rtdb.firebaseio.com)
 *   VITE_FIREBASE_PROJECT_ID
 */

import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const apiKey       = import.meta.env.VITE_FIREBASE_API_KEY
const databaseURL  = import.meta.env.VITE_FIREBASE_DATABASE_URL
const projectId    = import.meta.env.VITE_FIREBASE_PROJECT_ID

// Only initialize if the required config values are present
export const isFirebaseConfigured = !!(apiKey && databaseURL && projectId)

export let db = null

if (isFirebaseConfigured) {
  const app = initializeApp({
    apiKey,
    databaseURL,
    projectId,
    authDomain: `${projectId}.firebaseapp.com`,
  })
  db = getDatabase(app)
}
