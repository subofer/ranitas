# 🚀 GUÍA RÁPIDA - Cómo Usar Los Prompts

## 1️⃣ BUSCAR UN PROMPT

### Por nombre de componente
```bash
prompts/formComponents/Input.md           ← Input universal
prompts/pedidos/ListaPedidos.md           ← Lista de pedidos
prompts/alertas/alertaBorrarProducto.md   ← Alerta de borrado
```

### Por categoría
```bash
prompts/hooks/                    ← Custom hooks (13)
prompts/formComponents/           ← Componentes form (11)
prompts/alertas/                  ← Alertas y diálogos (8)
prompts/paginas/                  ← Páginas (14)
prompts/serverActions/            ← Backend actions (8)
```

### Índices disponibles
```bash
INDEX.md              ← Índice completo de archivos
MAESTRO.md            ← Tablas y estadísticas
00_INICIO_AQUI.md     ← Guía de inicio
```

---

## 2️⃣ COPIAR EL PROMPT

```bash
1. Abre el archivo .md
2. Selecciona todo (Ctrl+A)
3. Copia (Ctrl+C)
```

---

## 3️⃣ USARLO CON IA

### En Claude:
```
Pega el prompt en el chat
Espera a que lo analice
Recibe el código generado
```

### En ChatGPT:
```
Pega el prompt
Especifica: "Usa Next.js 13+, React, Tailwind"
Recibe el código
```

### Con mejoras:
```
[Pega el prompt]
Agrega: "También implementa estas mejoras:
- Validación de email
- Loading states
- Dark mode"
```

---

## 4️⃣ ESTRUCTURA DEL PROMPT

Cada prompt tiene esta estructura:

```markdown
## PROPÓSITO GENERAL
↓ Qué hace el componente

## PROPS PRINCIPALES
↓ Qué parámetros recibe

## FUNCIONALIDADES PRINCIPALES
↓ Qué features tiene

## COMPORTAMIENTO
↓ Cómo se comporta

## ESTILOS
↓ Tailwind CSS usado

## CASOS DE USO
↓ Dónde se usa

## NUEVAS CARACTERÍSTICAS
↓ IDEAS PARA MEJORAR ⭐
```

---

## 5️⃣ EJEMPLOS RÁPIDOS

### A) Regenerar Button.jsx existente
```
1. Abre prompts/formComponents/Button.md
2. Copia el contenido
3. Envía a Claude con: "Regenera Button.jsx"
4. Recibe versión mejorada
```

### B) Mejorar Input.jsx
```
1. Abre prompts/formComponents/Input.md
2. Mira sección "NUEVAS CARACTERÍSTICAS"
3. Copia prompt + agrega: 
   "Implementa estas mejoras:
   - [ ] Validación en tiempo real
   - [ ] Contador de caracteres
   - [ ] Atajos de teclado"
4. Envía a Claude
```

### C) Entender ListadoProductos
```
1. Abre prompts/productos/ListadoProductos.md
2. Lee todo el prompt
3. Entiende: props, funcionalidades, casos de uso
4. Puedes regenerarlo si necesitas cambios
```

### D) Crear página nueva
```
1. Copia prompts/paginas/page_Home.md
2. Adapta para tu página
3. Cambia nombres y funcionalidades
4. Envía a Claude
5. Recibe página nueva
```

---

## 6️⃣ BUSCAR POR FUNCIONALIDAD

| Necesito... | Archivo |
|-----------|---------|
| Búsqueda en tiempo real | FilterSelect.md, useFiltrarProductosPorValor.md |
| Tabla con datos | Tablas.md, TablaListaProductos.md |
| Modal | Alertas, CrearPedidoAutomatico.md |
| Formulario | Input.md, Button.md, Select.md |
| Navegación | NavBarVertical.md, NavBarHorizontal.md |
| Validar datos | useFormControl.md, Input.md |
| Notificaciones | ErrorNotification.md, useErrorNotification.md |
| Cargar datos | TablaListaProductos.md (Suspense) |
| Atajos teclado | useHotkey.md, useKeyDown.md |
| Imágenes | ImagenProducto.md, ImageWithFallback.md |

---

## 7️⃣ MEJORES PRÁCTICAS

### ✅ Hacer:
```
✅ Copia el prompt completo
✅ Especifica versión de Next.js
✅ Menciona Tailwind CSS
✅ Agrega mejoras específicas
✅ Prueba el código generado
```

### ❌ Evitar:
```
❌ Copiar solo partes del prompt
❌ Cambiar tecnologías (React → Vue)
❌ Ignorar la estructura propuesta
❌ No probar antes de usar
```

---

## 8️⃣ FLUJO TÍPICO

```
1. BUSCAR        → Encuentra el prompt en carpeta
                   
2. LEER          → Entiende PROPÓSITO y PROPS
                   
3. COPIAR        → Copia contenido completo
                   
4. MEJORAR       → Agrega tus requisitos
            (Opcional: mira "NUEVAS CARACTERÍSTICAS")
                   
5. ENVIAR        → Pega en Claude/ChatGPT
                   
6. RECIBIR       → Obtén código generado
                   
7. PROBAR        → Verifica que funcione
                   
8. INTEGRAR      → Copia a tu proyecto
                   
9. PERSONALIZAR  → Ajusta a tu necesidad
                   
10. COMMIT       → Guarda los cambios
```

---

## 9️⃣ COMBINACIONES ÚTILES

### Crear Input con validación
```
Copia: formComponents/Input.md
Agrega: "Validación de email y teléfono"
```

### Mejorar tabla
```
Copia: ui/Tablas.md
Agrega: "Exportación a Excel, ordenamiento"
```

### Crear página de dashboard
```
Copia: paginas/page_Home.md
Adapta: Cambia métricas y links
```

### Agregar filtros
```
Copia: formComponents/FilterSelect.md
Combina: Con useFilter si existe
```

---

## 🔟 TROUBLESHOOTING

### ¿No encuentro el componente?
```
1. Busca en INDEX.md
2. Intenta nombre similar
3. Busca por funcionalidad
4. Pregunta en prompts/00_INICIO_AQUI.md
```

### ¿El prompt no genera bien?
```
1. Verifica que copiaste completo
2. Menciona Next.js + Tailwind
3. Agrega tu arquitectura (server/client)
4. Especifica qué no funcionó
```

### ¿Quiero mejoras específicas?
```
1. Abre el prompt
2. Lee "NUEVAS CARACTERÍSTICAS"
3. Elige las que quieras
4. Agrega al mensaje de IA
```

---

## 📞 REFERENCIAS RÁPIDAS

**Carpetas principales:**
```
/hooks/              - 13 hooks reutilizables
/formComponents/     - 11 componentes form
/alertas/            - 8 alertas y diálogos
/ui/                 - 8 componentes genéricos
/paginas/            - 14 páginas de app
/serverActions/      - 8 backend actions
```

**Documentación:**
```
00_INICIO_AQUI.md    - ← COMIENZA AQUÍ
INDEX.md             - Índice completo
MAESTRO.md           - Tablas y matrices
PROGRESS.md          - Estado actual
MASTER_INDEX.md      - Índice maestro
RESUMEN_FINAL.md     - Resumen ejecutivo
```

---

## ⭐ EJEMPLO COMPLETO

```bash
PASO 1: Necesito mejorar el Input
├─ Abro: prompts/formComponents/Input.md
├─ Leo: PROPÓSITO, PROPS, FUNCIONALIDADES
└─ Copio: TODO el contenido

PASO 2: Agrego mejoras
├─ Leo: NUEVAS CARACTERÍSTICAS
├─ Selecciono:
│  ✓ Máscara de entrada
│  ✓ Validación en tiempo real
│  ✓ Contador de caracteres
└─ Copio todo

PASO 3: Voy a Claude
├─ Pego el prompt
├─ Agrego: "Implementa las 3 mejoras seleccionadas"
└─ Envío

PASO 4: Recibo código
├─ Reviso que funcione
├─ Pruebo en mi app
├─ Funciona ✅
└─ Lo integro

PASO 5: Hago commit
├─ git add app/components/formComponents/Input.jsx
├─ git commit -m "feat: mejorar Input con validación"
└─ git push
```

---

## 🎯 PRÓXIMAS LECTURAS

1. **Para entender la estructura**: Lee `INDEX.md`
2. **Para ver todo de un vistazo**: Lee `MAESTRO.md`
3. **Para componentes específicos**: Busca en carpetas
4. **Para ver el progreso**: Lee `PROGRESS.md`

---

**¡Listo para usar! 🚀 Copia cualquier prompt y comienza a generar código con IA.**
