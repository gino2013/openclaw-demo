/**
 * OpenClaw Demo — continuous loop: Dev + Reviewer agents cycle through tasks.
 * Watch the pixel art office at http://localhost:3000
 *
 * Run:  pnpm --filter example dev
 * Requires: Gateway running on ws://127.0.0.1:18789
 */
import { OpenClawAgent } from '@openclaw/sdk'
import { Orchestrator } from '@openclaw/orchestrator'
import { createLogger } from '@openclaw/core'
import type { Task } from '@openclaw/core'

const logger = createLogger('example')

// ── Agents ───────────────────────────────────────────────────────────────────

class DeveloperAgent extends OpenClawAgent {
  readonly role = 'developer' as const
  readonly capabilities = ['typescript', 'node']

  async handle(task: Task): Promise<unknown> {
    logger.info({ taskId: task.id, title: task.title }, '🧑‍💻 Dev agent working...')
    await sleep(2000 + Math.random() * 1500)
    return { code: `// ${task.title}\nconsole.log("Done by Dev-1 ✓")` }
  }
}

class ReviewerAgent extends OpenClawAgent {
  readonly role = 'reviewer' as const
  readonly capabilities = ['code-review', 'typescript']

  async handle(task: Task): Promise<unknown> {
    logger.info({ taskId: task.id, title: task.title }, '🔍 Reviewer checking...')
    await sleep(1200 + Math.random() * 800)
    return { approved: true, comments: ['LGTM! ✓', 'Looks clean.'] }
  }
}

class AnalystAgent extends OpenClawAgent {
  readonly role = 'analyst' as const
  readonly capabilities = ['data-analysis', 'reporting']

  async handle(task: Task): Promise<unknown> {
    logger.info({ taskId: task.id, title: task.title }, '📊 Analyst crunching...')
    await sleep(1500 + Math.random() * 1000)
    return { report: `Analysis complete for: ${task.title}`, score: Math.round(Math.random() * 100) }
  }
}

// ── Demo tasks ────────────────────────────────────────────────────────────────

const DEV_TASKS = [
  'Implement auth middleware',
  'Add pagination to /users endpoint',
  'Fix memory leak in WebSocket handler',
  'Write unit tests for parser module',
  'Refactor database connection pool',
]

const REVIEW_TASKS = [
  'Review PR #42: add rate limiting',
  'Review PR #43: update dependencies',
  'Code review: authentication module',
  'Review PR #44: fix SQL injection',
]

const ANALYST_TASKS = [
  'Analyse user retention metrics',
  'Generate weekly performance report',
  'Identify bottlenecks in pipeline',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info('🦀 Starting OpenClaw continuous demo')
  logger.info('   Watch the office at → http://localhost:3000')

  const dev = new DeveloperAgent({ name: 'Dev-1' })
  const reviewer = new ReviewerAgent({ name: 'Reviewer-1' })
  const analyst = new AnalystAgent({ name: 'Analyst-1' })

  dev.start()
  reviewer.start()
  analyst.start()

  await sleep(1200)

  const orchestrator = new Orchestrator()
  orchestrator.connect()
  await sleep(600)

  logger.info('🚀 Dispatching tasks in loop (Ctrl-C to stop)')

  // Dispatch tasks in an infinite loop, staggered by role
  let round = 0
  while (true) {
    round++
    logger.info({ round }, '─── Round ───')

    const devTask = orchestrator.dispatch({
      title: pick(DEV_TASKS),
      payload: { round },
      requiredRole: 'developer',
    })

    const reviewTask = orchestrator.dispatch({
      title: pick(REVIEW_TASKS),
      payload: { round },
      requiredRole: 'reviewer',
    })

    const analystTask = orchestrator.dispatch({
      title: pick(ANALYST_TASKS),
      payload: { round },
      requiredRole: 'analyst',
    })

    const [devResult, reviewResult, analystResult] = await Promise.allSettled([
      devTask, reviewTask, analystTask,
    ])

    if (devResult.status === 'fulfilled') logger.info({ result: devResult.value }, '✅ Dev done')
    if (reviewResult.status === 'fulfilled') logger.info({ result: reviewResult.value }, '✅ Review done')
    if (analystResult.status === 'fulfilled') logger.info({ result: analystResult.value }, '✅ Analyst done')

    // Pause between rounds so the office animation is visible
    await sleep(4000)
  }
}

void main().catch((err) => {
  logger.error({ err }, 'Demo failed')
  process.exit(1)
})
