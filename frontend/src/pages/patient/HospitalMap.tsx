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

function normalizeHospital(raw: any, index: number): Hospital | null {
  const latitude = Number(raw?.latitude)
  const longitude = Number(raw?.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return {
    id: String(raw?.id ?? `hospital-${index}`),
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name : "Hospital",
    address: typeof raw?.address === "string" && raw.address.trim() ? raw.address : "Address unavailable",
    city: typeof raw?.city === "string" && raw.city.trim() ? raw.city : "",
    latitude,
    longitude,
    specialties: Array.isArray(raw?.specialties)
      ? raw.specialties.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
  }
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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await api.get("/api/v1/hospitals")
        const payload = Array.isArray(response.data?.data) ? response.data.data : []
        setHospitals(payload.map(normalizeHospital).filter((hospital: Hospital | null): hospital is Hospital => hospital !== null))
      } catch (err: any) {
        toast.error("Failed to load hospitals data")
      } finally {
        setLoading(false)
      }
    }
    fetchHospitals()

    // Get User Location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude])
        },
        () => {
          console.log("Location access denied")
        }
      )
    }
  }, [])

  const getDirections = (h: Hospital) => {
    if (!userLocation) {
      // Fallback: search-based directions if origin is unknown
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`, "_blank")
      return
    }
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${h.latitude},${h.longitude}`,
      "_blank"
    )
  }

  const defaultCenter: [number, number] = [18.5204, 73.8567] // Pune default

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Find Hospitals</h1>
        <p className="text-muted-foreground">Locate hospitals nearest to you and get directions</p>
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
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{h.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2 mt-1">
                          {[h.address, h.city].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        title="Get Directions"
                        onClick={() => getDirections(h)}
                      >
                        <span className="text-xs font-bold">DIR</span>
                      </Button>
                    </div>
                    {h.specialties.length > 0 ? (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {h.specialties.map(spec => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
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
                  <div className="text-sm min-w-[150px]">
                    <p className="font-bold mb-1">{h.name}</p>
                    <p className="text-muted-foreground text-xs mb-3">{h.address}</p>
                    <Button 
                      size="sm" 
                      className="w-full h-8 text-xs"
                      onClick={() => getDirections(h)}
                    >
                      Get Directions
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {userLocation && (
              <Marker 
                position={userLocation}
                icon={new Icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                  shadowUrl: markerShadow,
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                })}
              >
                <Popup>You are here</Popup>
              </Marker>
            )}

            <FlyToLocation center={activeCenter} />
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
