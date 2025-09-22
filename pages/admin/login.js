import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function AdminLogin(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  async function handleSubmit(e){
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({email, password})
    if(error){ alert(error.message); return }
    router.push('/admin/dashboard')
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h3 className="font-semibold mb-4">Admin Login</h3>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2">Email<input value={email} onChange={e=>setEmail(e.target.value)} className="w-full border px-3 py-2 rounded" /></label>
        <label className="block mb-2">Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border px-3 py-2 rounded" /></label>
        <div className="mt-4"><button className="px-4 py-2 bg-blue-600 text-white rounded">Login</button></div>
      </form>
    </div>
  )
}
