import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import api from "@/api/client"
import { formatCurrency } from "@/utils/date"
import {
  Users,
  Activity,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Search,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

interface Overview {
  total_patients: number
  total_doctors: number
  appointments_today: number
  appointments_this_month: number
  revenue_this_month: number
  no_show_rate: string
  top_doctors: { doctor_name: string; appointment_count: number }[]
}

interface AppointmentTrend {
  date: string
  count: number
}

interface DoctorUtilization {
  doctor_name: string
  booked_slots: number
  available_slots: number
  utilization: number
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [apptTrend, setApptTrend] = useState<AppointmentTrend[]>([])
  const [utilization, setUtilization] = useState<DoctorUtilization[]>([])
  const [recentAppts, setRecentAppts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchData = async () => {
    try {
      const [ovRes, apptRes, utilRes, recentRes] = await Promise.all([
        api.get("/api/v1/analytics/overview"),
        api.get("/api/v1/analytics/appointments?range=7d"),
        api.get("/api/v1/analytics/doctor-utilization"),
        api.get("/api/v1/appointments", { params: { status: "pending" } }),
      ])
      setOverview(ovRes.data.data)
      setApptTrend(apptRes.data.data)
      setUtilization(utilRes.data.data)
      setRecentAppts(recentRes.data.data.slice(0, 10))
    } catch {
      toast.error("Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const triggerSync = async (city: string = "Pune") => {
    setSyncing(true)
    toast.promise(api.post(`/api/v1/hospitals/sync?city=${city}`), {
      loading: `Syncing hospitals from ${city}...`,
      success: (res) => {
        setSyncing(false)
        return `Successfully added ${res.data.data.added} new hospitals!`
      },
      error: () => {
        setSyncing(false)
        return "Sync failed. Please try again."
      },
    })
  }

  if (loading || !overview) {
    return (
      <div className="p-6 space-y-6 bg-black min-h-screen">
        <div className="flex justify-between items-center mb-10">
          <Skeleton className="h-10 w-64 bg-white/10" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 bg-white/10" />
            <Skeleton className="h-10 w-32 bg-white/10" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 bg-white/10 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-[400px] lg:col-span-2 bg-white/10 rounded-3xl" />
          <Skeleton className="h-[400px] bg-white/10 rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-6 space-y-8 bg-black text-white min-h-screen"
    >
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Command <span className="text-primary">Center</span>
          </h1>
          <p className="text-white/50 text-sm mt-1">Real-time clinic intelligence and operations dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/appointments">
            <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl h-11 px-6">
              <Calendar className="mr-2 h-4 w-4" /> Calendar
            </Button>
          </Link>
          <Button 
            disabled={syncing}
            onClick={() => triggerSync()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-6 shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:scale-105"
          >
            {syncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Data
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Patients" 
          value={overview.total_patients} 
          icon={<Users className="h-5 w-5 text-blue-400" />} 
          trend="+12% from last month"
          color="blue"
        />
        <StatsCard 
          title="Doctors" 
          value={overview.total_doctors} 
          icon={<Activity className="h-5 w-5 text-emerald-400" />} 
          trend="2 new this week"
          color="emerald"
        />
        <StatsCard 
          title="Daily Appointments" 
          value={overview.appointments_today} 
          icon={<TrendingUp className="h-5 w-5 text-amber-400" />} 
          trend={`${overview.appointments_this_month} total this month`}
          color="amber"
        />
        <StatsCard 
          title="Monthly Revenue" 
          value={formatCurrency(overview.revenue_this_month)} 
          icon={<DollarSign className="h-5 w-5 text-purple-400" />} 
          trend="Projected ₹12.5L"
          color="purple"
        />
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex items-center justify-between pb-1 overflow-x-auto no-scrollbar">
          <TabsList className="bg-white/5 border border-white/10 p-1 h-12 rounded-2xl w-full max-w-md justify-start">
            <TabsTrigger value="overview" className="rounded-xl px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none transition-all">Overview</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none transition-all">Deep Analytics</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-xl px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none transition-all">Activity</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Chart */}
            <Card className="lg:col-span-2 bg-white/5 border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-semibold">Appointment Volume</CardTitle>
                  <p className="text-xs text-white/40">Patient traffic over the last 7 days</p>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
                  <ArrowUpRight className="h-4 w-4" /> 8.4%
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={apptTrend}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fff" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#ffffff40", fontSize: 11 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#ffffff40", fontSize: 11 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#111", border: "1px solid #ffffff10", borderRadius: "12px", fontSize: "12px" }} 
                      itemStyle={{ color: "#fff" }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#fff" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Specialists */}
            <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Star Performers</CardTitle>
                <p className="text-xs text-white/40">Most active specialists this month</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {overview.top_doctors.map((doc, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ x: 5 }}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold shadow-lg ${
                          i === 0 ? 'from-amber-400 to-orange-500' : 
                          i === 1 ? 'from-slate-400 to-slate-500' : 
                          'from-orange-800 to-orange-950 text-orange-200'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.doctor_name}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Specialist</p>
                        </div>
                      </div>
                      <Badge className="bg-white/5 text-white hover:bg-white/10 border-white/10 rounded-lg py-1 px-3">
                        {doc.appointment_count}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-4 text-xs text-primary hover:text-primary hover:bg-primary/5 rounded-xl group">
                  Full Analytics List <ExternalLink className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
             {/* Utilization Chart */}
             <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Utilization Efficiency</CardTitle>
                <p className="text-xs text-white/40">Wait times and slot occupancy rates</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={utilization.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis 
                      dataKey="doctor_name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#ffffff40", fontSize: 9 }} 
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#ffffff40", fontSize: 11 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#111", border: "1px solid #ffffff10", borderRadius: "12px", fontSize: "12px" }}
                      cursor={{ fill: '#ffffff05' }}
                    />
                    <Bar dataKey="utilization" fill="#fff" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Health Indicators */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 content-start">
              <HealthMetric 
                title="Avg Wait Time" 
                value="14.5 min" 
                icon={<Clock className="h-5 w-5 text-blue-400" />} 
                status="good"
                desc="Below threshold"
              />
              <HealthMetric 
                title="Cancellation Rate" 
                value={overview.no_show_rate} 
                icon={<Activity className="h-5 w-5 text-red-500" />} 
                status="warning"
                desc="Up 2% today"
              />
              <HealthMetric 
                title="Patient Satisfaction" 
                value="4.9 / 5" 
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} 
                status="excellent"
                desc="Top percentile"
              />
              <HealthMetric 
                title="Revenue per slot" 
                value="₹1,450" 
                icon={<DollarSign className="h-5 w-5 text-purple-400" />} 
                status="good"
                desc="Optimal pricing"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Live Feed</CardTitle>
                <p className="text-xs text-white/40">Latest appointments and registration updates</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input className="bg-white/5 border border-white/10 rounded-lg h-9 w-48 pl-9 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Search activity..." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-3">
                <div className="absolute left-[27px] top-6 bottom-6 w-px bg-white/10" />
                <AnimatePresence>
                  {recentAppts.map((appt, i) => (
                    <motion.div 
                      key={appt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group relative z-10"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/40">
                        {appt.status === 'confirmed' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Dr. {appt.doctor_name}</p>
                          <span className="text-[10px] text-white/30 font-medium">{appt.start_time}</span>
                        </div>
                        <p className="text-xs text-white/50 truncate">Token #{appt.token_number} • Patient ID: {appt.patient_id.slice(0, 8)}...</p>
                      </div>
                      <Badge className={`rounded-xl border-none shadow-sm ${
                        appt.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {appt.status}
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Grid Quick Actions */}
      <h3 className="text-lg font-semibold mt-4">Operational <span className="text-primary">Shortcuts</span></h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickAction 
          label="Doctors" 
          link="/admin/doctors" 
          icon={<Users className="h-6 w-6 text-blue-400" />} 
          desc="Manage staff & schedules"
        />
        <QuickAction 
          label="Patients" 
          link="/admin/patients" 
          icon={<Activity className="h-6 w-6 text-emerald-400" />} 
          desc="EHR & records access"
        />
        <QuickAction 
          label="Billing" 
          link="/admin/billing" 
          icon={<DollarSign className="h-6 w-6 text-purple-400" />} 
          desc="Payments & invoices"
        />
        <QuickAction 
          label="Registrations" 
          link="/admin/walkin" 
          icon={<Users className="h-6 w-6 text-amber-500" />} 
          desc="Front-desk portal"
        />
      </div>
    </motion.div>
  )
}

function StatsCard({ title, value, icon, trend, color }: any) {
  const colorMap: any = {
    blue: "hover:shadow-blue-500/10 border-blue-500/10",
    emerald: "hover:shadow-emerald-500/10 border-emerald-500/10",
    amber: "hover:shadow-amber-500/10 border-amber-500/10",
    purple: "hover:shadow-purple-500/10 border-purple-500/10"
  }

  return (
    <Card className={`bg-white/5 border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl transition-all hover:scale-[1.02] cursor-default group ${colorMap[color]}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-2xl bg-white/5 ring-1 ring-white/10 group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <Badge variant="outline" className="text-[10px] bg-white/5 text-white/50 border-white/10 uppercase tracking-tight">Active</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-white tracking-tighter">{value}</p>
        </div>
        <p className="text-[10px] text-white/30 mt-4 leading-none">{trend}</p>
      </CardContent>
    </Card>
  )
}

function HealthMetric({ title, value, icon, status, desc }: any) {
  const statusColors: any = {
    good: "text-emerald-400",
    excellent: "text-blue-400",
    warning: "text-amber-500",
  }

  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/10 transition-colors backdrop-blur-xl">
      <div className="p-2 rounded-lg bg-white/5 w-fit mb-3 border border-white/10">
        {icon}
      </div>
      <div>
        <p className="text-xs text-white/40 font-medium">{title}</p>
        <p className={`text-xl font-bold mt-1 ${statusColors[status]}`}>{value}</p>
        <p className="text-[10px] text-white/30 mt-1">{desc}</p>
      </div>
    </div>
  )
}

function QuickAction({ label, link, icon, desc }: any) {
  return (
    <Link to={link}>
      <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl hover:bg-white/10 transition-all hover:scale-[1.02] cursor-pointer ring-1 ring-transparent hover:ring-primary/40 group">
        <CardContent className="p-6 text-center flex flex-col items-center gap-3">
          <div className="p-4 rounded-full bg-white/5 border border-white/10 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
            {icon}
          </div>
          <div className="space-y-1">
            <p className="font-bold text-white text-sm">{label}</p>
            <p className="text-[10px] text-white/40 leading-tight">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

