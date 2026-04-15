/**
 * igniteAndFeed: Aligns the Contract with the Physics Engine.
 */
export const igniteAndFeed = async (manager, cueContract, rdfMetadata, safeFlow) => {
  // 1. BIRTH: Use the existing manager to spawn the worker
  const agent = await manager.spawn(rdfMetadata.wasmUri, cueContract.id);

  // 2. THE FEED: Extract markers defined by the RDF schema
  const initialState = rdfMetadata.inputSchema.reduce((acc, marker) => {
    // If safeFlow is awake, get the real bit; otherwise use a placeholder
    acc[marker] = safeFlow ? safeFlow.getLatest(marker) : 0;
    return acc;
  }, {});

  // 3. HANDSHAKE: Send the processed state to the Worker
  // We use the 'ID' to let the Marshaller know how to pack this
  manager.feed(cueContract.id, {
    type: 'INITIAL_STATE',
    state: initialState,
    catalyst: cueContract.signature?.catalyst || 'neutral',
    t: Date.now()
  });

  return agent;
};