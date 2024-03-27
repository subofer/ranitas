"use client"
import Image from "next/image";
import Icon from "../formComponents/Icon";

const ImagenProducto = ({item: { imagen, nombre }, size=32, componentclassname}) => (
  imagen
    ? <Image className={componentclassname}
        src={imagen}
        height={size}
        width={size}
        alt={nombre || "imagen del producto"}
      />
    : <Icon className={componentclassname} icono={"image"}/>
)


export default ImagenProducto;