"use server"
import puppeteer from 'puppeteer';

let browser;

export async function getBrowserInstance() {
  if (!browser) {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.log('Navegador abierto');
  }
  return browser;
}

export async function closeBrowserInstance() {
  if (browser) {
    console.log('Intentando cerrar el navegador');
    await browser.close();
    browser = null; // Resetear la referencia del navegador
  }
  if(!browser) console.log('Navegador cerrado');
}











