import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Trash2, Package, Upload, Download, FileSpreadsheet, Check } from 'lucide-react'
import * as XLSX from 'xlsx'

type ProductRow = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  stock_count: number
}

export default function ProductsView() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bulkStatus, setBulkStatus] = useState<{ total: number; done: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Single product form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [stock, setStock] = useState('100')

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (data) setProducts(data)
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('products').insert({
      name, description: description || null, price: parseFloat(price),
      image_url: imageUrl || null, stock_count: parseInt(stock),
    })
    if (err) { setError(err.message) } else {
      setShowAdd(false); resetForm(); await loadProducts()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    await loadProducts()
  }

  function resetForm() {
    setName(''); setDescription(''); setPrice(''); setImageUrl(''); setStock('100')
  }

  // ============= TEMPLATE DOWNLOAD =============
  function downloadTemplate() {
    const template = [
      { name: 'Example Product', description: 'Short description', price: 999, image_url: 'https://example.com/image.jpg', stock_count: 50 },
      { name: 'Another Product', description: 'Another description', price: 1499, image_url: '', stock_count: 100 },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    // Set column widths
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 45 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Products')
    XLSX.writeFile(wb, 'products_template.xlsx')
  }

  // ============= BULK UPLOAD =============
  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setShowBulk(true)
    setBulkStatus({ total: 0, done: 0, errors: [] })

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet)

      if (rows.length === 0) {
        setBulkStatus({ total: 0, done: 0, errors: ['File is empty or has no valid rows.'] })
        return
      }

      setBulkStatus({ total: rows.length, done: 0, errors: [] })
      const errors: string[] = []
      let done = 0

      // Validate and insert
      const validProducts = []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row.name || !row.price) {
          errors.push(`Row ${i + 2}: Missing "name" or "price"`)
          continue
        }
        validProducts.push({
          name: String(row.name).trim(),
          description: row.description ? String(row.description).trim() : null,
          price: parseFloat(row.price),
          image_url: row.image_url ? String(row.image_url).trim() : null,
          stock_count: row.stock_count ? parseInt(row.stock_count) : 0,
        })
      }

      if (validProducts.length > 0) {
        // Insert in batches of 50
        for (let i = 0; i < validProducts.length; i += 50) {
          const batch = validProducts.slice(i, i + 50)
          const { error: insertErr } = await supabase.from('products').insert(batch)
          if (insertErr) {
            errors.push(`Batch starting row ${i + 2}: ${insertErr.message}`)
          }
          done += batch.length
          setBulkStatus({ total: rows.length, done, errors: [...errors] })
        }
      }

      setBulkStatus({ total: rows.length, done: validProducts.length, errors })
      await loadProducts()
    } catch (err: any) {
      setBulkStatus({ total: 0, done: 0, errors: [err.message || 'Failed to parse file'] })
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products ({products.length})</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your product catalog.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold shadow-sm flex items-center hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4 mr-2" /> Template
          </button>
          <label className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold shadow-sm flex items-center hover:bg-gray-50 transition-colors cursor-pointer text-sm">
            <Upload className="w-4 h-4 mr-2" /> Bulk Upload
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleBulkUpload} />
          </label>
          <button onClick={() => setShowAdd(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm flex items-center transition-colors text-sm">
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </button>
        </div>
      </div>

      {/* Bulk Upload Status */}
      {showBulk && bulkStatus && (
        <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <FileSpreadsheet className="w-5 h-5 text-primary-600 mr-2" />
              <h3 className="font-bold text-gray-900">Bulk Upload Progress</h3>
            </div>
            <button onClick={() => setShowBulk(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
            <div className="bg-primary-500 h-2.5 rounded-full transition-all" style={{ width: `${bulkStatus.total > 0 ? (bulkStatus.done / bulkStatus.total) * 100 : 0}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{bulkStatus.done} of {bulkStatus.total} products uploaded</span>
            {bulkStatus.done === bulkStatus.total && bulkStatus.errors.length === 0 && (
              <span className="text-emerald-600 font-semibold flex items-center"><Check className="w-4 h-4 mr-1" /> Complete!</span>
            )}
          </div>
          {bulkStatus.errors.length > 0 && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Errors:</p>
              {bulkStatus.errors.map((err, i) => <p key={i} className="text-xs text-red-600">{err}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Add Product</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Premium Headphones" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Product description..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="999" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                  <input required type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="https://..." />
              </div>
              <button type="submit" disabled={saving} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-70">
                {saving ? 'Saving...' : 'Add Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Products list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">No products yet.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setShowAdd(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Add Single Product</button>
            <button onClick={downloadTemplate} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center"><Download className="w-4 h-4 mr-1.5" /> Download Template</button>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="p-4 text-sm font-semibold text-gray-600">Product</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Price</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Stock</th>
                <th className="p-4 text-sm font-semibold text-gray-600 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg mr-3 overflow-hidden flex-shrink-0">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{product.description || 'No description'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-semibold text-gray-900">₹{Number(product.price).toLocaleString()}</td>
                  <td className="p-4 text-sm text-gray-600">{product.stock_count}</td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
