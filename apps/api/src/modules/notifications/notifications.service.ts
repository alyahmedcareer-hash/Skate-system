import { db } from '../../db/connection.js'
import { rentals } from '../../db/schema/rentals.js'
import { customers } from '../../db/schema/customers.js'
import { skates } from '../../db/schema/skates.js'
import { eq } from 'drizzle-orm'

export const ENDING_SOON_WINDOW_SECONDS = 75

export const notificationsService = {
  getNotifications: async () => {
    // 1. Fetch active rentals with relations
    const activeRentals = await db
      .select({
        rental: rentals,
        customer: customers,
        skate: skates,
      })
      .from(rentals)
      .innerJoin(customers, eq(rentals.customerId, customers.id))
      .innerJoin(skates, eq(rentals.skateId, skates.id))
      .where(eq(rentals.status, 'active'))

    const now = new Date().getTime()
    const notifications: any[] = []

    for (const row of activeRentals) {
      const expectedEnd = row.rental.expectedEndAt.getTime()
      const remainingTime = Math.floor((expectedEnd - now) / 1000) // seconds

      let type: string | null = null
      let textAr = ''

      if (remainingTime <= 0) {
        type = 'EXPIRED'
        textAr = 'الإيجار انتهى'
      } else if (remainingTime <= ENDING_SOON_WINDOW_SECONDS) {
        type = 'ENDING_SOON'
        textAr = 'الإيجار ينتهي قريبًا'
      }

      if (type) {
        notifications.push({
          rentalId: row.rental.id,
          customer: {
            id: row.customer.id,
            name: row.customer.name,
          },
          skate: {
            id: row.skate.id,
            skateCode: row.skate.skateCode,
          },
          expectedEndTime: row.rental.expectedEndAt.toISOString(),
          remainingTime,
          type,
          textAr,
        })
      }
    }

    return notifications
  }
}
