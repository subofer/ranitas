#!/bin/bash

# Script de prueba para verificar Ollama con imágenes

echo "🧪 Test de Ollama - Análisis de Imágenes"
echo "========================================"
echo ""

# 1. Verificar que Ollama esté corriendo
echo "1️⃣ Verificando servicio Ollama..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama está corriendo"
else
    echo "❌ Ollama NO está corriendo"
    echo "   Ejecuta: ollama serve"
    exit 1
fi
echo ""

# 2. Listar modelos disponibles
echo "2️⃣ Modelos disponibles:"
ollama list | grep -E "(qwen.*vl|llava|minicpm-v)" || echo "⚠️ No hay modelos de visión instalados"
echo ""

# 3. Verificar modelo específico
MODEL="qwen2.5vl:7b"
echo "3️⃣ Verificando modelo $MODEL..."
if ollama list | grep -q "$MODEL"; then
    echo "✅ Modelo $MODEL encontrado"
    
    # Detener el modelo para limpiar estado
    echo ""
    echo "4️⃣ Limpiando estado del modelo en VRAM..."
    ollama stop "$MODEL" 2>/dev/null || echo "   (modelo no estaba cargado)"
    sleep 2
    echo "✅ Estado limpiado"
else
    echo "❌ Modelo $MODEL no encontrado"
    echo "   Ejecuta: ollama pull $MODEL"
    exit 1
fi
echo ""

# 5. Test con imagen de prueba (si existe)
echo "5️⃣ Buscando imágenes de prueba..."
TEST_IMAGES=$(find . -maxdepth 3 -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) 2>/dev/null | head -5)

if [ -z "$TEST_IMAGES" ]; then
    echo "⚠️ No se encontraron imágenes de prueba en el directorio actual"
    echo ""
    echo "Puedes probar manualmente con:"
    echo "  ollama run $MODEL 'describe esta imagen' < /ruta/a/tu/imagen.jpg"
else
    echo "📸 Imágenes encontradas:"
    echo "$TEST_IMAGES"
    echo ""
    
    FIRST_IMAGE=$(echo "$TEST_IMAGES" | head -1)
    echo "6️⃣ Probando análisis con: $FIRST_IMAGE"
    echo "   Comando: ollama run $MODEL 'que ves en esta imagen?' < \"$FIRST_IMAGE\""
    echo ""
    echo "   Respuesta:"
    echo "   ────────────────────────────────────"
    
    # Ejecutar test con timeout de 60 segundos
    timeout 60s ollama run "$MODEL" "describe brevemente que ves en esta imagen" < "$FIRST_IMAGE" 2>&1 || {
        EXIT_CODE=$?
        echo ""
        echo "   ────────────────────────────────────"
        if [ $EXIT_CODE -eq 124 ]; then
            echo "❌ Timeout (60s) - El modelo tardó demasiado"
        else
            echo "❌ Error al ejecutar el modelo (código $EXIT_CODE)"
        fi
    }
fi

echo ""
echo "========================================"
echo "✅ Test completado"
echo ""
echo "Notas:"
echo "  - Si el test por terminal funciona pero la API no:"
echo "    → El problema está en cómo Node.js procesa el buffer/base64"
echo "  - Si el test por terminal también falla:"
echo "    → Problema con la resolución de la imagen o el modelo"
echo "  - Resoluciones recomendadas: 672x672, 896x896 (múltiplos de 28)"
