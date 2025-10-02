import Link from 'next/link'

export default function Header(){
  return (
    <header className="backdrop-blur-sm bg-white/60 sticky top-0 z-50 border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/"><a className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">K</div><span className="font-semibold text-lg text-primary-700">Kost</span></a></Link>
        <nav className="flex items-center gap-4">
          <Link href="/"><a className="text-sm hover:text-primary-600">Home</a></Link>
          <Link href="/payment"><a className="text-sm hover:text-primary-600">Bayar Sewa</a></Link>
          <Link href="/admin/login"><a className="text-sm px-3 py-1 border rounded-lg hover:bg-primary-50">Admin</a></Link>
        </nav>
      </div>
    </header>
  )
}
