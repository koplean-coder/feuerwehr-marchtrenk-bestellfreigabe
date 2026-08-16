import jsPDF from 'jspdf';

// Cache for loaded background image
let cachedBackground: string | null = null;
let cachedUrl: string | null = null;

// Optimized cache for compressed backgrounds
let cachedOptimizedBackground: string | null = null;
let cachedOptimizedUrl: string | null = null;

// A4 dimensions at 150 DPI (good balance between quality and size)
const A4_WIDTH_150DPI = 1240;
const A4_HEIGHT_150DPI = 1754;

// JPEG quality for backgrounds (0.7 = 70% quality, good compression with minimal visible loss)
const BACKGROUND_JPEG_QUALITY = 0.7;
const LOGO_JPEG_QUALITY = 0.85;

/**
 * Load an image from URL and convert to base64 data URL
 * Uses fetch first (better CORS handling), falls back to Image element
 */
export async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  
  // Return cached if same URL
  if (cachedUrl === url && cachedBackground) {
    return cachedBackground;
  }
  
  // Try fetch first (works better with Supabase Storage)
  const fetchResult = await fetchImageAsBase64(url);
  if (fetchResult) {
    return fetchResult;
  }
  
  // Fallback to Image element
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          cachedBackground = dataUrl;
          cachedUrl = url;
          resolve(dataUrl);
        } else {
          resolve(null);
        }
      } catch (e) {
        console.error('Canvas conversion error:', e);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.error('Image load error:', url);
      resolve(null);
    };
    
    img.src = url;
  });
}

/**
 * Load and optimize background image for PDF
 * - Resizes to A4 dimensions at 150 DPI
 * - Converts to JPEG with quality setting for smaller file size
 * - Caches the result
 */
export async function loadOptimizedBackground(url: string): Promise<string | null> {
  if (!url) return null;
  
  // Return cached if same URL
  if (cachedOptimizedUrl === url && cachedOptimizedBackground) {
    return cachedOptimizedBackground;
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Resize to A4 at 150 DPI
          canvas.width = A4_WIDTH_150DPI;
          canvas.height = A4_HEIGHT_150DPI;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(null);
            return;
          }
          
          // Use high-quality image scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw resized image
          ctx.drawImage(img, 0, 0, A4_WIDTH_150DPI, A4_HEIGHT_150DPI);
          
          // Convert to JPEG with quality setting (much smaller than PNG)
          const dataUrl = canvas.toDataURL('image/jpeg', BACKGROUND_JPEG_QUALITY);
          
          cachedOptimizedBackground = dataUrl;
          cachedOptimizedUrl = url;
          resolve(dataUrl);
        } catch (e) {
          console.error('Error optimizing background image:', e);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.error('Failed to load background image for optimization:', url);
        resolve(null);
      };
      
      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error('Error fetching background image:', error);
    return null;
  }
}

/**
 * Load and optimize logo/icon image for PDF
 * - Resizes to max dimensions while maintaining aspect ratio
 * - Converts to JPEG with higher quality (logos need more detail)
 */
export async function loadOptimizedLogo(
  url: string, 
  maxWidth: number = 400, 
  maxHeight: number = 200
): Promise<string | null> {
  if (!url) return null;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Calculate scaled dimensions maintaining aspect ratio
          let width = img.naturalWidth;
          let height = img.naturalHeight;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(null);
            return;
          }
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Use JPEG with higher quality for logos
          const dataUrl = canvas.toDataURL('image/jpeg', LOGO_JPEG_QUALITY);
          resolve(dataUrl);
        } catch (e) {
          console.error('Error optimizing logo image:', e);
          resolve(null);
        }
      };
      
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error('Error fetching logo image:', error);
    return null;
  }
}

/**
 * Fallback: Load image via fetch
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        cachedBackground = result;
        cachedUrl = url;
        resolve(result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Fetch error loading image:', error);
    return null;
  }
}

/**
 * Apply background image to a PDF page
 */
export function applyBackgroundToPage(
  doc: jsPDF, 
  backgroundData: string, 
  opacity: number = 0.15
): void {
  if (!backgroundData) return;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Save current graphics state
  doc.saveGraphicsState();
  
  // Set opacity using GState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gState = new (doc as any).GState({ opacity });
  doc.setGState(gState);
  
  // Detect format from data URL
  const format = backgroundData.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
  
  // Add background image covering the full page
  try {
    doc.addImage(
      backgroundData,
      format,
      0,
      0,
      pageWidth,
      pageHeight
    );
  } catch (error) {
    console.error('Error applying PDF background:', error);
  }
  
  // Restore graphics state
  doc.restoreGraphicsState();
}

/**
 * Apply background to all pages in a PDF
 */
export function applyBackgroundToAllPages(
  doc: jsPDF, 
  backgroundData: string, 
  opacity: number = 0.15
): void {
  if (!backgroundData) return;
  
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    applyBackgroundToPage(doc, backgroundData, opacity);
  }
}

/**
 * Load stamp image and process it to remove white background
 * This creates transparency for stamps that have white backgrounds
 */
export async function loadStampWithTransparency(url: string): Promise<string | null> {
  if (!url) return null;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(null);
            return;
          }
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Get image data to process white pixels
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Make white/near-white pixels transparent
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Check if pixel is white or near-white (threshold: 240)
            if (r > 240 && g > 240 && b > 240) {
              // Make transparent
              data[i + 3] = 0;
            } else if (r > 220 && g > 220 && b > 220) {
              // Semi-transparent for near-white
              data[i + 3] = Math.floor(data[i + 3] * 0.3);
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (e) {
          console.error('Error processing stamp image:', e);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.error('Failed to load stamp image:', url);
        resolve(null);
      };
      
      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error('Error fetching stamp image:', error);
    return null;
  }
}

/**
 * Create a PDF with background support
 * Use this as a wrapper for PDF generation
 */
/**
 * Create a compressed PDF instance
 * Always use this instead of `new jsPDF()` for smaller file sizes
 */
export function createCompressedPdf(options?: { orientation?: 'portrait' | 'landscape' }): jsPDF {
  return new jsPDF({
    orientation: options?.orientation ?? 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true // Enable PDF compression
  });
}

export async function createPdfWithBackground(
  backgroundUrl: string,
  opacity: number,
  generateContent: (doc: jsPDF) => void | Promise<void>
): Promise<jsPDF> {
  const doc = createCompressedPdf();
  
  // Load background image
  const backgroundData = await loadImageAsBase64(backgroundUrl);
  
  // Generate content
  await generateContent(doc);
  
  // Apply background to all pages (after content so it's behind)
  // Note: jsPDF draws in order, so we need to insert background first
  // This is tricky - we'll apply a semi-transparent watermark approach
  if (backgroundData) {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Add watermark-style background with low opacity
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gState = new (doc as any).GState({ opacity });
      doc.setGState(gState);
      
      try {
        doc.addImage(backgroundData, 'PNG', 0, 0, pageWidth, pageHeight);
      } catch (e) {
        console.error('Failed to add background image:', e);
      }
      
      doc.restoreGraphicsState();
    }
  }
  
  return doc;
}
