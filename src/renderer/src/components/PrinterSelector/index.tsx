import React from 'react';

export interface Printer {
  id: string;
  name: string;
  location?: string;
  type: 'server' | 'local';
}

interface PrinterSelectorProps {
  printers: Printer[];
  selectedPrinter: string;
  onSelect: (printerId: string) => void;
  onClose: () => void;
}

const PrinterSelector: React.FC<PrinterSelectorProps> = ({
  printers,
  selectedPrinter,
  onSelect,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">اختر الطابعة</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {printers.map((printer) => (
            <button
              key={printer.id}
              onClick={() => onSelect(printer.id)}
              className={`w-full p-4 rounded-lg border text-right transition-colors duration-200
                ${selectedPrinter === printer.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-800 border-gray-200 hover:border-primary'
                }`}
            >
              <div className="font-medium">{printer.name}</div>
              {printer.location && (
                <div className="text-sm opacity-80">{printer.location}</div>
              )}
              <div className="text-xs opacity-70 mt-1">
                {printer.type === 'local' ? 'طابعة محلية' : 'طابعة الخادم'}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-3 rtl:space-x-reverse">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrinterSelector;
