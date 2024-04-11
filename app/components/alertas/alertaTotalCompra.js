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
        font-family: Arial, sans-serif;
      }
      .swal2-title {
        color: #333;
        font-weight: bold;
      }
      .ticket-container {
        padding: 20px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #f7f7f7;
      }
      .ticket-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
      }
      .ticket-table thead th {
        text-align: left;
        border-bottom: 2px solid #333;
        padding-bottom: 5px;
      }
      .ticket-table tbody td {
        padding: 5px 0;
        border-bottom: 1px solid #ccc;
      }
      .ticket-total {
        text-align: right;
        font-weight: bold;
        margin-top: 10px;
        font-size: 1.2em;
      }
    </style>
    <div class="ticket-container">
      <table class="ticket-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${venta.detalle.map(d => `
            <tr> 
              <td>${d.nombre}</td>
              <td>$${d.sumaVenta.toFixed(2)}</td>
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