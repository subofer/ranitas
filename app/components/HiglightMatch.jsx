"use client"

const Hl = (t, e, u) => t.split(e).filter(Boolean).map((p, i) =>
  <span key={i} className={`text-gray-900 ${ e.test(p) && "bg-green-200"}`}>{p}</span>
);

const HighlightMatch = ({ text:t, filter:f, largo:l }) => (
  !!f.trim() ? Hl(t, new RegExp(`(${f})`, 'gi'), l === 1) : <span className="text-gray-900">{t}</span>
);

export default HighlightMatch;