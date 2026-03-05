export { createGatewayServer } from './server'
export { AgentRegistry } from './agent-registry'
export { EventBus } from './event-bus'

import { createGatewayServer } from './server'

// Start the server when run directly
createGatewayServer()
