import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
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
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)
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

// Declare global to allow clearing
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier
  }
}

export async function sendPhoneOtp(phoneNumber: string, recaptchaContainerId: string) {
  // Clear any existing recaptcha instance to avoid DOM detachment issues when switching tabs
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear()
    } catch (e) {
      console.warn("Error clearing recaptcha:", e)
    }
    window.recaptchaVerifier = undefined;
  }

  const container = document.getElementById(recaptchaContainerId);
  if (container) container.innerHTML = "";
  
  window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
    size: "invisible",
  })

  await window.recaptchaVerifier.render()
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
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

export function getAuthErrorMessage(error: any): string {
  const code = error?.code || "";
  const msg = error?.message || "An unknown error occurred.";
  
  if (code === "auth/email-already-in-use") return "This email is already registered. Please sign in instead.";
  if (code === "auth/weak-password") return "Password should be at least 6 characters.";
  if (code === "auth/invalid-email") return "Please enter a valid email address.";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") return "Invalid email or password.";
  if (code === "auth/operation-not-allowed") return "This sign-in method is not enabled.";
  if (code === "auth/too-many-requests") return "Too many failed attempts. Please try again later.";
  if (code === "auth/user-disabled") return "This account has been disabled.";
  if (code === "auth/invalid-verification-code") return "Invalid OTP code entered.";
  if (code === "auth/invalid-verification-id") return "OTP verification session expired.";
  if (code === "auth/invalid-phone-number") return "Please enter a valid phone number with country code (e.g. +1 234 567 8900).";
  
  // Expose the underlying message for easier debugging instead of aggressive masking
  return msg;
}

export { auth, analytics }
