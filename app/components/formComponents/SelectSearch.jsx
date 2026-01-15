"use client"

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from 'react-dom';
import Icon from "./Icon";

const SelectSearch = ({
  options = [],
  valueField = "id",
  textField = "nombre",
  label,
  placeholder = "Buscar y seleccionar...",
  value,
  onChange,
  loading = false,
  disabled = false,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Filtrar opciones basado en el término de búsqueda
  const filteredOptions = options.filter(option =>
    option[textField]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener el texto del valor seleccionado
  const selectedOption = options.find(option => option[valueField] === value);
  const displayText = selectedOption ? selectedOption[textField] : "";

  // Reset search term when value changes externally
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown position when opening
  useLayoutEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Update position on scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setHighlightedIndex(-1);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchTerm("");
  };

  const handleOptionSelect = (option) => {
    onChange && onChange({ target: { value: option[valueField] } });
    setIsOpen(false);
    setSearchTerm("");
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const inputValue = isOpen ? searchTerm : displayText;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={isOpen ? placeholder : displayText || placeholder}
          disabled={disabled || loading}
          className={`
            w-full px-3 py-3 pr-10
            border border-gray-300 rounded-lg
            bg-white text-gray-900
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            transition-all duration-200
            ${isOpen ? "border-blue-500" : ""}
          `}
          {...props}
        />

        {/* Icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <Icon
            icono={isOpen ? "chevron-up" : "chevron-down"}
            className="text-gray-400 text-sm"
          />
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          </div>
        )}
      </div>

      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Dropdown */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width
          }}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              No se encontraron resultados
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option[valueField]}
                onClick={() => handleOptionSelect(option)}
                className={`
                  px-4 py-3 cursor-pointer transition-colors
                  ${index === highlightedIndex
                    ? "bg-blue-50 text-blue-900"
                    : "hover:bg-gray-50 text-gray-900"
                  }
                  ${option[valueField] === value ? "bg-blue-100 font-medium" : ""}
                `}
              >
                {option[textField]}
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default SelectSearch;
