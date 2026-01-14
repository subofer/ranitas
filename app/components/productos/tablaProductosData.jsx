import { textos } from '@/lib/manipularTextos';
import { BotonEditarProducto } from './BotonEditarProducto';
import { BotonEliminarProducto } from './BotonEliminarProducto';
import ImagenProducto from './ImagenProducto';
import { eliminarProductoConPreciosPorId } from '@/prisma/serverActions/productos';
import { alertaBorrarProducto } from '../alertas/alertaBorrarProducto';
import { showImagenProducto } from './showImagenProducto';
import Counter from '../formComponents/Counter';
import RenderCategorias from '../categorias/RenderCategorias';
import BotonAgregarPedidoTabla from './BotonAgregarPedidoTabla';
import Icon from '../formComponents/Icon';

const CantidadVenta = ({ item, especialCounter, onEditarGranel }) => {
  if (item?.tipoVenta === 'GRANEL') {
    const cant = Number(item?.cantidad) || 0;
    const unidad = item?.unidadVenta || item?.unidad || 'kg';
    const textoCant = `${cant.toFixed(3)} ${unidad}`;
    const variedad = (item?.variedad || '').trim();

    return (
      <button
        type="button"
        onClick={() => onEditarGranel?.(item)}
        className="text-left px-2 py-1 rounded-md hover:bg-gray-100"
        title="Editar peso/variedad"
      >
        <div className="font-medium text-gray-900 tabular-nums">{textoCant}</div>
        {variedad ? <div className="text-xs text-gray-600 truncate">{variedad}</div> : <div className="text-xs text-gray-400">(sin variedad)</div>}
      </button>
    );
  }

  return <Counter especialCounter={especialCounter} item={item} valueKey="cantidad" />;
};

const EliminarVenta = ({ item, onEliminarVenta }) => (
  <Icon
    icono={"eliminar"}
    className={"text-red-600 cursor-pointer"}
    onClick={() => onEliminarVenta?.(item)}
  />
);


export const tablaListaProductosColumnasNames = {
  edit: {
    titulo:"",
    Component: BotonEditarProducto,
    onClick: ({codigoBarra}) => ({action:"addParam", key:"codigoBarra", value: codigoBarra, isParams: true}),
    className:"text-center",
    noselect: true,
    colw: "w-[30px]"
  },
  codigoBarra: {
    titulo: "Codigo",
    key:"codigoBarra",
    className:"text-center px-2",
    colw: "w-px",
  },
  cat: {
    titulo: "Categoria",
    key:"categorias",
    className:"whitespace-nowrap text-center px-2",
    valorDefecto:"-",
    ordenable: true,
    colw: "w-px",
    Component: RenderCategorias,
  },
  nombre: {
    titulo: "Nombre",
    key:"nombre",
    className:"px-2 text-left",

    ordenable: true,
  },
  desc: {
    titulo: "Descripcion",
    key: "descripcion",
    className:"px-2 text-center",
    ordenable: true,
  },
  size: {
    titulo: "Tamaño",
    key:["size","unidad"],
    className:"px-2 text-center whitespace-nowrap",
    colw: "w-px px-1",
    decorador: textos.unidades,
  },
  precioActual: {
    titulo: "Precio",
    key: "precioActual",
    className: "px-4 text-right",
    decorador: textos.monedaDecimales,
    ordenable: true,
    colw: "w-[4rem] px-1",
  },
  precioTotal: {
    titulo: "Precio",
    key: "sumaVenta",
    className: "px-2 pr-4 text-right w-px",
    decorador: textos.moneda,
    ordenable: true,
    colw: "w-px",
  },
  cantidad: {
    titulo: "Cantidad",
    key: "cantidad",
    Component: Counter,
    className: "px-2 pr-4 text-right w-px",
    ordenable: true,
    noselect: true,
  },
  cantidadVenta: {
    titulo: "Cantidad",
    key: "cantidad",
    Component: CantidadVenta,
    className: "px-2 pr-4 text-right w-px",
    ordenable: true,
    noselect: true,
  },
  stock: {
    titulo: "Stock",
    key: "stock",
    valueKey: 'stock',
    Component: Counter,
    className: "flex flex-row text-right justify-center",
    colw: "w-px px-1",
    ordenable: true,
    noselect: true,
  },
  imagen: {
    titulo:"Img",
    size: 70,
    key:"imagen",
    className: "flex justify-center p-0 w-auto my-1",
    Component: ImagenProducto,
    onClick: showImagenProducto,
    componentClassname: "mx-0 self-center cursor-zoom-in",
    colw:"w-[70px] min-w-[70px] ",
    noselect: true,
  },
  agregarPedido: {
    titulo: "Pedido",
    Component: BotonAgregarPedidoTabla,
    className: "text-center px-2",
    colw: "w-[80px]",
    noselect: true,
  },
  eliminar: {
    titulo: "",
    className: "px-2 text-center w-px",
    Component: BotonEliminarProducto,
    componentClassname: "p-0 m-0",
    onClick: async (item) => {
      await alertaBorrarProducto(item, () => eliminarProductoConPreciosPorId(item.id));
    },
    noselect: true,
    colw:"w-px",
  },
  eliminarLocal: {
    titulo: "",
    className: "px-2 text-center w-px",
    Component: BotonEliminarProducto,
    onClick: (item, items) => {
      const index = items.findIndex(({id}) => item.id == id)
      items[index].cantidad = items[index].cantidad - 1
      return{
        isParams: true,
        action: "recarga",
      }
    },
    componentClassname: "p-0 m-0",
    noselect: true,
  },
  eliminarVenta: {
    titulo: "",
    className: "px-2 text-center w-px",
    Component: BotonEliminarProducto,
    onClick: (item, items) => {
      const index = items.findIndex(({ id }) => item.id == id);
      if (index !== -1) items.splice(index, 1);
      return {
        isParams: true,
        action: "recarga",
      };
    },
    componentClassname: "p-0 m-0",
    noselect: true,
  },

  // Columnas para POS/venta (no afectan BD)
  cantidadVenta: {
    titulo: "Cantidad",
    key: "cantidad",
    Component: CantidadVenta,
    className: "px-2 pr-4 text-right w-px",
    ordenable: true,
    noselect: true,
  },
  eliminarVenta: {
    titulo: "",
    className: "px-2 text-center w-px",
    Component: EliminarVenta,
    noselect: true,
    colw: "w-px",
  },
}

export const obtenerValorPorRuta = (item, clave) => {
  const {key, decorador, ...resto} = tablaListaProductosColumnasNames[clave]
  const keys = Array.isArray(key) ? key : [key];
  const texto = keys?.map(subclave =>
    subclave?.split('.')?.reduce((resultado, clave) => {
        return resultado ? resultado[clave] : undefined;
      }, item)
    ).join(" ");

  return {
    texto,
    decorador: decorador ? decorador : (a) => a,
    ...resto
  }
};
