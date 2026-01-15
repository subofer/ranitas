"use client";
import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFormStatus } from "react-dom";
import { createPortal } from 'react-dom';
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
  allowCreate = false,
  onCreate,
  onNavigateNext,
  onNavigatePrev,
  size,
  acceptFirstOnEnter = false,
  disableMouseSelect = false,
  compact = false,
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
  const [openUp, setOpenUp] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const refPadre = useRef(null);
  const inputRef = useRef(null)
  const valueRef = useRef(null)
  const dropdownRef = useRef(null)

  const optionRefs = useRef([]);

  const filteredOptions = useMemo(() => {
    let filtered = options.filter((option) => {
      const raw = option?.[textField];
      const hay = String(raw ?? '').toLowerCase();
      const needle = String(filtro ?? '').toLowerCase();
      return hay.includes(needle);
    });

    // Si solo hay una opción filtrada y es la seleccionada, mostrar todas las opciones
    if (filtered.length === 1 && opcion && filtered[0][valueField] === opcion[valueField]) {
      filtered = options;
    }

    return filtered;
  }, [options, filtro, textField, opcion, valueField]);

  const canCreate = useMemo(() => {
    if (!allowCreate) return false;
    const txt = String(filtro ?? '').trim();
    if (!txt) return false;
    if (typeof onCreate !== 'function') return false;
    const exact = filteredOptions.some((o) => String(o?.[textField] ?? '').trim().toLowerCase() === txt.toLowerCase());
    return !exact;
  }, [allowCreate, filtro, filteredOptions, onCreate, textField]);

  const sizeClasses = useMemo(() => {
    if (size === 'kiosk') {
      return {
        input: 'text-lg h-[56px]',
        overlay: 'h-[56px]',
        labelBase: 'text-base',
      };
    }
    return {
      input: '',
      overlay: 'h-[46px]',
      labelBase: 'text-sm',
    };
  }, [size]);

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

  useImperativeHandle(ref, () => {
    return {
      focus: () => inputRef.current?.focus?.(),
      clear: () => resetInput(),
      getInput: () => inputRef.current,
    };
  }, [resetInput]);

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

  useEffect(() => {
    if (!isOpen) {
      setOpenUp(false);
      return;
    }
    const el = inputRef.current; // Cambiar a inputRef para precisión
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Si no hay espacio debajo, abrir hacia arriba.
    const shouldOpenUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    setOpenUp(shouldOpenUp);

    if (compact) {
      // Calcular posición para el portal solo en compact
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      setDropdownPosition({
        top: shouldOpenUp ? rect.top + scrollTop - 4 : rect.bottom + scrollTop + 4,
        left: rect.left + scrollLeft,
        width: rect.width,
      });
    }
  }, [isOpen, compact]);



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
      setTimeout(() => {
        if (isOpen && refPadre.current && !refPadre.current.contains(e.target)) {
          open(false);
        }
      }, 0);
    };
    document.addEventListener("click", checkIfClickedOutside);
    return () => {
      document.removeEventListener("click", checkIfClickedOutside);
    };
  }, [isOpen, open]);

  useEffect(() => {
    if (!isOpen && !opcion) {
      setFiltro('');
    }
  }, [isOpen, opcion]); // open está incluido

  useEffect(() => {
    const seleccionInicial = options.find((option) => {
      return (option?.[valueField] == value?.[valueField] || option?.[valueField] == value)
    });

    if (seleccionInicial) {
      setOpcion(seleccionInicial);
      // No establecer filtro por defecto para mostrar todas las opciones al abrir
      // setFiltro(seleccionInicial[textField]);
    }
  }, [value, options, valueField, textField, data]);

  //Esta funcion maneja las acciones al tocar cada tecla de la lista.
  const handleKeyDown = (e) => {
    const { key: tecla } = e;

    // Caso kiosko UX: si ya hay una opción seleccionada y el dropdown tiene una sola opción
    // (la misma), ArrowDown debe ir directo al siguiente control (tabla).
    if (tecla === 'ArrowDown' && opcion && filteredOptions.length <= 1) {
      e.preventDefault();
      setIsOpen(false);
      onNavigateNext?.();
      return;
    }

    if(["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(tecla)) {
      e.preventDefault()
      if (["ArrowDown", "ArrowUp"].includes(tecla)) {
        !isOpen && open(true)
      }
    }

    const checkit = (i, dir) => optionRefs.current[nextIndex(i, dir)]?.focus()

    if (tecla === 'ArrowDown') {
      if (isOpen) {
        e.preventDefault();
        checkit();
      }
      // Si no está abierto y no hay filtro, ir al siguiente (tabla)
      else if (!filtro) {
        e.preventDefault();
        onNavigateNext?.();
      }
    } else if (tecla === 'ArrowUp') {
      isOpen && (e.preventDefault(), checkit(null, -1));
    } else if ((tecla === 'Enter')) {
      e.preventDefault();
      // Si hay opción seleccionada en el dropdown, seleccionarla
      if (hgIndex !== -1) {
        onSelect(filteredOptions[hgIndex]);
        open(false, null)
      }
      // Si no hay resultados y está habilitado, crear
      else if (canCreate && filteredOptions.length === 0) {
        const txt = String(filtro ?? '').trim();
        open(false, null);
        onCreate?.(txt);
      }
      // Modo POS/Kiosk: Enter acepta la primera coincidencia si no hay highlight
      else if (acceptFirstOnEnter && filteredOptions[0] && filtro && !opcion) {
        onSelect(filteredOptions[0]);
        open(false, null);
      }
      // Si dropdown está cerrado, ir a la tabla
      else if (!isOpen) {
        onNavigateNext?.();
      }
    } else if ((tecla === 'Escape')) {
      e.preventDefault();
      if (isOpen) {
        setIsOpen(false);
        inputRef.current.focus();
      } else {
        resetInput();
        onNavigatePrev?.();
      }
    } else if ((tecla === 'Tab')) {
      // Si hay autocompletado visible (filtro + primera opción filtrada), aceptar la sugerencia
      if (filteredOptions[0] && filtro && !opcion) {
        e.preventDefault();
        onSelect(filteredOptions[0]);
      } 
      // Si hay opción seleccionada en la lista, aceptarla
      else if (hgIndex != -1) {
        e.preventDefault();
        onSelect(filteredOptions[hgIndex])
      }
      // Si no hay filtro abierto y está vacío, permitir navegar al siguiente elemento
      else if (!isOpen && !filtro) {
        e.preventDefault();
        onNavigateNext?.();
      }
    } else if ((tecla === 'ArrowRight') && filteredOptions[0] && filtro && !opcion) {
      // Presionar flecha derecha también acepta la sugerencia
      e.preventDefault();
      onSelect(filteredOptions[0]);
    } else if ((tecla === 'ArrowLeft') && !isOpen) {
      // Flecha izquierda navega al elemento anterior
      e.preventDefault();
      onNavigatePrev?.();
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

      <div className="relative bg-white" onClick={() => {
        if (!pending && !busy) {
          setIsOpen(prev => !prev);
          if (!isOpen) inputRef.current?.focus();
        }
      }}>
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
          disabled={pending || busy}
          className={`
            appearance-none
            text-left
            text-gray-900
            block w-full
            ${compact ? 'px-2 py-1 h-[32px] border border-gray-300 rounded-md' : 'px-2.5 pt-6 pb-3 h-[52px] border-0 border-b-2 border-gray-300'}
            bg-white
            focus:outline-none focus:ring-0
            focus:border-slate-400 peer
            transition-all duration-500 ease-in-out
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-gray-500
            ${pending || busy ? "bg-gray-100" : ""}
            ${sizeClasses.input}
          `}
          title={(hgIndex !== -1 ? filteredOptions[hgIndex] : filteredOptions[0]) && filtro && !opcion ? `Presiona Tab para completar: ${(hgIndex !== -1 ? filteredOptions[hgIndex] : filteredOptions[0])[textField]}` : ''}
        />
        {/* Autocompletado en texto gris */}
        {(hgIndex !== -1 ? filteredOptions[hgIndex] : filteredOptions[0]) && filtro && !opcion && (
          <div className={`absolute left-0 top-0 pointer-events-none ${compact ? 'px-2 py-1 pr-10 h-[32px]' : 'px-2.5 pt-6 pb-3 pr-10 h-[52px]'} ${sizeClasses.overlay} flex items-center`}>
            <span className="text-gray-900">{filtro}</span>
            <span className="text-gray-400 font-light">{(hgIndex !== -1 ? filteredOptions[hgIndex] : filteredOptions[0])[textField].substring(filtro.length)}</span>
          </div>
        )}

        {/* Label flotante dentro del input */}
        {label && (
          <span
            className={`absolute left-0 transition-all duration-500 ease-in-out px-2.5 bg-white
              text-sm font-medium top-1 text-black
              ${hasValue || props.placeholder ? "top-1 text-sm" : "top-3 text-base"}`
            }
          >
            {label}
          </span>
        )}

        {/* Icono del dropdown */}
        <div 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
        >
          <Icon
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'} ${iconoSegunCaso.className}`}
            tabIndex={-1}
            icono={iconoSegunCaso.icono}
          />
        </div>
      </div>

      {isOpen && (compact ? (
        createPortal(
          <div
            ref={dropdownRef}
            className="bg-white border border-gray-300 rounded-md shadow-xl max-h-72 overflow-auto z-50"
            style={{
              position: 'absolute',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            {canCreate ? (
              <li
                key="__create__"
                className="cursor-pointer p-3 text-gray-900 hover:bg-gray-50 transition-colors duration-150"
                onClick={() => {
                  const txt = String(filtro ?? '').trim();
                  phase(null, txt, false, -1);
                  onCreate?.(txt);
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                + Crear: <span className="font-semibold">{String(filtro ?? '').trim()}</span>
              </li>
            ) : null}
            {filteredOptions.map((option, index) => {
              const active = hgIndex === index
                ? "bg-blue-200 font-semibold"
                : "hover:bg-gray-50"
              return(
                <li key={index}
                  className={`cursor-pointer p-3 text-gray-900 ${active} transition-colors duration-150`}
                  ref={(el) => optionRefs.current[index] = el}
                  onClick={() => { if (!disableMouseSelect) onSelect(option); }}
                  onMouseDown={(e) => e.preventDefault()}
                  onKeyDown={handleKeyDown}
                >
                  <HighlightMatch text={option[textField]} filter={filtro} largo={filteredOptions.length}/>
                </li>
            )})}
          </div>,
          document.body
        )
      ) : (
        <ul
          className={`absolute w-full max-h-72 overflow-auto bg-white border border-gray-300 rounded-md shadow-xl z-50 ${openUp ? 'bottom-full' : 'top-full'}`}
        >
        {canCreate ? (
          <li
            key="__create__"
            className="cursor-pointer p-3 text-gray-900 hover:bg-gray-50 transition-colors duration-150"
            onClick={() => {
              const txt = String(filtro ?? '').trim();
              phase(null, txt, false, -1);
              onCreate?.(txt);
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            + Crear: <span className="font-semibold">{String(filtro ?? '').trim()}</span>
          </li>
        ) : null}
        {filteredOptions.map((option, index) => {
          const active = hgIndex === index
            ? "bg-blue-200 font-semibold"
            : "hover:bg-gray-50"
          return(
            <li key={index}
              className={`cursor-pointer p-3 text-gray-900 ${active} transition-colors duration-150`}
              ref={(el) => optionRefs.current[index] = el}
              onClick={() => { if (!disableMouseSelect) onSelect(option); }}
              onMouseDown={(e) => e.preventDefault()}
              onKeyDown={handleKeyDown}
            >
              <HighlightMatch text={option[textField]} filter={filtro} largo={filteredOptions.length}/>
            </li>
        )})}
      </ul>))}
    </div>
  );
});

FilterSelect.displayName = "FilterSelect";

export default FilterSelect;