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
}

export default menuList;

export const menuListHorizontal = [
  { menu: "Home", href: "/", subMenu: [] },
  { menu: "Inventario", subMenu: [
    { menu: "Productos", href: "/listadoProductos" },
    { menu: "Productos x proveedor", href: "/productosProveedor" },
    { menu: "Busqueda", href: "/buscarEnGoogle" },
  ] },
  { menu: "Compras", subMenu: [
    { menu: "Cargar Factura", href: "/compras" },
    { menu: "Facturas", href: "/facturas" },
    { menu: "Pedidos", href: "/pedidos" },
  ] },
  { menu: "Ventas", subMenu: [
    { menu: "Minorista", href: "/venta" },
    { menu: "Mayorista", href: "/venta" },
  ] },
  { menu: "ABM", subMenu: [
    { menu: "Productos", href: "/cargarProductos" },
    { menu: "Categorias", href: "/categorias" },
    { menu: "Contactos", href: "/contactos" },
  ] },
  { menu: "Ia", href: "/ia", subMenu: [] },
  { menu: "Auditoria", href: "/audit", subMenu: []  },
  { menu: "Pendientes", href: "/pendientes", subMenu: [] },
];
