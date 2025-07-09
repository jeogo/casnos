import React, { useEffect, useState } from 'react';
import CustomerScreen from './screens/CustomerScreen';
import DisplayScreen from './screens/DisplayScreen';
import AdminScreen from './screens/AdminScreen';
import WindowScreen from './screens/WindowScreen';

function App(): React.JSX.Element {
  const [activeScreen, setActiveScreen] = useState<'customer' | 'display' | 'window' | 'admin'>('customer');

  useEffect(() => {
    // Check URL parameters to determine which screen to show
    const urlParams = new URLSearchParams(window.location.search);
    const screenParam = urlParams.get('screen');

    if (screenParam === 'display') {
      setActiveScreen('display');
    } else if (screenParam === 'window') {
      setActiveScreen('window');
    } else if (screenParam === 'admin') {
      setActiveScreen('admin');
    } else {
      setActiveScreen('customer');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal']">
      {/* Show the appropriate screen based on URL parameters */}
      {activeScreen === 'customer' && <CustomerScreen />}
      {activeScreen === 'display' && <DisplayScreen />}
      {activeScreen === 'window' && <WindowScreen />}
      {activeScreen === 'admin' && <AdminScreen />}
    </div>
  );
}

export default App;
