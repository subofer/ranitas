"use client"

const hl = (t, e, u) => t.split(e).filter(Boolean).map((p, i) =>
  <span key={i}
    className={`
      rounded
      py-0.5
      ${ e.test(p) && (u ?"bg-green-200":"bg-blue-200")}
    `}
  >
    {p}
  </span>
);

const HighlightMatch = ({ text:t, filter:f, largo:l }) => (
  !!f.trim() ? hl(t, new RegExp(`(${f})`, 'gi'), l === 1) : t
);

export default HighlightMatch;