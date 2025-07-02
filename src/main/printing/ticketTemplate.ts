// Professional ticket template for 80mm thermal printer
import * as path from 'path';
import * as fs from 'fs';

export interface TicketData {
  ticket_number: string;
  service_name: string;
  created_at: string;
  printer_id?: string;
  company_name?: string;
  logo_url?: string;
  position?: number;
  print_source?: 'customer' | 'display' | 'background' | 'admin'; // Track print source
}

// Function to load logo as base64 - cached and optimized for B&W fast rendering
let cachedLogo: string | null = null;
let logoAttempted = false;

function loadLogoAsBase64(): string | null {
  // Return cached result if already attempted
  if (logoAttempted) {
    return cachedLogo;
  }

  logoAttempted = true;

  try {
    // Optimized paths - most likely first
    const possiblePaths = [
      path.join(process.cwd(), 'resources/logo.png'),
      path.join(__dirname, '../../resources/logo.png'),
      path.join(process.cwd(), 'resources/assets/logo.png'),
      path.join(__dirname, '../../resources/assets/logo.png')
    ];

    for (const logoPath of possiblePaths) {
      if (fs.existsSync(logoPath)) {
        const imageBuffer = fs.readFileSync(logoPath);
        const base64 = imageBuffer.toString('base64');
        // Note: CSS filters will handle B&W conversion for faster rendering
        cachedLogo = `data:image/png;base64,${base64}`;
        // Logo cached from path - CSS will convert to ultra-light B&W
        return cachedLogo;
      }
    }

    console.warn('[TicketTemplate] ⚠️ Logo.png not found');
    cachedLogo = null;
    return null;
  } catch (error) {
    console.error('[TicketTemplate] Error loading logo:', error);
    cachedLogo = null;
    return null;
  }
}

// Compact landscape template for 70mm x 80mm thermal printer
export default function generateCompactTicketHTML(ticketData: TicketData): string {
  const currentDate = new Date(ticketData.created_at);

  // English date formatting
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // English time formatting
  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Create logo HTML - simplified and faster
  let logoHtml;

  if (ticketData.logo_url && ticketData.logo_url.startsWith('data:')) {
    logoHtml = `<img src="${ticketData.logo_url}" alt="Logo" class="ticket-logo">`;
  } else {
    const logoBase64 = loadLogoAsBase64();
    logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="Logo" class="ticket-logo">`
      : `<div class="ticket-logo-placeholder">شعار</div>`;
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>تذكرة ${ticketData.ticket_number || ''}</title>
    <style>
      @page {
        size: 72.1mm 160mm;
        margin: 0;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        font-family: 'Arial', sans-serif;
        color: black;
        width: 70mm;
        height: 158mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .wrapper {
        width: 68mm;
        height: 156mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        margin: 0;
        padding: 3mm 0 0 0;
        box-sizing: border-box;
      }

      .ticket {
        box-sizing: border-box;
        text-align: center;
        padding: 2mm;
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        width: 68mm;
        height: auto;
      }

      .ticket-header-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        width: 100%;
        margin: 0 0 4mm 0;
        gap: 3mm;
        padding: 2mm;
        border: 1px solid #ddd;
        border-radius: 3mm;
        background: #f9f9f9;
      }

      .ticket-logo {
        width: 15mm;
        height: 15mm;
        margin: 0;
        flex-shrink: 0;
        border-radius: 2mm;
        object-fit: contain;
        background: white;
        border: 1px solid #eee;
        padding: 1mm;
        display: block;
        max-width: 15mm;
        max-height: 15mm;
        /* Ultra-light black and white logo for fastest generation and minimal space */
        filter: grayscale(100%) brightness(2) contrast(0.4) blur(0px);
        opacity: 0.3;
        -webkit-filter: grayscale(100%) brightness(2) contrast(0.4);
        /* Force black and white rendering - no color data stored */
        color-scheme: light;
        forced-color-adjust: none;
      }

      .ticket-logo-placeholder {
        width: 15mm;
        height: 15mm;
        margin: 0;
        flex-shrink: 0;
        border-radius: 2mm;
        background: #f0f0f0;
        border: 1px dashed #ccc;
        padding: 1mm;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 7pt;
        color: #999;
        font-weight: bold;
      }

      .ticket-title {
        font-size: 9pt;
        font-weight: 900;
        letter-spacing: 0.1pt;
        text-align: right;
        flex: 1;
        word-break: break-word;
        line-height: 1.2;
        color: #333;
      }

      .ticket-number {
        font-size: 24pt;
        font-weight: 900;
        margin: 4mm 0;
        text-align: center;
        width: 100%;
        letter-spacing: 0;
        padding: 0;
      }

      .service-footer-row {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin: 4mm 0 0 0;
        font-size: 9pt;
        font-weight: 900;
      }

      .service-footer-row .service-name {
        font-size: 12pt;
        font-weight: 900;
        text-align: center;
        margin-bottom: 2mm;
      }

      .service-footer-row .footer-date {
        font-size: 8pt;
        font-weight: 900;
        text-align: center;
        margin: 0;
      }

      @media print {
        @page {
          size: 70mm 160mm;
          margin: 0;
        }

        html,
        body {
          width: 70mm !important;
          height: 160mm !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .wrapper {
          width: 70mm !important;
          height: 160mm !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .ticket {
          width: 70mm !important;
          height: 160mm !important;
          margin: 0 !important;
          padding: 3mm !important;
        }

        /* Ultra-light black and white logo when printing - fastest rendering */
        .ticket-logo {
          filter: grayscale(100%) brightness(2) contrast(0.4) blur(0px) !important;
          opacity: 0.3 !important;
          -webkit-filter: grayscale(100%) brightness(2) contrast(0.4) !important;
          -webkit-print-color-adjust: none !important;
          print-color-adjust: exact !important;
          color-scheme: light !important;
          forced-color-adjust: none !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="ticket">
        <div class="ticket-header-row">
          ${logoHtml}
          <div class="ticket-title">${ticketData.company_name || 'نظام إدارة الطوابير'}</div>
        </div>
        <div class="ticket-number">${ticketData.ticket_number || ''}</div>
        <div class="service-footer-row">
          <div class="service-name">${ticketData.service_name || ''}</div>
          <div class="footer-date">${formattedDate || ''} ${formattedTime || ''}</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

