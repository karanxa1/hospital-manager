import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface DoctorCardProps {
  id: string
  user_name: string
  user_profile_picture: string | null
  specialization: string
  qualification: string
  experience_years: number
  consultation_fee: number
  avg_consultation_minutes: number
  onClick?: () => void
}

export function DoctorCard({
  user_name,
  user_profile_picture,
  specialization,
  qualification,
  experience_years,
  consultation_fee,
  onClick,
}: DoctorCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user_profile_picture || undefined} />
            <AvatarFallback>{user_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold leading-none">Dr. {user_name}</h3>
            <p className="text-sm text-muted-foreground">{specialization}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{qualification}</span>
              <span>·</span>
              <span>{experience_years} yrs exp</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Badge variant="outline">₹{consultation_fee}</Badge>
          {onClick && (
            <Button variant="ghost" size="sm">Book</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
