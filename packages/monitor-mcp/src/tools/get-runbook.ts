import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Runbook, AnomalyType } from '@runbook/shared-types'
import { logger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Map anomaly types to runbook files
const RUNBOOK_MAP: Record<string, string> = {
  MEMORY_SPIKE: 'memory-spike.md',
  HIGH_ERROR_RATE: 'high-error-rate.md',
  CPU_OVERLOAD: 'cpu-overload.md',
}

export async function getRunbook(
  anomalyType: string
): Promise<{
  success: boolean
  runbook?: Runbook
  source?: string
  content?: string
  error?: string
}> {
  try {
    logger.info('Fetching runbook', { anomalyType })

    // Validate anomaly type
    if (!RUNBOOK_MAP[anomalyType]) {
      throw new Error(`Unknown anomaly type: ${anomalyType}. Valid types: ${Object.keys(RUNBOOK_MAP).join(', ')}`)
    }

    // Construct path to runbook file
    const runbookFileName = RUNBOOK_MAP[anomalyType]
    const runbookPath = join(__dirname, '../../../../runbooks', runbookFileName)

    logger.debug('Reading runbook file', { path: runbookPath })

    // Read runbook file
    const content = await readFile(runbookPath, 'utf-8')

    // Parse markdown into structured runbook
    const runbook = parseRunbook(content, anomalyType)

    logger.info('Runbook fetched successfully', {
      anomalyType,
      steps: runbook.steps.length,
    })

    return {
      success: true,
      runbook,
      source: runbookPath,
      content,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch runbook', { anomalyType, error: errorMessage })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

function parseRunbook(markdown: string, anomalyType: string): Runbook {
  const lines = markdown.split('\n')
  
  let name = ''
  let description = ''
  const steps: Runbook['steps'] = []
  let rollbackPlan = ''
  let currentSection = ''
  let stepNumber = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Extract title (# Title)
    if (trimmed.startsWith('# ') && !name) {
      name = trimmed.substring(2).trim()
      continue
    }

    // Detect sections
    if (trimmed.startsWith('## Detection')) {
      currentSection = 'detection'
      continue
    } else if (trimmed.startsWith('## Steps')) {
      currentSection = 'steps'
      continue
    } else if (trimmed.startsWith('## Rollback Plan')) {
      currentSection = 'rollback'
      continue
    }

    // Parse based on current section
    if (currentSection === 'detection' && trimmed && !trimmed.startsWith('##')) {
      description += trimmed + ' '
    } else if (currentSection === 'steps' && trimmed.match(/^\d+\./)) {
      stepNumber++
      const stepText = trimmed.substring(trimmed.indexOf('.') + 1).trim()
      
      // Determine action type from step text
      let action = 'check'
      if (stepText.toLowerCase().includes('restart')) {
        action = 'restart'
      } else if (stepText.toLowerCase().includes('scale')) {
        action = 'scale'
      } else if (stepText.toLowerCase().includes('rollback')) {
        action = 'rollback'
      } else if (stepText.toLowerCase().includes('monitor')) {
        action = 'monitor'
      } else if (stepText.toLowerCase().includes('update') || stepText.toLowerCase().includes('increase')) {
        action = 'update'
      }

      steps.push({
        stepNumber,
        description: stepText,
        action,
        params: {},
        required: true,
      })
    } else if (currentSection === 'rollback' && trimmed && !trimmed.startsWith('##')) {
      rollbackPlan += trimmed + '\n'
    }
  }

  return {
    name: name || `${anomalyType} Runbook`,
    description: description.trim(),
    trigger: anomalyType as AnomalyType,
    steps,
    rollbackPlan: rollbackPlan.trim(),
    tags: [anomalyType.toLowerCase()],
  }
}