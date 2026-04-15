/**
 * hop-resonagents: The Swarm Manager
 * Role: Lifecycle & Memory Management for resonAgent WASM
 */

import { ResonAgentManager } from './logic/agent-worker.js';
import { igniteAndFeed } from './routines/ignition.js';

const MAX_AGENTS = 10;
const BIOMARKER_COUNT = 140;
const BYTES_PER_MARKER = 4; // Float32

class ResonSwarmManager {
  constructor(wiringIn) {
    this.wiring = wiringIn;
    this.agents = new Map();
    
    // 1. The Coherence Ledger (Shared Memory)
    // We allocate a buffer that all 10 agents can see simultaneously.
    this.sharedBuffer = new SharedArrayBuffer(BIOMARKER_COUNT * BYTES_PER_MARKER);
    this.biomarkerLeads = new Float32Array(this.sharedBuffer);
    
    // 2. The Memory Eye
    this.totalSwarmMemory = 0;
    this.memoryThreshold = 512 * 1024 * 1024; // 512MB Soft Cap
  }

  /**
   * Bring a new Agent to being
   * @param {string} id - Unique Nanobot ID
   * @param {string} role - 'live', 'shadow', or 'besearch'
   */
  async birthAgent(id, role = 'shadow') {
  if (this.agents.size >= MAX_AGENTS) {
    this.pruneWeakestLink();
  }

  // 1. Instantiation (The Shell)
  const agent = new ResonAgentManager({ id, role });

  // 2. Ignition (The Spark)
  // We pass the agent handle and the wiring context to the routine
  const isIgnited = await igniteAndFeed(agent, {
    id,
    role,
    sharedBuffer: this.sharedBuffer,
    wasmUrl: new URL('../wasm/reson_agent_bg.wasm', import.meta.url)
  });

  if (!isIgnited) throw new Error(`[Birth] Failed to ignite agent: ${id}`);

    // Listen for the "Memory Heartbeat"
    agent.on('telemetry', (stats) => this.updateMemoryEye(id, stats));
    
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