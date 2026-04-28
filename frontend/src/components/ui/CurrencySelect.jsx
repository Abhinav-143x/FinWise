import clsx from "clsx";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
];

export function getCurrencySymbol(code) {
  return CURRENCIES.find((c) => c.code === code)?.symbol || code;
}

export function formatCurrency(amount, code = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CurrencySelect({ value, onChange, className }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm text-ink-800",
        "focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all",
        className
      )}
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code} — {c.name}
        </option>
      ))}
    </select>
  );
}
