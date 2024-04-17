"use client";
import { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import { useFormStatus } from "react-dom";
import HighlightMatch from '../HiglightMatch';
import Icon from './Icon';
import Input from './Input';

const FilterSelect = forwardRef(({
  value,
  label,
  options = [],
  valueField,
  textField,
  save,
  busy = false,
  ...props
},
ref
) => {
  const { pending } = useFormStatus();

  const [form, setForm] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [opcion, setOpcion] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [hgIndex, setHgIndex] = useState(-1);
  const refPadre = useRef(null);
  const inputRef = useRef(null)
  const valueRef = useRef(null)

  const optionRefs = useRef([]);

  const filteredOptions = useMemo(
    () => options.filter(option =>
      option[textField].toLowerCase().includes(filtro.toLowerCase())
  ), [options, filtro, textField]);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filteredOptions.length);
  }, [filteredOptions]);

  const phase = (opcion, filtro, abierto, index) => {
    setOpcion(opcion);
    setFiltro(filtro);
    setIsOpen(abierto);
    setHgIndex(index);
  };

  const resetInput = useCallback(() => phase(null, '', false, -1),[]);

  useEffect(() => {
    if(isOpen && hgIndex >= 0){
      const ref = optionRefs.current[hgIndex];
      const smoothOrAuto = (hgIndex == 0 || hgIndex+1 == optionRefs.current.length)
      ref && ref.scrollIntoView({behavior: smoothOrAuto ? "auto" : "smooth",block: "nearest"});
      }
  }, [hgIndex, isOpen]);

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
    props?.onChange?.({
      name: props.name,
      value: option[valueField],
      valueField,
      textField,
      option,
    })
  }


  useEffect(() => {
    const formulario = refPadre.current.closest('form');
    if(formulario) {
      setForm(formulario)
    }
  }, []);

  useEffect(() => {
    if (form) form.addEventListener('reset', resetInput);
    return () => { if (form) form.removeEventListener('reset', resetInput)};
  }, [form, resetInput]);

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
    if (value) {
      const seleccionInicial = options.find((option) => {
        return (option[valueField] == value[valueField] || option[valueField] == value)
      });

      if (seleccionInicial) {
        setOpcion(seleccionInicial);
        setFiltro(seleccionInicial[textField]);
      }
    }
  }, [value, options, valueField, textField, props.formData]);

  //Esta funcion maneja las acciones al tocar cada tecla de la lista.
  const handleKeyDown = (e) => {
    const { key: tecla } = e;
    if(["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(tecla)) {
      e.preventDefault()
      if (["ArrowDown", "ArrowUp"].includes(tecla)) {
        !isOpen && open(true)
      }
    }

    const checkit = (i, dir) => optionRefs.current[nextIndex(i, dir)]?.focus()

    if (tecla === 'ArrowDown') {
      isOpen && checkit();
    } else if (tecla === 'ArrowUp') {
      isOpen && checkit(null, -1);
    } else if ((tecla === 'Enter') && hgIndex !== -1) {
      onSelect(filteredOptions[hgIndex]);
      open(false, null)
    } else if ((tecla === 'Escape')) {
      inputRef.current.focus()
      isOpen ? setIsOpen(false) : resetInput();
    } else if ((tecla === 'Tab' && hgIndex != -1)) {
      onSelect(filteredOptions[hgIndex])
    }
  };

  //Esto es completamente innecesario, pero queda lindo.
  const iconoSegunCaso = useMemo(() => {
    let ocupado = pending || busy ;
    let vacio = filteredOptions?.length == 0;

    return {
      icono: ocupado ? 'spinner': vacio ? 'xmark' : 'chevron-up',
      className:`
        ${ocupado ? "spin-slow": "transition-transform "}
        ${isOpen && !vacio ? 'rotate-180' : 'rotate-0'}
        ${vacio ? "pointer-events-none":""}
      `,
    }

  },[busy, filteredOptions?.length, isOpen, pending])

  return (
    <div ref={refPadre} className="relative">
      <input
        ref={valueRef}
        readOnly
        hidden
        name={props.name}
        value={opcion ? opcion[valueField] : ((save ? inputRef.current?.value : undefined) || 0)}
      />
      <Input
        name={`$ACTION_IGNORE_INPUT_JUST_FOR_LABEL_${props.name}`}
        ref={inputRef}
        placeholder={props.placeholder}
        value={opcion ? opcion[textField] : filtro}
        onChange={({value}) => phase(null, value, true, -1)}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={props.tabIndex}
        autoComplete="off"
        onBlur={() => setIsOpen(false)}
        label={label}
        disabled={pending || busy}
        actionIcon={
          <Icon
            className={iconoSegunCaso.className}
            tabIndex={-1}
            icono={iconoSegunCaso.icono}
            onClick={() => setIsOpen(prev => !prev)}
            />
        }
      />
      <ul
        className={`${!isOpen ? 'hidden' : 'absolute' } z-10 w-full max-h-60 overflow-auto
          bg-white shadow-md drop-shadow-[0px_0px_5px_rgba(229,231,235,1)]
        `}>
        {filteredOptions.map((option, index) => {
          const active = hgIndex === index
            ? "bg-slate-300 hover:bg-slate-500"
            : "hover:bg-slate-400"
          return(
            <li key={index}
              className={`cursor-pointer p-2 ${active}`}
              ref={(el) => optionRefs.current[index] = el}
              onClick={() => onSelect(option)}
              onMouseDown={(e) => e.preventDefault()}
              onKeyDown={handleKeyDown}
            >
              <HighlightMatch text={option[textField]} filter={filtro} largo={filteredOptions.length}/>
            </li>
        )})}
      </ul>
    </div>
  );
});

FilterSelect.displayName = "FilterSelect";

export default FilterSelect;