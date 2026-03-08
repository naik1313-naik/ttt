import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, requireAuth } from '../services/api'
import { connectWS, onWSMessage } from '../services/ws'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts'

const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb7185', '#22d3ee', '#f97316', '#10b981', '#94a3b8']

export default function Dashboard() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [filters, setFilters] = useState({ q: '', category: '', start: '', end: '' })
  const [newTxn, setNewTxn] = useState({ amount: '', category: '', type: 'expense', date: '', payment_method: '', notes: '' })
  const [budgets, setBudgets] = useState([])

  useEffect(() => {
    if (!requireAuth(navigate)) return
    loadAll()
    connectWS()
    const off = onWSMessage((msg) => {
      if (['transaction_created', 'transaction_deleted', 'budget_updated'].includes(msg.event)) {
        loadAll()
      }
    })
    return off
  }, [])

  async function loadAll() {
    const [cats, anal, txns, b] = await Promise.all([
      api.get('/categories'),
      api.get('/analytics'),
      api.get('/transactions'),
      api.get('/budgets'),
    ])
    setCategories(cats)
    setAnalytics(anal)
    setTransactions(txns)
    setBudgets(b)
  }

  async function addTxn(e) {
    e.preventDefault()
    const payload = { ...newTxn, amount: parseFloat(newTxn.amount), category: parseInt(newTxn.category) }
    await api.post('/transactions', payload)
    setNewTxn({ amount: '', category: '', type: 'expense', date: '', payment_method: '', notes: '' })
    loadAll()
  }

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      if (filters.q && !(t.notes || '').toLowerCase().includes(filters.q.toLowerCase())) return false
      if (filters.category && String(t.category) !== String(filters.category)) return false
      if (filters.start && new Date(t.date) < new Date(filters.start)) return false
      if (filters.end && new Date(t.date) > new Date(filters.end)) return false
      return true
    })
  }, [transactions, filters])

  function catName(id) {
    return categories.find(c => c.id === id)?.category_name || 'Unknown'
  }

  function budgetFor(catId) {
    const m = budgets.find(b => b.category === catId)
    return m?.budget_amount || 0
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {analytics && (
        <div className="grid md:grid-cols-4 gap-4 mt-4">
          <Stat title="Total Balance" value={formatMoney(analytics.total_balance)} color="text-primary" />
          <Stat title="Monthly Income" value={formatMoney(analytics.monthly_income)} color="text-income" />
          <Stat title="Monthly Expenses" value={formatMoney(analytics.monthly_expenses)} color="text-expense" />
          <Stat title="Savings" value={formatMoney(analytics.savings)} />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <div className="p-4 rounded border bg-white">
          <h3 className="font-semibold mb-3">Expense Categories</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie dataKey="amount" nameKey="category" data={(analytics?.by_category || []).map(d => ({ ...d, name: catName(d.category) }))} outerRadius={80}>
                  {(analytics?.by_category || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="p-4 rounded border bg-white md:col-span-2">
          <h3 className="font-semibold mb-3">Monthly Spending</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={analytics?.monthly_series || []}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="expense" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <div className="p-4 rounded border bg-white">
          <h3 className="font-semibold mb-3">Trends</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={analytics?.monthly_series || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="income" stroke="#16a34a" />
                <Line type="monotone" dataKey="expense" stroke="#dc2626" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="p-4 rounded border bg-white md:col-span-2">
          <h3 className="font-semibold mb-3">Add Transaction</h3>
          <form onSubmit={addTxn} className="grid md:grid-cols-6 gap-2">
            <input className="border rounded px-2 py-1 md:col-span-1" placeholder="Amount" value={newTxn.amount} onChange={e=>setNewTxn(s=>({...s, amount: e.target.value}))} />
            <select className="border rounded px-2 py-1 md:col-span-1" value={newTxn.category} onChange={e=>setNewTxn(s=>({...s, category: e.target.value}))}>
              <option value="">Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
            </select>
            <select className="border rounded px-2 py-1 md:col-span-1" value={newTxn.type} onChange={e=>setNewTxn(s=>({...s, type: e.target.value}))}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input className="border rounded px-2 py-1 md:col-span-1" type="date" value={newTxn.date} onChange={e=>setNewTxn(s=>({...s, date: e.target.value}))} />
            <input className="border rounded px-2 py-1 md:col-span-1" placeholder="Payment" value={newTxn.payment_method} onChange={e=>setNewTxn(s=>({...s, payment_method: e.target.value}))} />
            <input className="border rounded px-2 py-1 md:col-span-1" placeholder="Notes" value={newTxn.notes} onChange={e=>setNewTxn(s=>({...s, notes: e.target.value}))} />
            <button className="px-3 py-2 rounded bg-primary text-white md:col-span-1">Add</button>
          </form>
          <div className="mt-4">
            <div className="flex gap-2 mb-2">
              <input className="border rounded px-2 py-1" placeholder="Search notes" value={filters.q} onChange={e=>setFilters(s=>({...s, q: e.target.value}))} />
              <select className="border rounded px-2 py-1" value={filters.category} onChange={e=>setFilters(s=>({...s, category: e.target.value}))}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
              <input className="border rounded px-2 py-1" type="date" value={filters.start} onChange={e=>setFilters(s=>({...s, start: e.target.value}))} />
              <input className="border rounded px-2 py-1" type="date" value={filters.end} onChange={e=>setFilters(s=>({...s, end: e.target.value}))} />
            </div>
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Payment</th>
                    <th className="text-left p-2">Notes</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map(t => (
                    <tr key={t.id} className="border-t">
                      <td className="p-2">{t.date}</td>
                      <td className="p-2 capitalize">{t.type}</td>
                      <td className="p-2">{catName(t.category)}</td>
                      <td className="p-2">{formatMoney(t.amount)}</td>
                      <td className="p-2">{t.payment_method || '-'}</td>
                      <td className="p-2">{t.notes || '-'}</td>
                      <td className="p-2">
                        <button className="text-red-600" onClick={async ()=>{await api.del(`/transactions/${t.id}`); loadAll()}}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 rounded border bg-white">
        <h3 className="font-semibold mb-4">Budgets</h3>
        <div className="grid gap-4">
          {categories.map(c => {
            const spent = transactions.filter(t => t.type === 'expense' && t.category === c.id).reduce((s, t) => s + t.amount, 0)
            const budget = budgetFor(c.id)
            const pct = Math.min(100, budget ? Math.round((spent / budget) * 100) : 0)
            const exceeded = budget && spent > budget
            return (
              <div key={c.id}>
                <div className="flex justify-between text-sm">
                  <span>{c.category_name}</span>
                  <span className={exceeded ? 'text-expense' : ''}>{formatMoney(spent)} / {formatMoney(budget || 0)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded h-2 mt-1">
                  <div className={`h-2 rounded ${exceeded ? 'bg-expense' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ title, value, color }) {
  return (
    <div className="p-4 rounded border bg-white">
      <div className="text-sm text-gray-600">{title}</div>
      <div className={`text-2xl font-semibold ${color || ''}`}>{value}</div>
    </div>
  )
}

function formatMoney(v) {
  const n = Number(v || 0)
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

