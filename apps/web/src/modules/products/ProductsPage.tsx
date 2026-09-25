import { useState, useEffect, useRef } from 'react'
import { Plus, Edit, Loader2, Search, AlertCircle, Package } from 'lucide-react'
import { productsApi, type Product, type ProductCategory } from './products.api'
import { Button, Input, Modal, useToast } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'

export default function ProductsPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('products.manage')
  const { showToast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newCatName, setNewCatName] = useState('')
  const [newCatNameAr, setNewCatNameAr] = useState('')

  const [searchTerm, setSearchTerm] = useState('')

  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    categoryId: '',
    price: '',
    stockQuantity: '',
    barcode: ''
  })

  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchData()
    }
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const [pRes, cRes] = await Promise.all([
        productsApi.getProducts(),
        productsApi.getCategories()
      ])
      setProducts(pRes.data)
      setCategories(cRes.data)
    } catch {
      setError('حدث خطأ أثناء تحميل المنتجات. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName || !newCatNameAr) return
    try {
      await productsApi.createCategory({ name: newCatName, nameAr: newCatNameAr })
      showToast({ type: 'success', title: 'تمت إضافة الفئة بنجاح' })
      setNewCatName('')
      setNewCatNameAr('')
      fetchData()
    } catch {
      showToast({ type: 'error', title: 'خطأ في إضافة الفئة' })
    }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: formData.name,
      nameAr: formData.nameAr,
      categoryId: parseInt(formData.categoryId),
      price: parseFloat(formData.price),
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      barcode: formData.barcode || undefined
    }

    try {
      if (editingProductId) {
        await productsApi.updateProduct(editingProductId, payload)
        showToast({ type: 'success', title: 'تم تحديث المنتج بنجاح' })
      } else {
        await productsApi.createProduct(payload)
        showToast({ type: 'success', title: 'تمت إضافة المنتج بنجاح' })
      }
      setShowProductModal(false)
      setEditingProductId(null)
      fetchData()
      setFormData({ name: '', nameAr: '', categoryId: '', price: '', stockQuantity: '', barcode: '' })
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'STOCK_CANNOT_BE_NEGATIVE') {
        showToast({ type: 'error', title: 'رصيد المخزون لا يمكن أن يكون سالباً' })
      } else {
        showToast({ type: 'error', title: 'خطأ في حفظ المنتج' })
      }
    }
  }

  function editProduct(p: Product) {
    setEditingProductId(p.id)
    setFormData({
      name: p.name,
      nameAr: p.nameAr,
      categoryId: p.categoryId.toString(),
      price: p.price.toString(),
      stockQuantity: p.stockQuantity.toString(),
      barcode: p.barcode || ''
    })
    setShowProductModal(true)
  }

  const filteredProducts = products.filter(p => 
    p.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  )

  if (loading && !products.length) {
    return (
      <div className="page-container flex flex-col h-full">
        <div className="page-header shrink-0"><div className="page-header-text"><h1 className="page-header-title">المنتجات</h1></div></div>
        <div className="flex-1 flex items-center justify-center p-8 text-neutral-400 bg-white rounded-lg border border-border">
          <Loader2 className="animate-spin" size={32} />
        </div>
      </div>
    )
  }

  if (error && !products.length) {
    return (
      <div className="page-container flex flex-col h-full">
        <div className="page-header shrink-0"><div className="page-header-text"><h1 className="page-header-title">المنتجات</h1></div></div>
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-danger-600 bg-white rounded-lg border border-border">
           <AlertCircle size={48} className="mb-4 opacity-50" />
           <p className="text-lg font-semibold">{error}</p>
           <Button onClick={() => { fetchedRef.current = false; fetchData() }} className="mt-4" variant="secondary">إعادة المحاولة</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container flex flex-col h-full">
      <div className="page-header shrink-0">
        <div className="page-header-text">
          <h1 className="page-header-title">المنتجات</h1>
          <p className="text-sm text-neutral-500 mt-1">إدارة المنتجات وأرصدة المخزون والتصنيفات</p>
        </div>
        {canManage && (
          <Button onClick={() => {
            setEditingProductId(null)
            setFormData({ name: '', nameAr: '', categoryId: '', price: '', stockQuantity: '', barcode: '' })
            setShowProductModal(true)
          }}>
            <Plus size={16} className="mr-2" />
            إضافة منتج
          </Button>
        )}
      </div>

      {canManage && (
        <div className="bg-white rounded-lg border border-border p-4 mb-6 shadow-sm shrink-0">
          <h3 className="text-sm font-semibold mb-3 text-slate-800">إضافة فئة جديدة</h3>
          <form onSubmit={handleAddCategory} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <Input id="newCatNameAr" label="اسم الفئة بالعربي" placeholder="مثال: مشروبات" required value={newCatNameAr} onChange={(e: any) => setNewCatNameAr(e.target.value)} />
            </div>
            <div className="flex-1 w-full">
              <Input id="newCatName" label="اسم الفئة بالإنجليزي" placeholder="مثال: Beverages" required value={newCatName} onChange={(e: any) => setNewCatName(e.target.value)} />
            </div>
            <Button type="submit" variant="secondary" className="w-full md:w-auto h-10">
              <Plus size={16} className="ml-2" /> إضافة الفئة
            </Button>
          </form>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg border border-border shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-neutral-50/50 rounded-t-lg">
          <div className="relative w-full max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text" 
              placeholder="بحث في المنتجات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input w-full pr-9 text-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-0">
          <table className="w-full text-sm text-right border-collapse">
            <thead className="bg-neutral-50 sticky top-0 z-10 border-b border-border shadow-sm">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">الكود</th>
                <th className="px-4 py-3 font-semibold text-slate-700">اسم المنتج</th>
                <th className="px-4 py-3 font-semibold text-slate-700">الفئة</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">السعر</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap text-center">المخزون المتوفر</th>
                {canManage && <th className="px-4 py-3 font-semibold text-slate-700 w-24 text-center">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-12">
                    <div className="flex flex-col items-center justify-center text-neutral-400">
                      <Package size={48} className="mb-4 opacity-30" />
                      <p className="text-base font-medium">لا توجد منتجات مطابقة للبحث</p>
                      <p className="text-sm mt-1">أضف منتجاً جديداً للبدء</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.map(product => {
                const category = categories.find(c => c.id === product.categoryId)
                return (
                  <tr key={product.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500" dir="ltr">{product.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{product.nameAr}</td>
                    <td className="px-4 py-3 text-slate-600">{category?.nameAr || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-navy-700" dir="ltr">{product.price} ج.م</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${product.stockQuantity > 0 ? 'bg-success-50 text-success-700 border border-success-200' : 'bg-danger-50 text-danger-700 border border-danger-200'}`}>
                        {product.stockQuantity}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => editProduct(product)} title="تعديل">
                          <Edit size={16} />
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={showProductModal} 
        onClose={() => setShowProductModal(false)}
        title={editingProductId ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setShowProductModal(false)}>إلغاء</Button>
            <Button type="submit" form="product-form">حفظ المنتج</Button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <Input id="nameAr" label="الاسم بالعربي" required value={formData.nameAr} onChange={(e: any) => setFormData({ ...formData, nameAr: e.target.value })} />
          <Input id="name" label="الاسم بالإنجليزي" required value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} />
          
          <div className="form-group flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">الفئة</label>
            <select className="form-input" required value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}>
              <option value="">اختر الفئة...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </select>
          </div>

          <Input id="price" label="السعر (ج.م)" type="number" step="0.01" min="0" required value={formData.price} onChange={(e: any) => setFormData({ ...formData, price: e.target.value })} />
          <Input id="stockQuantity" label="المخزون" type="number" min="0" required value={formData.stockQuantity} onChange={(e: any) => setFormData({ ...formData, stockQuantity: e.target.value })} />
          <Input id="barcode" label="الباركود (اختياري)" value={formData.barcode} onChange={(e: any) => setFormData({ ...formData, barcode: e.target.value })} />
        </form>
      </Modal>
    </div>
  )
}
