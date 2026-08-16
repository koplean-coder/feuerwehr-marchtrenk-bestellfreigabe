// Roboto font für jsPDF mit UTF-8 Unterstützung
// Lädt Roboto von Google Fonts und cached sie im localStorage

import jsPDF from 'jspdf';

const FONT_CACHE_KEY = 'roboto-font-base64';
const FONT_URL = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf';
const FONT_URL_BOLD = 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf';

let fontRegistered = false;
let boldFontRegistered = false;

// Konvertiert ArrayBuffer zu Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Lädt und cached die Schriftart
async function fetchAndCacheFont(url: string, cacheKey: string): Promise<string> {
  // Prüfe Cache
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Lade von URL
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Font laden fehlgeschlagen: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  
  // Speichere im Cache
  try {
    localStorage.setItem(cacheKey, base64);
  } catch (e) {
    // localStorage voll - ignorieren
    console.warn('Font caching fehlgeschlagen:', e);
  }
  
  return base64;
}

// Registriert Roboto Regular in jsPDF
export async function registerRobotoFont(doc: jsPDF): Promise<boolean> {
  if (fontRegistered) {
    return true;
  }
  
  try {
    const base64 = await fetchAndCacheFont(FONT_URL, FONT_CACHE_KEY);
    
    doc.addFileToVFS('Roboto-Regular.ttf', base64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    
    fontRegistered = true;
    return true;
  } catch (error) {
    console.error('Roboto laden fehlgeschlagen:', error);
    return false;
  }
}

// Registriert Roboto Bold in jsPDF
export async function registerRobotoBoldFont(doc: jsPDF): Promise<boolean> {
  if (boldFontRegistered) {
    return true;
  }
  
  try {
    const base64 = await fetchAndCacheFont(FONT_URL_BOLD, FONT_CACHE_KEY + '-bold');
    
    doc.addFileToVFS('Roboto-Bold.ttf', base64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    
    boldFontRegistered = true;
    return true;
  } catch (error) {
    console.error('Roboto Bold laden fehlgeschlagen:', error);
    return false;
  }
}

// Lädt beide Roboto-Varianten
export async function loadRobotoFonts(doc: jsPDF): Promise<boolean> {
  const [regular, bold] = await Promise.all([
    registerRobotoFont(doc),
    registerRobotoBoldFont(doc)
  ]);
  
  return regular && bold;
}

// Setzt die Schriftart (mit Fallback)
export function setFont(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): void {
  if (fontRegistered && (style === 'normal' || boldFontRegistered)) {
    doc.setFont('Roboto', style);
  } else {
    doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal');
  }
}

// Prüft ob Roboto geladen ist
export function isRobotoLoaded(): boolean {
  return fontRegistered;
}
