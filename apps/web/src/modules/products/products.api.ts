import { api } from '../../services/api'

export interface ProductCategory {
  id: number
  name: string
  nameAr: string
}

export interface Product {
  id: number
  name: string
  nameAr: string
  categoryId: number
  barcode: string | null
  price: number
  stockQuantity: number
  isActive: boolean
}

export const productsApi = {
  // Categories
  getCategories: () => api.get<{ success: boolean; data: ProductCategory[] }>('/api/v1/products/categories'),
  createCategory: (data: { name: string; nameAr: string }) => api.post<{ success: boolean; data: ProductCategory }>('/api/v1/products/categories', data),
  updateCategory: (id: number, data: { name: string; nameAr: string }) => api.put<{ success: boolean; data: ProductCategory }>(`/api/v1/products/categories/${id}`, data),

  // Products
  getProducts: () => api.get<{ success: boolean; data: Product[] }>('/api/v1/products'),
  getProduct: (id: number) => api.get<{ success: boolean; data: Product }>(`/api/v1/products/${id}`),
  createProduct: (data: Partial<Product>) => api.post<{ success: boolean; data: Product }>('/api/v1/products', data),
  updateProduct: (id: number, data: Partial<Product>) => api.put<{ success: boolean; data: Product }>(`/api/v1/products/${id}`, data),
}
