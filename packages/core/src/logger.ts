import pino from 'pino'

/**
 * Creates a named logger instance using pino.
 *
 * @param name - Logger name (typically the package or module name)
 * @returns A configured pino logger instance
 */
export function createLogger(name: string): pino.Logger {
  return pino({
    name,
    level: process.env['LOG_LEVEL'] ?? 'info',
  })
}
