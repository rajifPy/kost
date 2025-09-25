import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import RoomList from '../components/RoomList'
import MapEmbed from '../components/MapEmbed'

export default function Home(){
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(()=>{ fetchRooms() }, [])

  async function fetchRooms(){
    setLoading(true)
    setError(null)
    try {
      if (!supabase) {
        throw new Error('Supabase client tidak dikonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY')
      }
      const { data, error } = await supabase.from('rooms').select('*').order('created_at', {ascending:false})
      if(error) {
        console.error(error)
        setError('Gagal mengambil data kamar.')
        setRooms([])
      } else {
        setRooms(data || [])
      }
    } catch (e) {
      console.error(e)
      setError(e.message || 'Terjadi kesalahan')
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary-700">Kost Pak Anda — Nyaman & Terjangkau</h1>
            <p className="mt-3 text-gray-600">Temukan kamar yang cocok, lihat fasilitas, harga, dan lakukan pembayaran dengan mudah.</p>
            <div className="mt-4 flex gap-3">
              <a href="/payment" className="btn-primary">Bayar Sewa</a>
              <a href="#rooms" className="px-4 py-2 border rounded-lg">Lihat Kamar</a>
            </div>
          </div>
          <div>
            <div className="card">
              <h4 className="font-semibold">Info singkat</h4>
              <ul className="mt-2 text-sm text-gray-600">
                <li>Harga mulai dari Rp 500.000 / bulan</li>
                <li>Fasilitas Pribadi : Kasur, Kipas, Almari, Listrik, Air</li>
                <li>Fasilitas Umum : Dapur, Kamar Mandi Luar, Jemuran</li>
                <li>Lokasi: dekat kampus </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="rooms">
        <h2 className="text-xl font-semibold mb-4">List Kamar</h2>

        {loading && (
          <div className="card">
            <div className="skeleton h-6 w-48 mb-3" />
            <div className="grid grid-cols-1 gap-3">
              <div className="skeleton h-20 rounded" />
              <div className="skeleton h-20 rounded" />
            </div>
          </div>
        )}

        {error && <div className="card text-red-600">{error}</div>}

        {!loading && !error && rooms.length === 0 && (
          <div className="card">
            <p className="text-gray-600">Belum ada kamar yang terdaftar. Admin dapat menambahkan kamar lewat dashboard.</p>
          </div>
        )}

        {!loading && !error && rooms.length > 0 && <RoomList rooms={rooms} />}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Lokasi</h2>

        {/* Pakai MapEmbed component untuk menampilkan peta embed yg sudah kamu berikan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <MapEmbed src={"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1978.883335070079!2d112.77890030865018!3d-7.267372706576134!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7fa27284874e3%3A0xdb4da342cefbd226!2sDharma%20Husada%20Indah%20Utara%20Mulyorejo%20Tengah%20Gg.%20V%20No.21%20XIV%20No.%20Depan%20U-416%2C%20Mulyorejo%2C%20Kec.%20Mulyorejo%2C%20Surabaya%2C%20Jawa%20Timur%2060115!5e0!3m2!1sid!2sid!4v1758474751866!5m2!1sid!2sid"} />
          </div>

          <div className="card">
            <h4 className="font-semibold mb-2">Alamat</h4>
            <div className="text-sm text-gray-600">
              Dharma Husada Indah Utara, Mulyorejo, Surabaya, Jawa Timur — Gg. V No.21 (Depan U-416)
            </div>
            <div className="mt-3">
              <a target="_blank" rel="noreferrer" className="text-primary-600 underline" href="https://www.google.com/maps/place/https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1978.883335070079!2d112.77890030865018!3d-7.267372706576134!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7fa27284874e3%3A0xdb4da342cefbd226!2sDharma%20Husada%20Indah%20Utara%20Mulyorejo%20Tengah%20Gg.%20V%20No.21%20XIV%20No.%20Depan%20U-416%2C%20Mulyorejo%2C%20Kec.%20Mulyorejo%2C%20Surabaya%2C%20Jawa%20Timur%2060115!5e0!3m2!1sid!2sid!4v1758474751866!5m2!1sid!2sid">Buka di Google Maps</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
