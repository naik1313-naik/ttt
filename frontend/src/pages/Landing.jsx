import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div>
      <section className="gradient-hero">
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight">SmartSpend</h1>
          <p className="mt-4 text-xl text-gray-700">Track Every Rupee. Control Your Future.</p>
          <div className="mt-8 flex gap-4 justify-center">
            <Link to="/register" className="px-6 py-3 rounded bg-primary text-white">Get Started</Link>
            <Link to="/login" className="px-6 py-3 rounded border">Login</Link>
          </div>
        </div>
      </section>
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-semibold">Features</h2>
          <div className="grid md:grid-cols-4 gap-6 mt-6">
            {[
              { title: 'Real-Time Expense Tracking' },
              { title: 'Smart Budget Management' },
              { title: 'Financial Analytics Dashboard' },
              { title: 'Secure Data Storage' },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-lg border bg-white">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm mt-2 text-gray-600">Clean UI with animations and gradients.</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-semibold">What our users say</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {['Life saver!', 'Amazing insights', 'Beautiful and fast'].map((t, i) => (
              <div key={i} className="p-6 rounded-lg border">
                <p className="text-gray-700">“{t}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
