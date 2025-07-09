// Professional ticket template for 80mm thermal printer
import * as fs from 'fs';
import { ResourcePathManager } from '../utils/resourcePathManager';

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
    const resourceManager = ResourcePathManager.getInstance();
    const logoPath = resourceManager.getLogoPath();

    if (logoPath && fs.existsSync(logoPath)) {
      const imageBuffer = fs.readFileSync(logoPath);
      const base64 = imageBuffer.toString('base64');
      // Note: CSS filters will handle B&W conversion for faster rendering
      cachedLogo = `data:image/png;base64,${base64}`;
      console.log(`[TicketTemplate] ✅ Logo loaded from: ${logoPath}`);
      return cachedLogo;
    }

    console.warn('[TicketTemplate] ⚠️ Logo not found at expected path');
    cachedLogo = null;
    return null;
  } catch (error) {
    console.error('[TicketTemplate] ❌ Error loading logo:', error);
    cachedLogo = null;
    return null;
  }
}

// Compact landscape template for 70mm x 80mm thermal printer
export default function generateCompactTicketHTML(ticketData: TicketData): string {
  const currentDate = new Date(ticketData.created_at);

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

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
      size: 70mm 160mm;
      margin: 0;
    }

    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Arial', sans-serif;
      width: 70mm;
      height: 160mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      direction: rtl;
    }

    .wrapper {
      width: 70mm;
      height: 160mm;
      padding: 2.5mm 2mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }

    .ticket-header {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      margin-bottom: 1.5mm;
      gap: 2mm;
    }

    .ticket-logo {
      width: 16mm;
      height: 16mm;
      object-fit: contain;
      background: white;
      padding: 1mm;
    }

    .ticket-title {
      font-size: 12pt;
      font-weight: bold;
      color: #000;
      flex: 1;
      line-height: 1.3;
      text-align: right;
    }

    .ticket-number {
      font-size: 34pt;
      font-weight: bold;
      color: #000;
      text-align: center;
      direction: ltr;
      letter-spacing: 2px;
      width: 100%;
    }

    .service-name {
      font-size: 11.5pt;
      font-weight: bold;
      color: #000;
      text-align: center;
      margin-bottom: 0;
    }

    .footer-date {
      font-size: 9pt;
      color: #000;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="ticket-header">
      ${logoHtml}
      <div class="ticket-title">
 الصندوق الوطني للضمان الاجتماعي لغير الاجراء
 وكالة المسيلة الشباك الجواري برهوم
      </div>
    </div>
    <div class="ticket-number">${ticketData.ticket_number || ''}</div>
    <div class="service-name">${ticketData.service_name || ''}</div>
    <div class="footer-date">${formattedDate || ''} ${formattedTime || ''}</div>
  </div>
</body>
</html>`;
}

