/**
 * hop-resonagent: Ignition & Feed Sequence
 * Triggered by the Cue Contract.
 */
import { ResonAgentManager } from './manager.js';

export const igniteAndFeed = async (cueContract, rdfMetadata, safeFlow) => {
  const manager = new ResonAgentManager();

  // 1. COMING TO BE: Instantiate the worker with the discovered WASM
  const agent = await manager.spawn(rdfMetadata.wasmUri, cueContract.id);

  // 2. THE FEED: Pull the 'Initial State Vector' from safeFLOW-ecs
  // We only feed the biomarkers the RDF traversal told us were required.
  const initialState = rdfMetadata.inputSchema.reduce((acc, marker) => {
    acc[marker] = safeFlow.getLatest(marker);
    return acc;
  }, {});

  // 3. HANDSHAKE: Push data into the WASM Linear Memory
  agent.postMessage({
    type: 'FEED_STATE',
    payload: {
      state: initialState,
      catalyst: cueContract.signature.catalyst,
      t: Date.now()
    }
  });

  console.log(`[HOP] resonAgent ${cueContract.id} is live and fed.`);
  return agent;
};