"use client"
import Icon from './Icon';

/**
 * Botón de acción pequeño con ícono para tablas y listas
 */
export default function ActionButton({
  onClick,
  icon,
  title,
  variant = 'default', // 'default' | 'primary' | 'success' | 'danger' | 'warning'
  size = 'sm', // 'xs' | 'sm' | 'md'
  disabled = false,
  className = ''
}) {
  const variants = {
    default: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
    primary: 'text-gray-400 hover:text-blue-600 hover:bg-blue-50',
    success: 'text-gray-400 hover:text-green-600 hover:bg-green-50',
    danger: 'text-gray-400 hover:text-red-600 hover:bg-red-50',
    warning: 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
  };

  const sizes = {
    xs: 'p-1 text-xs',
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-base'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded transition-colors ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <Icon icono={icon} />
    </button>
  );
}
