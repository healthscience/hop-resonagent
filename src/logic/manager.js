/**
 * hop-resonagent: Manager
 * Orchestrates the "Cells" (workers) and flows the "Pulse" (feed).
 */
/**
 * hop-resonagent: Manager
 * The "Cell Nursery" that spawns and feeds the Trinity.
 */
import { Marshaller } from './marshaller.js';

export class ResonAgentManager {
  constructor(wiring) {
    this.wiring = wiring; 
    this.agents = new Map();
  }

  /**
   * SPAWN: The primary entry point for bringing an agent to life.
   * @param {string} wasmUri - The location of the DNA (WASM).
   * @param {string} id - The Cue Contract ID (e.g., '400IM_RACE').
   */
  async spawn(wasmUri, id) {
    console.log(`[ResonAgent] Spawning cell: ${id} from ${wasmUri}`);

    // 1. Initialize the Worker
    const agentWorker = new Worker(new URL('./agent-worker.js', import.meta.url), { 
      type: 'module' 
    });

    // 2. Marshall the Initial State
    // We pull priors from the 'wiring' to ensure sovereignty
    const priors = await this.getSovereignPriors(id);

    // 3. Ignite the Worker
    agentWorker.postMessage({
      type: 'INIT',
      data: {
        id,
        wasmPath: wasmUri,
        priors
      }
    });

    // 4. Listen for Resonance Feedback
    agentWorker.onmessage = (e) => this.handleAgentFeedback(id, e.data);

    this.agents.set(id, agentWorker);
    return agentWorker; 
  }

  /**
   * FEED: The metabolic pulse.
   */
  feed(id, rawData) {
    const agent = this.agents.get(id);
    if (!agent) return;

    // Use Marshaller to convert JS Object to binary
    const packed = Marshaller(id, rawData);
    agent.postMessage({ type: 'TICK', payload: packed });
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