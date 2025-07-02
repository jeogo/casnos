import React, { useEffect, useState, useRef } from 'react';
import appServices from '../../utils/appServices';
import APP_CONFIG from '../../config/appConfig';
import { getDeviceInfo, DEVICE_NAMES, DEVICE_IDS } from '../../utils/deviceInfo';
import { autoRegisterDevice } from '../../utils/deviceRegistration';
import Logo from '../../components/Logo';

const RECONNECT_INTERVAL = APP_CONFIG.CONNECTION.RECONNECT_INTERVAL;

// Interfaces
interface Service {
  id: number;
  name: string;
  active?: boolean;
}

interface Employee {
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

interface Ticket {
  id: number;
  ticket_number: string;
  service_id: number;
  service_name: string;
  status: string;
  created_at: string;
}

const AdminScreen: React.FC = () => {
  // =================================================================
  // STATE MANAGEMENT
  // =================================================================

  // Remove all connection UI states - silent background reconnection only

  // Data states
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Service CRUD states
  const [showAddService, setShowAddService] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [serviceLoading, setServiceLoading] = useState<boolean>(false);

  // Employee CRUD states
  const [showAddEmployee, setShowAddEmployee] = useState<boolean>(false);
  const [newEmployeeWindow, setNewEmployeeWindow] = useState<string>('');
  const [selectedServiceForEmployee, setSelectedServiceForEmployee] = useState<number | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState<boolean>(false);

  // Window number edit modal states
  const [showEditWindowModal, setShowEditWindowModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newWindowNumber, setNewWindowNumber] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<string>(''); // For real-time status updates

  // UI states
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(false);

  // Refs
  const socketRef = useRef<any>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const discoveryTimeout = useRef<NodeJS.Timeout | null>(null);

  // =================================================================
  // SERVER CONNECTION
  // =================================================================

  const connectToServer = async (): Promise<boolean> => {
    try {
      console.log('[ADMIN] Starting server discovery...');
      const serverDiscovered = await appServices.initializeWithDiscovery();

      if (serverDiscovered) {
        console.log('[ADMIN] ✅ Server discovered successfully');
        return true;
      } else {
        console.log('[ADMIN] Server not found yet, will keep trying...');
        return false;
      }
    } catch (err) {
      console.error('[ADMIN] Error during server connection:', err);
      return false;
    }
  };

  // =================================================================
  // DATA FETCHING
  // =================================================================

  const fetchServices = async (useCache: boolean = false) => {
    try {
      if (!useCache) setLoading(true);

      // ⚡ Super fast fetch with shorter timeout for admin
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      try {
        const response = await fetch(`${appServices.getBaseURL()}/api/services`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': useCache ? 'max-age=30' : 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const servicesList = Array.isArray(data) ? data : (data.data || []);

        // ⚡ Instant UI update
        setServices(servicesList);

        return servicesList;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (err) {
      if (!useCache) setServices([]);
    } finally {
      if (!useCache) setLoading(false);
    }
  };

  const fetchEmployees = async (useCache: boolean = false) => {
    try {
      if (!useCache) setLoading(true);

      // ⚡ Fast fetch for employees
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const response = await fetch(`${appServices.getBaseURL()}/api/employees`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': useCache ? 'max-age=30' : 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const employeesList = Array.isArray(data) ? data : (data.data || []);

        setEmployees(employeesList);

        return employeesList;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (err) {
      if (!useCache) setEmployees([]);
    } finally {
      if (!useCache) setLoading(false);
    }
  };

  // =================================================================
  // EMPLOYEE CRUD OPERATIONS
  // =================================================================

  const createEmployee = async (windowNumber: string, serviceId?: number): Promise<boolean> => {
    try {
      setEmployeeLoading(true);

      // 🔍 Check for window number duplicates before making API call
      const isDuplicate = employees.some(emp => emp.window_number === windowNumber);
      if (isDuplicate) {
        alert(`⚠️ رقم الشباك "${windowNumber}" مُستخدم بالفعل من قِبل موظف آخر.\nالرجاء اختيار رقم شباك مختلف.`);
        return false;
      }

      // ⚡ Optimistic update - Show immediately
      const tempId = Date.now();
      const selectedService = services.find(s => s.id === serviceId);
      const tempEmployee: Employee = {
        id: tempId,
        window_number: windowNumber,
        device_id: `temp-${tempId}`,
        service_id: serviceId || null,
        service_name: selectedService?.name || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setEmployees(prev => [...prev, tempEmployee]);

      // ⚡ Fast API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(`${appServices.getBaseURL()}/api/employees/window`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            windowNumber,
            serviceId: serviceId || null,
            serviceName: selectedService?.name || null
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Revert optimistic update on failure
          setEmployees(prev => prev.filter(e => e.id !== tempId));

          // 🔥 Handle specific error cases
          if (response.status === 409) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `رقم الشباك "${windowNumber}" مُستخدم بالفعل`;
            alert(`⚠️ خطأ في إنشاء الموظف:\n${errorMessage}\n\nالرجاء اختيار رقم شباك مختلف.`);
          } else {
            alert('❌ فشل في إنشاء الموظف. الرجاء المحاولة مرة أخرى.');
          }
          return false;
        }

        const result = await response.json();
        const newEmployee = result.data || result;

        // ⚡ Replace temp employee with real employee instantly
        setEmployees(prev => prev.map(e => e.id === tempId ? newEmployee : e));

        // 🔥 Emit real-time event to all other clients
        appServices.emitRealtimeEvent('employee:created', newEmployee);

        return true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Revert optimistic update
        setEmployees(prev => prev.filter(e => e.id !== tempId));
        throw fetchError;
      }
    } catch (err) {
      return false;
    } finally {
      setEmployeeLoading(false);
    }
  };

  const updateEmployee = async (employeeId: number, updates: Partial<Employee>): Promise<boolean> => {
    try {
      setEmployeeLoading(true);

      // 🔍 Check for window number duplicates before making API call
      if (updates.window_number) {
        const isDuplicate = employees.some(emp =>
          emp.id !== employeeId && emp.window_number === updates.window_number
        );

        if (isDuplicate) {
          alert(`⚠️ رقم الشباك "${updates.window_number}" مُستخدم بالفعل من قِبل موظف آخر.\nالرجاء اختيار رقم شباك مختلف.`);
          return false;
        }
      }

      // ⚡ Optimistic update - Show changes immediately
      const originalEmployees = employees;
      setEmployees(prev => prev.map(e =>
        e.id === employeeId ? { ...e, ...updates } : e
      ));

      // ⚡ Fast API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(`${appServices.getBaseURL()}/api/employees/${employeeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Revert optimistic update on failure
          setEmployees(originalEmployees);

          // 🔥 Handle specific error cases
          if (response.status === 409) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `رقم الشباك "${updates.window_number || 'غير محدد'}" مُستخدم بالفعل`;
            alert(`⚠️ خطأ في التحديث:\n${errorMessage}\n\nالرجاء اختيار رقم شباك مختلف.`);
          } else {
            alert('❌ فشل في تحديث بيانات الموظف. الرجاء المحاولة مرة أخرى.');
          }
          return false;
        }

        const result = await response.json();
        const updatedEmployee = result.data || result;

        // ⚡ Ensure the update is applied correctly
        setEmployees(prev => prev.map(e =>
          e.id === employeeId ? updatedEmployee : e
        ));

        // 🔥 Emit real-time event to all other clients
        appServices.emitRealtimeEvent('employee:updated', updatedEmployee);

        return true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Revert optimistic update
        setEmployees(originalEmployees);
        throw fetchError;
      }
    } catch (err) {
      return false;
    } finally {
      setEmployeeLoading(false);
    }
  };

  const assignServiceToEmployee = async (employeeId: number, serviceId: number): Promise<boolean> => {
    const selectedService = services.find(s => s.id === serviceId);
    if (!selectedService) return false;

    return await updateEmployee(employeeId, {
      service_id: serviceId,
      service_name: selectedService.name
    });
  };

  const deleteEmployee = async (employeeId: number): Promise<boolean> => {
    try {
      setEmployeeLoading(true);

      // Confirm deletion
      if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
        return false;
      }

      // ⚡ Optimistic update - Remove immediately
      const originalEmployees = employees;
      const employeeToDelete = employees.find(e => e.id === employeeId);
      setEmployees(prev => prev.filter(e => e.id !== employeeId));

      // ⚡ Fast API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(`${appServices.getBaseURL()}/api/employees/${employeeId}`, {
          method: 'DELETE',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Revert optimistic update on failure
          setEmployees(originalEmployees);
          throw new Error('Failed to delete employee');
        }

        // 🔥 Emit real-time event to all other clients
        appServices.emitRealtimeEvent('employee:deleted', {
          id: employeeId,
          window_number: employeeToDelete?.window_number || 'Unknown',
          name: `شباك ${employeeToDelete?.window_number || 'غير معروف'}`
        });

        return true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Revert optimistic update
        setEmployees(originalEmployees);
        throw fetchError;
      }
    } catch (err) {
      return false;
    } finally {
      setEmployeeLoading(false);
    }
  };

  // Employee handlers
  const handleAddEmployee = async () => {
    if (!newEmployeeWindow.trim()) return;

    const success = await createEmployee(newEmployeeWindow.trim(), selectedServiceForEmployee || undefined);
    if (success) {
      setNewEmployeeWindow('');
      setSelectedServiceForEmployee(null);
      setShowAddEmployee(false);
    }
  };

  const handleEditEmployee = async (employee: Employee, updates: Partial<Employee>) => {
    await updateEmployee(employee.id, updates);
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    await deleteEmployee(employeeId);
  };

  const handleAssignService = async (employeeId: number, serviceId: number) => {
    await assignServiceToEmployee(employeeId, serviceId);
  };

  // Window number edit modal handlers
  const handleOpenEditWindowModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setNewWindowNumber(employee.window_number);
    setShowEditWindowModal(true);
  };

  const handleCloseEditWindowModal = () => {
    setShowEditWindowModal(false);
    setEditingEmployee(null);
    setNewWindowNumber('');
    setModalStatus(''); // Reset status
  };

  const handleSaveWindowNumber = async () => {
    if (!editingEmployee || !newWindowNumber.trim()) return;

    const trimmedWindow = newWindowNumber.trim();

    // Validate input
    if (trimmedWindow === editingEmployee.window_number) {
      alert('⚠️ رقم الشباك لم يتغير. لم يتم حفظ أي تعديل.');
      return;
    }

    // Check for duplicates
    const existingWindowNumbers = employees
      .filter(emp => emp.id !== editingEmployee.id)
      .map(emp => emp.window_number);

    if (existingWindowNumbers.includes(trimmedWindow)) {
      alert(`❌ رقم الشباك "${trimmedWindow}" مُستخدم بالفعل من قِبل موظف آخر.\n\nالأرقام المُستخدمة حالياً: ${existingWindowNumbers.join(', ')}\n\nالرجاء اختيار رقم مختلف.`);
      return;
    }

    try {
      setModalStatus('جاري التحديث...'); // Updating status

      // 🔥 Emit immediate real-time event for instant UI feedback across all clients
      const preUpdateData = {
        ...editingEmployee,
        window_number: trimmedWindow,
        updated_at: new Date().toISOString(),
        updateType: 'window_number_change',
        previousWindowNumber: editingEmployee.window_number
      };

      // Emit optimistic update event
      appServices.emitRealtimeEvent('employee:updating', preUpdateData);

      // Proceed with server update
      const success = await updateEmployee(editingEmployee.id, { window_number: trimmedWindow });

      if (success) {
        setModalStatus('تم بنجاح! ✅'); // Success status

        // ✅ Emit final success event
        appServices.emitRealtimeEvent('employee:window-updated', {
          employeeId: editingEmployee.id,
          oldWindowNumber: editingEmployee.window_number,
          newWindowNumber: trimmedWindow,
          timestamp: new Date().toISOString(),
          success: true
        });


        // Close modal after a brief success display
        setTimeout(() => {
          handleCloseEditWindowModal();
        }, 800);
      } else {
        setModalStatus('فشل التحديث ❌'); // Failed status
        // ❌ Emit failure event
        appServices.emitRealtimeEvent('employee:window-update-failed', {
          employeeId: editingEmployee.id,
          attemptedWindowNumber: trimmedWindow,
          timestamp: new Date().toISOString(),
          success: false
        });
      }
    } catch (error) {
      setModalStatus('حدث خطأ ❌'); // Error status

      // Emit error event
      appServices.emitRealtimeEvent('employee:window-update-error', {
        employeeId: editingEmployee.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${appServices.getBaseURL()}/api/devices`);
      const data = await response.json();
      const devicesList = Array.isArray(data) ? data : (data.data || []);
      setDevices(devicesList);
    } catch (err) {
      setDevices([]);
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await appServices.getTickets();
      const ticketsList = Array.isArray(response) ? response : ((response as any).data || []);
      setTickets(ticketsList);
    } catch (err) {
      setTickets([]);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${appServices.getBaseURL()}/api/tickets/statistics`);
      await response.json();
    } catch (err) {
    }
  };

  const fetchAllData = async () => {
    if (!appServices.isServerDiscovered()) return;

    await Promise.all([
      fetchServices(),
      fetchEmployees(),
      fetchDevices(),
      fetchTickets(),
      fetchStatistics()
    ]);
  };

  // =================================================================
  // SERVICE CRUD OPERATIONS
  // =================================================================

  const createService = async (serviceName: string): Promise<boolean> => {
    try {
      setServiceLoading(true);

      // ⚡ Optimistic update - Show immediately
      const tempId = Date.now();
      const tempService: Service = {
        id: tempId,
        name: serviceName,
        active: true
      };
      setServices(prev => [...prev, tempService]);

      // ⚡ Fast API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(`${appServices.getBaseURL()}/api/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: serviceName }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Revert optimistic update on failure
          setServices(prev => prev.filter(s => s.id !== tempId));
          throw new Error('Failed to create service');
        }

        const result = await response.json();
        const newService = result.data || result;

        // ⚡ Replace temp service with real service instantly
        setServices(prev => prev.map(s => s.id === tempId ? newService : s));

        // 🔥 Emit real-time event to all other clients
        appServices.emitRealtimeEvent('service:created', newService);

        return true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Revert optimistic update
        setServices(prev => prev.filter(s => s.id !== tempId));
        throw fetchError;
      }
    } catch (err) {
      return false;
    } finally {
      setServiceLoading(false);
    }
  };

  const updateService = async (serviceId: number, updates: Partial<Service>): Promise<boolean> => {
    try {
      setServiceLoading(true);

      // ⚡ Optimistic update - Show changes immediately
      const originalServices = services;
      setServices(prev => prev.map(s =>
        s.id === serviceId ? { ...s, ...updates } : s
      ));

      // ⚡ Fast API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(`${appServices.getBaseURL()}/api/services/${serviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Revert optimistic update on failure
          setServices(originalServices);
          throw new Error('Failed to update service');
        }

        const result = await response.json();
        const updatedService = result.data || result;

        // ⚡ Ensure the update is applied correctly
        setServices(prev => prev.map(s =>
          s.id === serviceId ? updatedService : s
        ));

        // 🔥 Emit real-time event to all other clients
        appServices.emitRealtimeEvent('service:updated', updatedService);

        return true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Revert optimistic update
        setServices(originalServices);
        throw fetchError;
      }
    } catch (err) {
      return false;
    } finally {
      setServiceLoading(false);
    }
  };

  const deleteService = async (serviceId: number): Promise<boolean> => {
    try {
      setServiceLoading(true);

      // Confirm deletion
      if (!window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
        return false;
      }

      // ⚡ Optimistic update - Remove immediately
      const originalServices = services;
      const serviceToDelete = services.find(s => s.id === serviceId);
      setServices(prev => prev.filter(s => s.id !== serviceId));

      // ⚡ Fast API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(`${appServices.getBaseURL()}/api/services/${serviceId}`, {
          method: 'DELETE',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Revert optimistic update on failure
          setServices(originalServices);
          throw new Error('Failed to delete service');
        }

        // 🔥 Emit real-time event to all other clients
        appServices.emitRealtimeEvent('service:deleted', {
          id: serviceId,
          name: serviceToDelete?.name || 'Unknown Service'
        });

        return true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Revert optimistic update
        setServices(originalServices);
        throw fetchError;
      }
    } catch (err) {
      return false;
    } finally {
      setServiceLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!newServiceName.trim()) return;

    const success = await createService(newServiceName.trim());
    if (success) {
      setNewServiceName('');
      setShowAddService(false);
    }
  };

  const handleEditService = async (service: Service, newName: string) => {
    if (!newName.trim() || newName === service.name) {
      setEditingService(null);
      return;
    }

    const success = await updateService(service.id, { name: newName.trim() });
    if (success) {
      setEditingService(null);
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    await deleteService(serviceId);
  };

  // =================================================================
  // SOCKET CONNECTION
  // =================================================================

  const connectSocket = async () => {
    if (appServices.isConnected()) {
      return;
    }

    console.log('[ADMIN] Connecting to socket server...');

    try {
      const deviceInfo = await getDeviceInfo('display', DEVICE_NAMES.display, DEVICE_IDS.display);

      const socket = appServices.connectSocket(deviceInfo);
      socketRef.current = socket;

      socket.on('connect', async () => {
        console.log('[ADMIN] ✅ Socket connected successfully');

        // Register device
        try {
          await autoRegisterDevice(deviceInfo);
        } catch (err) {
          console.warn('[ADMIN] Device registration failed:', err);
        }

        // Setup realtime event listeners
        setupRealtimeEventListeners();

        // Fetch initial data
        await fetchAllData();

        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      });

      socket.on('disconnect', () => {
        console.log('[ADMIN] Socket disconnected, will reconnect...');
        attemptReconnect();
      });

      socket.on('connect_error', (_error) => {
        console.log('[ADMIN] Socket connection error, will reconnect...');
        attemptReconnect();
      });

      return socket;

    } catch (err) {
      console.error('[ADMIN] ❌ Socket connection failed:', err);
      attemptReconnect();
      return null;
    }
  };

  // Setup realtime event listeners
  const setupRealtimeEventListeners = () => {

    // Listen for service events
    appServices.onRealtimeEvent('service:created', (data) => {
      if (data && data.id) {
        setServices(prev => {
          const exists = prev.find(s => s.id === data.id);
          if (!exists) {
            return [...prev, data];
          }
          return prev;
        });
      } else {
        fetchServices(true);
      }
    });

    appServices.onRealtimeEvent('service:updated', (data) => {
      if (data && data.id) {
        setServices(prev => prev.map(s =>
          s.id === data.id ? data : s
        ));
      } else {
        fetchServices(true);
      }
    });

    appServices.onRealtimeEvent('service:deleted', (data) => {
      if (data && data.id) {
        setServices(prev => prev.filter(s => s.id !== data.id));
      } else {
        fetchServices(true);
      }
    });

    // Listen for employee events
    appServices.onRealtimeEvent('employee:created', (data) => {
      if (data && data.id) {
        setEmployees(prev => {
          const exists = prev.find(e => e.id === data.id);
          if (!exists) {
            return [...prev, data];
          }
          return prev;
        });
      } else {
        fetchEmployees(true);
      }
    });

    appServices.onRealtimeEvent('employee:updated', (data) => {
      if (data && data.id) {
        setEmployees(prev => prev.map(e =>
          e.id === data.id ? data : e
        ));
      } else {
        fetchEmployees(true);
      }
    });

    appServices.onRealtimeEvent('employee:deleted', (data) => {
      if (data && data.id) {
        setEmployees(prev => prev.filter(e => e.id !== data.id));
      } else {
        fetchEmployees(true);
      }
    });

    appServices.onRealtimeEvent('employee:service-assigned', (_data) => {
      fetchEmployees(true);
    });

    appServices.onRealtimeEvent('employee:service-removed', (_data) => {
      fetchEmployees(true);
    });

    // 🔥 Enhanced real-time events for window number updates
    appServices.onRealtimeEvent('employee:updating', (data) => {
      if (data && data.id) {
        // Apply optimistic update immediately for better UX
        setEmployees(prev => prev.map(e =>
          e.id === data.id ? { ...e, ...data } : e
        ));

        // Show live notification for other users
        if (data.updateType === 'window_number_change') {
        }
      }
    });

    appServices.onRealtimeEvent('employee:window-updated', (data) => {
      // Refresh employee data to ensure consistency
      fetchEmployees(true);

      // Show success notification if available
      if (data.oldWindowNumber && data.newWindowNumber) {
      }
    });

    appServices.onRealtimeEvent('employee:window-update-failed', (_data) => {
      // Refresh to ensure UI consistency
      fetchEmployees(true);
    });

    appServices.onRealtimeEvent('employee:window-update-error', (_data) => {
      // Refresh to ensure UI consistency
      fetchEmployees(true);
    });

    // Listen for ticket events
    appServices.onRealtimeEvent('ticket:new', (_data) => {
      fetchTickets();
    });

    appServices.onRealtimeEvent('ticket:status-update', (_data) => {
      fetchTickets();
    });

    appServices.onRealtimeEvent('ticket:created', (_data) => {
      fetchTickets();
    });

    // Listen for device status updates
    appServices.onRealtimeEvent('device:status-update', (_data) => {
      fetchDevices();
    });

  };

  const attemptReconnect = () => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    reconnectTimeout.current = setTimeout(() => {
      connectSocket();
    }, RECONNECT_INTERVAL);
  };

  // =================================================================
  // LIFECYCLE
  // =================================================================

  useEffect(() => {
    // Start discovery process
    const checkServerIp = async () => {
      try {
        const res = await appServices.getServerInfo();

        if (res && res.ip) {
          (window as any).SOCKET_SERVER_IP = res.ip;
          (window as any).SOCKET_SERVER_PORT = res.port || 3001;

          if (discoveryTimeout.current) {
            clearTimeout(discoveryTimeout.current);
            discoveryTimeout.current = null;
          }

          // Connect to server
          const connected = await connectToServer();
          if (connected) {
            await connectSocket();
          }
        } else {
          discoveryTimeout.current = setTimeout(checkServerIp, APP_CONFIG.CONNECTION.DISCOVERY_RETRY_INTERVAL);
        }
      } catch (error) {
        console.log('[ADMIN] Discovery error, retrying...', error);
        discoveryTimeout.current = setTimeout(checkServerIp, APP_CONFIG.CONNECTION.DISCOVERY_ERROR_RETRY_INTERVAL);
      }
    };

    checkServerIp();

    return () => {
      appServices.disconnect();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (discoveryTimeout.current) clearTimeout(discoveryTimeout.current);
    };
  }, []);

  // Auto-refresh data with smart intervals
  useEffect(() => {
    if (!appServices.isServerDiscovered()) return;

    // Immediate fetch on mount
    fetchAllData();

    // Smart refresh intervals - faster for services and employees (real-time), slower for others
    const dataInterval = setInterval(() => {
      fetchServices(true); // Use cache, faster refresh
      fetchEmployees(true);   // Use cache, faster refresh
    }, 5000); // Every 5 seconds for main data

    const deviceInterval = setInterval(() => {
      fetchDevices();
      fetchStatistics();
    }, 15000); // Every 15 seconds for device data

    return () => {
      clearInterval(dataInterval);
      clearInterval(deviceInterval);
    };
  }, []);

  // =================================================================
  // RENDER
  // =================================================================

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-blue-50 p-4 font-sans overflow-hidden relative">
      {/* Logo in top-left corner */}
      <div className="absolute top-4 left-4 z-10">
        <Logo size="lg" position="left" />
      </div>

      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-6 bg-white rounded-xl shadow-lg p-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-blue-600 text-3xl font-bold drop-shadow-md">
              🛡️ CASNOS Admin Screen
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Queue Management System Administration</p>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Navigation Tabs */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div className="flex space-x-4 bg-white rounded-lg p-2 shadow">
                {[
                  { id: 'dashboard', label: '📊 لوحة التحكم', icon: '📊' },
                  { id: 'services', label: '🔧 الخدمات', icon: '🔧' },
                  { id: 'employees', label: '👥 الموظفين', icon: '👥' },
                  { id: 'devices', label: '📱 الأجهزة', icon: '📱' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Refresh Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchAllData()}
                  disabled={loading}
                  className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-300 transition-colors text-sm"
                >
                  {loading ? '🔄' : '🔄 تحديث'}
                </button>
                <div className="text-xs text-gray-500">
                  آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-6">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">🔧 إجمالي الخدمات</h3>
                  <p className="text-3xl font-bold text-blue-600">{services.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">👥 إجمالي الموظفين</h3>
                  <p className="text-3xl font-bold text-green-600">{employees.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">🟢 الموظفين النشطين</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {employees.filter(e => e.is_active).length}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">🎫 إجمالي التذاكر</h3>
                  <p className="text-3xl font-bold text-orange-600">{tickets.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">📱 الأجهزة المتصلة</h3>
                  <p className="text-3xl font-bold text-purple-600">
                    {devices.filter(d => d.status === 'online').length}
                  </p>
                </div>
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">🔧 إدارة الخدمات</h2>
                  <button
                    onClick={() => setShowAddService(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    disabled={serviceLoading}
                  >
                    ➕ إضافة خدمة
                  </button>
                </div>

                {/* Add Service Form */}
                {showAddService && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">إضافة خدمة جديدة</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="اسم الخدمة"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={serviceLoading}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddService()}
                      />
                      <button
                        onClick={handleAddService}
                        disabled={serviceLoading || !newServiceName.trim()}
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-300 transition-colors"
                      >
                        {serviceLoading ? '...' : 'إضافة'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddService(false);
                          setNewServiceName('');
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                        disabled={serviceLoading}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {loading && !services.length ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">جاري تحميل الخدمات...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-right font-semibold">الرقم</th>
                          <th className="px-4 py-3 text-right font-semibold">اسم الخدمة</th>
                          <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                          <th className="px-4 py-3 text-right font-semibold">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map((service) => (
                          <tr key={service.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3">{service.id}</td>
                            <td className="px-4 py-3">
                              {editingService?.id === service.id ? (
                                <input
                                  type="text"
                                  defaultValue={service.name}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                  onBlur={(e) => handleEditService(service, e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditService(service, (e.target as HTMLInputElement).value);
                                    } else if (e.key === 'Escape') {
                                      setEditingService(null);
                                    }
                                  }}
                                  disabled={serviceLoading}
                                />
                              ) : (
                                <span
                                  className="cursor-pointer hover:text-blue-600"
                                  onClick={() => setEditingService(service)}
                                >
                                  {service.name}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                service.active !== false
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {service.active !== false ? '✅ نشط' : '❌ غير نشط'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingService(service)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                  disabled={serviceLoading}
                                >
                                  ✏️ تعديل
                                </button>
                                <button
                                  onClick={() => updateService(service.id, { active: !service.active })}
                                  className={`text-sm font-medium ${
                                    service.active !== false
                                      ? 'text-orange-600 hover:text-orange-800'
                                      : 'text-green-600 hover:text-green-800'
                                  }`}
                                  disabled={serviceLoading}
                                >
                                  {service.active !== false ? '⏸️ إيقاف' : '▶️ تفعيل'}
                                </button>
                                <button
                                  onClick={() => handleDeleteService(service.id)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                  disabled={serviceLoading}
                                >
                                  🗑️ حذف
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {services.length === 0 && !loading && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-lg">📋 لا توجد خدمات مضافة</p>
                        <p className="text-sm mt-2">انقر على "إضافة خدمة" لإضافة خدمة جديدة</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Employees Tab */}
            {activeTab === 'employees' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">👥 إدارة الموظفين</h2>
                  <button
                    onClick={() => setShowAddEmployee(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    disabled={employeeLoading}
                  >
                    ➕ إضافة موظف
                  </button>
                </div>

                {/* Add Employee Form */}
                {showAddEmployee && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">إضافة موظف جديد</h3>

                    {/* Show existing window numbers for reference */}
                    {employees.length > 0 && (
                      <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                        <strong>أرقام الشبابيك المُستخدمة حالياً:</strong> {employees.map(emp => emp.window_number).join(', ')}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newEmployeeWindow}
                            onChange={(e) => {
                              const value = e.target.value;
                              setNewEmployeeWindow(value);

                              // 🔍 Real-time duplicate check
                              if (value.trim() && employees.some(emp => emp.window_number === value.trim())) {
                                e.target.style.borderColor = '#ef4444';
                                e.target.style.backgroundColor = '#fef2f2';
                              } else {
                                e.target.style.borderColor = '#d1d5db';
                                e.target.style.backgroundColor = '#ffffff';
                              }
                            }}
                            placeholder="رقم الشباك (مثل: 1, 2, 3)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={employeeLoading}
                          />
                          {/* Real-time duplicate warning */}
                          {newEmployeeWindow.trim() && employees.some(emp => emp.window_number === newEmployeeWindow.trim()) && (
                            <p className="text-red-500 text-xs mt-1">⚠️ هذا الرقم مُستخدم بالفعل</p>
                          )}
                        </div>
                        <select
                          value={selectedServiceForEmployee || ''}
                          onChange={(e) => setSelectedServiceForEmployee(e.target.value ? parseInt(e.target.value) : null)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={employeeLoading}
                        >
                          <option value="">اختر خدمة (اختياري)</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>{service.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddEmployee}
                          disabled={
                            employeeLoading ||
                            !newEmployeeWindow.trim() ||
                            employees.some(emp => emp.window_number === newEmployeeWindow.trim())
                          }
                          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-300 transition-colors"
                        >
                          {employeeLoading ? '...' : 'إضافة'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddEmployee(false);
                            setNewEmployeeWindow('');
                            setSelectedServiceForEmployee(null);
                          }}
                          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                          disabled={employeeLoading}
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {loading && !employees.length ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">جاري تحميل الموظفين...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-right font-semibold">الرقم</th>
                          <th className="px-4 py-3 text-right font-semibold">رقم الشباك</th>
                          <th className="px-4 py-3 text-right font-semibold">الخدمة المُعيَّنة</th>
                          <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                          <th className="px-4 py-3 text-right font-semibold">تاريخ الإنشاء</th>
                          <th className="px-4 py-3 text-right font-semibold">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((employee) => (
                          <tr key={employee.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3">{employee.id}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono font-bold text-blue-600">
                                شباك {employee.window_number}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {employee.service_name ? (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                                    {employee.service_name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">لا توجد خدمة</span>
                                )}
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAssignService(employee.id, parseInt(e.target.value));
                                    }
                                  }}
                                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                                  disabled={employeeLoading}
                                  value=""
                                >
                                  <option value="">تغيير الخدمة</option>
                                  {services.map(service => (
                                    <option key={service.id} value={service.id}>{service.name}</option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                employee.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {employee.is_active ? '✅ نشط' : '❌ غير نشط'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600">
                                {new Date(employee.created_at).toLocaleString('ar-SA')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditEmployee(employee, { is_active: !employee.is_active })}
                                  className={`text-sm font-medium ${
                                    employee.is_active
                                      ? 'text-orange-600 hover:text-orange-800'
                                      : 'text-green-600 hover:text-green-800'
                                  }`}
                                  disabled={employeeLoading}
                                >
                                  {employee.is_active ? '⏸️ إيقاف' : '▶️ تفعيل'}
                                </button>
                                <button
                                  onClick={() => handleOpenEditWindowModal(employee)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                  disabled={employeeLoading}
                                >
                                  ✏️ تعديل الشباك
                                </button>
                                <button
                                  onClick={() => handleDeleteEmployee(employee.id)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                  disabled={employeeLoading}
                                >
                                  🗑️ حذف
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {employees.length === 0 && !loading && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-lg">👥 لا يوجد موظفين مسجلين</p>
                        <p className="text-sm mt-2">انقر على "إضافة موظف" لإضافة موظف جديد</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Devices Tab */}
            {activeTab === 'devices' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">📱 الأجهزة المتصلة</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-right">اسم الجهاز</th>
                        <th className="px-4 py-2 text-right">النوع</th>
                        <th className="px-4 py-2 text-right">عنوان IP</th>
                        <th className="px-4 py-2 text-right">الحالة</th>
                        <th className="px-4 py-2 text-right">آخر اتصال</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((device) => (
                        <tr key={device.id} className="border-t">
                          <td className="px-4 py-2">{device.name}</td>
                          <td className="px-4 py-2">{device.device_type}</td>
                          <td className="px-4 py-2">{device.ip_address}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-sm ${
                              device.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {device.status === 'online' ? 'متصل' : 'غير متصل'}
                            </span>
                          </td>
                          <td className="px-4 py-2">{new Date(device.last_seen).toLocaleString('ar-SA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Window Number Edit Modal */}
      {showEditWindowModal && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">تعديل رقم الشباك</h3>

            {/* Current window info */}
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">الموظف الحالي:</p>
              <p className="font-medium">شباك {editingEmployee.window_number}</p>
              {editingEmployee.service_name && (
                <p className="text-sm text-gray-600">الخدمة: {editingEmployee.service_name}</p>
              )}
            </div>

            {/* Show existing window numbers */}
            {employees.length > 1 && (
              <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
                <strong>أرقام الشبابيك المُستخدمة:</strong>{' '}
                {employees
                  .filter(emp => emp.id !== editingEmployee.id)
                  .map(emp => emp.window_number)
                  .join(', ')}
              </div>
            )}

            {/* Input field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الشباك الجديد:
              </label>
              <input
                type="text"
                value={newWindowNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewWindowNumber(value);

                  // Real-time duplicate check
                  const isDuplicate = employees.some(emp =>
                    emp.id !== editingEmployee.id && emp.window_number === value.trim()
                  );

                  if (value.trim() && isDuplicate) {
                    e.target.style.borderColor = '#ef4444';
                    e.target.style.backgroundColor = '#fef2f2';
                  } else {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.backgroundColor = '#ffffff';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="أدخل رقم الشباك الجديد"
                autoFocus
              />

              {/* Real-time duplicate warning */}
              {newWindowNumber.trim() &&
               employees.some(emp => emp.id !== editingEmployee.id && emp.window_number === newWindowNumber.trim()) && (
                <p className="text-red-500 text-xs mt-1">⚠️ هذا الرقم مُستخدم بالفعل</p>
              )}
            </div>

            {/* Real-time Status Display */}
            {modalStatus && (
              <div className={`mb-4 p-3 rounded text-center font-medium ${
                modalStatus.includes('✅') ? 'bg-green-100 text-green-800' :
                modalStatus.includes('❌') ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {modalStatus}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCloseEditWindowModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={employeeLoading}
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveWindowNumber}
                disabled={
                  employeeLoading ||
                  !newWindowNumber.trim() ||
                  newWindowNumber.trim() === editingEmployee.window_number ||
                  employees.some(emp => emp.id !== editingEmployee.id && emp.window_number === newWindowNumber.trim())
                }
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
              >
                {modalStatus || (employeeLoading ? 'جاري الحفظ...' : 'حفظ')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminScreen;
