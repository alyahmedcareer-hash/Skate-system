import { db } from './src/db/connection.js';
import { cashierShifts } from './src/db/schema/treasury.js';
import { treasuryMovements } from './src/db/schema/payments.js';
import { eq, sum, sql, and } from 'drizzle-orm';
import { calculateExpectedCashBalance } from './src/modules/shifts/shifts.service.js';

async function run() {
  console.log('--- Financial Scenarios Audit ---');

  // Scenario 1: Cash sale = 200
  await testScenario('Scenario 1: Cash sale = 200', [
    { type: 'in', accountId: 1, amount: 200 }
  ], 1200);

  // Scenario 2: Card sale = 200
  await testScenario('Scenario 2: Card sale = 200', [
    { type: 'in', accountId: 2, amount: 200 }
  ], 1000);

  // Scenario 3: Cash expense = 100
  await testScenario('Scenario 3: Cash expense = 100', [
    { type: 'out', accountId: 1, amount: 100 }
  ], 900);

  // Scenario 4: Mixed
  await testScenario('Scenario 4: Mixed', [
    { type: 'in', accountId: 1, amount: 200 },
    { type: 'in', accountId: 2, amount: 300 },
    { type: 'out', accountId: 1, amount: 100 }
  ], 1100);

  // Scenario 5: Cash refund = 50
  await testScenario('Scenario 5: Cash refund = 50', [
    { type: 'out', accountId: 1, amount: 50, referenceType: 'rental_refund' }
  ], 950);

  console.log('All Scenarios Passed.');
  process.exit(0);
}

async function testScenario(name: string, movements: any[], expected: number) {
  // Create dummy shift
  const [res] = await db.insert(cashierShifts).values({
    cashierId: 1,
    openingBalance: '1000',
    status: 'active'
  });
  const shiftId = (res as any).insertId;

  // Insert movements
  for (const m of movements) {
    await db.insert(treasuryMovements).values({
      type: m.type,
      amount: String(m.amount),
      treasuryAccountId: m.accountId,
      shiftId: shiftId,
      referenceType: m.referenceType || 'sale_payment',
      referenceId: 1,
      notes: 'Test',
      cashierId: 1
    });
  }

  const expectedCash = await calculateExpectedCashBalance(shiftId);
  console.log(`${name} -> expected cash = ${expectedCash} (Expected: ${expected}) -> ${expectedCash === expected ? 'PASS' : 'FAIL'}`);
  
  if (expectedCash !== expected) {
    process.exit(1);
  }
}

run().catch(e => {
    console.error(e)
    process.exit(1)
});
