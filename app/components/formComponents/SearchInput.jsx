"use client"
import { forwardRef } from 'react';
import Icon from './Icon';

/**
 * Input de búsqueda reutilizable con estilos consistentes
 */
const SearchInput = forwardRef(({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
  autoFocus = false,
  onKeyDown,
  disabled = false
}, ref) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon icono="search" className="text-gray-400 text-sm" />
      </div>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <Icon icono="times" className="text-sm" />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;
