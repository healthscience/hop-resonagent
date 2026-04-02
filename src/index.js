/**
 * hop-resonagents: The Swarm Manager
 * Role: Lifecycle & Memory Management for resonAgent WASM
 */

import { AgentWorker } from './agent-worker.js'; 

const MAX_AGENTS = 10;
const BIOMARKER_COUNT = 140;
const BYTES_PER_MARKER = 4; // Float32

class ResonSwarmManager {
  constructor(contextAgents) {
    this.contextAgents = contextAgents;
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

    console.log(`[Birth] Initializing resonAgent: ${id} as ${role}...`);
    
    const worker = new AgentWorker({
      id,
      role,
      sharedBuffer: this.sharedBuffer,
      wasmPath: '.././reson_agent.wasm'
    });

    // Listen for the "Memory Heartbeat"
    worker.on('telemetry', (stats) => this.updateMemoryEye(id, stats));
    
    this.agents.set(id, worker);
    return worker;
  }

  updateMemoryEye(id, stats) {
    // Logic: Track RSS and Linear Memory growth
    this.totalSwarmMemory += stats.delta || 0;
    
    if (this.totalSwarmMemory > this.memoryThreshold) {
      console.warn(`[Memory Eye] Swarm exceeding 512MB. Requesting beebee for triage.`);
      if (this.contextAgents && this.contextAgents.safeflow) {
        this.contextAgents.safeflow.emit('SYSTEM_STRESS', { type: 'MEMORY', value: this.totalSwarmMemory });
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

  console.log("--- Sovereign Shell: ResonAgents are Alive ---");
}