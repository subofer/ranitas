"use client"
import { useState, useRef, useEffect } from 'react';
import Label from "./Label";

const FilterSelect = ({ options, valueField, textField, label, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [filter, setFilter] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-2);
  const refContainer = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);

  const filteredOptions = options.filter((option) =>
    option[textField].toLowerCase().includes(filter?.toLowerCase())
  );

  const onSelect = (option) => {
    setSelectedOption(option);
    setFilter(option[textField]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };
  useEffect(() => {
    const form = refContainer.current.closest('form');
    const handleReset = () => {
      setSelectedOption(null);
      setFilter('');
      setIsOpen(false);
      setHighlightedIndex(-2);
    };
    if (form) {
      form.addEventListener('reset', handleReset);
    }
    return () => {
      if (form) {
        form.removeEventListener('reset', handleReset);
      }
    };
  }, []);

  useEffect(() => {
    const checkIfClickedOutside = (e) => {
      if(!isOpen){setFilter('')}
      if (isOpen && refContainer.current && !refContainer.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", checkIfClickedOutside);
    return () => {
      document.removeEventListener("mousedown", checkIfClickedOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filteredOptions.length);
  }, [filteredOptions]);

  const handleKeyDown = (e) => {
    const {key: tecla} = e;
    if (["Tab", "ArrowDown", "ArrowUp", "Enter", "Escape"].includes(tecla)){
      e.preventDefault();
    }
    if (tecla === 'Tab' && !isOpen && filteredOptions.length > 0) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
    else if (tecla === 'Tab' && isOpen && filteredOptions.length > 0 && highlightedIndex === -2) {
      setHighlightedIndex(-1);
      optionRefs.current[0].focus();
    }
    else if (tecla === 'Tab' && isOpen && filteredOptions.length > 0) {
      const nextIndex = highlightedIndex >= filteredOptions.length - 1 ? 0 : highlightedIndex + 1;
      setHighlightedIndex(nextIndex);
      optionRefs.current[nextIndex].focus();
    }
    else if ((tecla === 'ArrowDown' || tecla === 'ArrowUp') && !isOpen) { setIsOpen(true);}
    else if (tecla === 'ArrowDown' && isOpen) {
      const nextIndex = highlightedIndex >= filteredOptions.length - 1 ? 0 : highlightedIndex + 1;
      setHighlightedIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
    }
    else if (tecla === 'ArrowUp' && isOpen && highlightedIndex === 0) {
      inputRef.current.focus()
      setHighlightedIndex(-1)
      setIsOpen(false)
    }
    else if (tecla === 'ArrowUp' && isOpen) {
      const prevIndex = highlightedIndex <= 0 ? filteredOptions.length - 1 : highlightedIndex - 1;
      setHighlightedIndex(prevIndex);
      optionRefs.current[prevIndex]?.focus();
    }
    else if ((tecla === 'Enter') && highlightedIndex !== -1) {
      onSelect(filteredOptions[highlightedIndex]);
      setIsOpen(false)
    }
    else if ((tecla === 'Escape')) {
      inputRef.current.focus()
      setIsOpen(false)
    }
    else if (tecla === 'Backspace' || "abcdefghijklmnñopqrstuvwxyz".includes(tecla)){
      inputRef.current.focus()
    }
  };


  const highlightMatch = (text, filter) => {
    const startIndex = text.toLowerCase().indexOf(filter.toLowerCase());
    if (startIndex === -1) return text; // Si no hay coincidencia, devuelve el texto original

    const isExactAndUnique = (filteredOptions.length === 1 && filteredOptions[0][textField].toLowerCase() === filter.toLowerCase()) || filteredOptions.length == 1;
    const endIndex = startIndex + filter.length;
    const highlightClass = isExactAndUnique ? "bg-green-200" : "bg-blue-200"; // Clase verde para coincidencia exacta y única

    return (
      <>
        {text.substring(0, startIndex)}
        <span className={highlightClass}>{text.substring(startIndex, endIndex)}</span>
        {text.substring(endIndex)}
      </>
    );
  };

  return (
    <div ref={refContainer} className="flex w-full flex-row justify-between">
      <Label htmlFor={props.name}>{label}</Label>
      <div className="w-3/5 relative">
        <input readOnly hidden name={props.name} value={selectedOption ? selectedOption[valueField] : 0}/>
        <input
          ref={inputRef}
          name={"ignore"}
          className="input[type='search'] w-full form-select rounded border-2 border-slate-200 text-right p-0 pr-8"
          placeholder={props.placeholder}
          value={selectedOption ? selectedOption[textField] : filter}
          onChange={(e) => {
            setIsOpen(true);
            setFilter(e.target.value);
            setSelectedOption(null);
            setHighlightedIndex(-1);
          }}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          tabIndex={props.tabIndex}
        />
        {isOpen && (
          <ul className="
            text-right
            absolute
            z-10
            w-full
            max-h-60
            overflow-auto">
            {filteredOptions.map((option, index) => (
              <li
                className="
                  form-input
                  form-multiselect

                  border-slate-200
                  pr-8
                  py-0.5
                  text-right
                  cursor-pointer
                  active:bg-slate-300
                  hover:bg-slate-300
                  focus:bg-slate-300
                  focus:ring-0
                  focus:border-0
                  border-0

                "

                key={option[valueField]}
                ref={el => optionRefs.current[index] = el}
                onClick={() => onSelect(option)}
                onMouseDown={(e) => e.preventDefault()}
                tabIndex="0"
                onKeyDown={handleKeyDown}
              >
                {highlightMatch(option[textField], filter)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FilterSelect;
