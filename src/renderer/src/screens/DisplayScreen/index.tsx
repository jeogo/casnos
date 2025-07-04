import React, { useState } from 'react';
import Logo from '../../components/Logo';

// Interfaces
interface Ticket {
  id: number;
  ticket_number: string;
  service_id: number;
  service_name: string;
  status: 'pending' | 'called' | 'served';
  created_at: string;
  called_at: string | null;
  window_number: number | null;
}

const DisplayScreen: React.FC = () => {
  // Static example data for design purposes
  const [tickets] = useState<Ticket[]>([
    {
      id: 1,
      ticket_number: 'A001',
      service_id: 1,
      service_name: 'Service 1',
      status: 'called',
      created_at: new Date().toISOString(),
      called_at: new Date().toISOString(),
      window_number: 1
    },
    {
      id: 2,
      ticket_number: 'A002',
      service_id: 1,
      service_name: 'Service 1',
      status: 'pending',
      created_at: new Date().toISOString(),
      called_at: null,
      window_number: 2
    }
  ]);

  const [currentTicket] = useState<Ticket | null>(tickets[0]);
  const [showTicketOverlay] = useState(false);

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Header with Logo */}
      <header className="bg-white shadow-md p-4">
        <Logo className="h-12 mx-auto" />
      </header>

      {/* Main Display Area */}
      <div className="flex-1 flex p-4 gap-4">
        {/* Current Ticket Display */}
        <div className="flex-1 bg-white rounded-lg shadow-lg p-6 flex flex-col items-center justify-center">
          <h2 className="text-2xl font-semibold mb-4">Current Ticket</h2>
          {currentTicket ? (
            <>
              <div className="text-6xl font-bold text-blue-600 mb-2">
                {currentTicket.ticket_number}
              </div>
              <div className="text-xl text-gray-600">
                شباك {currentTicket.window_number}
              </div>
              <div className="text-lg text-gray-500">
                {currentTicket.service_name}
              </div>
            </>
          ) : (
            <div className="text-xl text-gray-400">No active ticket</div>
          )}
        </div>

        {/* Queue Display */}
        <div className="w-1/3 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Queue</h2>
          <div className="space-y-3">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                className={`p-3 rounded-lg ${
                  ticket.status === 'called'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100'
                }`}
              >
                <div className="font-semibold">{ticket.ticket_number}</div>
                <div className="text-sm">{ticket.service_name}</div>
                {ticket.window_number && (
                  <div className="text-sm font-medium">
                    شباك {ticket.window_number}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket Called Overlay */}
      {showTicketOverlay && currentTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center">
            <h2 className="text-4xl font-bold text-blue-600 mb-4">
              {currentTicket.ticket_number}
            </h2>
            <div className="text-2xl">
              Please proceed to شباك {currentTicket.window_number}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayScreen;
