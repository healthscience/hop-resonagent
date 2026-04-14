/**
 * hop-resonagent: Harvester
 * Reads the 'Mind' of the resonAgent after a physics tick.
 */

export class Harvester {
  constructor(wasmInstance, schema) {
    this.wasm = wasmInstance;
    this.schema = schema; // The RDF-derived schema of what we expect back
    this.memory = new Float32Array(this.wasm.exports.memory.buffer);
  }

  /**
   * Pulls the results from the WASM 'Output Gate'.
   * @returns {Object} - The 'Resonance Summary' for Beebee and BentoBoxDS.
   */
  harvest() {
    const ptr = this.wasm.exports.get_output_ptr();
    const outputCount = this.schema.length + 1; // +1 for the Resonance Score (κ)
    
    // 1. Slice the relevant memory segment
    const rawOutput = this.memory.slice(ptr / 4, (ptr / 4) + outputCount);

    // 2. Map the floats back to semantic keys (The "Query Return")
    const result = {
      resonanceScore: rawOutput[0], // The κ (Concentration) of the Von Mises
      prediction: {}
    };

    this.schema.forEach((key, index) => {
      result.prediction[key] = rawOutput[index + 1];
    });

    return result;
  }
}