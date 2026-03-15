import { prisma } from './prisma'

// Simulated AI image analysis - maps keywords from filename to categories
// In production: replace with call to YOLO/CNN Python microservice
export async function analyzeImage(filename: string, fileBuffer?: Buffer): Promise<{
  detectedLabel: string
  category: string
  confidence: number
  suggestions: string[]
}> {
  const name = filename.toLowerCase()

  // Keyword-based detection map (simulates what YOLO would return)
  const detectionRules = [
    { keywords: ['wire', 'electrical', 'power', 'socket', 'cable', 'switch', 'light', 'bulb', 'spark', 'electric'], label: 'Electrical Fault Detected', category: 'Electrical', confidence: 0.91, suggestions: ['Exposed wiring', 'Faulty socket', 'Electrical hazard'] },
    { keywords: ['water', 'leak', 'pipe', 'flood', 'drain', 'plumb', 'tap', 'wet', 'moist', 'seepag'], label: 'Water Leakage Detected', category: 'Plumbing', confidence: 0.87, suggestions: ['Pipe leakage', 'Water seepage', 'Drain blockage'] },
    { keywords: ['chair', 'desk', 'table', 'furniture', 'bench', 'cupboard', 'shelf', 'broken', 'crack'], label: 'Furniture Damage Detected', category: 'Furniture', confidence: 0.85, suggestions: ['Broken chair', 'Damaged desk', 'Cracked furniture'] },
    { keywords: ['projector', 'board', 'smartboard', 'speaker', 'lab', 'equipment', 'screen', 'classroom'], label: 'Classroom Equipment Fault', category: 'Classroom Equipment', confidence: 0.88, suggestions: ['Projector failure', 'Smartboard issue', 'Speaker problem'] },
    { keywords: ['wifi', 'router', 'network', 'cable', 'internet', 'lan', 'switch', 'port'], label: 'Network Equipment Issue', category: 'Network / Internet', confidence: 0.83, suggestions: ['Router fault', 'Cable damage', 'Network port failure'] },
    { keywords: ['wall', 'ceiling', 'floor', 'tile', 'crack', 'roof', 'building', 'door', 'window', 'stair'], label: 'Infrastructure Damage Detected', category: 'Infrastructure / Building Maintenance', confidence: 0.84, suggestions: ['Wall crack', 'Ceiling damage', 'Broken tiles'] },
    { keywords: ['cctv', 'camera', 'gate', 'security', 'lock', 'fence', 'barrier'], label: 'Security Issue Detected', category: 'Security', confidence: 0.80, suggestions: ['CCTV fault', 'Gate malfunction', 'Security breach'] },
    { keywords: ['trash', 'garbage', 'waste', 'clean', 'dirty', 'mess', 'washroom', 'toilet'], label: 'Housekeeping Issue Detected', category: 'Cleaning / Housekeeping', confidence: 0.78, suggestions: ['Waste overflow', 'Dirty area', 'Washroom issue'] },
  ]

  for (const rule of detectionRules) {
    if (rule.keywords.some(kw => name.includes(kw))) {
      return { detectedLabel: rule.label, category: rule.category, confidence: rule.confidence, suggestions: rule.suggestions }
    }
  }

  // Default: general analysis with medium confidence
  return {
    detectedLabel: 'General Issue Detected',
    category: '',
    confidence: 0.55,
    suggestions: ['Unable to auto-classify', 'Please select a category manually'],
  }
}

// Predictive maintenance: find categories with increasing complaint trends
export async function getPredictiveAlerts() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)

  const categories = await prisma.category.findMany()
  const alerts = []

  for (const cat of categories) {
    const olderCount = await prisma.ticket.count({
      where: { categoryId: cat.id, createdAt: { gte: thirtyDaysAgo, lt: fifteenDaysAgo } },
    })
    const recentCount = await prisma.ticket.count({
      where: { categoryId: cat.id, createdAt: { gte: fifteenDaysAgo } },
    })
    const total = await prisma.ticket.count({ where: { categoryId: cat.id } })

    // Trend: more complaints in recent 15 days than previous 15 days
    const trendRatio = olderCount > 0 ? recentCount / olderCount : recentCount > 1 ? 2 : 0
    if (trendRatio >= 1.5 || (olderCount === 0 && recentCount >= 3)) {
      alerts.push({
        categoryId: cat.id,
        categoryName: cat.name,
        recentCount,
        olderCount,
        total,
        trendRatio: Math.round(trendRatio * 10) / 10,
        severity: trendRatio >= 2.5 ? 'High' : trendRatio >= 1.8 ? 'Medium' : 'Low',
        recommendation: `Proactive inspection of ${cat.name} infrastructure recommended — complaint frequency is rising.`,
      })
    }
  }

  return alerts.sort((a, b) => b.trendRatio - a.trendRatio)
}
