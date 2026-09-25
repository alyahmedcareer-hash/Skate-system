const fs = require('fs')
const path = require('path')

const filepath = path.join(__dirname, 'src/modules/reports/reports.service.ts')
let content = fs.readFileSync(filepath, 'utf8')

content = content.replace(/maintenance_logs/g, 'maintenance_records')
content = content.replace(/m\.repair_cost/g, 'm.total_cost')

fs.writeFileSync(filepath, content, 'utf8')
console.log('Fixed maintenance raw SQL schema in reports.service.ts')
