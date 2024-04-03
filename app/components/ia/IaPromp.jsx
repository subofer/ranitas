"use client"
import { consultarAHere } from "@/app/ia/consultaIa";
import { useState } from "react";

const IaPrompt = () => {
  const [respuesta, setRespuesta] = useState("")
  
  const pepito = async (formData) => {
    setRespuesta(await consultarAHere(formData.get("pregunta")))
  }

  return(
    <form action={pepito}>
      <span>{respuesta?.json}</span>
      <input name="pregunta" type="text"/>
      <button>Preguntar</button>
      <span>{respuesta?.text}</span>
    </form>
  )
}

export default IaPrompt;