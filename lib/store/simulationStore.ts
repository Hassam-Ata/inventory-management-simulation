import { create } from 'zustand';
import * as math from 'mathjs';

export type InventoryState = 'Stock-out' | 'Low' | 'Medium' | 'High' | 'Full';

export interface SimulationParams {
  lambda: number; // Avg customers per day
  reorderPoint: number;
  restockAmt: number;
  maxInventory: number;
  initialInventory: number;
}

export interface DayRecord {
  day: number;
  demand: number;
  inventoryBefore: number;
  inventoryAfter: number;
  stockOutOccurred: boolean;
  fulfilledDemand: number;
  lostDemand: number;
}

interface SimulationStore {
  params: SimulationParams;
  history: DayRecord[];
  inventory: number;
  
  // Markov Transition Matrix
  // [Stock-out, Low, Medium, High, Full]
  transitionMatrix: number[][];
  
  setParams: (params: Partial<SimulationParams>) => void;
  runSimulation: (days: number) => void;
  resetSimulation: () => void;
  computePoissonProb: (k: number) => number;
  getSteadyStateProbabilities: () => number[];
}

const STATE_COUNT = 5;

const createIdentityTransitionMatrix = () =>
  Array.from({ length: STATE_COUNT }, (_, i) =>
    Array.from({ length: STATE_COUNT }, (_, j) => (i === j ? 1 : 0)),
  );

const getInventoryStateIndex = (
  inventory: number,
  maxInventory: number,
): number => {
  if (inventory <= 0) return 0;
  const ratio = inventory / maxInventory;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
};

const buildTransitionMatrixFromHistory = (
  history: DayRecord[],
  maxInventory: number,
  initialInventory: number,
): number[][] => {
  if (history.length < 1) return createIdentityTransitionMatrix();

  const counts = Array.from({ length: STATE_COUNT }, () =>
    Array(STATE_COUNT).fill(0),
  );

  // Include day-0 -> day-1 transition from initial inventory.
  const initialFrom = getInventoryStateIndex(initialInventory, maxInventory);
  const firstTo = getInventoryStateIndex(history[0].inventoryAfter, maxInventory);
  counts[initialFrom][firstTo] += 1;

  for (let i = 0; i < history.length - 1; i++) {
    const from = getInventoryStateIndex(history[i].inventoryAfter, maxInventory);
    const to = getInventoryStateIndex(history[i + 1].inventoryAfter, maxInventory);
    counts[from][to] += 1;
  }

  return counts.map((row, rowIndex) => {
    const total = row.reduce((acc, v) => acc + v, 0);
    if (total === 0) {
      return row.map((_, colIndex) => (colIndex === rowIndex ? 1 : 0));
    }
    return row.map((v) => v / total);
  });
};

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  params: {
    lambda: 3,
    reorderPoint: 5,
    restockAmt: 15,
    maxInventory: 20,
    initialInventory: 15,
  },
  history: [],
  inventory: 15,
  
  transitionMatrix: createIdentityTransitionMatrix(),

  setParams: (newParams) => set((state) => ({ 
    params: { ...state.params, ...newParams } 
  })),

  computePoissonProb: (k) => {
    const { lambda } = get().params;
    // P(X=k) = (e^-lambda * lambda^k) / k!
    return (Math.exp(-lambda) * Math.pow(lambda, k)) / math.factorial(k);
  },

  getSteadyStateProbabilities: () => {
    const P = get().transitionMatrix;
    // Solving πP = π and Σπ = 1
    // Aπ = 0 where A = (P^T - I)
    // We add the Σπ = 1 constraint by replacing one row
    const size = P.length;
    const A = math.transpose(P) as number[][];
    
    for (let i = 0; i < size; i++) {
      A[i][i] -= 1;
    }
    
    // Replace last row with Σπ = 1
    for (let j = 0; j < size; j++) {
      A[size - 1][j] = 1;
    }
    
    const B = new Array(size).fill(0);
    B[size - 1] = 1;

    try {
      const solution = math.lusolve(A, B) as number[][];
      return solution.flat();
    } catch (e) {
      console.error("Failed to solve steady state", e);
      return new Array(size).fill(1/size);
    }
  },

  resetSimulation: () => set((state) => ({
    history: [],
    inventory: state.params.initialInventory,
    transitionMatrix: createIdentityTransitionMatrix(),
  })),

  runSimulation: (days) => {
    const { lambda, reorderPoint, restockAmt, maxInventory, initialInventory } = get().params;
    let currentInv = initialInventory;
    let incomingNextDay = 0;
    const newHistory: DayRecord[] = [];

    for (let d = 1; d <= days; d++) {
      // Receive orders placed yesterday (Lead time L = 1 day)
      if (incomingNextDay > 0) {
        currentInv = Math.min(currentInv + incomingNextDay, maxInventory);
        incomingNextDay = 0;
      }

      // Generate Poisson Demand
      // Use math.random() and cumulative distribution to sample
      let demand = 0;
      let cumProb = 0;
      const r = Math.random();
      while (true) {
        const prob = (Math.exp(-lambda) * Math.pow(lambda, demand)) / math.factorial(demand);
        cumProb += prob;
        if (r <= cumProb || demand > 20) break;
        demand++;
      }

      const invBefore = currentInv;
      const fulfilled = Math.min(demand, currentInv);
      const lost = Math.max(0, demand - currentInv);
      currentInv -= fulfilled;
      
      const stockOut = currentInv === 0 && demand > invBefore;

      // Place order at day end; it arrives next day.
      if (currentInv <= reorderPoint) {
        incomingNextDay += restockAmt;
      }

      newHistory.push({
        day: d,
        demand,
        inventoryBefore: invBefore,
        inventoryAfter: currentInv,
        stockOutOccurred: stockOut,
        fulfilledDemand: fulfilled,
        lostDemand: lost
      });
    }

    const transitionMatrix = buildTransitionMatrixFromHistory(
      newHistory,
      maxInventory,
      initialInventory,
    );

    set({ history: newHistory, inventory: currentInv, transitionMatrix });
  }
}));
