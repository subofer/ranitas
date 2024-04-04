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
  { menu: "ABM", subMenu: [
    { menu: "Cargar Producto", href: "/productos" },
    { menu: "Categorias", href: "/categorias" },
    { menu: "Proveedores", href: "/proveedores" },
    { menu: "Compras", href: "/compras" },
  ] },
  { menu: "Ia", href: "/ia", subMenu: [] },
];
