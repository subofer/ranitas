"use client"

import { DashboardCard } from "@/components/dashboard/DashboardCard"
import { Dashboard } from "@/components/dashboard/Dashboard"

export default function Home() {
  const menuItems = [
    {
      title: "Gestionar Productos",
      description: "Cargar y administrar productos del inventario",
      icon: "📦",
      href: "/cargarProductos",
      color: "blue"
    },
    {
      title: "Ver Productos",
      description: "Listado completo y búsqueda de productos",
      icon: "📋",
      href: "/listadoProductos",
      color: "green"
    },
    {
      title: "Gestionar Contactos",
      description: "Administrar proveedores y clientes",
      icon: "👥",
      href: "/contactos",
      color: "purple"
    },
    {
      title: "Categorías",
      description: "Organizar productos por categorías",
      icon: "🏷️",
      href: "/categorias",
      color: "orange"
    },
    {
      title: "Ventas",
      description: "Registrar y gestionar ventas",
      icon: "💰",
      href: "/venta",
      color: "green"
    },
    {
      title: "Compras",
      description: "Control de compras y proveedores",
      icon: "🛒",
      href: "/compras",
      color: "blue"
    },
    {
      title: "Productos por Proveedor",
      description: "Ver productos organizados por proveedor",
      icon: "🏭",
      href: "/productosProveedor",
      color: "indigo"
    },
    {
      title: "Inteligencia Artificial",
      description: "Herramientas de IA para el negocio",
      icon: "🤖",
      href: "/ia",
      color: "purple"
    }
  ];

  return (
    <main className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'>
      <div className='container mx-auto px-2 py-6'>
        {/* Dashboard Section */}
        <div className="mb-8">
          <Dashboard />
        </div>

        {/* Menu Cards Grid */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            Funcionalidades
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {menuItems.map((item, index) => (
              <DashboardCard key={index} {...item} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}