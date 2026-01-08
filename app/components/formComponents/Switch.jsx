import { useState, useRef, useId, useEffect } from "react";
import useParentForm from "@/hooks/useParentForm";
import { useFormStatus } from "react-dom";
import useHotkey from "@/hooks/useHotkey";

const Switch = ({ name, value, label, seconLabel, onChange }) => {
  const id = useId();
  const { refPadre, reset } = useParentForm();
  const { pending } = useFormStatus();
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleOnClick = () => {
    inputRef.current.checked = !inputRef.current.checked;
    onChange?.({ name, value: inputRef.current.checked, type: "checkbox" });
  };

  useHotkey(['Enter'], refPadre, handleOnClick);
  useHotkey(['ArrowRight'], refPadre, handleOnClick);
  useHotkey(['ArrowLeft'], refPadre, handleOnClick);

  useEffect(() => {
    setIsFocused(false);
  }, [reset]);

  return (
    <div
      ref={refPadre}
      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
    >
      {/* Labels */}
      <div className="flex-1">
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 cursor-pointer select-none block"
        >
          {label}
        </label>
        {seconLabel && (
          <span className="text-xs text-gray-500 block mt-0.5">
            {seconLabel}
          </span>
        )}
      </div>

      {/* Hidden checkbox */}
      <input
        id={id}
        name={name}
        value={value}
        ref={inputRef}
        type="checkbox"
        className="hidden"
        readOnly
      />

      {/* Toggle Switch */}
      <div
        onClick={handleOnClick}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${value ? 'bg-blue-600' : 'bg-gray-300'}
          ${pending ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out
            ${value ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </div>
    </div>
  );
}

export default Switch;
