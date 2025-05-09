"use client"
import { useEffect, useState } from "react";
import Phill from "./Phill";


const InputArrayList = ({ name, placeholder, label, value, onChange, onRemove, ...props }) => {
 const [altura, setAltura] = useState(120)

  useEffect(() => {
    let a = ((5/4)*40)
    setAltura(250)
  },[setAltura, value, altura])

  return (
  <div className="relative">
    <div 
      className={`flex flex-row form-input 
        transition-all duration-500 ease-in-out 
        w-full min-h-[2.5rem] ${value.length == 0 ? "h-[3.1rem]": "grows"}
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
      <div className="flex flex-row-reverse justify-start align-middle flex-wrap ml-20 gap-2 w-full">
        {value.length > 0
          ? value.map((item, index) => (
              <div key={index} className="transition-opacity duration-300 ease-in-out opacity-0 animate-fade-in">
                <Phill value={item} onRemove={onRemove} />
              </div>
            ))
          : <span
              className="
                text-gray-500
                mt-3.5
                transition-opacity
                duration-300
                ease-in-out
                opacity-0
                animate-fade-in"
            >
              {placeholder}
            </span>
        }
      </div>
    </div>
  </div>
  );
};

export default InputArrayList;
