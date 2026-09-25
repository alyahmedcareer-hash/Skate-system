const fs = require('fs')
const path = require('path')

const filepath = path.join(__dirname, 'src/modules/reports/reports.service.ts')
let content = fs.readFileSync(filepath, 'utf8')

// Fix column names in raw SQL
content = content.replace(/r\.total_cost/g, 'r.rental_amount')
content = content.replace(/r\.actual_return_time/g, 'r.returned_at')
content = content.replace(/r\.end_time/g, 'r.expected_end_at')
content = content.replace(/r\.start_time/g, 'r.started_at')
content = content.replace(/d\.reported_at/g, 'd.created_at')

fs.writeFileSync(filepath, content, 'utf8')
console.log('Fixed raw SQL schema in reports.service.ts')
