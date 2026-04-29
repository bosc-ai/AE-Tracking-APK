import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { User, Plus, X, Pencil, Eye, EyeOff, Trash2 } from 'lucide-react'

type Driver = {
  id: string
  full_name: string | null
  phone_number: string | null
}

export default function DriversView() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const [editDriver, setEditDriver] = useState<Driver | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [showEditPass, setShowEditPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  const [deleteDriverId, setDeleteDriverId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => { loadDrivers() }, [])

  async function loadDrivers() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_all_drivers')
    if (data && !error) {
      setDrivers(data.map((d: any) => ({
        id: d.id,
        full_name: d.full_name || 'Unnamed Driver',
        phone_number: d.phone_number || null,
      })))
    } else {
      console.error('loadDrivers error:', error?.message)
    }
    setLoading(false)
  }

  async function handleAddDriver(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError('')
    try {
      // Use a temporary Supabase client to avoid logging out the admin
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })

      const { data: authData, error: authErr } = await tempSupabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: { data: { full_name: newName, role: 'driver' } },
      })
      if (authErr) throw authErr
      if (!authData.user) throw new Error('Failed to create user')

      await supabase.rpc('update_driver_profile', {
        driver_id: authData.user.id,
        new_name: newName,
        new_phone: newPhone,
      })

      setShowAdd(false)
      setNewEmail(''); setNewPassword(''); setNewName(''); setNewPhone('')
      await loadDrivers()
    } catch (err: any) {
      setAddError(err.message || 'Failed to add driver')
    } finally {
      setAdding(false)
    }
  }

  function openEdit(driver: Driver) {
    setEditDriver(driver)
    setEditName(driver.full_name || '')
    setEditPhone(driver.phone_number || '')
    setEditPassword('')
    setEditError('')
    setEditSuccess('')
    setShowEditPass(false)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editDriver) return
    setSaving(true)
    setEditError('')
    setEditSuccess('')
    try {
      const { error: profileErr } = await supabase.rpc('update_driver_profile', {
        driver_id: editDriver.id,
        new_name: editName,
        new_phone: editPhone,
      })
      if (profileErr) throw profileErr

      if (editPassword.length >= 6) {
        const { error: passErr } = await supabase.rpc('update_driver_password', {
          driver_id: editDriver.id,
          new_password: editPassword,
        })
        if (passErr) throw passErr
      }

      setEditSuccess('Saved successfully!')
      await loadDrivers()
    } catch (err: any) {
      setEditError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(driverId: string) {
    setDeleteDriverId(driverId)
    setDeleteError('')
  }

  async function executeDelete() {
    if (!deleteDriverId) return
    setIsDeleting(true)
    setDeleteError('')
    
    try {
      const { error } = await supabase.rpc('delete_driver', {
        target_driver_id: deleteDriverId
      })
      if (error) throw error
      
      setDrivers(drivers.filter(d => d.id !== deleteDriverId))
      setDeleteDriverId(null)
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete driver.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Drivers ({drivers.length})</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your delivery fleet.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm flex items-center transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Driver
        </button>
      </div>

      {/* Add Driver Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Add New Driver</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {addError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{addError}</div>}
            <form onSubmit={handleAddDriver} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ravi Kumar" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input required type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="+91 90000 00000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login Email</label>
                <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="driver@company.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login Password</label>
                <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="min 6 characters" minLength={6} />
              </div>
              <button type="submit" disabled={adding} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-70">
                {adding ? 'Creating...' : 'Create Driver Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {editDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditDriver(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Edit Driver</h3>
              <button onClick={() => setEditDriver(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {editError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{editError}</div>}
            {editSuccess && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-3">{editSuccess}</div>}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                <input required type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="+91 90000 00000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span></label>
                <div className="relative">
                  <input
                    type={showEditPass ? 'text' : 'password'}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="min 6 characters"
                    minLength={editPassword ? 6 : undefined}
                  />
                  <button type="button" onClick={() => setShowEditPass(!showEditPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showEditPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditDriver(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-70">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDriverId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !isDeleting && setDeleteDriverId(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Driver</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this driver? This action cannot be undone and will remove all their access.
              </p>
              
              {deleteError && (
                <div className="w-full mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
                  {deleteError}
                </div>
              )}
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeleteDriverId(null)} 
                  disabled={isDeleting}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete} 
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-70 flex items-center justify-center"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drivers grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Loading drivers...</div>
      ) : drivers.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No drivers yet. Click "Add Driver" to onboard your first delivery partner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map(driver => (
            <div key={driver.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 leading-tight truncate">{driver.full_name}</h3>
                  <span className="text-xs text-gray-500">{driver.phone_number || 'No phone'}</span>
                </div>
                <button
                  onClick={() => openEdit(driver)}
                  className="ml-2 p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors flex-shrink-0"
                  title="Edit driver"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => confirmDelete(driver.id)}
                  className="ml-1 p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                  title="Delete driver"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-auto text-xs text-gray-400">ID: {driver.id.slice(0, 8)}...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
