import { useNavigate } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-center p-6">
      <div className="space-y-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/10 border border-destructive/25 flex items-center justify-center">
          <ShieldOff className="w-10 h-10 text-destructive" />
        </div>
        <div>
          <h1 className="text-5xl font-display font-bold text-destructive">404</h1>
          <p className="text-lg font-semibold mt-2">Page not found</p>
          <p className="text-muted-foreground text-sm mt-1">This route doesn't exist in ThreatPixel AI.</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Back to Analyzer
        </button>
      </div>
    </div>
  );
}
