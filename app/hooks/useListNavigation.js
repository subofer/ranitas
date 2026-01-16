import { useCallback, useEffect, useMemo, useState, useRef } from 'react';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Hook de navegación por teclado para listas/tablas simples.
 * Basado en useKeyboard.js pero simplificado para paneles.
 *
 * @param {Object} options
 * @param {Array} options.items - Lista de ítems navegables, cada uno debe tener un `id`
 * @param {boolean} options.isActive - Si este panel está activo para navegación
 * @param {Function} options.onEnter - Callback cuando se presiona Enter en un ítem
 * @param {Function} options.onDelete - Callback cuando se presiona Delete/Backspace en un ítem
 * @param {Function} options.onLeft - Callback cuando se presiona flecha izquierda (para cambiar panel)
 * @param {Function} options.onRight - Callback cuando se presiona flecha derecha (para cambiar panel)
 * @param {Ref} options.containerRef - Ref del contenedor para scroll automático
 * @param {Ref} options.inputRef - Ref del input de búsqueda
 */
export const useListNavigation = ({
  items = [],
  isActive = false,
  onEnter,
  onDelete,
  onLeft,
  onRight,
  containerRef,
  inputRef,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedIds, setSelectedIds] = useState([]);
  const itemRefs = useRef({});

  // Mapa de índice por ID
  const indexById = useMemo(() => {
    const map = new Map();
    items.forEach((item, i) => {
      if (item?.id) map.set(item.id, i);
    });
    return map;
  }, [items]);

  // ID del ítem enfocado
  const focusedId = useMemo(() => {
    if (focusedIndex < 0 || focusedIndex >= items.length) return null;
    return items[focusedIndex]?.id ?? null;
  }, [focusedIndex, items]);

  // Mover foco
  const moveFocus = useCallback((delta) => {
    if (items.length === 0) return;
    
    setFocusedIndex(prev => {
      if (prev < 0) return 0;
      return clamp(prev + delta, 0, items.length - 1);
    });
  }, [items.length]);

  // Enfocar un índice específico
  const focusIndex = useCallback((index) => {
    if (items.length === 0) {
      setFocusedIndex(-1);
      return;
    }
    setFocusedIndex(clamp(index, 0, items.length - 1));
  }, [items.length]);

  // Enfocar por ID
  const focusById = useCallback((id) => {
    const index = indexById.get(id);
    if (index !== undefined) {
      setFocusedIndex(index);
    }
  }, [indexById]);

  // Toggle selección
  const toggleSelected = useCallback((id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    );
  }, []);

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Seleccionar todos
  const selectAll = useCallback(() => {
    setSelectedIds(items.map(item => item.id).filter(Boolean));
  }, [items]);

  // Auto-scroll al ítem enfocado
  useEffect(() => {
    if (focusedIndex < 0 || !isActive) return;
    
    const item = items[focusedIndex];
    if (!item?.id) return;
    
    const element = itemRefs.current[item.id];
    if (element && containerRef?.current) {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex, items, isActive, containerRef]);

  // Keyboard handler
  useEffect(() => {
    if (!isActive) {
      hasKeyboardCapture.current = false;
      return;
    }

    const handleKeyDown = (e) => {
      // No interferir si el usuario está usando Alt (navbar)
      if (e.altKey) return;

      const active = document.activeElement;
      const activeIsBody = active === document.body || active === document.documentElement;
      
      // No interferir si el foco está en un elemento fuera del panel
      // (navbar, modals, etc.)
      const isInContainer = containerRef?.current?.contains(active);
      const isInInput = inputRef?.current === active;
      
      // Si el foco no está en body ni en el contenedor ni en el input, y no tenemos captura, no interferir
      if (!activeIsBody && !isInContainer && !isInInput && !hasKeyboardCapture.current) return;

      // No interferir si el usuario está escribiendo en un input (excepto nuestro input de búsqueda)
      const isEditing = active?.tagName === 'INPUT' || 
                        active?.tagName === 'TEXTAREA' || 
                        active?.contentEditable === 'true';
      
      const isSearchInput = inputRef?.current === active;
      
      if (isEditing && !isSearchInput) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (isSearchInput) {
            // Desde input, ir al primer ítem
            focusIndex(0);
            inputRef?.current?.blur();
          } else {
            moveFocus(1);
          }
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          if (focusedIndex <= 0 && inputRef?.current) {
            // Volver al input de búsqueda
            setFocusedIndex(-1);
            inputRef.current.focus();
          } else {
            moveFocus(-1);
          }
          break;
          
        case 'ArrowLeft':
          if (!isSearchInput && onLeft) {
            e.preventDefault();
            onLeft();
          }
          break;
          
        case 'ArrowRight':
          if (!isSearchInput && onRight) {
            e.preventDefault();
            onRight();
          }
          break;
          
        case 'Enter':
          if (focusedIndex >= 0 && onEnter) {
            e.preventDefault();
            onEnter(items[focusedIndex]);
          }
          break;
          
        case 'Delete':
        case 'Backspace':
          if (!isEditing && focusedIndex >= 0 && onDelete) {
            e.preventDefault();
            onDelete(items[focusedIndex]);
          }
          break;
          
        case ' ':
          if (!isEditing && focusedIndex >= 0) {
            e.preventDefault();
            const item = items[focusedIndex];
            if (item?.id) toggleSelected(item.id);
          }
          break;
          
        case 'Escape':
          e.preventDefault();
          setFocusedIndex(-1);
          clearSelection();
          inputRef?.current?.focus();
          break;
          
        case 'a':
          if ((e.ctrlKey || e.metaKey) && !isEditing) {
            e.preventDefault();
            selectAll();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isActive,
    focusedIndex,
    items,
    moveFocus,
    focusIndex,
    onEnter,
    onDelete,
    onLeft,
    onRight,
    toggleSelected,
    clearSelection,
    selectAll,
    inputRef,
    containerRef,
  ]);

  // Resetear foco cuando cambian los items
  useEffect(() => {
    if (items.length === 0) {
      setFocusedIndex(-1);
    } else if (focusedIndex >= items.length) {
      setFocusedIndex(items.length - 1);
    }
  }, [items.length, focusedIndex]);

  // Flag para indicar que el panel tiene captura de teclado (después de click)
  const hasKeyboardCapture = useRef(false);

  // Registrar ref de un ítem
  const registerItemRef = useCallback((id, element) => {
    if (id) {
      itemRefs.current[id] = element;
    }
  }, []);

  // Enfocar por click - simular selección de tabla y renglón
  const focusOnClick = useCallback((index) => {
    setFocusedIndex(index);
    hasKeyboardCapture.current = true;
    // Poner foco en el contenedor para que el teclado funcione
    // Usar setTimeout para asegurar que el DOM se haya actualizado
    setTimeout(() => {
      if (containerRef?.current) {
        containerRef.current.focus({ preventScroll: true });
      }
    }, 0);
  }, [containerRef]);

  // Obtener props para un ítem (para facilitar el binding)
  const getItemProps = useCallback((item, index) => ({
    ref: (el) => registerItemRef(item?.id, el),
    tabIndex: focusedIndex === index ? 0 : -1,
    'data-focused': focusedIndex === index,
    'data-selected': selectedIds.includes(item?.id),
    onClick: () => {
      setFocusedIndex(index);
      hasKeyboardCapture.current = true;
      // Poner foco en el contenedor
      setTimeout(() => {
        if (containerRef?.current) {
          containerRef.current.focus({ preventScroll: true });
        }
      }, 0);
    },
  }), [focusedIndex, selectedIds, registerItemRef, containerRef]);

  return {
    focusedIndex,
    focusedId,
    selectedIds,
    setFocusedIndex,
    focusIndex,
    focusById,
    moveFocus,
    focusOnClick,
    toggleSelected,
    clearSelection,
    selectAll,
    registerItemRef,
    getItemProps,
    isFocused: (index) => focusedIndex === index,
    isSelected: (id) => selectedIds.includes(id),
  };
};

export default useListNavigation;
