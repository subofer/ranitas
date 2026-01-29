# Refactorización del Polling de Ollama

## 🎯 Problema Original

### Síntomas
- ✅ Los inputs de edición de factura **flickeaban** constantemente
- ✅ Logs repetitivos cada 2 segundos:
  ```
  GET /api/ai/status 200 in 291ms
  GET /api/ai/status 200 in 293ms
  GET /api/ai/status 200 in 307ms
  ```
- ✅ Re-renders innecesarios en componentes con formularios
- ✅ Mala experiencia de usuario al escribir

### Causa Raíz
El hook `useOllamaStatus` se ejecutaba **dentro** de componentes que contenían inputs:
```jsx
// ❌ ANTES - Hook dentro del componente con inputs
const IaPrompt = () => {
  const { modelStatus } = useOllamaStatus({ selectedModel: model })
  // Cada 2s: polling → setState → re-render → inputs flickean
  return <div>
    <input /> {/* ← Este input se re-renderiza cada 2s */}
  </div>
}
```

**Problema:**
1. Hook hace polling cada 2 segundos
2. Cada polling actualiza estado local
3. Estado local cambia → componente re-renderiza
4. Inputs pierden foco momentáneamente → flickeo

---

## ✅ Solución Implementada

### Arquitectura Nueva

```
App Root
  └─ AiProviderClient
      └─ OllamaStatusProvider ← POLLING AISLADO AQUÍ (1 vez)
          ├─ Componente con inputs (NO re-renderiza)
          └─ ModelStatusIndicator ← SOLO ESTE se suscribe
```

### 1. Contexto Global: `OllamaStatusContext`

**Archivo:** `app/context/OllamaStatusContext.jsx`

```jsx
export function OllamaStatusProvider({ 
  children, 
  autoRefresh = true, 
  refreshInterval = 5000  // ← 5s en vez de 2s
}) {
  const [modelStatuses, setModelStatuses] = useState({})
  
  const checkStatus = useCallback(async () => {
    // Polling centralizado - 1 sola vez para toda la app
    const res = await fetch('/api/ai/status')
    // ... actualiza estado global
  }, [])
  
  useEffect(() => {
    checkStatus()
    if (autoRefresh) {
      const interval = setInterval(checkStatus, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, checkStatus])
  
  return (
    <OllamaStatusContext.Provider value={{ modelStatuses, getModelStatus }}>
      {children}
    </OllamaStatusContext.Provider>
  )
}
```

**Ventajas:**
- ✅ Polling se ejecuta **1 sola vez** en el provider
- ✅ Estado centralizado para **todos** los componentes
- ✅ Intervalo configurable (5s por defecto)
- ✅ Componentes no suscritos **NO** se re-renderizan

---

### 2. Componente Aislado: `ModelStatusIndicator`

**Archivo:** `app/components/ia/ModelStatusIndicator.jsx`

```jsx
const ModelStatusIndicator = memo(function ModelStatusIndicator({ 
  modelName, 
  onPreload, 
  preloading 
}) {
  const { getModelStatus } = useOllamaStatusContext()
  const status = getModelStatus(modelName) // ← Solo lee del contexto
  
  // Solo este componente se re-renderiza cuando cambia status
  return <div>Estado: {status}</div>
})
```

**Ventajas:**
- ✅ Envuelto en `memo()` → evita re-renders innecesarios
- ✅ Solo se actualiza cuando **cambia el estado del modelo**
- ✅ No afecta a componentes hermanos o padres
- ✅ Aislado del flujo de edición

---

### 3. Integración en `AiProviderClient`

**Archivo:** `app/components/ai/AiProviderClient.jsx`

```jsx
export default function AiProviderClient({ children }) {
  return (
    <AiProvider>
      <OllamaStatusProvider autoRefresh={true} refreshInterval={5000}>
        {children}
      </OllamaStatusProvider>
    </AiProvider>
  )
}
```

**Ventajas:**
- ✅ Provider agregado al árbol de componentes raíz
- ✅ Polling global para **toda la aplicación**
- ✅ Configuración centralizada

---

### 4. Actualización de `IaPromp.jsx`

**ANTES:**
```jsx
// ❌ Hook local causaba re-renders
const IaPrompt = () => {
  const { modelStatus, refresh } = useOllamaStatus({ selectedModel: model })
  // Estado local → re-render cada 2s
  
  return (
    <ControlHeader modelStatus={modelStatus} />
  )
}
```

**DESPUÉS:**
```jsx
// ✅ Sin hook local, usa componente aislado
const IaPrompt = () => {
  // Sin useOllamaStatus → sin re-renders por polling
  
  return (
    <ControlHeader>
      <ModelStatusIndicator modelName={model} />
    </ControlHeader>
  )
}
```

**Ventajas:**
- ✅ Sin estado local de modelStatus
- ✅ Sin re-renders del componente padre
- ✅ Inputs NO flickean

---

## 📊 Comparativa Antes/Después

### Antes (Problemático)

| Aspecto | Estado |
|---------|--------|
| **Polling** | Cada 2 segundos |
| **Re-renders** | Todo el componente con inputs |
| **Logs** | Repetitivos y molestos |
| **Performance** | Mala (múltiples re-renders) |
| **UX Edición** | ❌ Flickeo constante |
| **Arquitectura** | Hook local en cada componente |

```
IaPrompt (re-render cada 2s)
  ├─ useOllamaStatus() ← Polling aquí
  ├─ Inputs ← Flickean
  └─ ModelStatus ← Se actualiza
```

### Después (Optimizado)

| Aspecto | Estado |
|---------|--------|
| **Polling** | Cada 5 segundos |
| **Re-renders** | Solo ModelStatusIndicator |
| **Logs** | 1 solo por intervalo |
| **Performance** | ✅ Excelente |
| **UX Edición** | ✅ Fluida, sin flickeo |
| **Arquitectura** | Contexto global + componente memo |

```
OllamaStatusProvider (polling global)
  └─ IaPrompt (NO re-renderiza)
      ├─ Inputs ← NO flickean ✅
      └─ ModelStatusIndicator ← Solo este se actualiza
```

---

## 🔧 Cómo Usar el Nuevo Sistema

### Para Mostrar Estado del Modelo

```jsx
import ModelStatusIndicator from '@/components/ia/ModelStatusIndicator'

function MiComponente() {
  const [model, setModel] = useState('llama2')
  
  return (
    <div>
      <h1>Mi Componente</h1>
      
      {/* Componente aislado - no afecta re-renders */}
      <ModelStatusIndicator 
        modelName={model}
        onPreload={handlePreload}
        preloading={isPreloading}
      />
      
      {/* Estos inputs NO flickean */}
      <input type="text" />
    </div>
  )
}
```

### Para Acceder al Estado Programáticamente

```jsx
import { useOllamaStatusContext } from '@/context/OllamaStatusContext'

function MiComponente() {
  const { getModelStatus, loadedModels, refresh } = useOllamaStatusContext()
  
  const status = getModelStatus('llama2') // 'loaded' | 'unloaded'
  
  // Este componente se re-renderiza cuando cambia el estado
  // SOLO úsalo si realmente necesitas el estado
  return <div>Estado: {status}</div>
}
```

### Para Componentes con Formularios

```jsx
// ✅ CORRECTO - NO uses useOllamaStatusContext aquí
function FormularioEdicion() {
  return (
    <div>
      <input type="text" /> {/* ← NO se re-renderiza */}
      <textarea /> {/* ← NO se re-renderiza */}
      
      {/* Estado en componente separado */}
      <ModelStatusIndicator modelName={model} />
    </div>
  )
}

// ❌ INCORRECTO - causa flickeo
function FormularioEdicion() {
  const { getModelStatus } = useOllamaStatusContext() // ← Re-render cada 5s
  return (
    <div>
      <input type="text" /> {/* ← Flickea */}
    </div>
  )
}
```

---

## 🚀 Mejoras Adicionales

### Intervalo Configurable

Puedes ajustar el intervalo de polling:

```jsx
// En AiProviderClient.jsx
<OllamaStatusProvider 
  autoRefresh={true} 
  refreshInterval={10000} // ← 10 segundos
>
```

### Desactivar Polling

Para desactivar completamente:

```jsx
<OllamaStatusProvider autoRefresh={false}>
```

### Refresh Manual

```jsx
function MiComponente() {
  const { refresh } = useOllamaStatusContext()
  
  return (
    <button onClick={refresh}>
      🔄 Actualizar Estado
    </button>
  )
}
```

---

## 📝 Hook Antiguo Deprecado

El hook `useOllamaStatus` sigue existiendo pero está marcado como `@deprecated`:

```jsx
/**
 * @deprecated Este hook está obsoleto.
 * Usa OllamaStatusProvider y useOllamaStatusContext en su lugar.
 * 
 * Este hook causa re-renders innecesarios porque el polling se ejecuta
 * dentro del componente que lo usa.
 */
export function useOllamaStatus({ selectedModel, autoRefresh = true }) {
  // ...
}
```

**No lo uses en código nuevo.** Usa el contexto y componente aislado.

---

## ✅ Testing

Para verificar que funciona correctamente:

1. **Abrir DevTools Console**
   - Antes: Logs cada 2s repetitivos
   - Ahora: Logs cada 5s, 1 solo por intervalo

2. **Editar Factura Escaneada**
   - Antes: Inputs flickeaban al escribir
   - Ahora: Edición fluida sin interrupciones

3. **Verificar Re-renders**
   ```jsx
   // Agregar temporalmente en componente
   console.log('RENDER', Date.now())
   ```
   - Antes: Log cada 2s
   - Ahora: Log solo cuando cambies algo

---

## 📚 Archivos Afectados

### Nuevos
- ✅ `app/context/OllamaStatusContext.jsx` - Contexto global
- ✅ `app/components/ia/ModelStatusIndicator.jsx` - Componente memo

### Modificados
- ✅ `app/components/ai/AiProviderClient.jsx` - Agregado provider
- ✅ `app/components/ia/IaPromp.jsx` - Eliminado hook local

### Deprecados
- ⚠️ `app/hooks/useOllamaStatus.js` - Marcado deprecated

---

## 🎓 Lecciones Aprendidas

1. **Polling en Contexto, No en Hooks Locales**
   - Los hooks locales causan re-renders en cada componente
   - El contexto global centraliza y aísla

2. **Componentes Memo para Optimización**
   - `memo()` evita re-renders innecesarios
   - Ideal para componentes que muestran estado externo

3. **Separar Responsabilidades**
   - Componentes con inputs NO deben polling
   - Componentes de estado aislados

4. **Intervalos Razonables**
   - 2s es muy agresivo para polling
   - 5s es suficiente para estado de modelo

---

**Fecha:** 25/01/2026  
**Commit:** `b2d99f2`  
**Estado:** ✅ Implementado y funcional
