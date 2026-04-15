import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

export class ResonAgentManager {
  constructor(wiring) {
    this.wiring = wiring;
    this.agents = new Map();
  }

  async spawn(wasmUri, id) {
    const workerUrl = new URL('../agent-worker.js', import.meta.url);
    
    // Create the worker
    const agentWorker = new Worker(workerUrl);

    // Initial INIT message
    agentWorker.postMessage({
      type: 'INIT',
      data: { id, wasmPath: wasmUri }
    });

    this.agents.set(id, agentWorker);
    return agentWorker; 
  }

  /**
   * FEED: The primary pulse for data entry.
   * @param {string} id - The unique ID of the agent (e.g. lsStory.key)
   * @param {string} flavor - 'physics', 'language', or 'pattern'
   * @param {any} data - The raw story words or the structured patternMatch
   */
  feed(id, flavor, data) {
    const agent = this.agents.get(id);
    if (!agent) {
      console.warn(`[ResonAgent] No agent found for ID: ${id}`);
      return;
    }

    // 1. SMELT: Use the Marshaller to turn the data into a binary buffer
    // This is where we differentiate between the "Raw Story" and "Pattern Structure"
    const packedBuffer = this.marshaller.pack(flavor, data);

    // 2. PULSE: Send to the worker
    agent.postMessage({
      type: 'TICK',
      payload: packedBuffer,
      flavor: flavor,
      timestamp: Date.now()
    });
  }

  async getSovereignPriors(id) {
    // Attempt to pull from the Peer's @teach history in bbai
    return this.wiring?.bbai?.memory?.getWeights('physics', id) || {};
  }

  handleAgentFeedback(id, message) {
    if (message.type === 'RESONANCE_UPDATE') {
      // Emit to the BentoBoxDS Lens via the wiring
      this.wiring?.bbai?.emit('LENS_SYNC', { id, kappa: message.kappa });
    }
  }
}