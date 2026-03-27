import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { BrandLogo } from "@/components/BrandLogo"
import { toast } from "sonner"
import { useAuthStore } from "@/store/authStore"
import { loginWithGoogle, signUpWithEmail, sendPhoneOtp, verifyPhoneOtp, getAuthErrorMessage } from "@/utils/firebase"

export default function Signup() {
  const navigate = useNavigate()
  const { loginWithFirebase } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<"email" | "phone">("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<any>(null)

  const redirect = (role: string) => {
    const r: Record<string, string> = { admin: "/admin/dashboard", doctor: "/doctor/dashboard", patient: "/patient/dashboard" }
    navigate(r[role] || "/patient/dashboard", { replace: true })
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const { idToken } = await loginWithGoogle()
      const user = await loginWithFirebase(idToken)
      toast.success("Account created")
      redirect(user.role)
    } catch (err: any) { toast.error(getAuthErrorMessage(err)) } finally { setLoading(false) }
  }

  const handleEmail = async () => {
    if (!email || !password || !confirmPassword) { toast.error("Fill all fields"); return }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return }
    if (password !== confirmPassword) { toast.error("Passwords don't match"); return }
    setLoading(true)
    try {
      const { idToken } = await signUpWithEmail(email, password)
      const user = await loginWithFirebase(idToken)
      toast.success("Account created")
      redirect(user.role)
    } catch (err: any) { toast.error(getAuthErrorMessage(err)) } finally { setLoading(false) }
  }

  const handleSendOtp = async () => {
    if (!phone) { toast.error("Enter phone number"); return }
    setLoading(true)
    try {
      const result = await sendPhoneOtp(phone, "recaptcha-signup")
      setConfirmationResult(result)
      setOtpSent(true)
      toast.success("OTP sent")
    } catch (err: any) { toast.error(getAuthErrorMessage(err)) } finally { setLoading(false) }
  }

  const handleVerifyOtp = async () => {
    if (!otp) { toast.error("Enter OTP"); return }
    setLoading(true)
    try {
      const { idToken } = await verifyPhoneOtp(confirmationResult, otp)
      const user = await loginWithFirebase(idToken)
      toast.success("Account created")
      redirect(user.role)
    } catch (err: any) { toast.error(getAuthErrorMessage(err)) } finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-primary/[0.03]" animate={{ scale: [1, 1.3, 1], x: [0, -30, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-primary/[0.02]" animate={{ scale: [1.2, 1, 1.2], x: [0, 20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center space-y-1 pb-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }} className="mx-auto mb-4">
                <BrandLogo showLabel={false} className="drop-shadow-xl" />
              </motion.div>
              <CardTitle className="text-2xl">Create account</CardTitle>
              <CardDescription>Get started with Clinic Platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full h-10 gap-2" onClick={handleGoogle} disabled={loading}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>
              </motion.div>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">or</span>
              </div>

              <div className="flex rounded-lg border p-1">
                {(["email", "phone"] as const).map((t) => (
                  <motion.button key={t} whileTap={{ scale: 0.97 }} className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all duration-200 ${tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setTab(t)}>
                    {t === "email" ? "Email" : "Phone"}
                  </motion.button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {tab === "email" ? (
                  <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm Password</Label>
                      <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button className="w-full" onClick={handleEmail} disabled={loading}>
                        {loading ? <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>Creating account...</motion.span> : "Create Account"}
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                    </div>
                    <AnimatePresence>
                      {otpSent && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-1.5">
                          <Label>OTP</Label>
                          <Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button className="w-full" onClick={otpSent ? handleVerifyOtp : handleSendOtp} disabled={loading}>
                        {loading ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}
                      </Button>
                    </motion.div>
                    <div id="recaptcha-signup" />
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium underline hover:text-primary transition-colors">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
