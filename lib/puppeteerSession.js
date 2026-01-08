"use server"
import puppeteer from 'puppeteer';

let browser;

export async function getBrowserInstance(visible = false) {
  browser = await puppeteer.launch({
    headless: !visible,
    devtools: visible,
    timeout: 10000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-features=site-per-process',
    ],
  });
  return browser;
}

export async function closeBrowserInstance() {
  if (browser) {
    await browser.close();
    browser = null; // Resetear la referencia del navegador
  }
  if(!browser) console.log('Navegador ya estaba cerrado');
}


export const cargarURL = async (url, show = true) => {
  let pagina = null;
  let navegador = null;
  try {
    navegador = await getBrowserInstance(show);
    pagina = await navegador.newPage();
    await pagina.goto(url, { waitUntil: 'networkidle2' });
  } catch (e) {
    console.log(e);
  } finally {
    return { pagina, navegador };
  }
};

export const finalizarNavegacion = async (pagina, navegador) => {
  if (pagina) await pagina.close();
  if (navegador) await navegador.close();
};





