const fs = require('fs')
const path = require('path')

const filepath = path.join(__dirname, 'src/modules/reports/reports.service.ts')
let content = fs.readFileSync(filepath, 'utf8')

content = content.replace(/maintenanceLogs/g, 'maintenanceRecords')
content = content.replace(/maintenanceRecords\.problemType/g, 'maintenanceRecords.problemDescription')
content = content.replace(/maintenanceRecords\.repairCost/g, 'maintenanceRecords.totalCost')
// Also map problemType: r.problemType back from problemDescription
content = content.replace(/problemType: r\.problemType/g, 'problemType: r.problemDescription')
// Ensure totalCost is correctly extracted in the return mapping
content = content.replace(/repairCost: Number\(r\.repairCost \|\| 0\)/g, 'repairCost: Number(r.totalCost || 0)')

fs.writeFileSync(filepath, content, 'utf8')
console.log('Fixed maintenance schema in reports.service.ts')
