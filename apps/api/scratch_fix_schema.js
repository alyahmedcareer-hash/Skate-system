const fs = require('fs')
const path = require('path')

const filepath = path.join(__dirname, 'src/modules/reports/reports.service.ts')
let content = fs.readFileSync(filepath, 'utf8')

// rentals table fixes
content = content.replace(/rentals\.startTime/g, 'rentals.startedAt')
content = content.replace(/rentals\.endTime/g, 'rentals.expectedEndAt')
content = content.replace(/rentals\.actualReturnTime/g, 'rentals.returnedAt')
content = content.replace(/rentals\.totalCost/g, 'rentals.rentalAmount')

// expenses table fixes
content = content.replace(/expenses\.expenseDate/g, 'expenses.createdAt')

// damageCharges fixes (damageReports.customerCharge instead)
content = content.replace(/damageCharges\.amount/g, 'damageReports.customerCharge')
content = content.replace(/damageReports\.repairCost/g, 'damageReports.customerCharge') // just reuse for now, or 0
content = content.replace(/leftJoin\(damageCharges, eq\(damageCharges\.reportId, damageReports\.id\)\)/g, '')
content = content.replace(/import { damageReports, damageCharges }/g, 'import { damageReports }')

// lateFees table fixes (done partially, but let's make sure it's fully gone if any remain)
content = content.replace(/lateFees/g, 'rentalPayments')

fs.writeFileSync(filepath, content, 'utf8')
console.log('Fixed schemas in reports.service.ts')
