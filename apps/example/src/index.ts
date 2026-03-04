/**
 * OpenClaw Demo — two agents collaborate on a simple task.
 *
 * Run:  pnpm --filter example dev
 * Requires: Gateway running on ws://127.0.0.1:18789
 */
import { OpenClawAgent } from '@openclaw/sdk'
import { Orchestrator } from '@openclaw/orchestrator'
import { createLogger } from '@openclaw/core'
import type { Task } from '@openclaw/core'

const logger = createLogger('example')

// --- Developer Agent ---
class DeveloperAgent extends OpenClawAgent {
  readonly role = 'developer' as const
  readonly capabilities = ['typescript', 'node']

  async handle(task: Task): Promise<unknown> {
    logger.info({ taskId: task.id }, 'Developer handling task')
    // Simulate work
    await sleep(1500)
    return { code: `// Generated for: ${task.title}\nconsole.log("Hello from DeveloperAgent!")` }
  }
}

// --- Reviewer Agent ---
class ReviewerAgent extends OpenClawAgent {
  readonly role = 'reviewer' as const
  readonly capabilities = ['code-review', 'typescript']

  async handle(task: Task): Promise<unknown> {
    logger.info({ taskId: task.id }, 'Reviewer handling task')
    await sleep(1000)
    return { approved: true, comments: ['Looks good!', 'LGTM'] }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function main(): Promise<void> {
  logger.info('Starting OpenClaw Demo')

  // Start agents
  const dev = new DeveloperAgent({ name: 'Dev-1' })
  const reviewer = new ReviewerAgent({ name: 'Reviewer-1' })
  dev.start()
  reviewer.start()

  // Give agents time to connect
  await sleep(1000)

  // Dispatch tasks via Orchestrator
  const orchestrator = new Orchestrator()
  orchestrator.connect()
  await sleep(500)

  logger.info('Dispatching demo tasks...')

  const devResult = await orchestrator.dispatch({
    title: 'Write hello world function',
    payload: { language: 'typescript' },
    requiredRole: 'developer',
  })
  logger.info({ result: devResult }, 'Developer task completed')

  const reviewResult = await orchestrator.dispatch({
    title: 'Review code submission',
    payload: { code: devResult },
    requiredRole: 'reviewer',
  })
  logger.info({ result: reviewResult }, 'Reviewer task completed')

  logger.info('Demo complete! Check the Office dashboard at http://localhost:3000')
}

void main().catch((err) => {
  logger.error({ err }, 'Demo failed')
  process.exit(1)
})
