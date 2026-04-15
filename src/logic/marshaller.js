/**
 * hop-resonagent: Marshaller
 * Refactored for Serious Intent: Handles Physics, Language, and Pattern Flavors.
 */
export class Marshaller {
  constructor(wasmInstance) {
    this.wasm = wasmInstance;
    // We use a DataView or specific TypedArrays depending on the gate
    this.memory = new Float32Array(this.wasm.exports.memory.buffer);
  }

  /**
   * The entry point for the 'feed' protocol.
   */
  pack(flavor, data) {
    switch (flavor) {
      case 'physics':
        return this.packPhysics(data);
      case 'language':
        return typeof data === 'string' 
          ? this.packString(data) 
          : this.packPattern(data);
      default:
        throw new Error(`Unknown flavor: ${flavor}`);
    }
  }

  /**
   * Strategy: Hash words into a Semantic Space.
   * We turn a string like "400IM" into a fixed-length Float32Array.
   */
  packString(text) {
    const buffer = new Float32Array(32); // 32-slot semantic window
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach((word, i) => {
      if (i >= 32) return;
      // Simple hash to float for Zero-Draft; 
      // Serious Intent will use a lookup table from the Library.
      buffer[i] = this.simpleHash(word); 
    });
    return buffer;
  }

  /**
   * Strategy: Flatten the HomeoRange slots.
   * Converts [{label: 'Floor', resonance: 0.1}] into [0.1, valueHash, ...]
   */
  packPattern(pattern) {
    const buffer = new Float32Array(16); // 16-slot constraint window
    buffer[0] = pattern.isStable ? 1.0 : 0.0;
    
    pattern.slots.forEach((slot, i) => {
      const offset = (i * 2) + 1;
      if (offset >= 16) return;
      buffer[offset] = slot.resonance; 
      buffer[offset + 1] = this.simpleHash(slot.value || '');
    });
    return buffer;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; 
    }
    return (hash % 1000) / 1000; // Normalize to 0.0 - 1.0
  }

  /**
   * The actual 'Gate' push.
   */
  commit(cleanBuffer) {
    const ptr = this.wasm.exports.get_input_ptr();
    this.memory.set(cleanBuffer, ptr / 4);
    this.wasm.exports.tick();
  }
}