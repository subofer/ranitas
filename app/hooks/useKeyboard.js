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
  // Nuevo: callback para togglear selección de presentaciones (por id)
  onTogglePresentacion,
  // Nuevo: callback para seleccionar (varios) presentaciones por rango
  onSelectPresentacionesRange,
  scopeRef,
}) => {
  const [productoFocused, setProductoFocused] = useState(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [anchorIndex, setAnchorIndex] = useState(null);
  const [pendingFocus, setPendingFocus] = useState(null); // 'first' | 'last' | null

  const selectIdByRowId = useMemo(() => {
    const map = new Map();
    for (const it of itemsOrdenados || []) {
      if (!it) continue;
      const id = it?.id;
      if (!id) continue;
      map.set(id, it?.selectId || id);
    }
    return map;
  }, [itemsOrdenados]);

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

      setProductoFocused(nextId);
    },
    [itemsOrdenados]
  );

  const toggleProductoSeleccionado = useCallback(
    (productoId) => {
      setProductosSeleccionados((prev) =>
        prev.includes(productoId) ? prev.filter((id) => id !== productoId) : [...prev, productoId]
      );

      // No forzar foco acá: si el usuario estaba en una presentación,
      // la selección se aplica al producto pero el foco queda en la fila actual.
    },
    []
  );

  const selectRange = useCallback(
    (from, to) => {
      const list = itemsOrdenados || [];
      const a = clamp(from, 0, Math.max(0, list.length - 1));
      const b = clamp(to, 0, Math.max(0, list.length - 1));
      const [start, end] = a <= b ? [a, b] : [b, a];
      const productIds = [];
      const presentacionIds = [];
      for (let i = start; i <= end; i += 1) {
        const row = list[i];
        if (!row) continue;
        if (row.tipo === 'producto') {
          const selectId = row.selectId || row.id;
          if (selectId) productIds.push(selectId);
        } else if (row.tipo === 'presentacion') {
          if (row.presentacionId) presentacionIds.push(row.presentacionId);
        }
      }
      if (productIds.length > 0) setProductosSeleccionados((prev) => union(prev, productIds));
      if (presentacionIds.length > 0 && typeof onSelectPresentacionesRange === 'function') {
        onSelectPresentacionesRange(presentacionIds);
      }
    },
    [itemsOrdenados, onSelectPresentacionesRange]
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
        // Primer ítem visible
        focusIndex(0);
      } else if (e.key === 'Tab') {
        categoryFilterRef?.current?.querySelector('input')?.focus();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        categoryFilterRef?.current?.querySelector('input')?.focus();
      }
    },
    [categoryFilterRef, focusIndex, inputBusquedaRef]
  );

  const handleCategoryFilterNavigateNext = useCallback(() => {
    focusIndex(0);
  }, [focusIndex]);

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
      const active = document.activeElement;
      const activeIsBody = active === document.body || active === document.documentElement;
      if (scopeRef?.current && active && !activeIsBody && !scopeRef.current.contains(active)) return;

      const key = typeof e.key === 'string' ? e.key : '';
      const keyLower = key.toLowerCase();

      // No disparar si el usuario está escribiendo en inputs/textareas/editables
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

      // Si el usuario está escribiendo en un control dentro de la tabla,
      // no interceptar flechas/espacio/etc.
      const active = document.activeElement;
      const activeEsEditable =
        !!active && typeof active.closest === 'function' && !!active.closest('input, textarea, select');
      if (activeEsEditable) return;

      const keyLower = typeof e.key === 'string' ? e.key.toLowerCase() : e.key;
      const esCopia = (e.ctrlKey || e.metaKey) && keyLower === 'c';
      if (esCopia) {
        // Evitar copiar si el foco está en un input/textarea (dejar comportamiento normal)
        const active = document.activeElement;
        const activeEsEditable =
          !!active && typeof active.closest === 'function' && !!active.closest('input, textarea');
        if (activeEsEditable) return;

        if (typeof onCopySelected === 'function') {
          e.preventDefault();
          onCopySelected({ selectedIds: productosSeleccionados, focusedId: productoFocused });
        }
        return;
      }

      if ((e.ctrlKey && e.key !== ' ') || (e.metaKey && e.key !== ' ')) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          // Si estamos al final de la página, pasar a la siguiente página.
          if (indexById.get(productoFocused) === (itemsOrdenados?.length || 1) - 1 && pagina < totalPaginas) {
            setPagina(pagina + 1);
            setPendingFocus('first');
            return;
          }
          moveFocus(1, e);
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Si estamos en el primer ítem, subir vuelve a la búsqueda o a la página anterior.
          if (indexById.get(productoFocused) === 0) {
            if (pagina > 1) {
              setPagina(pagina - 1);
              setPendingFocus('last');
              return;
            }
            setProductoFocused(null);
            inputBusquedaRef?.current?.focus();
            break;
          }
          moveFocus(-1, e);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (pagina > 1) {
            setPagina(pagina - 1);
            setPendingFocus('first');
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (pagina < totalPaginas) {
            setPagina(pagina + 1);
            setPendingFocus('first');
          }
          break;
        case ' ': {
          e.preventDefault();
          if (!productoFocused) {
            const id = itemsOrdenados?.[0]?.id;
            if (id) {
              setProductoFocused(id);
              requestAnimationFrame(() => {
                filaProductoRef?.current?.[id]?.focus();
              });
            }
            break;
          }

          // Si el elemento enfocado es una presentación, delegar toggle a onTogglePresentacion
          const focusedItem = (itemsOrdenados || []).find((it) => it?.id === productoFocused);
          if (focusedItem?.tipo === 'presentacion') {
            if (typeof onTogglePresentacion === 'function') {
              onTogglePresentacion(focusedItem.presentacionId);
              break;
            }
          }

          const selectId = selectIdByRowId.get(productoFocused) || productoFocused;
          toggleProductoSeleccionado(selectId);
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
      onTogglePresentacion,
      pagina,
      productoFocused,
      productosSeleccionados,
      tablaRef,
      toggleProductoSeleccionado,
      selectIdByRowId,
      totalPaginas,
      setPagina,
    ]
  );

  // Navegación por teclado incluso si el foco salió de la tabla (por click, etc),
  // pero manteniendo el alcance dentro del scope y sin interferir con inputs.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!productoFocused) return;
      if (e.altKey) return;

      const active = document.activeElement;
      const activeIsBody = active === document.body || active === document.documentElement;

      // Solo dentro del contexto de esta pantalla.
      if (scopeRef?.current && active && !activeIsBody && !scopeRef.current.contains(active)) return;

      // Si el foco ya está dentro de la tabla, lo maneja el onKeyDown de filas.
      if (tablaRef?.current && active && tablaRef.current.contains(active)) return;

      // Si el usuario está escribiendo en un control, no interceptar.
      const activeEsEditable =
        !!active && typeof active.closest === 'function' && !!active.closest('input, textarea, select, [contenteditable="true"]');
      if (activeEsEditable) return;

      const keyLower = typeof e.key === 'string' ? e.key.toLowerCase() : e.key;
      const esCopia = (e.ctrlKey || e.metaKey) && keyLower === 'c';
      if (esCopia) {
        if (typeof onCopySelected === 'function') {
          e.preventDefault();
          onCopySelected({ selectedIds: productosSeleccionados, focusedId: productoFocused });
        }
        return;
      }

      if ((e.ctrlKey && e.key !== ' ') || (e.metaKey && e.key !== ' ')) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (indexById.get(productoFocused) === (itemsOrdenados?.length || 1) - 1 && pagina < totalPaginas) {
            setPagina(pagina + 1);
            setPendingFocus('first');
            return;
          }
          moveFocus(1, e);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (indexById.get(productoFocused) === 0) {
            if (pagina > 1) {
              setPagina(pagina - 1);
              setPendingFocus('last');
              return;
            }
            setProductoFocused(null);
            inputBusquedaRef?.current?.focus();
            break;
          }
          moveFocus(-1, e);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (pagina > 1) {
            setPagina(pagina - 1);
            setPendingFocus('first');
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (pagina < totalPaginas) {
            setPagina(pagina + 1);
            setPendingFocus('first');
          }
          break;
        case ' ': {
          e.preventDefault();
          const focusedItem = (itemsOrdenados || []).find((it) => it?.id === productoFocused);
          if (focusedItem?.tipo === 'presentacion') {
            if (typeof onTogglePresentacion === 'function') {
              onTogglePresentacion(focusedItem.presentacionId);
              break;
            }
          }
          const selectId = selectIdByRowId.get(productoFocused) || productoFocused;
          toggleProductoSeleccionado(selectId);
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
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    indexById,
    inputBusquedaRef,
    itemsOrdenados,
    moveFocus,
    onCopySelected,
    onTogglePresentacion,
    pagina,
    productoFocused,
    productosSeleccionados,
    scopeRef,
    selectIdByRowId,
    setPagina,
    tablaRef,
    toggleProductoSeleccionado,
    totalPaginas,
  ]);

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
        if (pagina < totalPaginas) {
          setPagina(pagina + 1);
          setPendingFocus('first');
        }
      } else if (e.deltaY < 0 && enBordeSuperior) {
        e.preventDefault();
        if (pagina > 1) {
          setPagina(pagina - 1);
          setPendingFocus('last');
        }
      }
    },
    [pagina, perPageEsAll, setPagina, tablaRef, totalPaginas]
  );

  // Auto-focus/scroll del ítem enfocado (evita robar clicks en elementos interactivos)
  useEffect(() => {
    if (!productoFocused) return;

    const active = document.activeElement;
    const activeEsInteractivo =
      !!active && typeof active.closest === 'function' && !!active.closest('button, a, input, select, textarea');

    // Si el usuario está interactuando dentro de la tabla (ej: editando inputs), no robar foco.
    const activeDentroTabla = !!tablaRef?.current && !!active && tablaRef.current.contains(active);
    if (activeEsInteractivo && activeDentroTabla) return;

    // Si el foco está en un botón/anchor fuera de la tabla (ej: Guardar/Cancelar),
    // no robar foco ni scrollear (evita saltos).
    const activeEsBoton =
      !!active && typeof active.closest === 'function' && !!active.closest('button, a');
    if (activeEsBoton && !activeDentroTabla) return;

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
        filaEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }
    }, 0);
  }, [filaProductoRef, productoFocused, tablaRef]);

  // Aplicar foco pendiente luego de paginar
  useEffect(() => {
    if (!pendingFocus) return;
    const list = itemsOrdenados || [];
    if (!list.length) return;

    if (pendingFocus === 'first') {
      focusIndex(0);
    } else if (pendingFocus === 'last') {
      focusIndex(list.length - 1);
    }
    setPendingFocus(null);
  }, [focusIndex, itemsOrdenados, pendingFocus]);

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
