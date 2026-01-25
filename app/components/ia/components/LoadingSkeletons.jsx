/**
 * Skeletons de carga animados
 */
export function LoadingSkeletons() {
  return (
    <div className="space-y-4 animate-pulse mb-6">
      <div className="bg-gray-200 rounded-xl p-6 h-32"></div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-200 rounded-lg h-24"></div>
        <div className="bg-gray-200 rounded-lg h-24"></div>
      </div>
      <div className="space-y-2">
        <div className="bg-gray-200 rounded-lg h-20"></div>
        <div className="bg-gray-200 rounded-lg h-20"></div>
        <div className="bg-gray-200 rounded-lg h-20"></div>
      </div>
    </div>
  )
}
