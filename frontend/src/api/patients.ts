import api from "@/api/client"

export const patientApi = {
  list: (search?: string) =>
    api.get("/api/v1/patients", { params: { search } }),

  /** Logged-in patient’s own row (uses JWT — not User.id in path). */
  getMe: () => api.get("/api/v1/patients/me"),

  getMyRecords: () => api.get("/api/v1/patients/me/records"),

  get: (id: string) =>
    api.get(`/api/v1/patients/${id}`),

  upsertProfile: (data: any) =>
    api.post("/api/v1/patients/profile", data),

  update: (id: string, data: any) =>
    api.put(`/api/v1/patients/${id}`, data),

  getAppointments: (id: string) =>
    api.get(`/api/v1/patients/${id}/appointments`),

  getRecords: (id: string) =>
    api.get(`/api/v1/patients/${id}/records`),

  getLabReports: (id: string) =>
    api.get(`/api/v1/patients/${id}/lab-reports`),

  uploadLabReport: (id: string, file: File, reportName: string) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("report_name", reportName)
    return api.post(`/api/v1/patients/${id}/lab-reports`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  },
}
