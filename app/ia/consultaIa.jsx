"use server"
import { CohereClient } from "cohere-ai";

export const consultarAHere = async (object, prompt) => {

  const cohere = new CohereClient({
    token: process.env.HERE_KEY,
  });
    const prediction = await cohere.generate({
      prompt: `given a text and a object,
      analize the object and the text and make corection to the data,
      use the provided object structure.
      get the product caracterist composed in a json object
      the json must have,
      family of product as categoria,
      stringbrand as marca,
      string name as nombre,
      float list of found prices as precios,
      array composition of all ingredients as ingredientes,
      float size as tamaño
      stringunit of measure as unidad,
      nothing else more than the json, no explanation or any more
      if there no info, return the empty object with null values, i only want an object as response.
      object:${object}, text:${prompt}
      `,
      maxTokens: 1500,
      temperature: 0.8,
    });
    console.log("Received prediction", prediction.generations[0].text);
    const json = prediction.generations[0].text.split("```json")[1]
    console.log("LO CONSOLO", json)
  //return {json, text: prediction.generations[0].text}
  };
