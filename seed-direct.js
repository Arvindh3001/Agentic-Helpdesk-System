const { PrismaClient } = require('@prisma/client')
const { CATEGORIES } = require('./src/lib/seed-data.ts')

const prisma = new PrismaClient()

async function seed() {
  try {
    console.log('Starting database seeding...')

    // Clear existing data
    await prisma.troubleshootingSolution.deleteMany({})
    await prisma.category.deleteMany({})
    console.log('Cleared existing categories and solutions')

    // Seed categories and solutions
    for (const cat of CATEGORIES) {
      console.log(`Seeding category: ${cat.name}`)
      const category = await prisma.category.create({ data: { name: cat.name } })

      console.log(`Adding ${cat.solutions.length} solutions for ${cat.name}`)
      for (const sol of cat.solutions) {
        await prisma.troubleshootingSolution.create({
          data: {
            categoryId: category.id,
            title: sol.title,
            steps: sol.steps
          }
        })
      }
    }

    console.log('Database seeding completed successfully!')

    // Print summary
    const categoryCount = await prisma.category.count()
    const solutionCount = await prisma.troubleshootingSolution.count()
    console.log(`Total categories: ${categoryCount}`)
    console.log(`Total solutions: ${solutionCount}`)

  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seed()