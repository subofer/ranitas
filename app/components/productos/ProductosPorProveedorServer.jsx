"use client";
import { obtenerProductosPorProveedor } from "@/prisma/serverActions/proveedores";
import EditarCodigoForm from "../formComponents/EditarCodigoForm"; // Importamos el formulario cliente
import { useCallback, useEffect, useState } from "react";

export default function ProductosPorProveedorServer({ proveedorId }) {
  const [productos, setProductos] = useState([]);
  const refreshData = useCallback( async () => {
    setProductos(await obtenerProductosPorProveedor(proveedorId));
  },[proveedorId])

  useEffect(() => {
    refreshData()
  },[refreshData])

  useEffect(() => {
    console.log(productos)
  },[productos])


  return (
    <div>
      <h2>Productos del Proveedor</h2>
      <ul>
        {productos.map(({ codigo, producto }) => (
          <li key={producto.id}>
            Nombre Propio: {producto.nombre}<br/>
            Nombre del Proveedor: {codigo}<br/>
            <EditarCodigoForm dale={refreshData} codigo={codigo} proveedorId={proveedorId} producto={producto} />
          </li>
        ))}
      </ul>
    </div>
  );
}
