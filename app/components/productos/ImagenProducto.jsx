"use client"
import Image from "next/image";
import Icon from "../formComponents/Icon";

const ImagenProducto = ({item: { imagen, nombre }, size=32, placeholder, componentclassname, onClick}) => (
  imagen
    ? <Image className={componentclassname}
        src={imagen}
        height={size}
        width={size}
        alt={nombre || "imagen del producto"}
        onClick={onClick}
      />
    : placeholder == "sin imagen" ? null: <Icon className={`${componentclassname} text-center`} icono={"image"}/>

)

export default ImagenProducto;