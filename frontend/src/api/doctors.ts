import api from "@/api/client"

export const doctorApi = {
  list: (specialization?: string) =>
    api.get("/api/v1/doctors", { params: { specialization } }),

  get: (id: string) =>
    api.get(`/api/v1/doctors/${id}`),

  create: (data: any) =>
    api.post("/api/v1/doctors", data),

  update: (id: string, data: any) =>
    api.put(`/api/v1/doctors/${id}`, data),

  getAvailability: (id: string) =>
    api.get(`/api/v1/doctors/${id}/availability`),

  setAvailability: (id: string, slots: any[]) =>
    api.post(`/api/v1/doctors/${id}/availability`, slots),

  deleteAvailabilitySlot: (id: string, slotId: string) =>
    api.delete(`/api/v1/doctors/${id}/availability/${slotId}`),

  getLeaves: (id: string) =>
    api.get(`/api/v1/doctors/${id}/leave`),

  markLeave: (id: string, data: { leave_date: string; reason?: string }) =>
    api.post(`/api/v1/doctors/${id}/leave`, data),

  cancelLeave: (id: string, leaveId: string) =>
    api.delete(`/api/v1/doctors/${id}/leave/${leaveId}`),

  getSlots: (id: string, date: string) =>
    api.get(`/api/v1/doctors/${id}/slots`, { params: { date } }),
}
