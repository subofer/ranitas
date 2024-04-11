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











