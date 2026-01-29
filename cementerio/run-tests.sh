#!/bin/bash

# ============================================
# SCRIPT PARA EJECUTAR TESTS CYPRESS
# Sistema: Ranitas - Gestión de Inventario
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TESTS CYPRESS - SISTEMA RANITAS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"

# Función para mostrar menú
show_menu() {
    echo -e "\n${YELLOW}Opciones disponibles:${NC}"
    echo -e "${GREEN}1)${NC} Ejecutar todos los tests (headless)"
    echo -e "${GREEN}2)${NC} Ejecutar tests en modo interactivo"
    echo -e "${GREEN}3)${NC} Ejecutar test específico"
    echo -e "${GREEN}4)${NC} Ejecutar solo tests de autenticación"
    echo -e "${GREEN}5)${NC} Ejecutar solo tests de productos"
    echo -e "${GREEN}6)${NC} Ejecutar solo tests de categorías"
    echo -e "${GREEN}7)${NC} Ejecutar solo tests de contactos"
    echo -e "${GREEN}8)${NC} Ver reporte último run"
    echo -e "${GREEN}0)${NC} Salir"
    echo -n -e "\n${BLUE}Selecciona una opción: ${NC}"
}

# Función para verificar servidor
check_server() {
    echo -e "\n${YELLOW}Verificando servidor...${NC}"
    if curl -s http://localhost:3000 > /dev/null; then
        echo -e "${GREEN}✓ Servidor corriendo en http://localhost:3000${NC}"
    else
        echo -e "${RED}✗ Servidor NO está corriendo${NC}"
        echo -e "${YELLOW}Inicia el servidor con: npm run dev${NC}"
        exit 1
    fi
}

# Función para ejecutar todos los tests
run_all_tests() {
    echo -e "\n${YELLOW}Ejecutando TODOS los tests...${NC}"
    check_server
    npx cypress run --headless --browser chrome
    echo -e "\n${GREEN}✓ Tests completados${NC}"
}

# Función para modo interactivo
run_interactive() {
    echo -e "\n${YELLOW}Abriendo Cypress en modo interactivo...${NC}"
    check_server
    npx cypress open
}

# Función para ejecutar test específico
run_specific_test() {
    echo -e "\n${YELLOW}Tests disponibles:${NC}"
    ls -1 cypress/e2e/*.cy.js | sed 's/.*\///' | nl
    echo -n -e "\n${BLUE}Selecciona el número del test: ${NC}"
    read -r test_num
    
    test_file=$(ls -1 cypress/e2e/*.cy.js | sed -n "${test_num}p")
    
    if [ -z "$test_file" ]; then
        echo -e "${RED}Archivo no encontrado${NC}"
        return
    fi
    
    echo -e "\n${YELLOW}Ejecutando: $(basename "$test_file")${NC}"
    check_server
    npx cypress run --spec "$test_file" --headless --browser chrome
}

# Función para ejecutar tests por categoría
run_category() {
    local category=$1
    echo -e "\n${YELLOW}Ejecutando tests de: $category${NC}"
    check_server
    npx cypress run --spec "cypress/e2e/${category}.cy.js" --headless --browser chrome
}

# Función para ver reporte
show_report() {
    echo -e "\n${YELLOW}Abriendo reporte...${NC}"
    if [ -f "cypress/reports/report.html" ]; then
        open cypress/reports/report.html || xdg-open cypress/reports/report.html || echo "Abre manualmente: cypress/reports/report.html"
    else
        echo -e "${RED}No hay reporte disponible. Ejecuta los tests primero.${NC}"
    fi
}

# Loop principal
while true; do
    show_menu
    read -r choice
    
    case $choice in
        1) run_all_tests ;;
        2) run_interactive ;;
        3) run_specific_test ;;
        4) run_category "auth" ;;
        5) run_category "productos" ;;
        6) run_category "categorias" ;;
        7) run_category "contactos" ;;
        8) show_report ;;
        0) 
            echo -e "${BLUE}¡Hasta luego!${NC}"
            exit 0
            ;;
        *) echo -e "${RED}Opción inválida${NC}" ;;
    esac
done
