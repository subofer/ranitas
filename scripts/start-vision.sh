#!/bin/bash
# Script para construir y levantar el sistema completo
# Incluye PostgreSQL y el servicio de visión con GPU

set -e

echo "🚀 Iniciando sistema Ranitas con servicio de visión..."

# Crear directorio para modelos si no existe
mkdir -p services/yolo/models

# Verificar NVIDIA Container Toolkit
if ! docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi &>/dev/null; then
    echo "⚠️  ADVERTENCIA: NVIDIA Container Toolkit no detectado o GPU no disponible"
    echo "   El servicio de visión funcionará en CPU (más lento)"
    echo "   Para instalar: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
    read -p "   ¿Continuar de todos modos? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# Construir imágenes
echo "📦 Construyendo contenedor de visión..."
docker-compose build vision

# Levantar servicios
echo "🎯 Levantando servicios..."
docker-compose up -d

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 5

# Verificar estado
echo "🔍 Verificando estado de servicios..."
docker-compose ps

# Verificar servicio de visión
echo ""
echo "🤖 Estado del servicio de visión:"
if curl -s http://localhost:8000/status | jq . 2>/dev/null; then
    echo "✅ Servicio de visión operativo"
else
    echo "⚠️  Servicio de visión no responde aún (puede estar descargando modelos)"
    echo "   Verifica logs con: docker-compose logs -f vision"
fi

echo ""
echo "✨ Sistema iniciado!"
echo "   - PostgreSQL: localhost:5432"
echo "   - Visión API: http://localhost:8000"
echo "   - Docs API: http://localhost:8000/docs"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs: docker-compose logs -f vision"
echo "   Reiniciar: docker-compose restart vision"
echo "   Detener: docker-compose down"
