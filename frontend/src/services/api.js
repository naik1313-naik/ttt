const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http'
const API_BASE = import.meta.env.VITE_API_BASE || `${protocol}://${host}:8000`

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function http(method, path, body, isForm = false) {
  const url = `${API_BASE}${path}`
  const init = {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders(),
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  }
  const res = await fetch(url, init)
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const data = await res.json()
      msg = data.detail || msg
    } catch {}
    throw new Error(msg)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => http('GET', path),
  post: (path, body) => http('POST', path, body),
  del: (path) => http('DELETE', path),
  postForm: (path, obj) => {
    const form = new URLSearchParams()
    Object.entries(obj).forEach(([k, v]) => form.append(k, v))
    return http('POST', path, form, true)
  },
}

export function requireAuth(navigate) {
  if (!localStorage.getItem('token')) {
    navigate('/login')
    return false
  }
  return true
}
