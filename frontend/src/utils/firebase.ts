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
  
  // Return the raw message nicely formatted if not matching our list, removing "Firebase: Error (auth/...)" prefix if it exists
  const cleanMsg = msg.replace(/^.*?Firebase:\s*/, "").replace(/ \([^)]+\)/, "");
  return cleanMsg || msg;
}

export { auth, analytics }
