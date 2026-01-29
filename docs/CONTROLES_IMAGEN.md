# Sistema de Controles de Imagen - Análisis de Facturas

## 🎨 Nuevas Funcionalidades

### Detección Mejorada de Bordes
- **Fondos Oscuros y Claros**: El sistema ahora detecta automáticamente el tipo de fondo
- **Detección por Gradiente**: Utiliza cambios de brillo para identificar bordes del documento
- **Adaptativo**: Funciona con fotos en fondos negros, blancos o mixtos

### Panel de Ajustes de Imagen

Antes de enviar la imagen a la IA, ahora puedes:

#### 🎨 Contraste (0-200%)
- Ajusta el contraste para mejorar la legibilidad
- Útil para facturas con impresión débil

#### 💡 Brillo (0-200%)
- Aclara u oscurece la imagen
- Ideal para compensar mala iluminación

#### 🌈 Saturación (0-200%)
- Ajusta la intensidad de colores
- Útil para reducir dominantes de color

#### 🔍 Zoom (0.5x - 3x)
- Acerca la imagen para enfocar áreas específicas
- Aleja para ver el contexto completo

#### 🧭 Pan (Desplazamiento)
- **Horizontal**: Desplaza la imagen izquierda/derecha
- **Vertical**: Desplaza la imagen arriba/abajo
- Útil combinado con zoom para centrar áreas de interés

## 🚀 Cómo Usar

### Flujo Básico
1. **Cargar imagen** → Se aplica auto-recorte automático
2. **Click en "🎨 Ajustes"** → Se abre el panel de controles
3. **Ajustar sliders** → Vista previa en tiempo real
4. **✔️ Aplicar** → Se confirman los cambios y se envía a la IA

### Flujo Avanzado
1. Cargar imagen con fondo oscuro
2. Abrir controles de imagen
3. Ajustar contraste y brillo para mejorar legibilidad
4. Usar zoom para enfocar sección relevante
5. Usar pan para centrar el área de interés
6. Aplicar cambios
7. Analizar con IA

## 🔧 Detalles Técnicos

### Auto-Detección de Fondo
```javascript
// Muestrea los bordes de la imagen
borderBrightness = promedio(píxeles_bordes)

// Determina tipo de fondo
fondoOscuro = borderBrightness < 100

// Busca contenido según fondo
if (fondoOscuro) {
  // Busca píxeles más claros que el fondo
  isContent = brightness > borderBrightness + 30
} else {
  // Busca píxeles más oscuros que el fondo
  isContent = brightness < borderBrightness - 30
}
```

### Transformaciones en Canvas
- Usa filtros CSS (`contrast`, `brightness`, `saturate`)
- Transformaciones 2D para zoom/pan
- Rendering en tiempo real mientras ajustas
- Exportación a blob al aplicar

### Estados Reactivos
```javascript
ajustes = {
  contraste: 100,    // 0-200%
  brillo: 100,       // 0-200%
  saturacion: 100,   // 0-200%
  zoom: 1,           // 0.5x - 3x
  panX: 0,           // -0.5 a 0.5
  panY: 0            // -0.5 a 0.5
}
```

## 💡 Tips de Uso

### Para Fondos Oscuros
1. Aumentar brillo (+20-40%)
2. Aumentar contraste (+10-20%)
3. Reducir saturación (-20%) si hay dominantes

### Para Facturas Borrosas
1. Aumentar contraste (+30-50%)
2. Ajustar brillo según necesidad
3. Zoom a la sección con texto más importante

### Para Facturas Grandes
1. Zoom 1.5x - 2x
2. Pan para recorrer secciones
3. Enfocar primero encabezado (emisor, fecha, número)
4. Aplicar y analizar
5. Repetir para sección de items si es necesario

## 🎯 Casos de Uso

### Foto con Flash (Sobreexpuesta)
- Brillo: 80%
- Contraste: 120%

### Foto en Sombra (Subexpuesta)
- Brillo: 140%
- Contraste: 110%

### Factura en Papel Amarillento
- Saturación: 70%
- Contraste: 115%

### Factura Pequeña en Foto Grande
- Zoom: 2x
- Pan para centrar documento
- Auto-recorte ya lo intentó, pero puedes ajustar más

## ⚙️ Configuración

### Auto-Recorte
```javascript
// Parámetros actuales
step: 3           // Precisión de muestreo
margin: 3%        // Margen de seguridad
gradiente: 100    // Umbral para detectar bordes
```

### Calidad de Exportación
```javascript
// Al aplicar ajustes
quality: 0.95  // 95% calidad JPEG/PNG
```

## 📊 Logs de Consola

El sistema registra:
- 🎨 Brillo promedio del borde
- 🔍 Tipo de fondo (OSCURO/CLARO)
- 🖍️ Píxeles de bordes encontrados
- 📐 Coordenadas de bordes
- ✂️ Área de recorte
- 📊 Porcentaje de área detectada
- ✅ Confirmación de ajustes aplicados

## 🔮 Próximas Mejoras

- [ ] Rotación de imagen
- [ ] Detección de perspectiva y corrección
- [ ] Presets guardados (ej: "Fondo oscuro", "Flash", etc.)
- [ ] Historial de ajustes
- [ ] Pan con arrastre del mouse (drag)
- [ ] Zoom con rueda del mouse
- [ ] Comparación lado a lado (original vs ajustada)
- [ ] Exportar imagen ajustada sin analizar
