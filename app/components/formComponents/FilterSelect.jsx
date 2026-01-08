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
  const { pending, data } = useFormStatus();

  const [form, setForm] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [opcion, setOpcion] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [hgIndex, setHgIndex] = useState(-1);

  const refPadre = useRef(null);
  const inputRef = useRef(null)
  const valueRef = useRef(null)

  const optionRefs = useRef([]);

  const filteredOptions = useMemo(() =>
    options.filter(option =>
      option[textField].toLowerCase().includes(filtro?.toLowerCase?.())
  ), [options, filtro, textField]);

  useEffect(() => {
    const formulario = refPadre.current.closest('form');
    if(formulario) {
      setForm(formulario)
    }
  }, []);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filteredOptions.length);
  }, [filteredOptions]);

  const phase = (opcion, filtro, abierto, index) => {
    setOpcion(opcion);
    setFiltro(filtro);
    setIsOpen(abierto);
    setHgIndex(index);
  };

  const resetInput = useCallback(() => {
    phase(null, '', false, -1);
    props?.onClear?.();
  },[props]);

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
      selected: {[valueField]: option[valueField]}
    })
  }

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
  }, [isOpen, open]); // open está incluido

  useEffect(() => {
    const seleccionInicial = options.find((option) => {
      return (option?.[valueField] == value?.[valueField] || option?.[valueField] == value)
    });

    if (seleccionInicial) {
      setOpcion(seleccionInicial);
      setFiltro(seleccionInicial[textField]);
    }
  }, [value, options, valueField, textField, data]);

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
    } else if ((tecla === 'Tab')) {
      e.preventDefault();
      // Si hay autocompletado visible (filtro + primera opción filtrada), aceptar la sugerencia
      if (filteredOptions[0] && filtro && !opcion) {
        onSelect(filteredOptions[0]);
      } 
      // Si hay opción seleccionada en la lista, aceptarla
      else if (hgIndex != -1) {
        onSelect(filteredOptions[hgIndex])
      }
    } else if ((tecla === 'ArrowRight') && filteredOptions[0] && filtro && !opcion) {
      // Presionar flecha derecha también acepta la sugerencia
      e.preventDefault();
      onSelect(filteredOptions[0]);
    }
  };

  //Icono según estado
  const iconoSegunCaso = useMemo(() => {
    let ocupado = pending || busy;

    return {
      icono: ocupado ? 'spinner' : isOpen ? 'chevron-up' : 'chevron-down',
      className:`
        ${ocupado ? "spin-slow" : "transition-transform duration-200"}
      `,
    }

  },[busy, pending, isOpen])

  const hasValue = opcion || (filtro && filtro.trim() !== "");

  return (
    <div ref={refPadre} className="relative">
      <input
        ref={valueRef}
        readOnly
        hidden
        name={props.name}
        value={opcion ? opcion[valueField] : ((save ? inputRef.current?.value : undefined) || 0)}
      />

      <div className="relative">
        <input
          name={`$ACTION_IGNORE_INPUT_JUST_FOR_LABEL_${props.name}`}
          ref={inputRef}
          placeholder={props.placeholder || "Buscar y seleccionar..."}
          value={opcion ? opcion[textField] : filtro}
          onChange={({target: {value}}) => phase(null, value, true, -1)}
          onFocus={() => !isOpen && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          tabIndex={props.tabIndex}
          autoComplete="off"
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          disabled={pending || busy}
          className={`
            appearance-none
            text-left
            text-gray-900
            block w-full
            px-2.5 pt-5 pb-2 pr-10
            h-[46px]
            border-0 border-b-2 border-gray-300
            bg-transparent
            focus:outline-none focus:ring-0
            focus:border-slate-400 peer
            transition-all duration-500 ease-in-out
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-gray-500
            ${pending || busy ? "bg-gray-50" : ""}
          `}
          title={(hgIndex !== -1 ? filteredOptions[hgIndex] : filteredOptions[0]) && filtro && !opcion ? `Presiona Tab para completar: ${(hgIndex !== -1 ? filteredOptions[hgIndex] : filteredOptions[0])[textField]}` : ''}
        />
        {/* Autocompletado en texto gris */}
        {(hgIndex !== -1 ? filteredOptions[hgIndex] : filteredOptions[0]) && filtro && !opcion && (
          <div className="absolute left-0 top-0 pointer-events-none px-2.5 pt-5 pb-2 pr-10 h-[46px] flex items-center">
            <span className="text-gray-900">{filtro}</span>
            <span className="text-gray-400 font-light">{(hgIndex !== -1 ? filteredOptions[hgIndex] : filteredOptions[0])[textField].substring(filtro.length)}</span>
          </div>
        )}

        {/* Label flotante dentro del input */}
        {label && (
          <span
            className={`absolute left-0 transition-all duration-500 ease-in-out px-2.5
              text-sm font-medium top-0.5 text-black
              ${hasValue || props.placeholder ? "top-0.5 text-sm" : "top-2.5 text-md"}`
            }
          >
            {label}
          </span>
        )}

        {/* Icono del dropdown */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <Icon
            rotate={isOpen}
            className={iconoSegunCaso.className}
            tabIndex={-1}
            icono={iconoSegunCaso.icono}
            onClick={() => setIsOpen(prev => !prev)}
          />
        </div>
      </div>

      <ul
        className={`${!isOpen ? 'hidden' : 'absolute' } z-10 w-full max-h-60 overflow-auto
          bg-white border border-gray-200 rounded-md shadow-lg
        `}>
        {filteredOptions.map((option, index) => {
          const active = hgIndex === index
            ? "bg-blue-200 font-semibold"
            : "hover:bg-gray-50"
          return(
            <li key={index}
              className={`cursor-pointer p-3 text-gray-900 ${active} transition-colors duration-150`}
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