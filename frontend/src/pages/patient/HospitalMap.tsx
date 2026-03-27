import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import { Icon } from "leaflet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import api from "@/api/client"

// Fix for default Leaflet icon paths in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (Icon.Default.prototype as any)._getIconUrl
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface Hospital {
  id: string
  name: string
  address: string
  city: string
  latitude: number
  longitude: number
  specialties: string[]
}

// Helper component to smoothly move map
function FlyToLocation({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { animate: true })
    }
  }, [center, map])
  return null
}

export default function HospitalMap() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCenter, setActiveCenter] = useState<[number, number] | null>(null)

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await api.get("/api/v1/hospitals")
        setHospitals(response.data.data)
      } catch (err: any) {
        toast.error("Failed to load hospitals data")
      } finally {
        setLoading(false)
      }
    }
    fetchHospitals()
  }, [])

  const defaultCenter: [number, number] = [18.5204, 73.8567] // Pune default

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Find Hospitals</h1>
        <p className="text-muted-foreground">Locate hospitals nearest to you</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        <Card className="flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-lg">Available Locations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : hospitals.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground text-sm">No hospitals found.</p>
            ) : (
              <div className="divide-y">
                {hospitals.map(h => (
                  <div key={h.id} className="p-4 hover:bg-accent/50 transition-colors">
                    <h3 className="font-semibold">{h.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2 mt-1">
                      {h.address}, {h.city}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {h.specialties.map(spec => (
                        <Badge key={spec} variant="outline" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setActiveCenter([h.latitude, h.longitude])}
                    >
                      View on Map
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 rounded-xl overflow-hidden border shadow-sm h-full z-0 relative">
          <MapContainer
            center={defaultCenter}
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {hospitals.map(h => (
              <Marker key={h.id} position={[h.latitude, h.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold mb-1">{h.name}</p>
                    <p className="text-muted-foreground">{h.address}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
            <FlyToLocation center={activeCenter} />
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
