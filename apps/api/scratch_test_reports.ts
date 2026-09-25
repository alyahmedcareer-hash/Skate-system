import { db } from './src/db/connection.js'
import { sql } from 'drizzle-orm'
import { users } from './src/db/schema/users.js'
import { customers } from './src/db/schema/customers.js'
import { skates } from './src/db/schema/skates.js'
import { rentals } from './src/db/schema/rentals.js'
import { treasuryMovements, rentalPayments, treasuryAccounts, paymentMethods } from './src/db/schema/payments.js'
import { expenses, cashierShifts } from './src/db/schema/treasury.js'
import { damageReports } from './src/db/schema/damages.js'
import { maintenanceRecords } from './src/db/schema/maintenance.js'
import * as reports from './src/modules/reports/reports.service.js'

async function run() {
  console.log('--- Cleaning DB ---')
  await db.delete(rentalPayments)
  await db.delete(treasuryMovements)
  await db.delete(paymentMethods)
  await db.delete(treasuryAccounts)
  await db.delete(expenses)
  await db.delete(damageReports)
  await db.delete(maintenanceRecords)
  await db.delete(rentals)
  await db.delete(cashierShifts)
  await db.delete(skates)
  await db.delete(customers)
  await db.delete(users)

  console.log('--- Seeding Data ---')
  
  const [uHeader] = await db.insert(users).values({
    name: 'Test Cashier', email: 'test@cashier.com', passwordHash: 'hash', isActive: true
  })
  const userId = uHeader.insertId

  const [tAccH] = await db.insert(treasuryAccounts).values({ name: 'Main', nameAr: 'رئيسي' })
  const tAccId = tAccH.insertId

  const [pMethH] = await db.insert(paymentMethods).values({ name: 'Cash', nameAr: 'كاش', treasuryAccountId: tAccId })
  const pMethId = pMethH.insertId

  const [sHeader] = await db.insert(cashierShifts).values({
    cashierId: userId, openedAt: new Date('2026-09-01T09:00:00Z'), status: 'active', openingBalance: '100'
  })
  const shiftId = sHeader.insertId

  const [c1H] = await db.insert(customers).values({ name: 'Customer 1', phone: '0101', nationalId: '111', registrationDate: '2026-09-01' })
  const custId1 = c1H.insertId

  const [c2H] = await db.insert(customers).values({ name: 'Customer 2', phone: '0102', nationalId: '222', registrationDate: '2026-09-01' })
  const custId2 = c2H.insertId

  const [sk1H] = await db.insert(skates).values({ skateCode: 'SK-01', brand: 'B1', model: 'M1', size: 40, color: 'Red', status: 'available' })
  const skateId1 = sk1H.insertId

  const [sk2H] = await db.insert(skates).values({ skateCode: 'SK-02', brand: 'B2', model: 'M2', size: 42, color: 'Blue', status: 'available' })
  const skateId2 = sk2H.insertId

  const [r1H] = await db.insert(rentals).values({
    skateId: skateId1, customerId: custId1, shiftId: shiftId, cashierId: userId, durationMinutes: 30, pricePerHour: '100.00', rentalAmount: '50.00', status: 'returned',
    startedAt: new Date('2026-09-01T10:00:00Z'), expectedEndAt: new Date('2026-09-01T10:30:00Z'), returnedAt: new Date('2026-09-01T10:25:00Z'), rentalCode: 'R-01'
  })
  const r1Id = r1H.insertId

  await db.insert(treasuryMovements).values({
    shiftId, treasuryAccountId: tAccId, cashierId: userId, type: 'in', referenceType: 'rental_payment', amount: '50.00', referenceId: r1Id, createdAt: new Date('2026-09-01T10:00:00Z')
  })

  const [r2H] = await db.insert(rentals).values({
    skateId: skateId2, customerId: custId2, shiftId, cashierId: userId, durationMinutes: 60, pricePerHour: '100.00', rentalAmount: '100.00', status: 'returned',
    startedAt: new Date('2026-09-01T11:00:00Z'), expectedEndAt: new Date('2026-09-01T12:00:00Z'), returnedAt: new Date('2026-09-01T12:30:00Z'), rentalCode: 'R-02'
  })
  const r2Id = r2H.insertId

  await db.insert(treasuryMovements).values({
    shiftId, treasuryAccountId: tAccId, cashierId: userId, type: 'in', referenceType: 'rental_payment', amount: '100.00', referenceId: r2Id, createdAt: new Date('2026-09-01T11:00:00Z')
  })

  await db.insert(rentalPayments).values({
    rentalId: r2Id, paymentMethodId: pMethId, cashierId: userId, amount: '20.00', paymentType: 'late_fee', createdAt: new Date('2026-09-01T12:30:00Z')
  })
  
  await db.insert(treasuryMovements).values({
    shiftId, treasuryAccountId: tAccId, cashierId: userId, type: 'in', referenceType: 'late_fee_payment', amount: '20.00', referenceId: r2Id, createdAt: new Date('2026-09-01T12:30:00Z')
  })

  await db.insert(expenses).values({
    shiftId, cashierId: userId, categoryId: null, amount: '30.00', description: 'Fix', createdAt: new Date('2026-09-01T13:00:00Z')
  })

  console.log('--- Testing Reports ---')
  const filters = { startDate: '2026-09-01', endDate: '2026-09-01', page: 1, limit: 10 }
  
  const overview = await reports.getOverviewReport(filters)
  console.log('Overview:', overview)

  const ops = await reports.getOperatingFinancialReport(filters)
  console.log('Ops:', ops)

  const cashiers = await reports.getCashierReport(filters)
  console.log('Cashiers:', cashiers.data)

  const custReport = await reports.getCustomerReport(filters)
  console.log('Customers:', custReport.data)

  const skateReport = await reports.getSkatePerformanceReport(filters)
  console.log('Skates:', skateReport.data)

  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
