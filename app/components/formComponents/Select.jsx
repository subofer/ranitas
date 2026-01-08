"use client"

import Icon from "./Icon";

const Option = ({text, value, ...props}) => <option value={value} {...props}>{text}</option>;

const Select = ({
  options,
  valueField,
  textField,
  label,
  placeholder = "Elija el tipo",
  loading,
  showIcon = false,
  ...props
}) => {
  const hasValue = props.value && props.value !== "";
  const displayPlaceholder = !hasValue && placeholder;

  return(
    <div className="relative w-full">
      <select
        className={`
          appearance-none
          text-right
          text-gray-900
          block w-full
          px-2.5 pt-6 pb-3
          h-[52px]
          border-0 border-b-2 border-gray-300
          bg-transparent
          focus:outline-none focus:ring-0
          focus:border-slate-400 peer
          transition-all duration-500 ease-in-out
          disabled:opacity-50 disabled:cursor-not-allowed
          ${loading ? "bg-gray-50" : ""}
          ${displayPlaceholder ? "text-gray-500" : ""}
          pr-8
        `}
        disabled={loading}
        {...props}
      >
        {displayPlaceholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options?.map((o, i) =>
          <Option
            key={i}
            value={o[valueField]}
            text={o[textField]}
          />
        )}
      </select>

      {/* Label flotante dentro del select */}
      {label && (
        <span
          className={`absolute left-0 transition-all duration-500 ease-in-out px-2.5
            text-sm font-medium top-1 text-black
            ${hasValue || props.placeholder ? "top-1 text-sm" : "top-3 text-base"}`
          }
        >
          {label}
        </span>
      )}
    </div>
  )
};

export default Select;
