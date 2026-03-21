import { useState, useEffect, useRef, useCallback, type ComponentType } from "react"
import { useNavigate } from "react-router-dom"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  Calendar,
  ListOrdered,
  Receipt,
  FileHeart,
  MessageSquare,
  Stethoscope,
  Sparkles,
  CheckCircle2,
  Shield,
  Users,
  Building2,
  HeartPulse,
  ClipboardList,
  Monitor,
} from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { BrandLogo } from "@/components/BrandLogo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BorderBeam } from "@/components/ui/border-beam"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import { Marquee } from "@/components/ui/marquee"

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55 },
  }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
}

function LandingBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.18),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(34,211,238,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(244,114,182,0.06),transparent)]" />
      <AnimatedGridPattern
        width={72}
        height={72}
        x={0}
        y={0}
        squares={[
          [1, 2],
          [3, 6],
          [7, 3],
          [10, 8],
          [13, 4],
          [16, 9],
        ]}
        className="opacity-65"
      />
      <motion.div
        className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity }}
      />
      <motion.div
        className="absolute -right-20 bottom-1/4 h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl"
        animate={{ x: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity }}
      />
      <div
        className="absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

const depts = [
  { id: "im", label: "Internal medicine", ab: "IM" },
  { id: "or", label: "Orthopedics", ab: "OR" },
  { id: "en", label: "ENT", ab: "EN" },
]

const slots = ["10:00", "10:15", "10:30", "11:00", "11:30"]

function AppointmentMiniApp() {
  const [tab, setTab] = useState("pick")
  const [slot, setSlot] = useState("")
  const step = tab === "pick" ? 33 : tab === "slot" ? 66 : 100

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="pick">Doctor</TabsTrigger>
        <TabsTrigger value="slot">Time</TabsTrigger>
        <TabsTrigger value="done">Done</TabsTrigger>
      </TabsList>
      <Progress value={step} className="mt-2 h-1" />
      <TabsContent value="pick" className="mt-3 space-y-2">
        <ScrollArea className="h-[9.5rem] rounded-md border p-2">
          <div className="space-y-2 pr-3">
            {depts.map((d) => (
              <Button
                key={d.id}
                variant="outline"
                size="sm"
                className="h-auto w-full justify-start gap-2 py-2 text-left"
                onClick={() => setTab("slot")}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px]">{d.ab}</AvatarFallback>
                </Avatar>
                <span className="text-xs">{d.label}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="slot" className="mt-3 space-y-2">
        <p className="text-[10px] text-zinc-400">Available slots</p>
        <div className="grid grid-cols-3 gap-2">
          {slots.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={slot === s ? "default" : "outline"}
              className="text-[11px] font-semibold"
              onClick={() => {
                setSlot(s)
                setTab("done")
              }}
            >
              {s}
            </Button>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="done" className="mt-3 space-y-3 text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <CheckCircle2 className="h-5 w-5" />
        </motion.div>
        <p className="text-xs font-medium">Booking flow complete</p>
        {slot ? (
          <p className="text-[10px] text-zinc-400">Selected slot: {slot}</p>
        ) : (
          <p className="text-[10px] text-zinc-400">Pick a slot to preview confirmation</p>
        )}
        <Button size="sm" variant="outline" className="text-xs" onClick={() => { setTab("pick"); setSlot("") }}>
          Reset
        </Button>
      </TabsContent>
    </Tabs>
  )
}

function QueueMiniApp() {
  const [current, setCurrent] = useState(3)
  const max = 7
  const pct = Math.round((current / max) * 100)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        <div className="text-center">
          <motion.p
            key={current}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold tabular-nums text-white"
          >
            #{current}
          </motion.p>
          <p className="text-[10px] text-zinc-400">Now serving</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Queue</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
        <div className="flex flex-wrap justify-center gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((t) => (
            <Tooltip key={t}>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  layout
                  className={`flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border px-1 text-xs font-semibold transition-[colors,transform] active:scale-95 sm:min-h-10 sm:min-w-10 ${
                    t < current
                      ? "bg-muted text-muted-foreground line-through"
                      : t === current
                        ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/25"
                        : "border-border bg-card hover:bg-accent/80"
                  }`}
                >
                  {t}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">
                {t < current ? "Served" : t === current ? "Current" : "Waiting"}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <Button
          size="sm"
          className="w-full text-xs"
          onClick={() => setCurrent((c) => Math.min(max, c + 1))}
        >
          Call next
        </Button>
      </div>
    </TooltipProvider>
  )
}

function BillingMiniApp() {
  const [tab, setTab] = useState("invoice")
  const [paid, setPaid] = useState(false)
  const [prog, setProg] = useState(0)
  const payTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (payTimer.current) clearInterval(payTimer.current)
  }, [])

  const runPay = useCallback(() => {
    setProg(15)
    if (payTimer.current) clearInterval(payTimer.current)
    payTimer.current = setInterval(() => {
      setProg((p) => {
        if (p >= 100) {
          if (payTimer.current) clearInterval(payTimer.current)
          payTimer.current = null
          setPaid(true)
          return 100
        }
        return p + 18
      })
    }, 120)
  }, [])

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="invoice">Invoice</TabsTrigger>
        <TabsTrigger value="pay">Pay</TabsTrigger>
      </TabsList>
      <TabsContent value="invoice" className="mt-3 space-y-2">
        <div className="rounded-lg border border-border bg-muted p-3 text-xs text-foreground">
          <div className="flex justify-between"><span>Consultation</span><span>₹500</span></div>
          <div className="flex justify-between text-zinc-400"><span>GST</span><span>₹90</span></div>
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold"><span>Total</span><span>₹590</span></div>
        </div>
        <Button size="sm" className="w-full text-xs" onClick={() => setTab("pay")}>
          Continue to pay
        </Button>
      </TabsContent>
      <TabsContent value="pay" className="mt-3 space-y-3">
        {!paid ? (
          <>
            <p className="text-[10px] text-zinc-400">Gateway checkout (preview)</p>
            <Progress value={prog} className="h-1.5" />
            <Button size="sm" className="w-full text-xs" disabled={prog > 0 && prog < 100} onClick={runPay}>
              {prog > 0 && prog < 100 ? "Processing…" : "Pay ₹590"}
            </Button>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
            <p className="text-xs font-medium">Payment recorded</p>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setPaid(false); setProg(0); setTab("invoice") }}>
              Reset
            </Button>
          </motion.div>
        )}
      </TabsContent>
    </Tabs>
  )
}

function RecordsMiniApp() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-2 py-1.5">
        <span className="text-xs font-medium">Visit record</span>
        <Badge variant="secondary" className="text-[10px]">SOAP</Badge>
      </div>
      <ScrollArea className="h-[8.5rem] rounded-md border bg-background/80 p-3 text-[10px] leading-relaxed">
        <div className="space-y-2 pr-3">
          <p><span className="font-semibold">S:</span> Chief complaint</p>
          <p><span className="font-semibold">O:</span> Vitals & exam</p>
          <p><span className="font-semibold">A:</span> Assessment</p>
          <p><span className="font-semibold">P:</span> Plan & Rx</p>
          <Separator />
          <Button type="button" size="sm" variant="secondary" className="text-[10px]">
            Export PDF
          </Button>
        </div>
      </ScrollArea>
    </div>
  )
}

function SmsMiniApp() {
  const [sent, setSent] = useState(false)

  return (
    <Card className="border-dashed">
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-xs">Notification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-2">
        <p className="text-[10px] leading-relaxed text-zinc-400">
          Template: appointment time, token, and clinic name are merged when sending.
        </p>
        <Progress value={sent ? 100 : 0} className="h-1" />
        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setSent(true)}>
          Run send preview
        </Button>
        {sent && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-primary">
            Pipeline ready
          </motion.p>
        )}
      </CardContent>
    </Card>
  )
}

function DoctorMiniApp() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {["Day load", "Done", "Waiting"].map((label, i) => (
          <div key={label} className="rounded-lg border bg-muted/20 p-2 text-center">
            <Progress value={[55, 72, 28][i]} className="mb-1 h-1" />
            <p className="text-[9px] text-zinc-400">{label}</p>
          </div>
        ))}
      </div>
      <Separator />
      <ScrollArea className="h-24 rounded-md border">
        <div className="space-y-1.5 p-2 pr-4">
          {["Queue item 1", "Queue item 2", "Queue item 3"].map((row, i) => (
            <div key={row} className="flex items-center justify-between rounded-md border px-2 py-1.5">
              <span className="text-[10px]">{row}</span>
              <Badge variant={i === 0 ? "default" : "outline"} className="text-[9px]">
                {i === 0 ? "Active" : "Queued"}
              </Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

const features: {
  icon: LucideIcon
  title: string
  desc: string
  Mini: ComponentType
}[] = [
  { icon: Calendar, title: "Smart appointments", desc: "Doctor pick, live slots, guided steps.", Mini: AppointmentMiniApp },
  { icon: ListOrdered, title: "Live queue", desc: "Tokens, progress, and desk controls.", Mini: QueueMiniApp },
  { icon: Receipt, title: "Billing & pay", desc: "Invoice tab + checkout progress.", Mini: BillingMiniApp },
  { icon: FileHeart, title: "Medical records", desc: "SOAP layout with scroll and export.", Mini: RecordsMiniApp },
  { icon: MessageSquare, title: "Reminders", desc: "SMS / email templates and pipeline.", Mini: SmsMiniApp },
  { icon: Stethoscope, title: "Doctor desk", desc: "Load bars and queue strip.", Mini: DoctorMiniApp },
]

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[number]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const Icon = feature.icon
  const Mini = feature.Mini

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48, scale: 0.96 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.55, delay: index * 0.06, type: "spring", stiffness: 120, damping: 18 }}
    >
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="h-full"
      >
        <Card className="group relative h-full overflow-hidden border border-border bg-card/60 shadow-none backdrop-blur-md">
          <BorderBeam
            size={100}
            duration={10}
            borderWidth={1.5}
            colorFrom="#6366f1"
            colorTo="#ec4899"
            className="opacity-45 transition-opacity duration-500 group-hover:opacity-95"
          />
          <CardContent className="relative z-[1] space-y-3 p-5">
            <div className="flex items-start gap-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Badge variant="outline" className="mb-1 text-[10px]">Live preview</Badge>
                <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{feature.desc}</p>
              </div>
            </div>
            <Separator />
            {/* Isolate pointer events: card must not use onClick (it broke tab/button clicks) */}
            <div
              className="rounded-xl border border-border/80 bg-muted/15 p-3"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Mini />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

const marqueeItems = [
  "Appointments",
  "Queue",
  "Billing",
  "Records",
  "Reminders",
  "Analytics",
  "Walk-in",
  "Tokens",
  "Cashfree",
  "PDF export",
  "Role-based access",
]

const liveDemoBlocks: { title: string; desc: string; Mini: ComponentType }[] = [
  { title: "Booking flow", desc: "Pick department, choose a slot, confirm.", Mini: AppointmentMiniApp },
  { title: "Queue desk", desc: "Serving number, progress, call next.", Mini: QueueMiniApp },
  { title: "Billing", desc: "Invoice lines and pay progress.", Mini: BillingMiniApp },
]

const roleBlocks = [
  {
    icon: HeartPulse,
    title: "Patients",
    points: ["Book and reschedule", "Token status", "History & pay online"],
  },
  {
    icon: Stethoscope,
    title: "Doctors",
    points: ["Today’s queue", "SOAP & prescriptions", "Schedule overview"],
  },
  {
    icon: Building2,
    title: "Admin",
    points: ["Staff & patients", "Walk-in desk", "Analytics & billing"],
  },
]

const capabilityItems = [
  { icon: ClipboardList, label: "Appointments & walk-ins" },
  { icon: Monitor, label: "Token display mode" },
  { icon: Shield, label: "JWT + role routes" },
  { icon: Receipt, label: "GST invoices & gateway" },
  { icon: FileHeart, label: "Records & uploads" },
  { icon: MessageSquare, label: "SMS / email hooks" },
]

const faqItems: { q: string; a: string }[] = [
  {
    q: "Do these previews use my database?",
    a: "No. Widgets on this page are self-contained demos. After you sign in, the real app talks to your configured API and database.",
  },
  {
    q: "Can patients and staff share one deployment?",
    a: "Yes. Accounts are separated by role (patient, doctor, admin) with different menus and permissions.",
  },
  {
    q: "Does dark mode apply to the whole app?",
    a: "Theme is stored in your browser (localStorage). Signed-in pages use the same light/dark tokens, including AMOLED black in dark mode.",
  },
  {
    q: "Where do payments go?",
    a: "Production checkout uses your Cashfree credentials from environment variables. The billing widget here only simulates progress.",
  },
]

function LiveDemosSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="live-demos-heading">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45 }}
        className="mb-8 text-center"
      >
        <Badge className="mb-3 border border-transparent bg-primary/15 text-primary hover:bg-primary/20">
          Hands-on
        </Badge>
        <h2 id="live-demos-heading" className="text-2xl font-bold text-white sm:text-3xl">
          Live product widgets
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-400">
          Use the controls below — each block is a real UI pattern from the app (local state only, no API calls).
        </p>
      </motion.div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {liveDemoBlocks.map(({ title, desc, Mini }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
          >
            <Card className="h-full overflow-hidden border border-border bg-card/80 backdrop-blur-md">
              <CardHeader className="border-b border-border/60 bg-muted/25 py-4">
                <CardTitle className="text-base text-white">{title}</CardTitle>
                <CardDescription className="text-xs text-zinc-400">{desc}</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="rounded-lg border border-dashed border-primary/20 bg-muted/10 p-3">
                  <Mini />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function CapabilitiesSection() {
  return (
    <section className="border-y border-border/60 bg-muted/10 py-14" aria-labelledby="capabilities-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-8 text-center"
        >
          <h2 id="capabilities-heading" className="text-xl font-bold text-white sm:text-2xl">
            Platform capabilities
          </h2>
          <p className="mt-1 text-sm text-zinc-400">What ships in the stack today</p>
        </motion.div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {capabilityItems.map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card/60 p-4 text-center shadow-none backdrop-blur-sm"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-[11px] font-medium leading-tight text-zinc-300 sm:text-xs">{label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RolesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="roles-heading">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-10 text-center"
      >
        <div className="mb-2 flex justify-center">
          <Users className="h-8 w-8 text-primary" aria-hidden />
        </div>
        <h2 id="roles-heading" className="text-2xl font-bold text-white sm:text-3xl">
          Built for every role
        </h2>
        <p className="mt-2 text-sm text-zinc-400">One deployment — tailored navigation per role</p>
      </motion.div>
      <div className="grid gap-4 md:grid-cols-3">
        {roleBlocks.map((r, i) => {
          const Icon = r.icon
          return (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="h-full border border-border bg-card/60 p-6 shadow-none backdrop-blur-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-white">{r.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                  {r.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

function FaqSection() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6" aria-labelledby="faq-heading">
      <motion.h2
        id="faq-heading"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mb-8 text-center text-2xl font-bold text-white"
      >
        Questions
      </motion.h2>
      <div className="space-y-2">
        {faqItems.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-white/10 bg-black px-4 py-1 shadow-none open:bg-black"
          >
            <summary className="cursor-pointer list-none py-3 text-sm font-medium text-zinc-100 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                {item.q}
                <span className="text-zinc-500 transition group-open:rotate-180">▼</span>
              </span>
            </summary>
            <p className="border-t border-border/60 pb-3 pt-2 text-sm text-zinc-400">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated, user, isLoading } = useAuth()
  const [scrollY, setScrollY] = useState(0)
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 48])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.99])

  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      const roleRoutes: Record<string, string> = {
        admin: "/admin/dashboard",
        doctor: "/doctor/dashboard",
        patient: "/patient/dashboard",
      }
      navigate(roleRoutes[user.role] || "/patient/dashboard", { replace: true })
    }
  }, [isAuthenticated, user, isLoading, navigate])

  useEffect(() => {
    const handle = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handle, { passive: true })
    return () => window.removeEventListener("scroll", handle)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-foreground border-t-transparent"
        />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="relative min-h-screen text-foreground">
        <LandingBackdrop />

        <motion.nav
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`sticky top-0 z-50 flex items-center justify-between px-4 py-3 sm:px-6 ${scrollY > 16 ? "border-b border-border/60 bg-background/75 shadow-none backdrop-blur-xl" : ""}`}
        >
          <BrandLogo />
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/login")}>
              Sign in
            </Button>
            <Button size="sm" onClick={() => navigate("/signup")}>Sign up</Button>
          </div>
        </motion.nav>

        <section ref={heroRef} className="relative px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-16">
          <motion.div
            style={{ y: heroY, scale: heroScale }}
            className="mx-auto max-w-3xl rounded-3xl border border-transparent bg-transparent px-0 py-0 text-center shadow-none"
          >
            <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
              <motion.div variants={fadeUp} custom={0}>
                <Badge variant="outline" className="gap-1 border-border px-3 py-1 text-xs text-foreground">
                  <Sparkles className="h-3 w-3" />
                  Clinic operations in one stack
                </Badge>
              </motion.div>
              <motion.h1
                variants={fadeUp}
                custom={1}
                className="text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl md:leading-[1.05]"
              >
                Run the floor.
                <br />
                <span className="mt-1 block bg-gradient-to-r from-white via-white/85 to-zinc-400 bg-clip-text text-transparent">
                  Ship the experience.
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="mx-auto max-w-xl text-sm text-zinc-400 sm:text-base">
                Scroll to live widgets and module cards — tabs, queue, billing, and records run in the page so you can try the UI before signing in.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} className="flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="gap-2" onClick={() => navigate("/signup")}>
                  Create account
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>→</motion.span>
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                  Sign in
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="mx-auto mt-12 max-w-4xl rounded-2xl border border-border/60 bg-muted/20 py-2 shadow-none"
          >
            <Marquee pauseOnHover durationSec={28}>
              {marqueeItems.map((t) => (
                <span key={t} className="text-xs font-medium text-zinc-400">
                  {t}
                </span>
              ))}
            </Marquee>
          </motion.div>
        </section>

        <LiveDemosSection />

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <h2 className="text-2xl font-bold text-white sm:text-3xl">All modules</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Six areas of the product — each card embeds a working mini UI (scroll down if you are on a small screen).
            </p>
          </motion.div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>
        </section>

        <CapabilitiesSection />

        <RolesSection />

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-white/10 bg-black px-4 py-12 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-sm sm:px-8">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-10 text-center text-2xl font-bold text-white"
            >
              Three steps
            </motion.h2>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={stagger}
              className="grid grid-cols-1 gap-6 md:grid-cols-3"
            >
              {[
                { step: "01", title: "Sign up", desc: "Email, phone, or Google." },
                { step: "02", title: "Book", desc: "Doctor, slot, token." },
                { step: "03", title: "Visit", desc: "Queue, consult, pay." },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -6 }}
                  className="rounded-2xl border border-white/10 bg-black p-6 text-center shadow-none ring-1 ring-white/5"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  <h3 className="font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400">{s.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <FaqSection />

        <section className="bg-black px-4 py-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-black p-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          >
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready when you are</h2>
            <p className="mt-2 text-sm text-zinc-400">Start on the free tier and invite your team.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => navigate("/signup")}>Create account</Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/login")}>Sign in</Button>
            </div>
          </motion.div>
        </section>

        <footer className="border-t border-border px-4 py-8 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <BrandLogo className="text-sm text-zinc-400" labelClassName="text-sm text-zinc-400" />
            <p className="text-xs text-zinc-500">Readable light UI · AMOLED dark</p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
