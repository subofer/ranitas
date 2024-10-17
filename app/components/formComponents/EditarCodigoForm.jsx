"use client";

import { editarNombreProductoProveedor } from "@/prisma/serverActions/proveedores";
import Input from "./Input";
import Button from "./Button";
import { useState } from "react";

export default function EditarCodigoForm({ codigo, proveedorId, producto, after }) {
  const [edited, setEdited] = useState(false)

  const formAction = async (formData) => {
    await editarNombreProductoProveedor(formData)
    after()
  }

  const onChangeInput = ({value}) => {
    console.log('laaa')
    setEdited(value == codigo)
  }

  return (
    <form action={formAction} buttons={false} className={`w-[400px] flex flex-row gap-2`}>
      <input type="hidden" name="proveedorId" value={proveedorId} />
      <input type="hidden" name="productoId" value={producto.id} />
      <Input
        type="text"
        name="nuevoCodigo"
        label="Nombre"
        defaultValue={codigo}
        placeholder="Nuevo Código"
        onChange={onChangeInput}
      />
      <Button 
        tipo="inline"
        type="submit"
        disabled={edited}
      >
        Guardar
      </Button>
    </form>
  );
}
