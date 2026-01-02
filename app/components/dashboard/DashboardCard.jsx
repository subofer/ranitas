import Link from "next/link";

export function DashboardCard({ title, description, icon, href, color = "blue" }) {
  const colorClasses = {
    blue: "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700",
    green: "border-green-200 bg-green-50 hover:bg-green-100 text-green-700",
    purple: "border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700",
    orange: "border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700",
    red: "border-red-200 bg-red-50 hover:bg-red-100 text-red-700",
    indigo: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
  };

  return (
    <Link
      href={href}
      className={`
        group relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300
        ${colorClasses[color]}
        hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 group-hover:scale-105 transition-transform duration-300">
            {title}
          </h3>
          <p className="text-sm opacity-80 group-hover:opacity-100 transition-opacity duration-300">
            {description}
          </p>
        </div>
        <div className="ml-4 text-3xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500"></div>
    </Link>
  );
}
