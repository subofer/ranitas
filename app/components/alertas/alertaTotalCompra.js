import Swal from 'sweetalert2'
import { alertaSiNoAcction } from './genericas/alertaSiNoAction';

export const alertaTotalCompra = async (action, venta) => {
  
  const pregunta = {
    title: `Cobrar Total: $${venta.total}`,
    text: "Gracias por su compra!!",
    icon: 'warning',
    html: `
    <style>
    .swal2-popup {
      font-family: 'Courier New', Courier, monospace; /* Estilo de fuente de máquina de escribir para simular ticket */
    }
    .swal2-title {
      color: #333;
      font-weight: bold;
      font-size: 1.2em;
      margin-bottom: 1em;
    }
      .ticket-container {
        padding: 1em;
        border: none;
        font-size: 0.9em; /* Ajustar el tamaño de la fuente si es necesario */
      }
      .ticket-table {
        width: 100%;
        border-collapse: collapse;
      }
      .ticket-table th, .ticket-table td {
        padding: 0.4em;
        text-align: left;
        border-bottom: 1px solid #ddd;
        word-break: keep-all; /* Evitar cortar palabras */
        white-space: normal; /* Permitir que el texto ocupe más de una línea */
      }
      .ticket-table th {
        font-weight: bold;
      }
      .ticket-table td {
        vertical-align: top; /* Alinear el texto en la parte superior de la celda */
      }
      .ticket-table td.cantidad {
        max-width: 50px; /* Ajustar al ancho deseado para los nombres */
      }
      .ticket-table td.nombre {
        max-width: 150px; /* Ajustar al ancho deseado para los nombres */
      }
      .ticket-table td.subtotal {
        width: 1%; /* Ajustar al ancho deseado para los subtotales */
        white-space: nowrap; /* Evitar que los números se partan en líneas */
        text-align: right;
      }
      .ticket-total {
        font-weight: bold;
        font-size: 1.2em;
        text-align: right;
        padding-top: 0.5em;
      }
    </style>
    <div class="ticket-container">
      <table class="ticket-table">
        <thead>
          <tr>
            <th class="cantidad">Qt.</th>
            <th class="nombre">Nombre</th>
            <th class="subtotal">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${venta.detalle.map(d => `
            <tr>
              <td class="cantidad">${d.cantidad}</td>
              <td class="nombre">${d.nombre}</td>
              <td class="subtotal">$${d.sumaVenta.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="ticket-total">Total: $${venta.total.toFixed(2)}</div>
    </div>
  `,
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Cobrar',
    cancelButtonText: 'Cancelar',
  }

  const solucion = {
    true: {
      title: 'Cobrado!',
      text: 'Gracias por su compra',
      icon: 'success',
    },
    false : {
      title: 'Venta cancelada',
      text: 'Ups..',
      icon: 'info',
    }
  }

  alertaSiNoAcction(action, pregunta, solucion, venta)
}