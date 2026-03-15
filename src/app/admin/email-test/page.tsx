'use client'

import { useState } from 'react'

export default function EmailTest() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const sendTestEmail = async () => {
    if (!email) {
      setMessage('Please enter an email address')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ ' + data.message)
      } else {
        setMessage('❌ ' + data.error)
      }
    } catch (error) {
      setMessage('❌ Failed to send test email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Email Test</h1>
          <div className="bg-white py-8 px-4 shadow rounded-lg sm:px-10">
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Test Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email to test"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <button
                  onClick={sendTestEmail}
                  disabled={loading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {loading ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>

              {message && (
                <div className="p-3 text-sm bg-gray-100 border rounded-md">
                  {message}
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm">
                <h3 className="font-medium text-yellow-800 mb-2">Email Configuration:</h3>
                <p className="text-yellow-700 mb-2">
                  To enable email notifications, configure these environment variables in your <code>.env</code> file:
                </p>
                <ul className="text-yellow-700 space-y-1 text-xs">
                  <li>• <code>EMAIL_HOST</code> (e.g., smtp.gmail.com)</li>
                  <li>• <code>EMAIL_PORT</code> (e.g., 587)</li>
                  <li>• <code>EMAIL_USER</code> (your email address)</li>
                  <li>• <code>EMAIL_PASS</code> (your app password)</li>
                </ul>
                <p className="text-yellow-700 mt-2 text-xs">
                  For Gmail, you need to use an "App Password" instead of your regular password.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}