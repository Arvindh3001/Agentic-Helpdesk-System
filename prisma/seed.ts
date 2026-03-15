import { PrismaClient } from '@prisma/client'
import { CATEGORIES } from '../src/lib/seed-data'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

const zones = ['SJT', 'TT', 'MGR', 'MGB', 'SMV', 'PRP', 'CDMM', 'Mens Hostel', 'Ladies Hostel', 'Library']

const indianNames = [
  // Male names
  'Arjun Sharma', 'Vikram Patel', 'Rohit Kumar', 'Amit Singh', 'Rajesh Gupta',
  'Suresh Reddy', 'Manoj Agarwal', 'Deepak Verma', 'Ravi Nair', 'Pradeep Joshi',
  'Sanjay Mehta', 'Ashish Yadav', 'Kiran Desai', 'Nitin Chopra', 'Vivek Mishra',
  'Anil Pandey', 'Dinesh Malhotra', 'Gopal Iyer', 'Harish Bansal', 'Jatin Kapoor',
  'Kamal Saxena', 'Lalit Sinha', 'Mukesh Jain', 'Naveen Bhat', 'Omkar Kulkarni',
  'Prakash Tiwari', 'Ramesh Agnihotri', 'Sachin Bhardwaj', 'Tarun Chaudhary', 'Umesh Dubey',
  'Vinod Thakur', 'Yogesh Shukla', 'Akash Mittal', 'Bhuvan Awasthi', 'Chetan Bajpai',
  'Dharmendra Srivastava', 'Gautam Prasad', 'Hemant Rastogi', 'Indrajit Ghosh', 'Jagdish Rawat',

  // Female names
  'Priya Sharma', 'Sunita Patel', 'Kavita Singh', 'Meera Gupta', 'Asha Reddy',
  'Rekha Agarwal', 'Sushma Verma', 'Lata Nair', 'Geeta Joshi', 'Usha Mehta',
  'Shanti Yadav', 'Radha Desai', 'Kamala Chopra', 'Vijaya Mishra', 'Sudha Pandey',
  'Manju Malhotra', 'Poonam Iyer', 'Anita Bansal', 'Neeta Kapoor', 'Bharati Saxena',
  'Sulekha Sinha', 'Pushpa Jain', 'Savita Bhat', 'Nalini Kulkarni', 'Veena Tiwari',
  'Seema Agnihotri', 'Renu Bhardwaj', 'Madhuri Chaudhary', 'Kalpana Dubey', 'Vandana Thakur',
  'Archana Shukla', 'Pooja Mittal', 'Nisha Awasthi', 'Smita Bajpai', 'Anjali Srivastava',
  'Swati Prasad', 'Nandini Rastogi', 'Preeti Ghosh', 'Mamta Rawat', 'Shobha Agrawal'
]

async function main() {
  // First, clean up existing data
  await prisma.feedback.deleteMany({})
  await prisma.ticket.deleteMany({})
  await prisma.technicianProfile.deleteMany({})
  await prisma.troubleshootingSolution.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.category.deleteMany({})

  console.log('Creating categories...')

  // Create categories and their solutions
  const createdCategories = []
  for (const categoryData of CATEGORIES) {
    const category = await prisma.category.create({
      data: {
        name: categoryData.name,
      },
    })
    createdCategories.push(category)
    console.log(`Created category: ${categoryData.name}`)

    // Create solutions for this category
    console.log(`Creating ${categoryData.solutions.length} solutions for ${categoryData.name}`)
    for (const solution of categoryData.solutions) {
      await prisma.troubleshootingSolution.create({
        data: {
          categoryId: category.id,
          title: solution.title,
          steps: solution.steps,
        },
      })
    }
  }

  console.log('Creating admin user...')

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'arvindh3001@gmail.com',
      passwordHash: hashPassword('password123'),
      role: 'Admin',
    },
  })

  console.log('Creating technicians...')

  // Create 10 technicians for each category (80 total)
  let nameIndex = 0
  const createdTechnicians = []

  for (let categoryIndex = 0; categoryIndex < createdCategories.length; categoryIndex++) {
    const category = createdCategories[categoryIndex]
    console.log(`Creating technicians for category: ${category.name}`)

    for (let techIndex = 0; techIndex < 10; techIndex++) {
      const techName = indianNames[nameIndex % indianNames.length]
      const zone = zones[nameIndex % zones.length]
      nameIndex++

      const email = `${techName.toLowerCase().replace(' ', '.')}@helpdesk.com`

      // Create user for technician
      const techUser = await prisma.user.create({
        data: {
          name: techName,
          email: email,
          passwordHash: hashPassword('password123'),
          role: 'Technician',
        },
      })

      // Create technician profile
      const techProfile = await prisma.technicianProfile.create({
        data: {
          userId: techUser.id,
          zone: zone,
          categoryId: category.id,
          isAvailable: Math.random() > 0.3, // 70% available
          currentWorkload: Math.floor(Math.random() * 5), // 0-4 current tickets
        },
      })

      createdTechnicians.push({ user: techUser, profile: techProfile })
      console.log(`Created technician: ${techName} - ${category.name} - ${zone}`)
    }
  }

  console.log('Creating sample customers...')

  // Create some sample customers
  const customerNames = ['Rahul Sharma', 'Sneha Patel', 'Mohan Kumar', 'Divya Singh', 'Arun Gupta']
  const createdCustomers = []

  for (let i = 0; i < customerNames.length; i++) {
    const customer = await prisma.user.create({
      data: {
        name: customerNames[i],
        email: `${customerNames[i].toLowerCase().replace(' ', '.')}@college.edu`,
        passwordHash: hashPassword('password123'),
        role: 'Customer',
      },
    })
    createdCustomers.push(customer)
  }

  // Solutions are already created above with categories

  console.log('Creating sample tickets...')

  // Create some sample tickets
  const sampleTickets = [
    { description: 'Power failure in SJT building computer lab', zone: 'SJT', categoryName: 'Electrical', priority: 'High' },
    { description: 'WiFi not working in library main hall', zone: 'Library', categoryName: 'Network / Internet', priority: 'High' },
    { description: 'Water leakage from ceiling in MGR lab room 101', zone: 'MGR', categoryName: 'Plumbing', priority: 'High' },
    { description: 'Broken chairs in Mens Hostel common room', zone: 'Mens Hostel', categoryName: 'Furniture', priority: 'Medium' },
    { description: 'Washroom not cleaned in TT department', zone: 'TT', categoryName: 'Cleaning / Housekeeping', priority: 'Medium' },
    { description: 'CCTV camera not working at Ladies Hostel entrance', zone: 'Ladies Hostel', categoryName: 'Security', priority: 'High' },
    { description: 'Broken tiles in MGB building corridor', zone: 'MGB', categoryName: 'Infrastructure / Building Maintenance', priority: 'Medium' },
    { description: 'Projector not working in SMV classroom', zone: 'SMV', categoryName: 'Classroom Equipment', priority: 'Medium' },
  ]

  for (let i = 0; i < sampleTickets.length; i++) {
    const ticket = sampleTickets[i]
    const category = createdCategories.find(cat => cat.name === ticket.categoryName)
    const customer = createdCustomers[i % createdCustomers.length]

    if (category && customer) {
      // Find a technician for this category and zone
      const availableTech = createdTechnicians.find(tech =>
        tech.profile.categoryId === category.id &&
        tech.profile.zone === ticket.zone &&
        tech.profile.isAvailable
      )

      await prisma.ticket.create({
        data: {
          customerId: customer.id,
          categoryId: category.id,
          description: ticket.description,
          zone: ticket.zone,
          priority: ticket.priority,
          assignedTechId: availableTech?.user.id,
          status: availableTech ? 'Assigned' : 'Pending',
        },
      })
    }
  }

  const solutionCount = await prisma.troubleshootingSolution.count()

  console.log('Database seeded successfully!')
  console.log(`Created ${CATEGORIES.length} categories`)
  console.log(`Created ${createdTechnicians.length} technicians`)
  console.log(`Created ${createdCustomers.length} customers`)
  console.log(`Created ${solutionCount} troubleshooting solutions`)
  console.log(`Created ${sampleTickets.length} sample tickets`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })