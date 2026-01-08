"use client"

import { useState } from "react";

const Phill = ({ value, onRemove, children, className }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    if(!onRemove) return;
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(value.id);
      setIsRemoving(false);
    }, 300);
  };

  return (
    <div className={`max-w-fit bg-blue-200 rounded-full px-2 py-1 ${isRemoving ? 'shrink' : 'grow'} ${className}`}>
      <span>{value?.nombre || children}</span>
      { onRemove && 
        <button type="button" onClick={handleRemove} className="ml-2 text-slate-600 hover:text-slate-800">
          &times;
        </button>
      }
    </div>
  );
};

export default Phill;