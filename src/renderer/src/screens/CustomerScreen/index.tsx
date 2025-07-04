import React, { useState } from 'react';
import PrinterSelector, { Printer } from '../../components/PrinterSelector';
import Logo from '../../components/Logo';

// Static interface definitions
interface Service {
  id: number;
  name: string;
  description?: string;
}

// Mock data for static UI design
const MOCK_SERVICES: Service[] = [
  { id: 1, name: 'استقبال المؤمنين', description: 'خدمة استقبال المؤمنين الجدد' },
  { id: 2, name: 'تحديث الملفات', description: 'تحديث ملفات المؤمنين' },
  { id: 3, name: 'الشكاوي', description: 'تقديم وتتبع الشكاوي' },
  { id: 4, name: 'استشارات', description: 'خدمة الاستشارات القانونية' }
];

const MOCK_PRINTERS: Printer[] = [
  { id: 1, name: 'طابعة التذاكر 1', type: 'local', location: 'المكتب الرئيسي' },
  { id: 2, name: 'طابعة التذاكر 2', type: 'server', location: 'قسم الاستقبال' }
];

const CustomerScreen: React.FC = () => {
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const [showPrinterSelector, setShowPrinterSelector] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('defaultPrinter') || undefined;
    }
    return undefined;
  });
  const [ticketLoading, setTicketLoading] = useState(false);

  // Static UI handlers
  const handleServiceSelection = async (serviceId: number) => {
    if (!selectedPrinter) {
      setShowPrinterSelector(true);
      return;
    }

    // Simulate ticket processing
    setTicketLoading(true);
    setTimeout(() => {
      setTicketLoading(false);
      // In a real app, this would print the ticket
      console.log('Ticket would be printed for service:', serviceId, 'on printer:', selectedPrinter);
    }, 1000);
  };

  const handlePrinterSelection = (printerId: string) => {
    setSelectedPrinter(printerId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultPrinter', printerId);
    }
    setShowPrinterSelector(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header with Logo */}
      <header className="bg-white shadow-md p-4">
        <Logo className="h-16 mx-auto" />
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => handleServiceSelection(service.id)}
              disabled={ticketLoading}
              className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200
                       flex flex-col items-center justify-center space-y-4
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <h3 className="text-xl font-bold text-gray-800 text-center">
                {service.name}
              </h3>
              {service.description && (
                <p className="text-sm text-gray-600 text-center">
                  {service.description}
                </p>
              )}
            </button>
          ))}
        </div>
      </main>

      {/* Printer Selector Dialog */}
      {showPrinterSelector && (
        <PrinterSelector
          printers={MOCK_PRINTERS}
          onPrinterSelect={handlePrinterSelection}
          onClose={() => setShowPrinterSelector(false)}
          selectedPrinter={selectedPrinter}
        />
      )}

      {/* Loading Overlay */}
      {ticketLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="mt-4 text-center text-gray-800">جاري طباعة التذكرة...</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white shadow-md-up p-4">
        <p className="text-center text-gray-600">
          {selectedPrinter ?
            `الطابعة المحددة: ${MOCK_PRINTERS.find(p => p.id === Number(selectedPrinter))?.name || selectedPrinter}` :
            'لم يتم تحديد طابعة'
          }
        </p>
      </footer>
    </div>
  );
};

export default CustomerScreen;

