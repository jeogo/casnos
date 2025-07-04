import React, { useState } from 'react';
import Logo from '../../components/Logo';

// Interfaces
interface Service {
  id: number;
  name: string;
  active?: boolean;
}

interface WindowInfo {
  id: number;
  window_number: string;
  device_id: string;
  service_id: number | null;
  service_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Device {
  id: number;
  device_id: string;
  name: string;
  ip_address: string;
  device_type: string;
  status: string;
  last_seen: string;
}

const AdminScreen: React.FC = () => {
  // Data states with static example data
  const [services, setServices] = useState<Service[]>([
    { id: 1, name: 'Customer Service', active: true },
    { id: 2, name: 'Technical Support', active: true },
    { id: 3, name: 'Payments', active: false }
  ]);

  const [windows, setWindows] = useState<WindowInfo[]>([
    {
      id: 1,
      window_number: 'W1',
      device_id: 'dev1',
      service_id: 1,
      service_name: 'Customer Service',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      window_number: 'W2',
      device_id: 'dev2',
      service_id: 2,
      service_name: 'Technical Support',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);

  const [devices, setDevices] = useState<Device[]>([]);

  // UI states
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showAddService, setShowAddService] = useState(false);
  const [showAddWindow, setShowAddWindow] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newWindowNumber, setNewWindowNumber] = useState('');

  // Mock handlers
  const handleAddService = () => {
    if (!newServiceName.trim()) return;

    const newService: Service = {
      id: services.length + 1,
      name: newServiceName,
      active: true
    };

    setServices([...services, newService]);
    setNewServiceName('');
    setShowAddService(false);
  };

  const handleAddWindow = () => {
    if (!newWindowNumber.trim()) return;

    const newWindow: WindowInfo = {
      id: windows.length + 1,
      window_number: newWindowNumber,
      device_id: `dev${windows.length + 1}`,
      service_id: null,
      service_name: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setWindows([...windows, newWindow]);
    setNewWindowNumber('');
    setShowAddWindow(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Logo className="h-12" />
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 px-4">
        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="flex space-x-4 bg-white rounded p-2 shadow-sm">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'services', label: 'Services' },
              { id: 'windows', label: 'Windows' },
              { id: 'devices', label: 'Devices' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Total Services
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {services.length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Active Windows
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {windows.filter(w => w.is_active).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Online Devices
              </h3>
              <p className="text-3xl font-bold text-purple-600">
                {devices.filter(d => d.status === 'online').length}
              </p>
            </div>
          </div>
        )}

        {/* Services */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Services Management</h2>
                <button
                  onClick={() => setShowAddService(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Service
                </button>
              </div>
            </div>

            {showAddService && (
              <div className="p-4 bg-gray-50 border-b">
                <input
                  type="text"
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  placeholder="Service Name"
                  className="w-full p-2 border rounded"
                />
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={handleAddService}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowAddService(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="p-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(service => (
                    <tr key={service.id} className="border-b">
                      <td className="p-2">{service.id}</td>
                      <td className="p-2">{service.name}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            service.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {service.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-2">
                        <button className="text-blue-600 hover:text-blue-800 mr-2">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Windows */}
        {activeTab === 'windows' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Windows Management</h2>
                <button
                  onClick={() => setShowAddWindow(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Window
                </button>
              </div>
            </div>

            {showAddWindow && (
              <div className="p-4 bg-gray-50 border-b">
                <input
                  type="text"
                  value={newWindowNumber}
                  onChange={e => setNewWindowNumber(e.target.value)}
                  placeholder="Window Number"
                  className="w-full p-2 border rounded"
                />
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={handleAddWindow}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowAddWindow(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="p-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Window</th>
                    <th className="text-left p-2">Service</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {windows.map(window => (
                    <tr key={window.id} className="border-b">
                      <td className="p-2">{window.id}</td>
                      <td className="p-2">{window.window_number}</td>
                      <td className="p-2">
                        {window.service_name || 'Not Assigned'}
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            window.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {window.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-2">
                        <button className="text-blue-600 hover:text-blue-800 mr-2">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Devices */}
        {activeTab === 'devices' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Connected Devices</h2>
            </div>
            <div className="p-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">IP Address</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => (
                    <tr key={device.id} className="border-b">
                      <td className="p-2">{device.name}</td>
                      <td className="p-2">{device.device_type}</td>
                      <td className="p-2">{device.ip_address}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            device.status === 'online'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {device.status}
                        </span>
                      </td>
                      <td className="p-2">
                        {new Date(device.last_seen).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminScreen;
