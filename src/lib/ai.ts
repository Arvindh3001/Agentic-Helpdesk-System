import { prisma } from './prisma'

// ─────────────────────────────────────────────
// CATEGORY / KEYWORD RULES (shared reference)
// ─────────────────────────────────────────────
const CATEGORY_RULES: { category: string; keywords: string[]; troubleshooting: string[] }[] = [
  {
    category: 'Electrical',
    keywords: ['wire', 'electrical', 'power', 'socket', 'cable', 'switch', 'light', 'bulb', 'spark', 'electric', 'tripped', 'short circuit', 'mcb', 'breaker', 'fan', 'ac', 'air conditioner'],
    troubleshooting: [
      'Check if the main circuit breaker has tripped and reset it.',
      'Test the socket with a different device to isolate the fault.',
      'Inspect visible wiring for burns, cuts or exposed conductors.',
      'If there is sparking or burning smell, evacuate and call emergency.',
    ],
  },
  {
    category: 'Plumbing',
    keywords: ['water', 'leak', 'pipe', 'flood', 'drain', 'tap', 'wet', 'seepage', 'washroom', 'toilet', 'flush', 'basin', 'sink', 'overflow'],
    troubleshooting: [
      'Turn off the local water supply valve immediately.',
      'Clear visible blockages from the drain using a plunger.',
      'Check all pipe joints for looseness and tighten if safe to do so.',
      'Place absorbent materials to limit water spread until technician arrives.',
    ],
  },
  {
    category: 'Furniture',
    keywords: ['chair', 'desk', 'table', 'furniture', 'bench', 'cupboard', 'shelf', 'broken', 'crack', 'wobbly', 'leg', 'drawer'],
    troubleshooting: [
      'Tighten any loose screws or bolts with a screwdriver.',
      'Stabilise broken legs temporarily with tape or wedges.',
      'Remove sharp or protruding edges to prevent injury.',
      'Document the damage with a photo for the maintenance record.',
    ],
  },
  {
    category: 'Classroom Equipment',
    keywords: ['projector', 'board', 'smartboard', 'speaker', 'lab', 'equipment', 'screen', 'classroom', 'display', 'hdmi', 'remote'],
    troubleshooting: [
      'Restart the projector and re-seat all HDMI / VGA cables.',
      'Replace the remote control batteries.',
      'Clean the projector lens and air vents with a soft cloth.',
      'Confirm the correct input source is selected on the display.',
    ],
  },
  {
    category: 'Network / Internet',
    keywords: ['wifi', 'router', 'network', 'internet', 'lan', 'port', 'connection', 'slow internet', 'no internet', 'disconnected'],
    troubleshooting: [
      'Restart the WiFi router by unplugging for 30 seconds.',
      'Reconnect by forgetting the network and re-entering credentials.',
      'Try a different device to confirm whether the issue is device-specific.',
      'Check that the Ethernet cable is firmly seated at both ends.',
    ],
  },
  {
    category: 'Cleaning / Housekeeping',
    keywords: ['trash', 'garbage', 'waste', 'clean', 'dirty', 'mess', 'hygiene', 'pest', 'odour', 'smell', 'cockroach', 'rat', 'insect'],
    troubleshooting: [
      'Remove trash and dispose in designated bins immediately.',
      'Clean liquid spills with absorbent materials right away.',
      'Sanitise high-touch surfaces with disinfectant.',
      'Report persistent pest issues directly to the housekeeping supervisor.',
    ],
  },
  {
    category: 'Security',
    keywords: ['cctv', 'camera', 'gate', 'security', 'lock', 'fence', 'barrier', 'access card', 'intruder', 'theft', 'missing'],
    troubleshooting: [
      'Verify that the CCTV camera power supply is active.',
      'Restart the camera by power-cycling the device.',
      'Test door locks and access card readers.',
      'Contact the security office immediately for critical incidents.',
    ],
  },
  {
    category: 'Infrastructure / Building Maintenance',
    keywords: ['wall', 'ceiling', 'floor', 'tile', 'crack', 'roof', 'building', 'door', 'window', 'stair', 'railing', 'paint', 'damp'],
    troubleshooting: [
      'Barricade the affected area to prevent access and injury.',
      'Document the damage with photos and note the exact location.',
      'Check for related structural issues in surrounding areas.',
      'Schedule a professional inspection before clearing the barricade.',
    ],
  },
]

const PRIORITY_HIGH_KEYWORDS = [
  'urgent', 'critical', 'emergency', 'fire', 'flood', 'shock', 'collapse',
  'gas leak', 'exposed wire', 'power failure', 'outage', 'breach', 'intruder',
  'not working', 'completely down', 'no power', 'sparking', 'burning smell',
]
const PRIORITY_MEDIUM_KEYWORDS = [
  'slow', 'issue', 'problem', 'intermittent', 'delay', 'trouble', 'damaged',
  'broken', 'leak', 'dirty', 'repair', 'error', 'fail', 'incorrect', 'wrong',
]

const ZONE_PATTERNS: Record<string, string[]> = {
  SJT: ['sjt', 'saint joseph', 'st joseph'],
  TT: ['tt', 'technology tower', 'tech tower'],
  MGR: ['mgr', 'mg r'],
  MGB: ['mgb', 'mg b'],
  SMV: ['smv'],
  PRP: ['prp'],
  CDMM: ['cdmm'],
  'Mens Hostel': ['mens hostel', 'boys hostel', 'male hostel'],
  'Ladies Hostel': ['ladies hostel', 'women hostel', 'female hostel', 'girls hostel'],
  Library: ['library', 'reading room', 'study hall'],
}

// ─────────────────────────────────────────────
// MODULE 1 – LLM COMPLAINT UNDERSTANDING
// Rule-based fallback; swap client.chat() call in here when an API key is available.
// ─────────────────────────────────────────────
export function analyzeComplaintWithLLM(text: string): {
  category: string
  priority: string
  location: string
  summary: string
  troubleshooting: string[]
} {
  const lower = text.toLowerCase()

  // Detect category
  let category = ''
  let troubleshooting: string[] = []
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      category = rule.category
      troubleshooting = rule.troubleshooting
      break
    }
  }

  // Detect priority
  let priority = 'Low'
  if (PRIORITY_HIGH_KEYWORDS.some(kw => lower.includes(kw))) priority = 'High'
  else if (PRIORITY_MEDIUM_KEYWORDS.some(kw => lower.includes(kw))) priority = 'Medium'

  // Detect location / zone from text
  let location = ''
  for (const [zone, patterns] of Object.entries(ZONE_PATTERNS)) {
    if (patterns.some(p => lower.includes(p))) { location = zone; break }
  }

  // Generate summary: first sentence or first 120 chars
  const firstSentence = text.split(/[.!?]/)[0].trim()
  const summary = firstSentence.length > 10
    ? firstSentence.slice(0, 120)
    : text.slice(0, 120)

  return { category, priority, location, summary, troubleshooting }
}

// ─────────────────────────────────────────────
// MODULE 3 – COMPLAINT SUMMARIZATION
// ─────────────────────────────────────────────
export function summarizeComplaint(text: string): string {
  // Extract key nouns / actions using simple heuristic
  const sentences = text.split(/[.!?]/).map(s => s.trim()).filter(Boolean)
  if (sentences.length === 0) return text.slice(0, 100)

  // Take up to 2 sentences; collapse whitespace
  const core = sentences.slice(0, 2).join('. ').replace(/\s+/g, ' ').trim()

  // Capitalise and append period
  const capped = core.charAt(0).toUpperCase() + core.slice(1)
  return capped.endsWith('.') ? capped : capped + '.'
}

// ─────────────────────────────────────────────
// MODULE 4 – DUPLICATE DETECTION
// ─────────────────────────────────────────────
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'by','is','are','was','were','be','been','being','have','has','had',
    'do','does','did','will','would','could','should','may','might','must',
    'can','this','that','these','those','i','you','he','she','it','we',
    'they','my','your','his','her','its','our','their','there','here',
  ])
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(extractKeywords(a))
  const setB = new Set(extractKeywords(b))
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return union.size === 0 ? 0 : intersection.size / union.size
}

export function detectDuplicateComplaint(
  newText: string,
  existing: { id: number; description: string }[],
  threshold = 0.55,
): { isDuplicate: boolean; matchedTicketId?: number; similarityScore?: number } {
  let best = { id: -1, score: 0 }
  for (const ticket of existing) {
    const score = jaccardSimilarity(newText, ticket.description)
    if (score > best.score) best = { id: ticket.id, score }
  }
  if (best.score >= threshold) {
    return { isDuplicate: true, matchedTicketId: best.id, similarityScore: Math.round(best.score * 100) / 100 }
  }
  return { isDuplicate: false }
}

// ─────────────────────────────────────────────
// MODULE 2 – YOLO / IMAGE FAULT DETECTION
// ─────────────────────────────────────────────
export async function analyzeImage(filename: string): Promise<{
  detectedLabel: string
  detectedObject: string
  category: string
  confidence: number
  suggestions: string[]
}> {
  const name = filename.toLowerCase()

  const rules = [
    { keywords: ['wire','electrical','power','socket','cable','switch','light','bulb','spark','electric'], detectedObject: 'Electrical Component', label: 'Electrical Fault Detected', category: 'Electrical', confidence: 0.91, suggestions: ['Exposed wiring','Faulty socket','Electrical hazard'] },
    { keywords: ['water','leak','pipe','flood','drain','plumb','tap','wet','moist','seepag'], detectedObject: 'Pipe / Water Fitting', label: 'Water Leakage Detected', category: 'Plumbing', confidence: 0.87, suggestions: ['Pipe leakage','Water seepage','Drain blockage'] },
    { keywords: ['chair','desk','table','furniture','bench','cupboard','shelf','broken','crack'], detectedObject: 'Furniture Item', label: 'Furniture Damage Detected', category: 'Furniture', confidence: 0.85, suggestions: ['Broken chair','Damaged desk','Cracked furniture'] },
    { keywords: ['projector','board','smartboard','speaker','lab','equipment','screen','classroom'], detectedObject: 'Classroom Equipment', label: 'Classroom Equipment Fault', category: 'Classroom Equipment', confidence: 0.88, suggestions: ['Projector failure','Smartboard issue','Speaker problem'] },
    { keywords: ['wifi','router','network','cable','internet','lan','switch','port'], detectedObject: 'Network Device', label: 'Network Equipment Issue', category: 'Network / Internet', confidence: 0.83, suggestions: ['Router fault','Cable damage','Network port failure'] },
    { keywords: ['wall','ceiling','floor','tile','crack','roof','building','door','window','stair'], detectedObject: 'Building Structure', label: 'Infrastructure Damage Detected', category: 'Infrastructure / Building Maintenance', confidence: 0.84, suggestions: ['Wall crack','Ceiling damage','Broken tiles'] },
    { keywords: ['cctv','camera','gate','security','lock','fence','barrier'], detectedObject: 'Security Device', label: 'Security Issue Detected', category: 'Security', confidence: 0.80, suggestions: ['CCTV fault','Gate malfunction','Security breach'] },
    { keywords: ['trash','garbage','waste','clean','dirty','mess','washroom','toilet'], detectedObject: 'Waste / Hygiene Item', label: 'Housekeeping Issue Detected', category: 'Cleaning / Housekeeping', confidence: 0.78, suggestions: ['Waste overflow','Dirty area','Washroom issue'] },
  ]

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 800))

  for (const rule of rules) {
    if (rule.keywords.some(kw => name.includes(kw))) {
      return { detectedLabel: rule.label, detectedObject: rule.detectedObject, category: rule.category, confidence: rule.confidence, suggestions: rule.suggestions }
    }
  }

  return {
    detectedLabel: 'General Issue Detected',
    detectedObject: 'Unknown Object',
    category: '',
    confidence: 0.45,
    suggestions: ['Unable to auto-classify', 'Please select a category manually'],
  }
}

// ─────────────────────────────────────────────
// Predictive Maintenance Alerts (existing feature)
// ─────────────────────────────────────────────
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
