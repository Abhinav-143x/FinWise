import { Link } from "react-router-dom";
import { ArrowRight, CircleDollarSign, TrendingUp, ShieldCheck, ChevronRight } from "lucide-react";

const FEATURES = [
  {
    icon: CircleDollarSign,
    title: "Can I Afford This?",
    desc: "Enter any purchase. Get an instant verdict with a clear explanation.",
    color: "bg-brand-50 text-brand-700",
  },
  {
    icon: TrendingUp,
    title: "Goal Impact",
    desc: "See exactly how a purchase delays your savings goals — in months.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: ShieldCheck,
    title: "Safe to Spend",
    desc: "Know your real discretionary budget after goals, EMIs, and expenses.",
    color: "bg-purple-50 text-purple-700",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-ink-900 rounded-lg flex items-center justify-center">
            <CircleDollarSign className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-semibold text-xl text-ink-900">FinWise</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
          <Link to="/register" className="btn-primary text-sm py-2 px-4">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-3xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-4 py-2 rounded-full mb-8 border border-brand-200 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse-soft" />
          Financial clarity in under 60 seconds
        </div>

        <h1 className="text-5xl md:text-6xl font-semibold text-ink-950 leading-[1.08] tracking-tight mb-6 animate-fade-up">
          Stop guessing.
          <br />
          <span className="text-ink-400">Start deciding.</span>
        </h1>

        <p className="text-lg text-ink-500 mb-10 max-w-lg leading-relaxed animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
          FinWise answers your real money questions —
          not with charts, but with a clear verdict and the reason why.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
          <Link to="/register" className="btn-primary gap-2 text-base px-8 py-3.5">
            Try it free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="btn-secondary text-base px-8 py-3.5">
            Sign in
          </Link>
        </div>

        {/* Sample verdict */}
        <div className="mt-16 w-full max-w-md text-left animate-fade-up" style={{ animationDelay: "0.3s", opacity: 0 }}>
          <div className="card p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Caution
              </span>
              <span className="text-sm text-ink-400">Affordability Check</span>
            </div>
            <p className="font-medium text-ink-800 mb-4">
              Buying now is possible, but waiting 1 month is safer.
            </p>
            <ul className="space-y-1.5">
              {["Uses 54% of your savings", "Reduces emergency cushion to 1.2 months"].map((r) => (
                <li key={r} className="flex items-center gap-2 text-sm text-ink-500">
                  <span className="w-1 h-1 rounded-full bg-ink-300 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-ink-100">
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Better Move</p>
              <p className="text-sm text-brand-700">→ Wait next salary for a safer buffer</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-ink-50 border-t border-ink-100 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold text-ink-900 text-center mb-12">
            Three decisions that matter
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card p-6 hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-ink-900 mb-2">{title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-100 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-ink-400">© 2025 FinWise. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-ink-400 hover:text-ink-700">Privacy</a>
            <a href="#" className="text-sm text-ink-400 hover:text-ink-700">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
