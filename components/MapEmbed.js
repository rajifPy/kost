// components/MapEmbed.js
export default function MapEmbed({ src }) {
  const defaultSrc =
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1978.883335070079!2d112.77890030865018!3d-7.267372706576134!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7fa27284874e3%3A0xdb4da342cefbd226!2sDharma%20Husada%20Indah%20Utara%20Mulyorejo%20Tengah%20Gg.%20V%20No.21%20XIV%20No.%20Depan%20U-416%2C%20Mulyorejo%2C%20Kec.%20Mulyorejo%2C%20Surabaya%2C%20Jawa%20Timur%2060115!5e0!3m2!1sid!2sid!4v1758474751866!5m2!1sid!2sid';

  return (
    <div className="card">
      <h4 className="font-semibold mb-3 text-primary-700">Lokasi Kost</h4>

      <div
        className="w-full rounded overflow-hidden"
        style={{ aspectRatio: '16/9', minHeight: 240 }}
      >
        <iframe
          src={src || defaultSrc}
          title="Peta Lokasi Kost"
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <p className="mt-2 text-sm text-gray-600">
        Zoom untuk melihat detail. Jika peta tidak tampil, coba periksa koneksi atau ganti URL embed.
      </p>
    </div>
  );
}
