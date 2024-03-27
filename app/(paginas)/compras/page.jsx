"use client"
import { useState, useCallback } from 'react';

const CargaFacturaForm = ({ proveedores }) => {
  const blankForm = {
    proveedorId: '',
    numeroFactura: '',
    fecha: '',
    tieneImpuestos: false,
    detalles: [{ productoProvId: '', cantidad: 1, precioUnitario: 0 }]
  };

  const [formData, setFormData] = useState(blankForm);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDetalleChange = (index, e) => {
    const updatedDetalles = [...formData.detalles];
    updatedDetalles[index][e.target.name] = e.target.value;
    setFormData((prev) => ({ ...prev, detalles: updatedDetalles }));
  };

  const handleAgregarDetalle = () => {
    setFormData((prev) => ({
      ...prev,
      detalles: [...prev.detalles, { productoProvId: '', cantidad: 1, precioUnitario: 0 }]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Aquí deberías llamar a una función para guardar la factura y sus detalles
    // Por ejemplo: await guardarFactura(formData);
    console.log('Guardando factura:', formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Número de Factura</label>
        <input
          type="text"
          name="numeroFactura"
          value={formData.numeroFactura}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Proveedor</label>
        <select
          name="proveedorId"
          value={formData.proveedorId}
          onChange={handleInputChange}
        >
          <option value="">Seleccione un proveedor</option>
          {proveedores?.map((proveedor) => (
            <option key={proveedor.id} value={proveedor.id}>
              {proveedor.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Fecha</label>
        <input
          type="date"
          name="fecha"
          value={formData.fecha}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Tiene Impuestos</label>
        <input
          type="checkbox"
          name="tieneImpuestos"
          checked={formData.tieneImpuestos}
          onChange={(e) => setFormData((prev) => ({ ...prev, tieneImpuestos: e.target.checked }))}
        />
      </div>
      <div>
        <label>Detalles de Factura:</label>
        {formData?.detalles?.map((detalle, index) => (
          <div key={index}>
            <input
              type="text"
              name="productoProvId"
              value={detalle.productoProvId}
              onChange={(e) => handleDetalleChange(index, e)}
              placeholder="ID Producto"
            />
            <input
              type="number"
              name="cantidad"
              value={detalle.cantidad}
              onChange={(e) => handleDetalleChange(index, e)}
              placeholder="Cantidad"
            />
            <input
              type="number"
              name="precioUnitario"
              value={detalle.precioUnitario}
              onChange={(e) => handleDetalleChange(index, e)}
              placeholder="Precio Unitario"
            />
          </div>
        ))}
        <button type="button" onClick={handleAgregarDetalle}>Agregar Detalle</button>
      </div>
      <button type="submit">Guardar Factura</button>
    </form>
  );
};

export default CargaFacturaForm;
