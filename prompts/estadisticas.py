#!/usr/bin/env python3
"""
Generador de Prompts para Componentes React - Ranitas
Archivo de configuración y estadísticas

Generado: 7 de enero de 2026
"""

PROMPTS_GENERADOS = {
    "FORMULARIOS": {
        "Input.jsx": {
            "lineas": 300,
            "criticidad": "⭐⭐⭐",
            "complejidad": "🟠 MEDIO",
            "categoria": "Base",
            "mejoras": 15
        },
        "Button.jsx": {
            "lineas": 280,
            "criticidad": "⭐⭐⭐",
            "complejidad": "🟢 SIMPLE",
            "categoria": "Base",
            "mejoras": 12
        },
        "Select.jsx": {
            "lineas": 220,
            "criticidad": "⭐⭐",
            "complejidad": "🟢 SIMPLE",
            "categoria": "Base",
            "mejoras": 10
        },
        "FilterSelect.jsx": {
            "lineas": 400,
            "criticidad": "⭐⭐⭐",
            "complejidad": "🔴 ALTO",
            "categoria": "Avanzado",
            "mejoras": 14
        }
    },
    
    "PRODUCTOS": {
        "ListadoProductosModerno.jsx": {
            "lineas": 620,
            "criticidad": "⭐⭐⭐",
            "complejidad": "🔴 ALTO",
            "categoria": "Complejo",
            "mejoras": 20
        },
        "TablaListaProductos.jsx": {
            "lineas": 350,
            "criticidad": "⭐⭐⭐",
            "complejidad": "🟠 MEDIO",
            "categoria": "Intermedio",
            "mejoras": 13
        }
    },
    
    "PEDIDOS": {
        "ListaPedidos.jsx": {
            "lineas": 350,
            "criticidad": "⭐⭐⭐",
            "complejidad": "🟠 MEDIO",
            "categoria": "Intermedio",
            "mejoras": 12
        },
        "BotonAgregarPedido.jsx": {
            "lineas": 300,
            "criticidad": "⭐⭐⭐",
            "complejidad": "🟠 MEDIO",
            "categoria": "Intermedio",
            "mejoras": 10
        },
        "AgregarProductoPedido.jsx": {
            "lineas": 360,
            "criticidad": "⭐⭐⭐",
            "complejidad": "🟠 MEDIO",
            "categoria": "Intermedio",
            "mejoras": 11
        }
    },
    
    "DASHBOARD": {
        "Dashboard.jsx": {
            "lineas": 380,
            "criticidad": "⭐⭐⭐",
            "complejidad": "🟠 MEDIO",
            "categoria": "Intermedio",
            "mejoras": 14
        },
        "MetricCard.jsx": {
            "lineas": 200,
            "criticidad": "⭐⭐",
            "complejidad": "🟢 SIMPLE",
            "categoria": "Base",
            "mejoras": 13
        }
    },
    
    "NAVEGACION": {
        "NavBarVertical.jsx": {
            "lineas": 200,
            "criticidad": "⭐⭐",
            "complejidad": "🟢 SIMPLE",
            "categoria": "Base",
            "mejoras": 14
        }
    },
    
    "ALERTAS": {
        "alertaBorrarProducto.jsx": {
            "lineas": 170,
            "criticidad": "⭐⭐⭐",
            "complejidad": "🟢 SIMPLE",
            "categoria": "Base",
            "mejoras": 12
        }
    }
}

ESTADISTICAS = {
    "total_archivos": 15,
    "total_lineas": 2789,
    "total_componentes": 13,
    "total_documentacion": 2,
    "total_mejoras_sugeridas": 155,
    "palabras_estimadas": 35000,
    "horas_analisis": 2,
    "componentes_analizados": 113,
    "tasa_cobertura": "11.5%"
}

PRIORITARIOS_TOP_5 = [
    {
        "ranking": 1,
        "componente": "FilterSelect.jsx",
        "razon": "Base de búsqueda en toda la app",
        "impacto": "🔴 CRÍTICO",
        "estimacion": "6 horas"
    },
    {
        "ranking": 2,
        "componente": "Input.jsx",
        "razon": "Base de todos los formularios",
        "impacto": "🔴 CRÍTICO",
        "estimacion": "4 horas"
    },
    {
        "ranking": 3,
        "componente": "Dashboard.jsx",
        "razon": "Home page principal",
        "impacto": "🔴 CRÍTICO",
        "estimacion": "3.5 horas"
    },
    {
        "ranking": 4,
        "componente": "ListadoProductosModerno.jsx",
        "razon": "Página más visitada",
        "impacto": "🔴 CRÍTICO",
        "estimacion": "5.5 horas"
    },
    {
        "ranking": 5,
        "componente": "ListaPedidos.jsx",
        "razon": "Flujo de compras crítico",
        "impacto": "🔴 CRÍTICO",
        "estimacion": "4 horas"
    }
]

# Resumen por categoría
def imprimir_resumen():
    print("=" * 80)
    print("📊 RESUMEN DE PROMPTS GENERADOS - RANITAS")
    print("=" * 80)
    print()
    
    for categoria, componentes in PROMPTS_GENERADOS.items():
        print(f"📁 {categoria}")
        print("-" * 80)
        for nombre, datos in componentes.items():
            print(f"  ✓ {nombre}")
            print(f"    • Criticidad: {datos['criticidad']}")
            print(f"    • Complejidad: {datos['complejidad']}")
            print(f"    • Mejoras: {datos['mejoras']} sugeridas")
        print()
    
    print("=" * 80)
    print("📈 ESTADÍSTICAS GLOBALES")
    print("=" * 80)
    for clave, valor in ESTADISTICAS.items():
        print(f"  {clave.replace('_', ' ').title()}: {valor}")
    print()
    
    print("=" * 80)
    print("🏆 TOP 5 COMPONENTES PARA MEJORAR PRIMERO")
    print("=" * 80)
    for item in PRIORITARIOS_TOP_5:
        print(f"  {item['ranking']}. {item['componente']}")
        print(f"     Razón: {item['razon']}")
        print(f"     Impacto: {item['impacto']}")
        print(f"     Estimación: {item['estimacion']}")
    print()

if __name__ == "__main__":
    imprimir_resumen()
