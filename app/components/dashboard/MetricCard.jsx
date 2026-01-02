export function MetricCard({ title, value, change, changeType, icon, color = "blue" }) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      icon: "text-blue-500"
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-600",
      icon: "text-green-500"
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      icon: "text-purple-500"
    },
    orange: {
      bg: "bg-orange-50",
      text: "text-orange-600",
      icon: "text-orange-500"
    },
    red: {
      bg: "bg-red-50",
      text: "text-red-600",
      icon: "text-red-500"
    },
    indigo: {
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      icon: "text-indigo-500"
    }
  };

  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'positive' ? 'text-green-600' :
              changeType === 'negative' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              <span className={`mr-1 ${
                changeType === 'positive' ? '↗' :
                changeType === 'negative' ? '↘' :
                '●'
              }`}>
                {changeType === 'positive' ? '↗' :
                 changeType === 'negative' ? '↘' :
                 '●'}
              </span>
              {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${colors.bg}`}>
          <div className={`text-2xl ${colors.icon}`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
