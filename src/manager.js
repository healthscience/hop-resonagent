/**
 * hop-resonagent: Manager
 * Listens for bbAI ignition signals and spawns workers.
 */

export class ResonAgentManager {
  constructor() {
    this.agents = new Map();
  }

  // This is the function triggered by Bee's discovery
  async handleIgnition(payload) {
    const { model, constraint } = payload;

    console.log(`[ResonAgent] Spawning agent for constraint: ${constraint}`);

    // Instantiating the WASM physics engine
    const agentWorker = new Worker('./agent-worker.js');
    
    agentWorker.postMessage({
      type: 'INIT_WASM',
      wasmPath: `/models/${model}`,
      params: this.getPhysicsParams(constraint)
    });

    this.agents.set(constraint, agentWorker);
    
    // Notify the Peer (via BentoBoxDS) that the "River" is now live
    this.emit('AGENT_LIVE', { constraint });
  }

  getPhysicsParams(constraint) {
    // Maps the "400IM" constraint to specific physics constants (drag, buoyancy)
    if (constraint === '400IM_RACE') {
      return { dragCoeff: 0.04, strokeRateLimit: 60 };
    }
    return {};
  }
}