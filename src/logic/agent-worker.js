import EventEmitter from 'events';

/**
 * agent-worker.js: The Sovereign Sandbox
 * Role: Loads resonAgent.wasm and monitors the Coherence Ledger.
 */

// We'll wrap the Worker instantiation to bridge the Map in index.js
export class AgentWorker extends EventEmitter {
  constructor({ id, role, sharedBuffer, wasmPath }) {
    super();
    this.id = id;
    this.role = role;

    // Use absolute URL or ensure the environment resolves this correctly
    // In a browser context, we'd use new Worker(new URL('./agent-worker.js', import.meta.url))
    // In Node.js (assuming this is a Node project as per vitest/package.json), we'd use node:worker_threads
    this.worker = {} /* new Worker(new URL('./agent-worker.js', import.meta.url), {
      type: 'module'
    });*/

    /* this.worker.onmessage = (e) => {
      const { type, agentId, data } = e.data;
      if (type === 'MEM_REPORT') {
        this.emit('telemetry', data);
      } else if (type === 'RESONANCE' || type === 'BIFURCATION_WARNING') {
        this.emit('telemetry', { type, data });
      } else if (type === 'EMULATION_COMPLETE') {
        this.emit('emulation_complete', data);
      }
    };

    this.worker.postMessage({
      type: 'INIT',
      data: { id, role, sharedBuffer, wasmPath }
    });*/
  }

  terminate() {
    // this.worker.terminate();
  }

  runEmulation(params) {
    // this.worker.postMessage({ type: 'RUN_EMULATION', data: params });
  }
}

// We use self because this runs in a WebWorker/WorkerThread context.
if (typeof self !== 'undefined' && self.onmessage === undefined) {
  let wasmInstance = null;
  let sharedLedger = null;
  let agentId = null;
  let role = null;

  self.onmessage = async (e) => {
    const { type, data } = e.data;

    switch (type) {
      case 'INIT':
        await initializeAgent(data);
        break;
      case 'RUN_EMULATION':
        executeEmulation(data);
        break;
    }
  };

  /**
   * Initialization: Setup WASM and the Shared Memory link
   */
  async function initializeAgent({ id, role: r, sharedBuffer, wasmPath }) {
    agentId = id;
    role = r;
    
    // Link to the Coherence Ledger (140 Biomarkers)
    // We wrap it in a Float32Array so the Worker can read the raw bits.
    sharedLedger = new Float32Array(sharedBuffer);

    try {
      // 2026 Standard: instantiateStreaming is the fastest path
      const { instance } = await WebAssembly.instantiateStreaming(
        fetch(wasmPath),
        {
          env: {
            // Provide hooks for the Rust code to report back to JS
            report_resonance: (score) => sendTelemetry('RESONANCE', score),
            log_memory: (bytes) => sendTelemetry('MEM_REPORT', { delta: bytes })
          }
        }
      );

      wasmInstance = instance;
      console.log(`[${agentId}] resonAgent WASM Initialized.`);
      
      // Start the "Passive Observation" loop if this is a 'live' agent
      if (role === 'live') {
        startObservationLoop();
      }
    } catch (err) {
      console.error(`[${agentId}] Failed to bring to being:`, err);
    }
  }

  /**
   * The Observation Loop: Runs every 'tick' of the heli clock.
   * It reads from the sharedLedger without any message passing.
   */
  function startObservationLoop() {
    const TICK_MS = 100; // Aligned with heli clock resolution

    setInterval(() => {
      if (!wasmInstance) return;

      // Zero-Copy: Pass the pointer of the sharedLedger to Rust
      // The Rust side (resonAgent) reads directly from this memory.
      const resonanceScore = wasmInstance.exports.evaluate_state(sharedLedger);
      
      if (resonanceScore < 0.4) {
        sendTelemetry('BIFURCATION_WARNING', { score: resonanceScore });
      }
    }, TICK_MS);
  }

  /**
   * Execute a "Shadow" Emulation (What-if scenario)
   */
  function executeEmulation(params) {
    if (role !== 'shadow') return;
    
    // Use the emulation_engine in the Rust WASM
    const result = wasmInstance.exports.run_emulation(
      params.intensity,
      params.duration
    );
    
    self.postMessage({ type: 'EMULATION_COMPLETE', data: result });
  }

  function sendTelemetry(type, payload) {
    self.postMessage({ type, agentId, data: payload });
  }
}
