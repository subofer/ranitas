#!/bin/bash
# Script para generar prompts automáticos para componentes sin documentar

# Array de componentes formComponents sin documentar
formComponents=(
    "InputSelect"
    "InputArrayList"
    "SelectSearch"
    "FormContainer"
    "Title"
    "CameraCapture"
    "SelectorImagenes"
    "EditarCodigoForm"
)

# Array de componentes productos sin documentar
productos=(
    "ListadoProductos"
    "TbodyTablaProducto"
    "RenglonTablaProducto"
    "TablaListaVenta"
    "DetalleProducto"
    "GestionPresentaciones"
    "SelectTipoPresentacion"
    "BotonEditarProducto"
    "BotonEliminarProducto"
    "ProductListPlaceholder"
    "ProductGridPlaceholder"
)

# Array de componentes alertas sin documentar
alertas=(
    "alertaBorrarProveedor"
    "alertaBorrarCategoria"
    "alertaCrearCodigoDeBarras"
    "alertaLeerCodigoBarra"
    "alertaTotalCompra"
    "alertaSiNoAction"
)

# Array de componentes otros
otros=(
    "Skeleton"
    "Image"
    "LoadImage64"
    "HiglightMatch"
)

echo "✓ Este script generaría prompts básicos para:"
echo "  - formComponents: ${#formComponents[@]}"
echo "  - productos: ${#productos[@]}"
echo "  - alertas: ${#alertas[@]}"
echo "  - otros: ${#otros[@]}"
echo ""
echo "Total: $((${#formComponents[@]} + ${#productos[@]} + ${#alertas[@]} + ${#otros[@]})) componentes"
