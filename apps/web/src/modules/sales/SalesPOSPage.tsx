import { useState, useEffect, useMemo } from 'react'
import { ShoppingCart, Plus, Minus, X, Loader2 } from 'lucide-react'
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
  const [cart, setCart] = useState<CartItem[]>([])
  
  const [payments, setPayments] = useState<PaymentRow[]>([])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
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
      showToast({ type: 'error', title: 'حدث خطأ أثناء تحميل البيانات' })
    } finally {
      setLoading(false)
    }
  }

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0), [cart])
  const paymentsTotal = useMemo(() => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0), [payments])
  const remaining = cartTotal - paymentsTotal

  const filteredProducts = activeCategory 
    ? products.filter(p => p.categoryId === activeCategory)
    : products

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

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header"><div className="page-header-text"><h1 className="page-header-title">نقطة البيع (POS)</h1></div></div>
        <div className="flex items-center justify-center p-8 text-neutral-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      </div>
    )
  }

  return (
    <div className="page-container h-[calc(100vh-var(--header-height)-var(--space-6))]">
      <div className="flex gap-4 h-full">
        {/* Left: Products Grid */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-50 rounded-lg border border-border p-4">
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            <Button 
              variant={activeCategory === null ? 'primary' : 'secondary'} 
              size="sm" 
              onClick={() => setActiveCategory(null)}
              className="shrink-0"
            >
              الكل
            </Button>
            {categories.map(c => (
              <Button 
                key={c.id} 
                variant={activeCategory === c.id ? 'primary' : 'secondary'} 
                size="sm"
                onClick={() => setActiveCategory(c.id)}
                className="shrink-0"
              >
                {c.nameAr}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 content-start flex-1">
            {filteredProducts.map(p => {
              const outOfStock = p.stockQuantity <= 0
              return (
                <div 
                  key={p.id} 
                  className={`card p-3 cursor-pointer transition-transform hover:scale-105 ${outOfStock ? 'opacity-50 grayscale' : 'hover:border-gold-500'}`}
                  onClick={() => addToCart(p)}
                >
                  <div className="aspect-square bg-neutral-100 rounded-md mb-2 flex items-center justify-center">
                    <ShoppingCart className="text-neutral-300" size={32} />
                  </div>
                  <h4 className="font-semibold text-sm truncate" title={p.nameAr}>{p.nameAr}</h4>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-navy-700 font-bold">{p.price} ج.م</span>
                    <span className="text-xs text-neutral-500">{p.stockQuantity} متوفر</span>
                  </div>
                </div>
              )
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center p-8 text-neutral-400">لا توجد منتجات في هذه الفئة</div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="w-[380px] shrink-0 flex flex-col bg-white rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-navy-800 text-white flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><ShoppingCart size={18} /> تفاصيل الطلب</h3>
            <span className="bg-navy-700 px-2 py-0.5 rounded text-sm">{cart.length} عناصر</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {cart.length === 0 ? (
              <div className="text-center text-neutral-400 py-8">السلة فارغة</div>
            ) : cart.map(item => (
              <div key={item.id} className="flex flex-col gap-2 p-3 bg-neutral-50 rounded-md border border-neutral-100">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-sm">{item.nameAr}</span>
                  <button onClick={() => removeFromCart(item.id)} className="text-danger-500 hover:text-danger-700"><X size={16} /></button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 bg-white border border-border rounded-md px-2 py-1">
                    <button onClick={() => updateCartQuantity(item.id, -1)} className="text-neutral-500 hover:text-navy-800"><Minus size={14} /></button>
                    <span className="text-sm font-semibold w-4 text-center">{item.cartQuantity}</span>
                    <button onClick={() => updateCartQuantity(item.id, 1)} className="text-neutral-500 hover:text-navy-800"><Plus size={14} /></button>
                  </div>
                  <span className="font-bold text-navy-800">{item.price * item.cartQuantity} ج.م</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border bg-neutral-50 flex flex-col gap-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>الإجمالي:</span>
              <span className="text-gold-600">{cartTotal} ج.م</span>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-navy-800">المدفوعات</span>
                <Button variant="secondary" size="sm" onClick={addPaymentRow} disabled={remaining <= 0}>
                  <Plus size={14} className="mr-1" /> إضافة
                </Button>
              </div>

              <div className="flex flex-col gap-2 mb-2">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select className="form-input text-sm flex-1" value={p.methodId} onChange={e => updatePaymentRow(idx, 'methodId', parseInt(e.target.value))}>
                      {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                    </select>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={p.amount} 
                      onChange={(e: any) => updatePaymentRow(idx, 'amount', e.target.value)}
                      placeholder="المبلغ"
                      className="form-input text-sm w-24"
                    />
                    <button onClick={() => removePaymentRow(idx)} className="text-danger-500 p-1"><X size={16}/></button>
                  </div>
                ))}
              </div>

              {payments.length > 0 && (
                <div className={`flex justify-between items-center text-sm font-semibold p-2 rounded ${Math.abs(remaining) < 0.01 ? 'bg-success-100 text-success-800' : 'bg-warning-100 text-warning-800'}`}>
                  <span>المتبقي:</span>
                  <span dir="ltr">{remaining.toFixed(2)} ج.م</span>
                </div>
              )}
            </div>

            <Button 
              className="w-full py-6 text-lg" 
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
