import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

export default function TokenDisplay() {
  const { doctorId } = useParams()
  const [currentToken, setCurrentToken] = useState(0)

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
    const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws"
    const wsUrl = baseUrl.replace(/^https?/, wsProtocol)
    const ws = new WebSocket(`${wsUrl}/api/v1/queue/ws/${doctorId}`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.current_token !== undefined) {
        setCurrentToken(data.current_token)
      }
    }

    ws.onerror = () => {
      fetch(`${baseUrl}/api/v1/queue/${doctorId}/today`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setCurrentToken(data.data.current_token)
        })
        .catch(() => {})
    }

    return () => ws.close()
  }, [doctorId])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <p className="text-xl text-muted-foreground font-medium">Now Serving</p>
        <div className="text-[12rem] font-bold leading-none tracking-tighter">
          {currentToken > 0 ? `#${currentToken}` : "--"}
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
    </div>
  )
}
