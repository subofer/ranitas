# 🪦 Cementerio de Código

Esta carpeta contiene código obsoleto que ya no se usa en la aplicación, pero se guarda por nostalgia y referencia histórica.

## ⚠️ IMPORTANTE

**NADA de esta carpeta debe ser importado o usado en el código activo.**

Si necesitas algo de aquí, primero evalúa si realmente lo necesitas o si hay una mejor solución moderna.

---

## 📁 Contenido

### `hooks/`
- `useOllamaStatus.js` - Hook obsoleto reemplazado por `OllamaStatusContext`
  - **Problema:** Causaba re-renders innecesarios y flickeo en inputs
  - **Reemplazo:** `app/context/OllamaStatusContext.jsx` + `ModelStatusIndicator.jsx`
  - **Fecha entierro:** 25/01/2026
  - **RIP:** Murió por causar mal rendimiento

### `components/ia/`
- `IaPromp.backup.jsx` - Versión antigua de IaPromp
- `IaImage.backup.jsx` - Backup de IaImage
- `IaImage.backup-v2.jsx` - Versión 2 de backup
- `IaImage.backup-v3.jsx` - Versión 3 de backup
- `IaImage-old.jsx` - Versión vieja con duplicados
  - **Problema:** Variables duplicadas que causaban errores de lint
  - **Fecha entierro:** 25/01/2026
  - **RIP:** Murió por tener identidades múltiples

---

## 🎓 Lecciones Aprendidas

1. **No dejar archivos .backup en el código activo**
   - Usa Git para historial
   - Si necesitas backup, usa ramas

2. **Polling debe estar en contexto, no en hooks locales**
   - Evita re-renders innecesarios
   - Centraliza operaciones costosas

3. **Limpia el código regularmente**
   - Código muerto confunde
   - Aumenta el tamaño del bundle
   - Dificulta mantenimiento

---

## 🔍 ¿Necesitas algo de aquí?

Antes de usar código del cementerio, pregúntate:

1. ✅ ¿Existe una solución moderna mejor?
2. ✅ ¿Por qué se deprecó originalmente?
3. ✅ ¿Vale la pena resucitarlo o mejor reescribirlo?

**Regla de oro:** Si está en el cementerio, hay una razón. Úsalo solo como referencia, nunca copies directamente.

---

*"El código viejo nunca muere, solo se archiva en carpetas con nombres graciosos."* 🪦
