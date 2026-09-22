import { useState, useEffect } from 'react'
import { Plus, Edit, Loader2 } from 'lucide-react'
import { productsApi, type Product, type ProductCategory } from './products.api'
import { Button, Input, useToast } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'

export default function ProductsPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('products.manage')
  const { showToast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [newCatName, setNewCatName] = useState('')
  const [newCatNameAr, setNewCatNameAr] = useState('')

  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    categoryId: '',
    price: '',
    stockQuantity: '',
    barcode: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [pRes, cRes] = await Promise.all([
        productsApi.getProducts(),
        productsApi.getCategories()
      ])
      setProducts(pRes.data)
      setCategories(cRes.data)
    } catch {
      showToast({ type: 'error', title: 'حدث خطأ أثناء تحميل المنتجات' })
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
      setShowProductForm(false)
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
    setShowProductForm(true)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header"><div className="page-header-text"><h1 className="page-header-title">المنتجات</h1></div></div>
        <div className="flex items-center justify-center p-8 text-neutral-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">المنتجات</h1>
        </div>
        {canManage && (
          <Button onClick={() => {
            setEditingProductId(null)
            setFormData({ name: '', nameAr: '', categoryId: '', price: '', stockQuantity: '', barcode: '' })
            setShowProductForm(!showProductForm)
          }}>
            <Plus size={16} className="mr-2" />
            إضافة منتج
          </Button>
        )}
      </div>

      {showProductForm && (
        <div className="card p-4 mb-4">
          <h3 className="text-lg font-semibold mb-4 text-navy-800">{editingProductId ? 'تعديل منتج' : 'منتج جديد'}</h3>
          <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input id="name" label="الاسم (EN)" required value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} />
            <Input id="nameAr" label="الاسم (AR)" required value={formData.nameAr} onChange={(e: any) => setFormData({ ...formData, nameAr: e.target.value })} />
            
            <div className="form-group">
              <label className="form-label">الفئة</label>
              <select className="form-input" required value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}>
                <option value="">اختر الفئة...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
              </select>
            </div>

            <Input id="price" label="السعر" type="number" step="0.01" min="0" required value={formData.price} onChange={(e: any) => setFormData({ ...formData, price: e.target.value })} />
            <Input id="stockQuantity" label="الرصيد الافتتاحي / الحالي" type="number" min="0" required value={formData.stockQuantity} onChange={(e: any) => setFormData({ ...formData, stockQuantity: e.target.value })} />
            <Input id="barcode" label="الباركود (اختياري)" value={formData.barcode} onChange={(e: any) => setFormData({ ...formData, barcode: e.target.value })} />

            <div className="col-span-full flex gap-2 justify-end mt-2">
              <Button type="button" variant="ghost" onClick={() => setShowProductForm(false)}>إلغاء</Button>
              <Button type="submit">حفظ المنتج</Button>
            </div>
          </form>
        </div>
      )}

      {canManage && (
        <div className="card p-4 mb-4 bg-neutral-50/50">
          <h4 className="text-sm font-semibold mb-2 text-navy-800">إضافة فئة جديدة</h4>
          <form onSubmit={handleAddCategory} className="flex gap-2 items-end">
            <div className="flex-1"><Input id="newCatNameAr" label="اسم الفئة (AR)" placeholder="اسم الفئة (AR)" value={newCatNameAr} onChange={(e: any) => setNewCatNameAr(e.target.value)} required /></div>
            <div className="flex-1"><Input id="newCatName" label="اسم الفئة (EN)" placeholder="اسم الفئة (EN)" value={newCatName} onChange={(e: any) => setNewCatName(e.target.value)} required /></div>
            <Button type="submit" variant="secondary"><Plus size={16} /></Button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>اسم المنتج</th>
                <th>الفئة</th>
                <th>السعر</th>
                <th>المخزون المتوفر</th>
                {canManage && <th className="text-left">الإجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-neutral-400">لا توجد منتجات</td>
                </tr>
              ) : products.map(product => {
                const category = categories.find(c => c.id === product.categoryId)
                return (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.nameAr}</td>
                    <td>{category?.nameAr || '-'}</td>
                    <td>{product.price} ج.م</td>
                    <td>
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${product.stockQuantity > 0 ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'}`}>
                        {product.stockQuantity}
                      </span>
                    </td>
                    {canManage && (
                      <td className="text-left">
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
    </div>
  )
}
