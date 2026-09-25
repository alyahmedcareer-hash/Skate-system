const fs = require('fs')
const path = require('path')

const filepath = path.join(__dirname, 'src/modules/reports/reports.service.ts')
let content = fs.readFileSync(filepath, 'utf8')

content = content.replace(/damageReports\.reportedAt/g, 'damageReports.createdAt')

fs.writeFileSync(filepath, content, 'utf8')
console.log('Fixed damages schema in reports.service.ts')
