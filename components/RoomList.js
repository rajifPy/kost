import RoomCard from './RoomCard'

export default function RoomList({ rooms, adminMode = false, onToggle, onEdit, onDelete }) {
  if (!rooms || rooms.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="text-gray-400 text-4xl mb-2">🏠</div>
        <p className="text-gray-600">No rooms available yet.</p>
        {adminMode && (
          <p className="text-sm text-gray-500 mt-2">Click "Add Room" to get started.</p>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map(room => (
        <RoomCard 
          key={room.id} 
          room={room} 
          adminMode={adminMode}
          onToggle={adminMode ? onToggle : undefined}
          onEdit={adminMode ? onEdit : undefined}
          onDelete={adminMode ? onDelete : undefined}
        />
      ))}
    </div>
  )
}
