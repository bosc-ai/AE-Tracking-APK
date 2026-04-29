import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCart, type Product } from '../../contexts/CartContext'
import { Plus, Check } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const { addToCart } = useCart()

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .gt('stock_count', 0)
      .order('created_at', { ascending: false })

    if (data && !error) {
      setProducts(data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: Number(p.price),
        image_url: p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop',
      })))
    }
    setLoading(false)
  }

  const handleAdd = (product: Product) => {
    addToCart(product)
    setAddedIds(prev => new Set(prev).add(product.id))
    setTimeout(() => setAddedIds(prev => {
      const next = new Set(prev)
      next.delete(product.id)
      return next
    }), 1200)
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-accent rounded-2xl p-6 text-white shadow-lg shadow-primary-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Welcome!</h2>
          <p className="text-primary-100 text-sm mb-4">Browse products and place your order.</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Products</h3>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-2 border border-gray-100 h-48"></div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No products available yet. Ask your admin to add products.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={product.id} 
                className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col group hover:shadow-xl hover:shadow-primary-500/10 transition-all"
              >
                <div className="aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">{product.name}</h4>
                <div className="mt-auto flex items-end justify-between">
                  <span className="font-bold text-primary-600">₹{product.price.toLocaleString()}</span>
                  <button 
                    onClick={() => handleAdd(product)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      addedIds.has(product.id)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white'
                    }`}
                  >
                    {addedIds.has(product.id) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
