import React, { useState, useEffect } from 'react';
import Logo from '../../components/Logo';
import { getDeviceInfo, DEVICE_NAMES, getPersistentDeviceId } from '../../utils/deviceInfo';

// Interfaces
interface Service {
  id: number;
  name: string;
}

const WindowScreen: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [services] = useState<Service[]>([
    { id: 1, name: 'استقبال المؤمنين' },
    { id: 2, name: 'تحديث الملفات' },
    { id: 3, name: 'الشكاوي' },
    { id: 4, name: 'استشارات' }
  ]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [windowNumber, setWindowNumber] = useState<string>('');
  const [isServiceSelected, setIsServiceSelected] = useState(false);

  // Initialize window on mount
  useEffect(() => {
    const initializeWindow = async () => {
      try {
        // Get persistent device ID for this window
        const deviceId = await getPersistentDeviceId('window');
        console.log('[WINDOW] Device ID:', deviceId);

        // Generate window number based on device info
        const deviceInfo = await getDeviceInfo('window', DEVICE_NAMES.window, deviceId);
        setWindowNumber(deviceInfo.device_id.split('-').pop() || '1');

        setIsInitializing(false);
      } catch (error) {
        console.error('[WINDOW] Initialization error:', error);
        setWindowNumber('1');
        setIsInitializing(false);
      }
    };

    initializeWindow();
  }, []);

  const handleServiceSelection = (serviceId: number) => {
    setSelectedServiceId(serviceId);
    setIsServiceSelected(true);
    console.log(`[WINDOW] Service ${serviceId} selected for window ${windowNumber}`);
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-gray-50 to-blue-100 flex flex-col items-center justify-center">
        <Logo className="h-16 mb-8" />
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <h2 className="text-xl font-semibold mb-2">جاري تهيئة الشباك...</h2>
          <p className="text-gray-600">يرجى الانتظار</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-blue-100 p-4">
      {/* Logo in top-left corner */}
      <div className="absolute top-4 left-4 z-10">
        <Logo size="lg" position="left" />
      </div>

      <div className="w-full h-full flex flex-col items-center justify-center">
        {/* Header */}
        <div className="text-center mb-8 bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-blue-600 text-3xl font-bold mb-2">
            🏢 CASNOS Window Screen
          </h1>
          {windowNumber && (
            <h2 className="text-gray-600 text-xl">
              شباك {windowNumber}
            </h2>
          )}
        </div>

        {/* Service Selection */}
        {!isServiceSelected ? (
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-4xl w-full">
            <h2 className="text-blue-600 mb-6 text-2xl font-bold">
              🎯 اختر خدمتك
            </h2>
            <p className="text-gray-600 mb-6 text-base">
              يرجى اختيار الخدمة التي ستقوم بخدمتها في هذا الشباك
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(service => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelection(service.id)}
                  className="bg-gradient-to-br from-blue-600 to-blue-400 text-white p-6 rounded-xl text-lg font-bold
                           transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1
                           hover:from-blue-700 hover:to-blue-500"
                >
                  {service.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Main Working Area */
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-2xl w-full">
            <h2 className="text-green-600 mb-6 text-2xl font-bold">
              ✅ الخدمة المختارة
            </h2>
            <div className="text-xl mb-6">
              <strong>{services.find(s => s.id === selectedServiceId)?.name}</strong>
            </div>

            <div className="bg-gray-100 p-6 rounded-xl mb-6">
              <h3 className="text-lg font-semibold mb-4">📭 حالة الطوابير</h3>
              <p className="text-gray-600">
                النظام جاهز لاستقبال التذاكر
              </p>
            </div>

            <button
              onClick={() => {
                setIsServiceSelected(false);
                setSelectedServiceId(null);
              }}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              تغيير الخدمة
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WindowScreen;
