import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Checking database connection...')
    const result = await prisma.$queryRaw`SELECT 1`
    console.log('Connection successful:', result)

    console.log('Checking Task table columns...')
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Task'
    `
    console.log('Task columns:', columns)

    // Check for specific fields
    const columnNames = (columns as any[]).map(c => c.column_name)
    const requiredFields = ['attachments', 'reminderSent']
    for (const field of requiredFields) {
      if (columnNames.includes(field)) {
        console.log(`Field "${field}" exists.`)
      } else {
        console.log(`MISSING FIELD: "${field}"`)
      }
    }

  } catch (error) {
    console.error('Error connecting to database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
