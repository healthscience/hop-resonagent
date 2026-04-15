import EventEmitter from 'events';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { Harvester } from '.././routines/harvester.js'

/**
 * agent-worker.js: The Sovereign Sandbox
 * Role: Loads resonAgent.wasm and monitors the Coherence Ledger.
 */

// We'll wrap the Worker instantiation to bridge the Map in index.js

export class ResonAgentCell extends EventEmitter {
  constructor(options = {}) {
    super();
    this.flavor = options.flavor || 'generic';
    this.worker = this.initWorker();
  }

  initWorker() {
    // In Node.js, we point to the current file because the worker logic is at the bottom.
    const workerUrl = new URL(import.meta.url);
    
    const worker = new Worker(workerUrl, {
      workerData: { flavor: this.flavor }
    });

    worker.on('message', (data) => {
      this.handleAgentResponse(data);
      // Forward telemetry to the manager (index.js)
      if (data.type === 'RESONANCE' || data.type === 'MEM_REPORT' || data.type === 'BIFURCATION_WARNING') {
        this.emit('telemetry', data);
      }
    });

    worker.on('error', (err) => console.error(`[Agent:${this.flavor}] Worker Error:`, err));

    return worker;
  }

  handleAgentResponse(data) {
    // Logic for handling worker messages
    this.emit('message', data);
  }

  terminate() {
    this.worker.terminate();
  }

  runEmulation(params) {
    this.worker.postMessage({ type: 'RUN_EMULATION', data: params });
  }

}

// Node.js worker_threads use isMainThread check.
if (!isMainThread) {
  let wasmInstance = null;
  let sharedLedger = null;
  let harvester = null; // Store the harvester instance here
  let agentId = null;
  let role = null;


  // Inside agent-worker.js (The Cell)
  parentPort.on('message', async (e) => {
    const { type, payload, flavor } = e.data;

    if (type === 'TICK') {
      if (!wasmInstance) return;

      // 1. SELECT THE GATE
      // We tell the WASM which "flavor" of data is arriving
      // 0 = Physics, 1 = Language (Raw), 2 = Pattern (Structured)
      const gateId = flavor === 'physics' ? 0 : (typeof payload === 'string' ? 1 : 2);
      
      // 2. COMMIT TO MEMORY
      // The Marshaller on the main thread already 'packed' this into a Float32Array
      const ptr = wasmInstance.exports.get_input_ptr();
      const wasmMemory = new Float32Array(wasmInstance.exports.memory.buffer);
      wasmMemory.set(payload, ptr / 4);

      // 3. EXECUTE WITH CONTEXT
      // We pass the gateId to the WASM so it knows how to interpret the buffer
      wasmInstance.exports.tick_with_gate(gateId);

      // 4. HARVEST
      const results = harvester.harvest();
      sendTelemetry('RESONANCE', results);
    }
  });

  /**
   * Initialization: Setup WASM and the Shared Memory link
   */
    async function initializeAgent({ id, role: r, sharedBuffer, wasmPath, schema: s }) {
      agentId = id;
      role = r;
      schema = s || ['velocity', 'drag']; // Fallback schema

      try {
        // ... (Your existing WASM loading logic)
        const instance = await wasmLoader.default(wasmBuffer);
        wasmInstance = { exports: instance };

        // ATTACH THE HARVESTER HERE
        // It now has direct, synchronous access to the wasmInstance memory
        harvester = new Harvester(wasmInstance, schema);

        console.log(`[${agentId}] Harvester and WASM Initialized.`);
        
        if (role === 'live') startObservationLoop();
      } catch (err) {
        console.error(`[${agentId}] Failed to bring to being:`, err);
      }
    }

  /**
   * The Observation Loop: Runs every 'tick' of the heli clock.
   * It reads from the sharedLedger without any message passing.
  */
  function startObservationLoop() {
    const TICK_MS = 100;

    setInterval(() => {
      if (!wasmInstance || !harvester) return;

      // 1. Run the WASM calculation
      const resonanceScore = wasmInstance.exports.evaluate_state 
        ? wasmInstance.exports.evaluate_state(sharedLedger) 
        : 0.5;

      // 2. HARVEST the internal state
      // Instead of just a score, we get the full 'Attunement' data
      const fullAttunement = harvester.harvest();
      
      // 3. Send the full 'Mind' of the agent back to the manager
      sendTelemetry('RESONANCE', { 
        score: resonanceScore,
        details: fullAttunement // The prediction from the Harvester
      });

    }, TICK_MS);
  }

  /**
   * Execute a "Shadow" Emulation (What-if scenario)
   */
  function executeEmulation(params) {
    if (role !== 'shadow' || !wasmInstance) return;
    
    // Use the emulation_engine in the Rust WASM
    // NOTE: run_emulation seems to be missing from current WASM build, defaulting to placeholder.
    const result = wasmInstance.exports.run_emulation ? wasmInstance.exports.run_emulation(
      params.intensity,
      params.duration
    ) : { status: 'mock_complete' };
    
    parentPort.postMessage({ type: 'EMULATION_COMPLETE', data: result });
  }

  function sendTelemetry(type, payload) {
    parentPort.postMessage({ type, agentId, data: payload });
  }

  // Direct Harvesting
  /*const resonanceScore = wasmInstance.exports.evaluate_state(sharedLedger);
  const attunementData = harvester.harvest();

  sendTelemetry('RESONANCE', { 
    score: resonanceScore, 
    attunement: attunementData 
  });*/
}
