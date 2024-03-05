"use client"
import { useState, useRef, useEffect } from 'react';
import Label from "./Label";

const FilterSelect = ({ options, valueField, textField, label, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [filter, setFilter] = useState('');
  const refContainer = useRef(null);

  const filteredOptions = options.filter((option) =>
    option[textField].toLowerCase().includes(filter.toLowerCase())
  );

  const onSelect = (option) => {
    setSelectedOption(option);
    setFilter('');
    setIsOpen(false);
  };

  useEffect(() => {
    const checkIfClickedOutside = (e) => {
      if (isOpen && refContainer.current && !refContainer.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", checkIfClickedOutside);
    return () => {
      document.removeEventListener("mousedown", checkIfClickedOutside);
    };
  }, [isOpen]);

  return (
    <div ref={refContainer} className="flex w-full flex-row justify-between">
      <Label htmlFor={props.name}>{label}</Label>
      <div className="w-3/5 relative">
        <input
          className="
          input[type='search']
            w-full
            form-select
            rounded
            border-2
            border-slate-200
            text-right
            p-0
            pr-8
          "
          placeholder={props.placeholder}
          value={selectedOption ? selectedOption[textField] : filter}
          onChange={(e) => {
            setIsOpen(true);
            setFilter(e.target.value);
            if(selectedOption) {
              setSelectedOption(null);
            }
          }}
          onClick={() => setIsOpen(!isOpen)}
          {...props}
        />
        {isOpen && (
          <ul className="text-right absolute z-10 w-full bg-white border border-slate-200 max-h-60 overflow-auto">
            {filteredOptions.map((option) => (
              <li
                key={option[valueField]}
                className="
                  p-2
                  hover:bg-slate-300
                  cursor-pointer
                  "
                onClick={() => onSelect(option)}
                onMouseDown={(e) => e.preventDefault()}
              >
                {option[textField]}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FilterSelect;
