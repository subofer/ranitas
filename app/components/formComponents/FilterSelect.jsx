"use client";
import { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import HighlightMatch from '../HiglightMatch';
import Icon from './Icon';

const FilterSelect = forwardRef(({ value, save, options = [], valueField, textField, label, ...props }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [opcion, setOpcion] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [hgIndex, setHgIndex] = useState(-1);
  const [form, setForm] = useState(null);
  const refPadre = useRef(null);
  const inputRef = useRef(null)

  const optionRefs = useRef([]);

  const filteredOptions = useMemo(
    () => options.filter(option => option[textField].toLowerCase().includes(filtro.toLowerCase())
  ), [options, filtro, textField]);

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
  },[nextIndex, inputRef])

  const onSelect = (option) => {
    phase(option, option[textField], false, -1);
    if (props?.onChange) {props.onChange(valueField, option[valueField], option)};
  }

  const resetInput = () => phase(null, '', false, -1);

  useEffect(() => {
    const formulario = refPadre.current.closest('form');
    if(formulario){
      setForm(formulario)
    }
  }, []);

  useEffect(() => {
    const handleReset = () => phase(null, '', false, -1);
    if (form) form.addEventListener('reset', handleReset);
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

  useEffect(() => {
    if (value) {
      const seleccionInicial = options.find((option) => option[valueField] == value);
      if (seleccionInicial) {
        setOpcion(seleccionInicial);
        setFiltro(seleccionInicial[textField]);
      }
    }
  }, [value, options, valueField, textField]);

  const handleKeyDown = (e) => {
    const { key: tecla } = e;
    const keyList = ["Delete", "ArrowDown", "ArrowUp", "Enter", "Escape"];
    if(keyList.includes(tecla)){ e.preventDefault() }
    const checkit = () => optionRefs.current[nextIndex()]?.focus()

    if (['ArrowDown'].includes(tecla)) {
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
    else if ((tecla === 'Tab' && hgIndex != -1)) {
      onSelect(filteredOptions[hgIndex])
    }
  };

  return (
    <div ref={refPadre} className="relative">
      <input
        readOnly
        hidden
        name={props.name}
        value={opcion ? opcion[valueField] : ((save ? inputRef.current?.value : undefined) || 0)}
      />
      <div className="flex items-center">
        <input
          ref={inputRef}
          name={"$ACTION_IGNORE_INPUT"}
          //placeholder:translate-y-2 form-input block text-right w-full pr-10 pb-2.5 pt-4 border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-black peer
          className="
          form-input
          block w-full
          px-2.5 pb-2.5 pr-8
          pt-4 border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0
          focus:border-slate-400 peer
          text-right
          placeholder:translate-y-2 
            "
          placeholder={props.placeholder}
          value={opcion ? opcion[textField] : filtro}
          onChange={(e) => phase(null, e.target.value, true, -1)}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          tabIndex={props.tabIndex}
          autoComplete="off"
          onBlur={() => setIsOpen(false)}
        />
        <label
          htmlFor={inputRef.current}
          className={`
              absolute left-0 transition-all px-2.5
              text-sm font-medium top-0.5 text-black
              peer-placeholder-shown:text-md peer-placeholder-shown:top-2.5 
              peer-focus:text-sm peer-focus:top-0.5
            `}>
          {label}
        </label>
        <div className="pointer-events-none absolute right-2 top-[50%] transform -translate-y-1/2">
          <div className={`transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
            <Icon tabIndex={-1} icono={"chevron-up"}/>
          </div>
        </div>

      </div>
      {isOpen && (
        <ul className="
          absolute
          rounded
          z-10
          w-full
          max-h-60
          overflow-auto
          border
          border-gray-200
          mt-0
          bg-white
          shadow-md
          drop-shadow-[0px_0px_5px_rgba(229,231,235,1)]

          ">
          {filteredOptions.map((option, index) => (
            <li
              key={option[valueField]}
              className={`cursor-pointer p-2 ${hgIndex === index ? "bg-slate-300 hover:bg-slate-500" : "hover:bg-slate-400"}`}
              ref={(el) => optionRefs.current[index] = el}
              onClick={() => onSelect(option)}
              onMouseDown={(e) => e.preventDefault()}
              //tabIndex={0}
              onKeyDown={handleKeyDown}
            >
              <HighlightMatch text={option[textField]} filter={filtro} largo={filteredOptions.length}/>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

FilterSelect.displayName = "FilterSelect";

export default FilterSelect;