import { useCallback, useEffect, useMemo, useState } from 'react';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const union = (a, b) => {
  const set = new Set(a);
  for (const x of b) set.add(x);
  return Array.from(set);
};

/**
 * Hook de navegación por teclado para listas/tablas.
 *
 * Reglas:
 * - Flechas arriba/abajo: mover foco.
 * - Espacio: togglear selección del ítem enfocado.
 * - Shift + flechas: seleccionar rango mientras se navega.
 */
export const useKeyboard = ({
  itemsOrdenados,
  pagina,
  perPageEsAll,
  perPageNum,
  totalPaginas,
  setPagina,
  inputBusquedaRef,
  categoryFilterRef,
  filaProductoRef,
  tablaRef,
  onCopySelected,
  scopeRef,
}) => {
  const [productoFocused, setProductoFocused] = useState(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [anchorIndex, setAnchorIndex] = useState(null);

  const indexById = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < (itemsOrdenados?.length || 0); i += 1) {
      const id = itemsOrdenados[i]?.id;
      if (id) map.set(id, i);
    }
    return map;
  }, [itemsOrdenados]);

  const focusIndex = useCallback(
    (nextIndex) => {
      const list = itemsOrdenados || [];
      if (!list.length) {
        setProductoFocused(null);
        return;
      }

      const bounded = clamp(nextIndex, 0, list.length - 1);
      const nextId = list[bounded]?.id;
      if (!nextId) return;

      if (!perPageEsAll && perPageNum > 0) {
        const nextPage = Math.floor(bounded / perPageNum) + 1;
        if (nextPage !== pagina) setPagina(nextPage);
      }

      setProductoFocused(nextId);
    },
    [itemsOrdenados, pagina, perPageEsAll, perPageNum, setPagina]
  );

  const toggleProductoSeleccionado = useCallback(
    (productoId) => {
      setProductosSeleccionados((prev) =>
        prev.includes(productoId) ? prev.filter((id) => id !== productoId) : [...prev, productoId]
      );

      // Mantener el foco estable al seleccionar/deseleccionar con teclado.
      setProductoFocused(productoId);
      requestAnimationFrame(() => {
        filaProductoRef?.current?.[productoId]?.focus();
      });

      const idx = indexById.get(productoId);
      if (typeof idx === 'number') setAnchorIndex(idx);
    },
    [filaProductoRef, indexById]
  );

  const selectRange = useCallback(
    (from, to) => {
      const list = itemsOrdenados || [];
      const a = clamp(from, 0, Math.max(0, list.length - 1));
      const b = clamp(to, 0, Math.max(0, list.length - 1));
      const [start, end] = a <= b ? [a, b] : [b, a];
      const ids = [];
      for (let i = start; i <= end; i += 1) {
        const id = list[i]?.id;
        if (id) ids.push(id);
      }
      setProductosSeleccionados((prev) => union(prev, ids));
    },
    [itemsOrdenados]
  );

  const moveFocus = useCallback(
    (delta, e) => {
      const list = itemsOrdenados || [];
      if (!list.length) return;

      const currentIndex = indexById.get(productoFocused);
      const baseIndex = typeof currentIndex === 'number' ? currentIndex : 0;

      if (e?.shiftKey && anchorIndex === null) setAnchorIndex(baseIndex);

      const nextIndex = clamp(baseIndex + delta, 0, list.length - 1);
      if (e?.shiftKey) {
        const anchor = anchorIndex === null ? baseIndex : anchorIndex;
        selectRange(anchor, nextIndex);
      } else {
        setAnchorIndex(nextIndex);
      }

      focusIndex(nextIndex);
    },
    [anchorIndex, focusIndex, indexById, itemsOrdenados, productoFocused, selectRange]
  );

  const handleInputKeyDown = useCallback(
    (e) => {
      const inputEl = inputBusquedaRef?.current;
      if (!inputEl) return;
      // Evitar depender de document.activeElement (puede fallar con focus/portals/overlay)
      if (e.target !== inputEl && e.currentTarget !== inputEl) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Primer ítem visible de la página actual
        const startIndex = perPageEsAll ? 0 : (pagina - 1) * perPageNum;
        focusIndex(startIndex);
      } else if (e.key === 'Tab') {
        categoryFilterRef?.current?.querySelector('input')?.focus();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        categoryFilterRef?.current?.querySelector('input')?.focus();
      }
    },
    [categoryFilterRef, focusIndex, inputBusquedaRef, pagina, perPageEsAll, perPageNum]
  );

  const handleCategoryFilterNavigateNext = useCallback(() => {
    const startIndex = perPageEsAll ? 0 : (pagina - 1) * perPageNum;
    focusIndex(startIndex);
  }, [focusIndex, pagina, perPageEsAll, perPageNum]);

  const handleCategoryFilterNavigatePrev = useCallback(() => {
    inputBusquedaRef?.current?.focus();
  }, [inputBusquedaRef]);

  const focusSearch = useCallback(() => {
    setProductoFocused(null);
    inputBusquedaRef?.current?.focus();
  }, [inputBusquedaRef]);

  // Atajo para recuperar foco rápido sin tabbear: Ctrl/Cmd+K y '/' enfocan búsqueda.
  useEffect(() => {
    const onKeyDown = (e) => {
      // Respetar modo navbar (Alt) y no tocar atajos del navegador
      if (e.altKey) return;

      // Limitar el atajo al contexto de esta pantalla
      if (scopeRef?.current && !scopeRef.current.contains(document.activeElement)) return;

      const key = typeof e.key === 'string' ? e.key : '';
      const keyLower = key.toLowerCase();

      // No disparar si el usuario está escribiendo en inputs/textareas/editables
      const active = document.activeElement;
      const activeEsEditable =
        !!active &&
        typeof active.closest === 'function' &&
        !!active.closest('input, textarea, [contenteditable="true"]');
      if (activeEsEditable) return;

      const esCtrlK = (e.ctrlKey || e.metaKey) && keyLower === 'k';
      const esSlash = !e.ctrlKey && !e.metaKey && key === '/';

      if (esCtrlK || esSlash) {
        e.preventDefault();
        focusSearch();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [focusSearch, scopeRef]);

  const handleProductoKeyDown = useCallback(
    (e) => {
      if (!tablaRef?.current || !tablaRef.current.contains(document.activeElement)) return;

      // No interferir con Alt (navbar) y no romper shortcuts del navegador,
      // pero sí permitir Ctrl/Cmd+C para copiar selección.
      if (e.altKey) return;

      const keyLower = typeof e.key === 'string' ? e.key.toLowerCase() : e.key;
      const esCopia = (e.ctrlKey || e.metaKey) && keyLower === 'c';
      if (esCopia) {
        // Evitar copiar si el foco está en un input/textarea (dejar comportamiento normal)
        const active = document.activeElement;
        const activeEsEditable =
          !!active && typeof active.closest === 'function' && !!active.closest('input, textarea');
        if (activeEsEditable) return;

        if (typeof onCopySelected === 'function' && productosSeleccionados.length > 0) {
          e.preventDefault();
          onCopySelected({ selectedIds: productosSeleccionados, focusedId: productoFocused });
        }
        return;
      }

      if ((e.ctrlKey && e.key !== ' ') || (e.metaKey && e.key !== ' ')) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          moveFocus(1, e);
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Si estamos en el primer ítem, subir vuelve al filtro de búsqueda.
          if (indexById.get(productoFocused) === 0) {
            setProductoFocused(null);
            inputBusquedaRef?.current?.focus();
            break;
          }
          moveFocus(-1, e);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!perPageEsAll) {
            // Ir a la página anterior manteniendo la misma “fila relativa” (salto por tamaño de página)
            moveFocus(-perPageNum, e);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!perPageEsAll) {
            // Ir a la página siguiente manteniendo la misma “fila relativa”
            moveFocus(perPageNum, e);
          }
          break;
        case ' ': {
          e.preventDefault();
          if (!productoFocused) {
            const startIndex = perPageEsAll ? 0 : (pagina - 1) * perPageNum;
            const id = itemsOrdenados?.[startIndex]?.id;
            if (id) {
              setProductoFocused(id);
              requestAnimationFrame(() => {
                filaProductoRef?.current?.[id]?.focus();
              });
            }
            break;
          }
          toggleProductoSeleccionado(productoFocused);
          break;
        }
        case 'Escape':
          e.preventDefault();
          setProductoFocused(null);
          inputBusquedaRef?.current?.focus();
          break;
        default:
          break;
      }
    },
    [
      filaProductoRef,
      inputBusquedaRef,
      indexById,
      itemsOrdenados,
      moveFocus,
      onCopySelected,
      pagina,
      perPageEsAll,
      perPageNum,
      productoFocused,
      productosSeleccionados,
      tablaRef,
      toggleProductoSeleccionado,
    ]
  );

  const handleTableWheel = useCallback(
    (e) => {
      if (perPageEsAll) return;
      if (!tablaRef?.current) return;

      // Solo paginar cuando el usuario ya está "en el borde" del área visible de la tabla.
      const rect = tablaRef.current.getBoundingClientRect();
      const threshold = 6;
      const enBordeInferior = rect.bottom <= window.innerHeight + threshold;
      const enBordeSuperior = rect.top >= -threshold;

      if (e.deltaY > 0 && enBordeInferior) {
        e.preventDefault();
        moveFocus(perPageNum, { shiftKey: e.shiftKey });
      } else if (e.deltaY < 0 && enBordeSuperior) {
        e.preventDefault();
        moveFocus(-perPageNum, { shiftKey: e.shiftKey });
      }
    },
    [moveFocus, perPageEsAll, perPageNum, tablaRef]
  );

  // Auto-focus/scroll del ítem enfocado (evita robar clicks en elementos interactivos)
  useEffect(() => {
    if (!productoFocused) return;

    const active = document.activeElement;
    const activeEsInteractivo =
      !!active && typeof active.closest === 'function' && !!active.closest('button, a, input, select, textarea');

    // Solo evitamos “robar” foco cuando el usuario interactúa con un control dentro de la misma fila.
    // Si el foco está en un input de búsqueda (fuera de la fila), sí queremos mover el foco a la fila.
    const filaEl = filaProductoRef?.current?.[productoFocused];
    const activeDentroDeFila = !!filaEl && !!active && filaEl.contains(active);
    if (activeEsInteractivo && activeDentroDeFila) return;

    setTimeout(() => {
      const filaEl = filaProductoRef?.current?.[productoFocused];
      if (!filaEl) return;

      filaEl.focus();

      // Evitar que la pantalla "salte" hacia arriba en cada cambio de foco.
      // Solo scrollear si la fila quedó fuera de la zona visible.
      const rect = filaEl.getBoundingClientRect();
      const margen = 80;
      const fueraArriba = rect.top < margen;
      const fueraAbajo = rect.bottom > window.innerHeight - margen;
      if (fueraArriba || fueraAbajo) {
        filaEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 0);
  }, [filaProductoRef, productoFocused]);

  return {
    productoFocused,
    setProductoFocused,
    productosSeleccionados,
    setProductosSeleccionados,
    toggleProductoSeleccionado,
    handleInputKeyDown,
    handleCategoryFilterNavigateNext,
    handleCategoryFilterNavigatePrev,
    handleProductoKeyDown,
    handleTableWheel,
    focusSearch,
  };
};
