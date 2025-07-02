import React, { useState } from 'react'
import { cn } from '../lib/utils'

export interface Printer {
  id?: number;
  name: string;
  location?: string;
  device_id?: number;
  type?: 'server' | 'local';
  printer_id?: string;
  printer_name?: string;
  driver?: string;
  port?: string;
  connection_type?: string;
  platform?: string;
  source?: string;
}

interface PrinterSelectorProps {
  printers: Printer[];
  selectedPrinter?: string;
  onPrinterSelect: (printerId: string) => void;
  onClose: () => void;
  loading?: boolean;
}

const PrinterSelector: React.FC<PrinterSelectorProps> = ({
  printers,
  selectedPrinter,
  onPrinterSelect,
  onClose,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter printers based on search term
  const filteredPrinters = printers.filter(printer => {
    const searchableText = [
      printer.name,
      printer.printer_name,
      printer.location,
      printer.type,
      printer.connection_type
    ].join(' ').toLowerCase();

    return searchableText.includes(searchTerm.toLowerCase());
  });

  // Group printers by type
  const serverPrinters = filteredPrinters.filter(p => p.type === 'server' || p.source === 'system');
  const localPrinters = filteredPrinters.filter(p => p.type === 'local' || p.source === 'electron');

  // Helper function to display printer name from unique ID
  const getDisplayName = (uniquePrinterId: string) => {
    if (!uniquePrinterId) return '';

    // If it contains a colon, it's in the new format (type:name)
    if (uniquePrinterId.includes(':')) {
      const [type, name] = uniquePrinterId.split(':', 2);
      const typeLabel = type === 'local' ? '💻' : '🖥️';
      return `${typeLabel} ${name}`;
    }

    // Fallback for old format
    return uniquePrinterId;
  };

  // Helper function to generate unique printer ID
  const getUniquePrinterId = (printer: Printer) => {
    const printerType = printer.type || (printer.source === 'electron' ? 'local' : 'server');
    const basePrinterId = printer.printer_id || printer.id?.toString() || printer.name;
    return `${printerType}:${basePrinterId}`;
  };

  // Helper function to check if there are naming conflicts
  const hasNamingConflicts = () => {
    const printerNames = filteredPrinters.map(p => p.name || p.printer_name || 'Unknown');
    const uniqueNames = new Set(printerNames);
    return printerNames.length !== uniqueNames.size;
  };

  // Get conflict indicator for a printer
  const getConflictInfo = (printer: Printer) => {
    const printerName = printer.name || printer.printer_name || 'Unknown Printer';
    const hasSameName = filteredPrinters.filter(p =>
      (p.name || p.printer_name || 'Unknown Printer') === printerName
    ).length > 1;

    return hasSameName;
  };

  const handlePrinterClick = (printer: Printer) => {
    const uniquePrinterId = getUniquePrinterId(printer);
    onPrinterSelect(uniquePrinterId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 min-w-[500px] max-w-[700px] max-h-[80vh] overflow-auto shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-primary text-xl font-bold mb-2 flex items-center justify-center gap-2">
            🖨️ Select Printer
          </h2>
          {selectedPrinter ? (
            <div className="text-sm mb-2">
              <span className="text-gray-500">Current Default:</span>
              <span className="text-blue-600 font-medium ml-2">{getDisplayName(selectedPrinter)}</span>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">
              Choose a default printer for ticket printing
            </p>
          )}
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            type="text"
            placeholder="البحث في الطابعات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm outline-none transition-colors duration-200 focus:border-primary text-right"
            dir="rtl"
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>جارٍ تحميل الطابعات...</p>
          </div>
        ) : filteredPrinters.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            <p>لا توجد طابعات متاحة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {serverPrinters.length > 0 && (
              <div>
                <h3 className="text-primary font-semibold mb-3 text-right flex items-center gap-2">
                  🖥️ طابعات الخادم ({serverPrinters.length})
                </h3>
                <div className="space-y-2">
                  {serverPrinters.map((printer, index) => (
                    <PrinterCard
                      key={`server-${printer.id || index}`}
                      printer={printer}
                      isSelected={selectedPrinter === getUniquePrinterId(printer)}
                      onClick={() => handlePrinterClick(printer)}
                      hasConflict={getConflictInfo(printer)}
                      showTypeLabel={hasNamingConflicts()}
                    />
                  ))}
                </div>
              </div>
            )}

            {localPrinters.length > 0 && (
              <div>
                <h3 className="text-purple-600 font-semibold mb-3 text-right flex items-center gap-2">
                  💻 الطابعات المحلية ({localPrinters.length})
                </h3>
                <div className="space-y-2">
                  {localPrinters.map((printer, index) => (
                    <PrinterCard
                      key={`local-${printer.id || index}`}
                      printer={printer}
                      isSelected={selectedPrinter === getUniquePrinterId(printer)}
                      onClick={() => handlePrinterClick(printer)}
                      hasConflict={getConflictInfo(printer)}
                      showTypeLabel={hasNamingConflicts()}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-5 border-t border-gray-100 mt-5">
          <button
            className="btn-secondary"
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// Printer card component with TailwindCSS
interface PrinterCardProps {
  printer: Printer;
  isSelected: boolean;
  onClick: () => void;
  hasConflict?: boolean;
  showTypeLabel?: boolean;
}

const PrinterCard: React.FC<PrinterCardProps> = ({
  printer,
  isSelected,
  onClick,
  hasConflict = false,
  showTypeLabel = false
}) => {
  const printerName = printer.name || printer.printer_name || 'Unknown Printer';
  const isUSB = printer.connection_type === 'usb' || (printer.port && printer.port.startsWith('USB'));
  const isNetwork = printer.connection_type === 'network' || (printer.port && !printer.port.startsWith('USB'));

  return (
    <div
      className={cn(
        "border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md relative",
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50",
        hasConflict && "ring-2 ring-yellow-300" // Highlight conflicts
      )}
      onClick={onClick}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 text-sm w-6 h-6 flex items-center justify-center shadow-lg">
          ✓
        </div>
      )}

      {hasConflict && (
        <div className="absolute -top-2 -left-2 bg-yellow-500 text-white rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center shadow-lg">
          ⚠️
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-2 mb-2">
            <span className="font-semibold text-gray-800 text-right">
              {printerName}
              {hasConflict && showTypeLabel && (
                <span className="text-xs text-yellow-600 font-normal ml-2">
                  ({printer.type === 'server' ? 'Server' : 'Local'})
                </span>
              )}
            </span>
            <span className="text-2xl">🖨️</span>
          </div>

          {printer.location && (
            <div className="text-sm text-gray-600 mb-1 text-right">
              📍 {printer.location}
            </div>
          )}

          {printer.port && (
            <div className="text-xs text-gray-500 text-right">
              🔌 {printer.port}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            {isUSB && (
              <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
                USB
              </span>
            )}
            {isNetwork && (
              <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                Network
              </span>
            )}
            {printer.type && (
              <span className={cn(
                "text-white px-2 py-1 rounded text-xs font-semibold",
                printer.type === 'server' ? 'bg-primary' : 'bg-purple-600'
              )}>
                {printer.type === 'server' ? 'Server' : 'Local'}
              </span>
            )}
          </div>
        </div>

        {isSelected && (
          <div className="text-primary text-xl mr-3">
            ✓
          </div>
        )}
      </div>
    </div>
  );
};

export default PrinterSelector;
