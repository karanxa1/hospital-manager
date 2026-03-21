import api from "@/api/client"

export const appointmentApi = {
  listAll: (params?: any) =>
    api.get("/api/v1/appointments", { params }),

  myAppointments: () =>
    api.get("/api/v1/appointments/my"),

  doctorToday: () =>
    api.get("/api/v1/appointments/doctor/today"),

  create: (data: any) =>
    api.post("/api/v1/appointments", data),

  confirm: (id: string) =>
    api.put(`/api/v1/appointments/${id}/confirm`),

  cancel: (id: string) =>
    api.put(`/api/v1/appointments/${id}/cancel`),

  complete: (id: string) =>
    api.put(`/api/v1/appointments/${id}/complete`),

  noShow: (id: string) =>
    api.put(`/api/v1/appointments/${id}/no-show`),

  walkin: (data: any) =>
    api.post("/api/v1/appointments/walkin", data),
}
