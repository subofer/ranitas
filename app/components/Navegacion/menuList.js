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
  { menu: "Listados", href: "/venta", subMenu: [
    { menu: "Productos", href: "/listadoProductos" },
    { menu: "Busqueda", href: "/buscarEnGoogle" },
  ] },
  { menu: "Ventas", href: "/venta", subMenu: [
    { menu: "Minorista", href: "/venta" },
    { menu: "Mayorista", href: "/venta" },
  ] },
  { menu: "Compras", subMenu: [
    { menu: "Cargar Factura", href: "/compras" },
  ] },
  { menu: "ABM", subMenu: [
    { menu: "Productos", href: "/cargarProductos" },
    { menu: "Categorias", href: "/categorias" },
    { menu: "Contactos", href: "/contactos" },
  ] },
  { menu: "Ia", href: "/ia", subMenu: [] },
  { menu: "Auditoria", href: "/", subMenu: [] },
];
