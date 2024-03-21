"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import Label from "./Label";
import HighlightMatch from '../HiglightMatch';

const FilterSelect = ({ save, options = [], valueField, textField, label, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [opcion, setOpcion] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [hgIndex, setHgIndex] = useState(-1);
  const [form, setForm] = useState(null);
  const refPadre = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);

  const filteredOptions = options?.filter((option) =>
    option[textField]?.toLowerCase()?.includes(filtro?.toLowerCase())
  );

  const phase = (opcion, filtro, abierto, index) => {
    setOpcion(opcion);
    setFiltro(filtro);
    setIsOpen(abierto);
    setHgIndex(index);
  };

  const nextIndex = useCallback((i, dir = 1) => {
    const endOfList = filteredOptions.length - 1;
    let next = i ? i : hgIndex + dir;
    next = (next > endOfList) ? 0 : (next <-1) ? endOfList : next
    setHgIndex(next)
    return next;
  },[hgIndex, filteredOptions]);

  const open = useCallback((seter, index = -1) => {
    index && nextIndex(index);
    setIsOpen(seter);
    !seter && inputRef.current.focus()
  },[nextIndex])

  const onSelect = (option) => phase(option, option[textField], false, -1);
  const resetInput = () => phase(null, '', false, -1);

  useEffect(() => {
    const formulario = refPadre.current.closest('form');
    setForm(formulario)
  }, []);


  useEffect(() => {
    const handleReset = () => phase(null, '', false, -1);
    if (form) {
      form.addEventListener('reset', handleReset);
    }
    return () => { if (form) form.removeEventListener('reset', handleReset)};
  }, [form]);

  useEffect(() => {
    const checkIfClickedOutside = (e) => {
      !isOpen && setFiltro('');
      isOpen && refPadre.current && !refPadre.current.contains(e.target) && open(false);
    };
    document.addEventListener("mousedown", checkIfClickedOutside);
    return () => {
      document.removeEventListener("mousedown", checkIfClickedOutside);
    };
  }, [isOpen, open]);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filteredOptions.length);
  }, [filteredOptions]);

  const handleKeyDown = (e) => {
    const {key: tecla} = e;
    const keyList = ["Delete", "Tab", "ArrowDown", "ArrowUp", "Enter", "Escape"];
    keyList.includes(tecla) ? e.preventDefault() : inputRef.current.focus()
    const checkit = () => optionRefs.current[nextIndex()]?.focus()

    if (['ArrowDown','Tab'].includes(tecla)) {
      !isOpen ? open(true) : checkit();
    }
    else if (tecla === 'ArrowUp') {
      !isOpen
      ? open(true)
      : hgIndex === 0
        ? open(false)
        : optionRefs.current[nextIndex(null, -1)]?.focus();
    }
    else if ((tecla === 'Enter') && hgIndex !== -1) {
      onSelect(filteredOptions[hgIndex]);
      open(false, null)
    }
    else if ((tecla === 'Escape')) {
      inputRef.current.focus()
      isOpen ? setIsOpen(false) : resetInput();
    }
    else if ((tecla === 'Delete')) {
      document.activeElement === inputRef.current
      ? inputRef.current.focus()
      : document.body.focus();
      resetInput();
    }

  };

  return (
    <div ref={refPadre} className="flex w-full flex-row justify-between">
      <Label htmlFor={props.name}>{label}</Label>
      <div className="w-3/5 relative">
        <input readOnly hidden name={props.name} value={opcion ? opcion[valueField] : ((save ? inputRef.current?.value: undefined) || 0)}/>
        <input
          ref={inputRef}
          name={"$ACTION_IGNORE_INPUT"}
          className="input[type='search'] w-full form-select rounded border-2 border-slate-200 text-right p-0 pr-8"
          placeholder={props.placeholder}
          value={opcion ? opcion[textField] : filtro}
          onChange={(e) => phase(null, e.target.value, true, -1)}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          tabIndex={props.tabIndex}
          autoComplete="off"
        />
        {isOpen && (
          <ul className="text-right absolute rounded z-10 w-full max-h-60 overflow-auto">
            {filteredOptions.map((option, index) => (
              <li
                key={option[valueField]}
                className={`form-input form-multiselect pr-8 py-0.5 text-right cursor-pointer
                  border-slate-200 focus:border-0 border-0
                  active:bg-slate-300 hover:bg-slate-200
                  focus:bg-slate-300 focus:ring-0
                  ${hgIndex == index ? "bg-slate-300" : ""}
                `}
                ref={(el) => optionRefs.current[index] = el}
                onClick={() => onSelect(option)}
                onMouseDown={(e) => e.preventDefault()}
                tabIndex="0"
                onKeyDown={handleKeyDown}
              >
                <HighlightMatch text={option[textField]} filter={filtro} largo={filteredOptions.length}/>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FilterSelect;
