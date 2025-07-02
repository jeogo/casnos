import React, { useEffect, useState } from 'react';
import CustomerScreen from './screens/CustomerScreen';
import DisplayScreen from './screens/DisplayScreen';
import EmployeeScreen from './screens/EmployeeScreen';
import AdminScreen from './screens/AdminScreen';

function App(): React.JSX.Element {
  const [activeScreen, setActiveScreen] = useState<'customer' | 'display' | 'employee' | 'admin'>('customer');

  useEffect(() => {
    // Check URL parameters to determine which screen to show
    const urlParams = new URLSearchParams(window.location.search);
    const screenParam = urlParams.get('screen');

    if (screenParam === 'display') {
      setActiveScreen('display');
    } else if (screenParam === 'employee') {
      setActiveScreen('employee');
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
      {activeScreen === 'employee' && <EmployeeScreen />}
      {activeScreen === 'admin' && <AdminScreen />}
    </div>
  );
}

export default App;
