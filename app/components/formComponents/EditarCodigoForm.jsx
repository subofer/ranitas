"use client";

import { editarNombreProductoProveedor } from "@/prisma/serverActions/proveedores";
import Input from "./Input";
import Button from "./Button";
import { FormCard } from "./FormCard";

export default function EditarCodigoForm({ codigo, proveedorId, producto, dale }) {

  const formAction = async (formData) => {
    await editarNombreProductoProveedor(formData)
    dale()
  }

  return (
    <FormCard action={formAction} buttons={false} className={`w-[400px] flex flex-row gap-2`}>
      <input type="hidden" name="proveedorId" value={proveedorId} />
      <input type="hidden" name="productoId" value={producto.id} />
      <Input
        type="text"
        name="nuevoCodigo"
        defaultValue={codigo}
        placeholder="Nuevo Código"
      />
      <Button tipo="inline" type="submit">Guardar</Button>
    </FormCard>
  );
}
