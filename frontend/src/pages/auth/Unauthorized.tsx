import { Link } from "react-router-dom"

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">403</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
        <Link to="/login" className="text-sm underline">
          Back to login
        </Link>
      </div>
    </div>
  )
}
