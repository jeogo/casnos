import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getLocalPrinters(): Promise<any[]> {
  try {
    if (process.platform === 'win32') {
      // Use PowerShell to get printers on Windows
      const { stdout } = await execAsync('powershell "Get-Printer | Select-Object Name,Type,DriverName,PortName | ConvertTo-Json"');
      const printers = JSON.parse(stdout);
      if (Array.isArray(printers)) {
        return printers.map((printer: any) => ({
          name: printer.Name,
          type: printer.Type || 'Unknown',
          driver: printer.DriverName,
          port: printer.PortName,
          platform: 'windows',
          connection_type: (printer.PortName && printer.PortName.startsWith('USB')) ? 'usb' : 'network'
        }));
      } else if (printers.Name) {
        // Single printer
        return [{
          name: printers.Name,
          type: printers.Type || 'Unknown',
          driver: printers.DriverName,
          port: printers.PortName,
          platform: 'windows',
          connection_type: (printers.PortName && printers.PortName.startsWith('USB')) ? 'usb' : 'network'
        }];
      }
      return [];
    } else {
      // For other OS, fallback to empty or implement as needed
      return [];
    }
  } catch (error) {
    console.error('[ELECTRON] Error getting local printers:', error);
    return [];
  }
}
