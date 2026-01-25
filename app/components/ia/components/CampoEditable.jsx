"use client"
import { useState, useRef, useEffect } from 'react'

/**
 * Campo editable inline con soporte para auditoría
 * Permite editar valores directamente con un click
 */
export function CampoEditable({ valor, path, tipo = 'text', className = '', formatear = null, onUpdate }) {
  const [editando, setEditando] = useState(false)
  const [valorTemp, setValorTemp] = useState(valor)
  const inputRef = useRef(null)
  
  useEffect(() => {
    if (editando && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }, [editando])
  
  const guardar = async () => {
    if (valorTemp !== valor) {
      await onUpdate(path, valorTemp, valor)
    }
    setEditando(false)
  }
  
  const iniciarEdicion = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setValorTemp(valor)
    setEditando(true)
  }
  
  if (editando) {
    return (
      <input
        ref={inputRef}
        type={tipo}
        value={valorTemp}
        onChange={(e) => setValorTemp(e.target.value)}
        onBlur={(e) => {
          e.stopPropagation()
          guardar()
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            guardar()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setValorTemp(valor)
            setEditando(false)
          }
        }}
        className={`${className} border-2 border-orange-400 rounded px-2 py-1 outline-none`}
      />
    )
  }
  
  return (
    <div
      onMouseDown={iniciarEdicion}
      className={`${className} cursor-pointer hover:bg-yellow-50 hover:border hover:border-orange-300 rounded px-1 transition-colors`}
    >
      {formatear ? formatear(valor) : valor}
    </div>
  )
}
