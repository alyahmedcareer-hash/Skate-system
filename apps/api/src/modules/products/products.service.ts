import { eq, desc } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { productCategories, products } from '../../db/schema/products.js'
import { CreateProductCategoryDTO, ProductCategoryDTO, CreateProductDTO, UpdateProductDTO, ProductDTO } from './products.types.js'

export class ProductsService {
  // --- Categories ---
  static async listCategories(): Promise<ProductCategoryDTO[]> {
    const records = await db.select().from(productCategories)
    return records
  }

  static async createCategory(data: CreateProductCategoryDTO): Promise<ProductCategoryDTO> {
    const [result] = await db.insert(productCategories).values(data)
    const [record] = await db.select().from(productCategories).where(eq(productCategories.id, result.insertId)).limit(1)
    return record
  }

  static async getCategory(id: number): Promise<ProductCategoryDTO | null> {
    const [record] = await db.select().from(productCategories).where(eq(productCategories.id, id)).limit(1)
    return record || null
  }

  static async updateCategory(id: number, data: CreateProductCategoryDTO): Promise<ProductCategoryDTO | null> {
    const [record] = await db.select().from(productCategories).where(eq(productCategories.id, id)).limit(1)
    if (!record) return null
    await db.update(productCategories).set(data).where(eq(productCategories.id, id))
    const [updated] = await db.select().from(productCategories).where(eq(productCategories.id, id)).limit(1)
    return updated
  }

  // --- Products ---
  static async listProducts(): Promise<ProductDTO[]> {
    const records = await db.select().from(products).orderBy(desc(products.id))
    return records.map(this.mapToProductDTO)
  }

  static async getProduct(id: number): Promise<ProductDTO | null> {
    const [record] = await db.select().from(products).where(eq(products.id, id)).limit(1)
    if (!record) return null
    return this.mapToProductDTO(record)
  }

  static async createProduct(data: CreateProductDTO): Promise<ProductDTO> {
    const [result] = await db.insert(products).values({
      name: data.name,
      nameAr: data.nameAr,
      categoryId: data.categoryId,
      barcode: data.barcode || null,
      price: data.price.toString(),
      stockQuantity: data.stockQuantity || 0,
      isActive: true,
    })
    const [record] = await db.select().from(products).where(eq(products.id, result.insertId)).limit(1)
    return this.mapToProductDTO(record)
  }

  static async updateProduct(id: number, data: UpdateProductDTO): Promise<ProductDTO | null> {
    const [record] = await db.select().from(products).where(eq(products.id, id)).limit(1)
    if (!record) return null
    
    // DEC-Phase11: "Administrator may directly edit product stock_quantity from Product Management."
    // "Do not allow sales that would make product stock negative. stock must remain >= 0"
    if (data.stockQuantity !== undefined && data.stockQuantity < 0) {
      throw new Error('STOCK_CANNOT_BE_NEGATIVE')
    }

    const updates: any = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.nameAr !== undefined) updates.nameAr = data.nameAr
    if (data.categoryId !== undefined) updates.categoryId = data.categoryId
    if (data.barcode !== undefined) updates.barcode = data.barcode
    if (data.price !== undefined) updates.price = data.price.toString()
    if (data.stockQuantity !== undefined) updates.stockQuantity = data.stockQuantity
    if (data.isActive !== undefined) updates.isActive = data.isActive

    await db.update(products).set(updates).where(eq(products.id, id))
    const [updated] = await db.select().from(products).where(eq(products.id, id)).limit(1)
    return this.mapToProductDTO(updated)
  }

  private static mapToProductDTO(record: any): ProductDTO {
    return {
      id: record.id,
      name: record.name,
      nameAr: record.nameAr,
      categoryId: record.categoryId,
      barcode: record.barcode,
      price: parseFloat(record.price),
      stockQuantity: record.stockQuantity,
      isActive: record.isActive,
    }
  }
}
