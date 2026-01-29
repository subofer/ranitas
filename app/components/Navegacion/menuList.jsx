const menuList = {
  "Home" : "/",
  "Venta" : "/venta",
  "Cargar Producto" : "/productos",
  "Ver Productos" : "/listadoProductos",
  "Categorias" : "/categorias",
  "Busqueda" : "/buscarEnGoogle",
  "Compras" : "/compras",
  "Proveedores" : "/proveedores",
  "Ia" : "/ia",
  "Configuración": "/configuracion"
}

export default menuList;

export const menuListHorizontal = [
  { menu: "Principal", subMenu: [
    { menu: "Home", href: "/", subMenu: [] },
    { menu: "Productos", href: "/listadoProductos" },
    { menu: "Productos x proveedor", href: "/productosProveedor" },
    { menu: "Busqueda", href: "/buscarEnGoogle" },
  ] },
  { menu: "Operaciones", subMenu: [
    { menu: "Cargar Factura", href: "/compras" },
    { menu: "Facturas", href: "/facturas" },
    { menu: "Pedidos", href: "/pedidos" },
    { menu: "Minorista", href: "/venta" },
    { menu: "Mayorista", href: "/venta" },
  ] },
  { menu: "ABM", subMenu: [
    { menu: "Productos", href: "/cargarProductos" },
    { menu: "Categorias", href: "/categorias" },
    { menu: "Contactos", href: "/contactos" },
  ] },
  { menu: "Ia", href: "/ia", subMenu: [] },
  { menu: "Admin", subMenu: [
    { menu: "Auditoria", href: "/audit", subMenu: []  },
    { menu: "Pendientes", href: "/pendientes", subMenu: [] },
    { menu: "Configuración", href: "/configuracion", subMenu: [] },
  ]  },
];
