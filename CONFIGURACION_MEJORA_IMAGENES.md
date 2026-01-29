# Configuración de Mejora de Imágenes

## 📍 Ubicación

Ve a **`/configuracion`** en la aplicación y busca la sección **"Parámetros de Mejora de Imagen"** al final de la página.

## 🎯 ¿Qué hace cada parámetro?

### 1. **CLAHE Clip** (1.0 - 4.0)
- **Predeterminado**: 1.8
- **Qué hace**: Controla el límite de contraste adaptativo
- **Valores bajos (1.0-1.5)**: Mejora suave, preserva texto delicado
- **Valores altos (3.0-4.0)**: Contraste agresivo, puede crear halos

### 2. **Kernel Size** (15 - 61, impar)
- **Predeterminado**: 31
- **Qué hace**: Tamaño de la ventana para detectar sombras
- **Valores bajos (15-25)**: Detecta sombras pequeñas, preserva detalles
- **Valores altos (45-61)**: Sombras grandes, puede perder texto pequeño

### 3. **Shadow Threshold** (10 - 40)
- **Predeterminado**: 25
- **Qué hace**: Umbral para identificar qué es sombra
- **Valores bajos (10-20)**: Corrige más zonas (puede sobre-corregir)
- **Valores altos (30-40)**: Solo corrige sombras muy oscuras

### 4. **Brightness Boost** (1.0 - 1.15)
- **Predeterminado**: 1.03
- **Qué hace**: Multiplicador de brillo en zonas oscuras
- **Valores bajos (1.0-1.05)**: Corrección mínima
- **Valores altos (1.10-1.15)**: Aumenta mucho el brillo

### 5. **Denoise Strength** (3 - 12)
- **Predeterminado**: 4
- **Qué hace**: Fuerza del filtro de ruido
- **⚠️ CUIDADO**: Valores altos (>8) pueden borrar texto pequeño
- **Valores bajos (3-5)**: Preserva detalles
- **Valores altos (10-12)**: Imagen muy suave, arriesgado para texto

### 6. **Sharpen Amount** (1.0 - 1.3)
- **Predeterminado**: 1.08
- **Qué hace**: Cantidad de nitidez aplicada
- **Valores bajos (1.0-1.10)**: Suave, natural
- **Valores altos (1.20-1.30)**: Muy nítido, puede crear artefactos

### 7. **Contrast Boost** (1.0 - 1.1)
- **Predeterminado**: 1.01
- **Qué hace**: Boost final de contraste
- **Valores bajos (1.0-1.03)**: Conservador
- **Valores altos (1.08-1.10)**: Contraste fuerte

---

## 🔧 Recomendaciones según el problema

### Si la mejora borra el texto:
1. ✅ **Reducir Denoise Strength** a 3-4
2. ✅ **Reducir Kernel Size** a 21-25
3. ✅ **Reducir Brightness Boost** a 1.01-1.02

### Si quedan muchas sombras:
1. ✅ **Aumentar Kernel Size** a 41-51
2. ✅ **Reducir Shadow Threshold** a 15-20
3. ✅ **Aumentar Brightness Boost** a 1.05-1.08

### Si la imagen queda muy artificial:
1. ✅ **Reducir CLAHE Clip** a 1.5-1.8
2. ✅ **Reducir Sharpen Amount** a 1.02-1.05
3. ✅ **Reducir Contrast Boost** a 1.00-1.01

### Si necesitas más contraste:
1. ✅ **Aumentar CLAHE Clip** a 2.5-3.0
2. ✅ **Aumentar Sharpen Amount** a 1.15-1.20
3. ✅ **Aumentar Contrast Boost** a 1.05-1.08

---

## 💾 Almacenamiento

- Los parámetros se guardan en **localStorage** del navegador
- Se aplican automáticamente al usar **"✨ Mejorar documento"**
- Cada navegador tiene su propia configuración
- Botón **"Restaurar Predeterminados"** vuelve a valores seguros

---

## 🎓 Flujo de trabajo recomendado

1. **Carga una factura de prueba**
2. **Usa "✨ Mejorar documento" con valores predeterminados**
3. Si el resultado no es bueno:
   - Ve a `/configuracion`
   - Ajusta los parámetros según el problema
   - Guarda (automático al mover sliders)
   - Vuelve a la factura y prueba de nuevo
4. **Repite hasta encontrar tu configuración ideal**

---

## ⚠️ Advertencias

- **Denoise Strength > 8**: Puede borrar números pequeños en facturas
- **Kernel Size > 51**: Puede perder líneas finas de texto
- **Brightness Boost > 1.10**: Puede sobre-exponer y crear manchas blancas
- **CLAHE Clip > 3.0**: Puede crear halos alrededor del texto

---

## 🔄 ¿Cómo funciona?

1. El frontend lee los parámetros de localStorage
2. Los envía en el FormData al endpoint `/restore`
3. El contenedor Docker procesa con esos valores
4. No necesitas reiniciar nada, es en tiempo real

---

## 📊 Valores Ultra-Conservadores (Si todo falla)

```json
{
  "clahe_clip": 1.5,
  "kernel_size": 21,
  "shadow_threshold": 30,
  "brightness_boost": 1.01,
  "denoise_strength": 3,
  "sharpen_amount": 1.02,
  "contrast_boost": 1.00
}
```

Copia estos valores manualmente si necesitas la mínima intervención posible.
