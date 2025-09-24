import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; // Asumsi path ke client

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10; // Pagination sederhana

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rooms').select('*'); // Sesuaikan table name
    if (error) {
      console.error('Error fetching rooms:', error);
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(search.toLowerCase()) ||
    room.status.toLowerCase().includes(search.toLowerCase())
  );

  const currentRooms = filteredRooms.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading rooms...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Room Management</h1>
        <p className="text-gray-600 mb-6">Manage and view all available rooms.</p>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search rooms by name or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/2 lg:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Add Room Button */}
        <button className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mb-6">
          Add New Room
        </button>
      </div>

      {/* Rooms Display: Cards on mobile, Table on desktop */}
      <div className="overflow-hidden">
        {/* Mobile: Cards */}
        <div className="md:hidden grid grid-cols-1 gap-4 mb-4">
          {currentRooms.map((room) => (
            <div key={room.id} className="bg-white shadow-md rounded-lg p-4 border">
              <h3 className="font-semibold text-lg">{room.name}</h3>
              <p className="text-gray-600">{room.status}</p>
              <p className="text-sm text-gray-500">Price: ${room.price}/month</p>
              <div className="flex space-x-2 mt-2">
                <button className="bg-green-500 text-white px-3 py-1 rounded text-sm">Edit</button>
                <button className="bg-red-500 text-white px-3 py-1 rounded text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-4 py-2 text-left">Name</th>
                <th className="border px-4 py-2 text-left">Status</th>
                <th className="border px-4 py-2 text-left">Price</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{room.name}</td>
                  <td className="border px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      room.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {room.status}
                    </span>
                  </td>
                  <td className="border px-4 py-2">${room.price}/month</td>
                  <td className="border px-4 py-2">
                    <div className="flex space-x-2">
                      <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                        Edit
                      </button>
                      <button className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredRooms.length > itemsPerPage && (
        <div className="flex justify-center mt-6 space-x-2">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-gray-600">Page {page}</span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, Math.ceil(filteredRooms.length / itemsPerPage)))}
            disabled={page === Math.ceil(filteredRooms.length / itemsPerPage)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Total Results */}
      <div className="text-center text-gray-500 mt-4">
        Showing {currentRooms.length} of {filteredRooms.length} rooms
      </div>
    </div>
  );
};

export default RoomManagement;
