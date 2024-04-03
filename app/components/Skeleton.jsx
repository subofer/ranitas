"use client"
const Skeleton = ({className}) => (
  <span className={`animate-pulse p-3 m-2 flex h-full w-full bg-slate-300 rounded ${className}`}>
    <span className="max-w-full w-full">
    </span>
  </span>
)

export default Skeleton;
