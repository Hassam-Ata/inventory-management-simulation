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
  
  transitionMatrix: [
    [0.1, 0.4, 0.3, 0.1, 0.1], // Stock-out transitions
    [0.2, 0.5, 0.2, 0.05, 0.05], // Low transitions
    [0.05, 0.2, 0.5, 0.2, 0.05], // Medium transitions
    [0.01, 0.04, 0.25, 0.5, 0.2], // High transitions
    [0.01, 0.01, 0.08, 0.3, 0.6], // Full transitions
  ],

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
    inventory: state.params.initialInventory
  })),

  runSimulation: (days) => {
    const { lambda, reorderPoint, restockAmt, maxInventory } = get().params;
    let currentInv = get().inventory;
    const newHistory: DayRecord[] = [];

    for (let d = 1; d <= days; d++) {
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

      // Restocking logic (End of day)
      if (currentInv <= reorderPoint) {
        currentInv = Math.min(currentInv + restockAmt, maxInventory);
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

    set({ history: newHistory, inventory: currentInv });
  }
}));
