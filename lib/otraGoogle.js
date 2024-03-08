"use server"
import axios from 'axios';
import { load } from 'cheerio';

const getOrganicData = async (codigoDeBarras) => {
  const url = `https://www.google.com/search?q=${codigoDeBarras}`;

  const { data } = await axios.get(url);
  const $ = load(data);

      let titles = [];
      let links = [];
      let img = [];

      $(".srKDX").each((i,el) => {
        titles[i] = $(el).find("h3").text()
        links[i] = (el).find("a").attr('href');
        img[i] = (el).find("img").attr('alt');

      })
      
/*
      $("h3").each((i, h3) => {
        titles[i] = $(h3).text();
        const prev = $(h3).find("a").text()
        links[i] = $(prev).text();
      });
*/
      
      const organicResults = [];

      for (let i = 0; i < titles.length; i++) {
        organicResults[i] = {
          title: titles[i] || "vacio",
          links: links[i]  || "vacio",
          img: img[i]  || "vacio",
        };
      }
      console.log(organicResults)
  
};

export default getOrganicData;