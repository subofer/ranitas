"use client"
import { useEffect, useState } from "react";

const Pill = ({ value, onRemove }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(value.id);
      setIsRemoving(false);
    }, 300);
  };

  return (
    <div className={`bg-blue-200 rounded-full px-2 py-1 ${isRemoving ? 'shrink' : 'grow'}`}>
      <span>{value.nombre}</span>
      <button type="button" onClick={handleRemove} className="ml-2 text-slate-600 hover:text-slate-800">
        &times;
      </button>
    </div>
  );
};

const InputArrayList = ({ name, placeholder, label, value, onChange, onRemove, ...props }) => {
 const [altura, setAltura] = useState(120)
  
  useEffect(() => {
    let a = ((5/4)*40)
    setAltura(250)
    console.log(altura)

  },[setAltura, value, altura])

  return (
  <div className="relative">
    <div className={`flex flex-row form-input w-full min-h-[52px] h-[3rem]
        border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0
        focus:border-slate-400 peer
      `}
    >
      <span
        className={`absolute left-0 transition-all px-2.5
          text-sm font-medium top-0.5 text-black
          ${value.length > 0 ? "top-0.5 text-sm" : "top-2.5 text-md"}`
        }>
        {label}
      </span>
      <div className="flex flex-row justify-end align-middle flex-wrap ml-20 gap-2 h-full w-full">
        {value.length > 0
          ? value.map((item, index) => (
            <>
              <div key={index} className="transition-opacity duration-300 ease-in-out opacity-0 animate-fade-in">
                <Pill value={item} onRemove={onRemove} />
              </div>
            </>
            ))
          : <span className="text-gray-500 mt-4 transition-opacity duration-300 ease-in-out opacity-0 animate-fade-in">{placeholder}</span>
        }
      </div>
    </div>
  </div>
  );
};

export default InputArrayList;
