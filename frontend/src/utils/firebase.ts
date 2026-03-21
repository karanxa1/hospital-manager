import { initializeApp } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
} from "firebase/auth"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  const idToken = await result.user.getIdToken()
  return { user: result.user, idToken }
}

export async function loginWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  const idToken = await result.user.getIdToken()
  return { user: result.user, idToken }
}

export async function signUpWithEmail(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  const idToken = await result.user.getIdToken()
  return { user: result.user, idToken }
}

export async function sendPhoneOtp(phoneNumber: string, recaptchaContainerId: string) {
  const recaptcha = new RecaptchaVerifier(auth, recaptchaContainerId, {
    size: "invisible",
  })
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptcha)
  return confirmationResult
}

export async function verifyPhoneOtp(confirmationResult: any, otp: string) {
  const result = await confirmationResult.confirm(otp)
  const idToken = await result.user.getIdToken()
  return { user: result.user, idToken }
}

export async function firebaseSignOut() {
  await signOut(auth)
}

export { auth }
