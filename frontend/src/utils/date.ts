import { format, parseISO, isToday, isTomorrow, isYesterday, differenceInYears } from "date-fns"

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "MMM dd, yyyy")
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":")
  const hour = parseInt(h)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "MMM dd, yyyy 'at' hh:mm a")
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  if (isYesterday(d)) return "Yesterday"
  return format(d, "MMM dd, yyyy")
}

export function calculateAge(dob: string | Date): number {
  const d = typeof dob === "string" ? parseISO(dob) : dob
  return differenceInYears(new Date(), d)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount)
}
