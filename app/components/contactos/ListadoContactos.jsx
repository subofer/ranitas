"use client"

import { useState, useEffect } from 'react';
import { getContactosCompletos } from "@/prisma/serverActions/contactos"
import ListadoContactosCliente from "./ListadoContactosCliente"

export default function ListadoContactos(props) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContactos = async () => {
      try {
        const data = await getContactosCompletos();
        setContactos(data);
      } catch (error) {
        console.error('Error cargando contactos:', error);
        setContactos([]);
      } finally {
        setLoading(false);
      }
    };

    loadContactos();
  }, []);

  const columnas = ['id', 'Cuit', 'Nombre', 'E-mail', 'Tipo', 'telefono', '']

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <ListadoContactosCliente
      columnas={columnas}
      contactos={contactos}
      {...props}
    />
  )
}
