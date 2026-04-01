import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hopSwarm } from '../src/index.js';

// Mock AgentWorker since we can't easily run real Workers/WASM in this environment without setup
vi.mock('../src/agent-worker.js', () => {
  return {
    AgentWorker: vi.fn().mockImplementation(function({ id, role }) {
      this.id = id;
      this.role = role;
      this.on = vi.fn();
      this.terminate = vi.fn();
      this.emit = vi.fn();
    })
  };
});

describe('ResonSwarmManager', () => {
  beforeEach(() => {
    hopSwarm.agents.clear();
    hopSwarm.totalSwarmMemory = 0;
  });

  it('should birth an agent and add it to the map', async () => {
    const id = 'test-agent';
    await hopSwarm.birthAgent(id, 'shadow');
    expect(hopSwarm.agents.has(id)).toBe(true);
    expect(hopSwarm.agents.get(id).role).toBe('shadow');
  });

  it('should prune the weakest link when max agents is reached', async () => {
    // Fill up to max agents
    for (let i = 0; i < 10; i++) {
      await hopSwarm.birthAgent(`agent-${i}`, 'shadow');
    }
    expect(hopSwarm.agents.size).toBe(10);

    // Birth one more, should trigger prune
    await hopSwarm.birthAgent('agent-10', 'live');
    
    expect(hopSwarm.agents.size).toBe(10);
    expect(hopSwarm.agents.has('agent-10')).toBe(true);
    // One of the shadows should have been pruned (agent-0 in this case as it's the first)
    expect(hopSwarm.agents.has('agent-0')).toBe(false);
  });

  it('should sync ledger correctly', () => {
    const mockData = new Float32Array(140).fill(1.23);
    hopSwarm.syncLedger(mockData);
    
    expect(hopSwarm.biomarkerLeads[0]).toBeCloseTo(1.23);
    expect(hopSwarm.biomarkerLeads[139]).toBeCloseTo(1.23);
  });

  it('should update memory eye and handle delta', () => {
    hopSwarm.updateMemoryEye('test', { delta: 1024 });
    expect(hopSwarm.totalSwarmMemory).toBe(1024);
  });
});
