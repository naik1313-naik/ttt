import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      // OAuth2PasswordRequestForm expects "username" and "password"
      const res = await api.postForm('/login', { username: email, password })
      localStorage.setItem('token', res.access_token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <div className="p-3 rounded bg-red-50 text-red-700">{error}</div>}
        <div>
          <label className="text-sm">Email</label>
          <input className="w-full border rounded px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">Password</label>
          <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button className="px-4 py-2 rounded bg-primary text-white">Login</button>
      </form>
      <p className="text-sm mt-4">New here? <Link className="text-primary" to="/register">Sign up</Link></p>
    </div>
  )
}
