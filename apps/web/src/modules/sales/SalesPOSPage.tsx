import { useState, useEffect, useMemo, useRef } from 'react'
import { ShoppingCart, Plus, Minus, X, Loader2, Search, PackageOpen, AlertCircle } from 'lucide-react'
import { productsApi, type Product, type ProductCategory } from '../products/products.api'
import { salesApi } from './sales.api'
import { paymentsService, type PaymentMethodDTO } from '../payments/payments.service'
import { Button, useToast } from '../../components/ui'

interface CartItem extends Product {
  cartQuantity: number
}

interface PaymentRow {
  methodId: number
  amount: string
}

export default function SalesPOSPage() {
  const { showToast } = useToast()
  
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDTO[]>([])
  
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  
  const [payments, setPayments] = useState<PaymentRow[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      const [pRes, cRes, pmRes] = await Promise.all([
        productsApi.getProducts(),
        productsApi.getCategories(),
        paymentsService.listMethods()
      ])
      // Filter out inactive products
      setProducts(pRes.data.filter((p: any) => p.isActive))
      setCategories(cRes.data)
      setPaymentMethods(pmRes.data.filter((pm: any) => pm.isActive))
    } catch {
      setError('حدث خطأ أثناء تحميل بيانات نقطة البيع')
    } finally {
      setLoading(false)
    }
  }

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0), [cart])
  const paymentsTotal = useMemo(() => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0), [payments])
  const remaining = cartTotal - paymentsTotal

  const filteredProducts = products.filter(p => {
    if (activeCategory && p.categoryId !== activeCategory) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return p.nameAr.toLowerCase().includes(term) || p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.includes(term))
    }
    return true
  })

  function addToCart(product: Product) {
    if (product.stockQuantity <= 0) {
      showToast({ type: 'error', title: 'المنتج غير متوفر في المخزون' })
      return
    }

    setCart(prev => {
      const existing = prev.find(p => p.id === product.id)
      if (existing) {
        if (existing.cartQuantity >= product.stockQuantity) {
          showToast({ type: 'error', title: 'لا يمكن تجاوز المخزون المتوفر' })
          return prev
        }
        return prev.map(p => p.id === product.id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p)
      }
      return [...prev, { ...product, cartQuantity: 1 }]
    })
  }

  function updateCartQuantity(id: number, delta: number) {
    setCart(prev => {
      return prev.map(p => {
        if (p.id !== id) return p
        const newQ = p.cartQuantity + delta
        if (newQ > p.stockQuantity) {
          showToast({ type: 'error', title: 'لا يمكن تجاوز المخزون المتوفر' })
          return p
        }
        if (newQ <= 0) return p // use remove for 0
        return { ...p, cartQuantity: newQ }
      })
    })
  }

  function removeFromCart(id: number) {
    setCart(prev => prev.filter(p => p.id !== id))
  }

  function addPaymentRow() {
    if (paymentMethods.length === 0) return
    const defaultMethod = paymentMethods[0]
    setPayments([...payments, { methodId: defaultMethod.id, amount: remaining > 0 ? remaining.toString() : '' }])
  }

  function updatePaymentRow(index: number, field: keyof PaymentRow, value: string | number) {
    const newPayments = [...payments]
    if (field === 'methodId') {
      const method = paymentMethods.find(m => m.id === Number(value))
      newPayments[index] = { ...newPayments[index], methodId: method!.id }
    } else {
      newPayments[index] = { ...newPayments[index], [field]: value as string }
    }
    setPayments(newPayments)
  }

  function removePaymentRow(index: number) {
    setPayments(payments.filter((_, i) => i !== index))
  }

  async function handleCompleteSale() {
    if (cart.length === 0) return showToast({ type: 'error', title: 'السلة فارغة' })
    if (payments.length === 0) return showToast({ type: 'error', title: 'يجب إضافة طريقة دفع واحدة على الأقل' })
    if (Math.abs(cartTotal - paymentsTotal) > 0.01) return showToast({ type: 'error', title: 'إجمالي المدفوعات لا يساوي قيمة الفاتورة' })
    if (payments.some(p => parseFloat(p.amount) <= 0 || isNaN(parseFloat(p.amount)))) {
      return showToast({ type: 'error', title: 'يوجد مبالغ دفع غير صحيحة' })
    }

    try {
      setSubmitting(true)
      const res = await salesApi.createSale({
        items: cart.map(c => ({ productId: c.id, quantity: c.cartQuantity })),
        payments: payments.map(p => ({
          paymentMethodId: p.methodId,
          amount: parseFloat(p.amount)
        }))
      })
      showToast({ type: 'success', title: `تم إنشاء الفاتورة بنجاح: ${res.data.saleCode}` })
      setCart([])
      setPayments([])
      fetchData() // refresh stock
    } catch (err: any) {
      showToast({ type: 'error', title: err.response?.data?.error?.message || 'فشل إنشاء الفاتورة' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !products.length) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-var(--header-height))]">
        <Loader2 className="animate-spin text-neutral-400" size={32} />
      </div>
    )
  }

  if (error && !products.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-var(--header-height))] text-danger-600 p-8">
        <AlertCircle size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-semibold">{error}</p>
        <Button onClick={() => { fetchedRef.current = false; fetchData() }} className="mt-4" variant="secondary">إعادة المحاولة</Button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] bg-neutral-100/50 w-full max-w-full overflow-hidden">
      {/* Main Product Area */}
      <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 overflow-hidden">
        
        {/* Search & Categories Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
          <div className="relative w-full md:w-72 lg:w-96 shrink-0">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder="البحث برقم الباركود أو اسم المنتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input w-full pr-10 py-2.5 shadow-sm bg-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar flex-1 items-center">
            <Button 
              variant={activeCategory === null ? 'primary' : 'secondary'} 
              size="sm" 
              onClick={() => setActiveCategory(null)}
              className="shrink-0 h-10 px-4"
            >
              الكل
            </Button>
            {categories.map(c => (
              <Button 
                key={c.id} 
                variant={activeCategory === c.id ? 'primary' : 'secondary'} 
                size="sm"
                onClick={() => setActiveCategory(c.id)}
                className="shrink-0 h-10 px-4"
              >
                {c.nameAr}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 bg-white rounded-xl border border-dashed border-border p-8">
              <PackageOpen size={64} className="mb-4 opacity-30" />
              <p className="text-xl font-bold text-slate-700">لا توجد منتجات</p>
              <p className="text-base mt-2 text-slate-500">أضف منتجات أولاً من صفحة المنتجات لبدء البيع.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-neutral-400 bg-white rounded-xl border border-dashed border-border p-8">
              <PackageOpen size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-medium text-slate-600">لا توجد منتجات مطابقة للبحث أو الفئة المحددة</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(p => {
                const outOfStock = p.stockQuantity <= 0
                return (
                  <button 
                    key={p.id} 
                    className={`flex flex-col items-stretch text-right bg-white border border-border shadow-sm p-3 rounded-xl transition-all ${
                      outOfStock 
                        ? 'opacity-50 grayscale cursor-not-allowed' 
                        : 'hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-95'
                    }`}
                    onClick={() => {
                      if (!outOfStock) addToCart(p)
                    }}
                    disabled={outOfStock}
                  >
                    <div className="aspect-[4/3] bg-neutral-50 rounded-lg mb-3 flex items-center justify-center group">
                      <ShoppingCart className={`text-neutral-300 ${!outOfStock && 'group-hover:text-blue-400 transition-colors'}`} size={32} />
                    </div>
                    <h4 className="font-semibold text-sm text-slate-800 line-clamp-2 leading-tight mb-2 h-9 flex items-start" title={p.nameAr}>
                      {p.nameAr}
                    </h4>
                    <div className="flex justify-between items-end mt-auto pt-1">
                      <span className="text-blue-700 font-bold text-base" dir="ltr">{p.price} ج.م</span>
                      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{p.stockQuantity} متوفر</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Current Order / Cart Panel */}
      <div className="w-[360px] lg:w-[400px] shrink-0 bg-white border-r border-border shadow-xl flex flex-col z-10 relative">
        {/* Cart Header */}
        <div className="p-4 border-b border-border bg-slate-800 text-white flex justify-between items-center shrink-0">
          <h3 className="font-semibold flex items-center gap-2 text-lg">
            <ShoppingCart size={20} /> السلة الحالية
          </h3>
          <span className="bg-slate-700 px-2.5 py-1 rounded-full text-xs font-bold shadow-inner">
            {cart.reduce((s, i) => s + i.cartQuantity, 0)} عنصر
          </span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart size={48} className="opacity-20 mb-3" />
              <p className="font-medium">السلة فارغة</p>
              <p className="text-sm mt-1 opacity-70">قم بإضافة منتجات للبدء</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="flex flex-col gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm relative group transition-all hover:border-slate-300">
              <div className="flex justify-between items-start gap-2 pr-6">
                <span className="font-semibold text-sm text-slate-800 leading-tight">{item.nameAr}</span>
                <span className="font-bold text-slate-800 shrink-0" dir="ltr">{item.price * item.cartQuantity} ج.م</span>
                <button 
                  onClick={() => removeFromCart(item.id)} 
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex justify-between items-center mt-1">
                <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                  <button onClick={() => updateCartQuantity(item.id, -1)} className="text-slate-500 hover:bg-white hover:text-slate-900 rounded p-1.5 transition-colors shadow-sm"><Minus size={14} /></button>
                  <span className="text-sm font-bold w-8 text-center text-slate-800">{item.cartQuantity}</span>
                  <button onClick={() => updateCartQuantity(item.id, 1)} className="text-slate-500 hover:bg-white hover:text-slate-900 rounded p-1.5 transition-colors shadow-sm"><Plus size={14} /></button>
                </div>
                <span className="text-xs font-medium text-slate-500">{item.price} ج.م / وحدة</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals & Payment Section */}
        <div className="shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center text-lg font-bold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span>الإجمالي:</span>
              <span className="text-blue-700 text-xl" dir="ltr">{cartTotal} ج.م</span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-slate-700">المدفوعات</span>
                <Button variant="secondary" size="sm" onClick={addPaymentRow} disabled={remaining <= 0} className="h-8">
                  <Plus size={14} className="mr-1.5" /> إضافة دفعة
                </Button>
              </div>

              <div className="flex flex-col gap-2 mb-3">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex gap-2 items-center group">
                    <select className="form-input text-sm flex-1 bg-slate-50 border-slate-200 shadow-none h-9" value={p.methodId} onChange={e => updatePaymentRow(idx, 'methodId', parseInt(e.target.value))}>
                      {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                    </select>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={p.amount} 
                      onChange={(e: any) => updatePaymentRow(idx, 'amount', e.target.value)}
                      placeholder="المبلغ"
                      className="form-input text-sm w-24 bg-slate-50 border-slate-200 shadow-none h-9 font-mono"
                      dir="ltr"
                    />
                    <button onClick={() => removePaymentRow(idx)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"><X size={16}/></button>
                  </div>
                ))}
              </div>

              {payments.length > 0 && (
                <div className={`flex justify-between items-center text-sm font-bold p-3 rounded-lg border ${Math.abs(remaining) < 0.01 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  <span>المتبقي:</span>
                  <span dir="ltr">{remaining.toFixed(2)} ج.م</span>
                </div>
              )}
            </div>

            <Button 
              className="w-full py-6 text-lg font-bold shadow-md hover:shadow-lg mt-2" 
              onClick={handleCompleteSale} 
              disabled={submitting || cart.length === 0 || Math.abs(remaining) > 0.01}
            >
              {submitting ? <Loader2 className="animate-spin" /> : 'إتمام البيع'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
