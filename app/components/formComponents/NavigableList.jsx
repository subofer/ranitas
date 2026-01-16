"use client"
import { useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useListNavigation } from '@/app/hooks/useListNavigation';
import SearchInput from './SearchInput';
import PanelContainer from './PanelContainer';
import HighlightMatch from '../HiglightMatch';

/**
 * NavigableList - Componente de lista navegable con teclado
 * 
 * @param {Object} props
 * @param {string} props.title - Título del panel
 * @param {Array} props.items - Items a mostrar (cada uno con id y los campos requeridos)
 * @param {boolean} props.isActive - Si este panel está activo para navegación
 * @param {boolean} props.loading - Estado de carga
 * @param {string} props.searchTerm - Término de búsqueda
 * @param {Function} props.onSearchChange - Callback cuando cambia la búsqueda
 * @param {Function} props.renderItem - Función para renderizar cada ítem
 * @param {Function} props.onItemAction - Callback cuando se ejecuta acción principal (Enter)
 * @param {Function} props.onItemDelete - Callback cuando se elimina un ítem (Delete/Backspace)
 * @param {Function} props.onSwitchLeft - Callback para cambiar al panel izquierdo
 * @param {Function} props.onSwitchRight - Callback para cambiar al panel derecho
 * @param {string} props.emptyMessage - Mensaje cuando no hay items
 * @param {string} props.loadingMessage - Mensaje durante carga
 * @param {string} props.countLabel - Etiqueta para el contador
 * @param {string} props.searchPlaceholder - Placeholder del input de búsqueda
 */
const NavigableList = forwardRef(({
  title,
  items = [],
  isActive = false,
  loading = false,
  searchTerm = '',
  onSearchChange,
  renderItem,
  onItemAction,
  onItemDelete,
  onSwitchLeft,
  onSwitchRight,
  emptyMessage = 'No hay items',
  loadingMessage = 'Cargando...',
  countLabel = 'items',
  searchPlaceholder = 'Buscar...',
  className = '',
  maxHeight = 'max-h-96',
}, ref) => {
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const {
    focusedIndex,
    selectedIds,
    getItemProps,
    isFocused,
    isSelected,
    focusIndex,
    clearSelection,
  } = useListNavigation({
    items,
    isActive,
    onEnter: onItemAction,
    onDelete: onItemDelete,
    onLeft: onSwitchLeft,
    onRight: onSwitchRight,
    containerRef,
    inputRef,
  });

  // Exponer métodos al padre
  useImperativeHandle(ref, () => ({
    focusSearch: () => inputRef.current?.focus(),
    focusFirst: () => focusIndex(0),
    clearSelection,
  }), [focusIndex, clearSelection]);

  return (
    <PanelContainer
      title={title}
      count={items.length}
      countLabel={countLabel}
      loading={loading}
      loadingMessage={loadingMessage}
      isEmpty={items.length === 0 && searchTerm}
      emptyIcon="search"
      emptyMessage={emptyMessage}
      className={className}
    >
      {onSearchChange && (
        <SearchInput
          ref={inputRef}
          value={searchTerm}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="mb-4"
        />
      )}

      <div 
        ref={containerRef}
        className={`space-y-1 ${maxHeight} overflow-y-auto`}
      >
        {items.map((item, index) => {
          const itemProps = getItemProps(item, index);
          const focused = isFocused(index);
          const selected = isSelected(item?.id);

          return renderItem({
            item,
            index,
            focused,
            selected,
            itemProps,
            searchTerm,
          });
        })}
      </div>
    </PanelContainer>
  );
});

NavigableList.displayName = 'NavigableList';

export default NavigableList;
