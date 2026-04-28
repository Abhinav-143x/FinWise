import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

/**
 * Shown on engine pages when profile is not set up.
 * Blocks the form with a clear CTA.
 */
export default function ProfileSetupBanner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-amber-600" />
      </div>
      <h2 className="text-xl font-semibold text-ink-900 mb-2">Profile setup required</h2>
      <p className="text-sm text-ink-500 max-w-xs mb-6">
        Add your monthly income, expenses, and savings once — then all decision tools use it automatically.
      </p>
      <Link to="/profile" className="btn-primary gap-2">
        Set up profile →
      </Link>
    </div>
  );
}
