/**
 * KOSHK SKATE ERP — Products Types
 * Phase 11 — Sales POS
 */

export interface ProductCategoryDTO {
  id: number
  name: string
  nameAr: string
}

export interface CreateProductCategoryDTO {
  name: string
  nameAr: string
}

export interface ProductDTO {
  id: number
  name: string
  nameAr: string
  categoryId: number
  barcode: string | null
  price: number
  stockQuantity: number
  isActive: boolean
}

export interface CreateProductDTO {
  name: string
  nameAr: string
  categoryId: number
  barcode?: string
  price: number
  stockQuantity?: number
}

export interface UpdateProductDTO {
  name?: string
  nameAr?: string
  categoryId?: number
  barcode?: string | null
  price?: number
  stockQuantity?: number
  isActive?: boolean
}
