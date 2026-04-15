/**
 * hop-resonagents: The Swarm Manager
 * Role: Lifecycle & Memory Management for resonAgent WASM
 */
import { ResonAgentCell } from './logic/agent-worker.js';
import { igniteAndFeed } from './routines/ignition.js';

const MAX_AGENTS = 10;
const BIOMARKER_COUNT = 140;
const BYTES_PER_MARKER = 4; // Float32

class ResonSwarmManager {
  constructor(wiring) {
      this.wiring = wiring;
      this.manager = new ResonAgentCell(wiring); // Manager is born here
      this.agents = new Map();
    }

    async birthAgent(cueContract, rdfMetadata) {
      const id = cueContract.id;
      
      console.log(`[Birth] Initializing resonAgent: ${id}...`);

      // We pass the manager and the dependencies to the ignition routine
      const agent = await igniteAndFeed(
        this.manager, 
        cueContract, 
        rdfMetadata, 
        this.wiring.safeflow
      );

      this.agents.set(id, agent);
      return agent;
    }

  /**
   * 
   * @param {*} id 
   * @param {*} stats 
   */
  updateMemoryEye(id, stats) {
    // Logic: Track RSS and Linear Memory growth
    this.totalSwarmMemory += stats.delta || 0;
    
    if (this.totalSwarmMemory > this.memoryThreshold) {
      console.warn(`[Memory Eye] Swarm exceeding 512MB. Requesting beebee for triage.`);
      if (this.wiring && this.wiring.safeflow) {
        this.wiring.safeflow.emit('SYSTEM_STRESS', { type: 'MEMORY', value: this.totalSwarmMemory });
      }
    }
  }

  pruneWeakestLink() {
    // Find the oldest 'shadow' agent and terminate to make room
    for (const [id, agent] of this.agents) {
      if (agent.role === 'shadow') {
        console.log(`[Prune] Terminating shadow agent ${id} for efficiency.`);
        agent.terminate();
        this.agents.delete(id);
        break;
      }
    }
  }

  /**
   * Update the Ledger from node-safeflow
   * This is the "Zero-Copy" injection point.
   */
  syncLedger(biomarkerData) {
    // Directly write to the SharedArrayBuffer
    // No strings, no JSON, just raw bits for the 10 agents to read.
    for (let i = 0; i < BIOMARKER_COUNT; i++) {
      this.biomarkerLeads[i] = biomarkerData[i] || 0;
    }
  }

  /**
   * 
   * @param {*} strategy 
   */
  setTMTOStrategy(strategy) {
    if (strategy === 'PRE_COMPUTE') {
      // We trade RAM for speed. Load the lookup tables into WASM memory.
      this.wasmInstance.exports.load_bifurcation_tables();
    } else {
      // We trade speed for RAM. Free the tables and calculate on-the-fly.
      this.wasmInstance.exports.flush_tables();
    }
  }

  // The "Base Functionality" Loop
  async runTick(agent, rawInput, schema) {
    // 1. FEED: Translate messy life-strap data to bytes
    const cleanInput = DataMapper.pack(rawInput, schema);
    agent.marshaller.feed(cleanInput);

    // 2. TICK: The WASM executes the physics of the swimming stroke
    // (Triggered inside marshaller.feed)

    // 3. HARVEST: Pull the "Knowledge" out
    const knowledge = agent.harvester.harvest();

    // 4. EMIT: Send to BentoBoxDS and Beebee for "Global Brain" assessment
    return knowledge;
  }

}

// Singleton Instance
export const hopSwarm = new ResonSwarmManager();

/**
 * Initialize the HOP Network 
 */
export async function bringToBeing() {
  // Birth the primary "Live" agent
  await hopSwarm.birthAgent('reson-alpha', 'live');
  
  // Birth 2 initial "Shadow" agents for background emulations
  await hopSwarm.birthAgent('shadow-01', 'shadow');
  await hopSwarm.birthAgent('shadow-02', 'shadow');
}