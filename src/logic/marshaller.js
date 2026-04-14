/**
 * hop-resonagent: Marshaller
 * Handles the low-level byte-pushing into the WASM instance.
 */

export class Marshaller {
  constructor(wasmInstance) {
    this.wasm = wasmInstance;
    this.memory = new Float32Array(this.wasm.exports.memory.buffer);
  }

  /**
   * Feeds the mapped buffer into the WASM 'Input Gate'.
   * @param {Float32Array} cleanBuffer - Produced by bbAI.DataMapper.
   */
  feed(cleanBuffer) {
    // 1. Find the memory pointer defined in the Rust/WASM export
    const ptr = this.wasm.exports.get_input_ptr();
    
    // 2. Set the data directly into WASM memory (Zero-Copy)
    this.memory.set(cleanBuffer, ptr / 4); // Divide by 4 for Float32 offset

    // 3. Trigger the physics tick
    this.wasm.exports.tick();
    
    console.log("[ResonAgent] Data Fed. Physics Tick Executed.");
  }
}