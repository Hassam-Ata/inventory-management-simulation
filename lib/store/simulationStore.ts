import { create } from 'zustand';
import * as math from 'mathjs';

export type InventoryState = 'Stock-out' | 'Low' | 'Medium' | 'High' | 'Full';

export interface SimulationParams {
  lambda: number; // Avg customers per day
  reorderPoint: number;
  restockAmt: number;
  maxInventory: number;
  initialInventory: number;
  leadTimeMin: number;
  leadTimeMax: number;
}

export interface DayRecord {
  day: number;
  demand: number;
  inventoryBefore: number;
  inventoryAfter: number;
  stockOutOccurred: boolean;
  fulfilledDemand: number;
  lostDemand: number;
  receivedQty: number;
  orderPlacedQty: number;
  orderLeadTime: number | null;
  pendingOrdersEndOfDay: number;
  pendingUnitsEndOfDay: number;
}

interface LeadTimeAwareModel {
  states: string[];
  transitionMatrix: number[][];
  steadyState: number[];
}

interface PendingOrder {
  quantity: number;
  arrivalDay: number;
  leadTime: number;
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
  getLeadTimeAwareTransitionModel: () => LeadTimeAwareModel;
}

const BASE_STATES: InventoryState[] = ["Stock-out", "Low", "Medium", "High", "Full"];

function solveSteadyState(transitionMatrix: number[][]): number[] {
  const size = transitionMatrix.length;
  const A = math.transpose(transitionMatrix) as number[][];

  for (let i = 0; i < size; i++) {
    A[i][i] -= 1;
  }

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
    return new Array(size).fill(1 / size);
  }
}

function getInventoryState(inventory: number, maxInventory: number): InventoryState {
  if (inventory <= 0) return "Stock-out";
  if (inventory <= Math.max(1, Math.floor(maxInventory * 0.25))) return "Low";
  if (inventory <= Math.floor(maxInventory * 0.6)) return "Medium";
  if (inventory < maxInventory) return "High";
  return "Full";
}

function sampleUniformInt(min: number, max: number): number {
  const lo = Math.max(1, Math.floor(Math.min(min, max)));
  const hi = Math.max(lo, Math.floor(Math.max(min, max)));
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  params: {
    lambda: 3,
    reorderPoint: 5,
    restockAmt: 15,
    maxInventory: 20,
    initialInventory: 15,
    leadTimeMin: 1,
    leadTimeMax: 3,
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
    return solveSteadyState(P);
  },

  getLeadTimeAwareTransitionModel: () => {
    const { history, params } = get();
    const states = [
      ...BASE_STATES.map((s) => `${s} | No PO`),
      ...BASE_STATES.map((s) => `${s} | Pending PO`),
    ];

    const size = states.length;
    const matrix = Array.from({ length: size }, () => new Array(size).fill(0));

    if (history.length < 2) {
      for (let i = 0; i < size; i++) {
        matrix[i][i] = 1;
      }

      return {
        states,
        transitionMatrix: matrix,
        steadyState: new Array(size).fill(1 / size),
      };
    }

    const toIndex = (record: DayRecord) => {
      const invState = getInventoryState(record.inventoryAfter, params.maxInventory);
      const invIdx = BASE_STATES.indexOf(invState);
      const pendingOffset = record.pendingOrdersEndOfDay > 0 ? BASE_STATES.length : 0;
      return invIdx + pendingOffset;
    };

    for (let i = 0; i < history.length - 1; i++) {
      const fromIdx = toIndex(history[i]);
      const toIdx = toIndex(history[i + 1]);
      matrix[fromIdx][toIdx] += 1;
    }

    for (let i = 0; i < size; i++) {
      const rowSum = matrix[i].reduce((acc, value) => acc + value, 0);
      if (rowSum === 0) {
        matrix[i][i] = 1;
        continue;
      }
      matrix[i] = matrix[i].map((value) => value / rowSum);
    }

    return {
      states,
      transitionMatrix: matrix,
      steadyState: solveSteadyState(matrix),
    };
  },

  resetSimulation: () => set((state) => ({
    history: [],
    inventory: state.params.initialInventory
  })),

  runSimulation: (days) => {
    const {
      lambda,
      reorderPoint,
      restockAmt,
      maxInventory,
      initialInventory,
      leadTimeMin,
      leadTimeMax,
    } = get().params;
    let currentInv = initialInventory;
    const newHistory: DayRecord[] = [];
    let pendingOrders: PendingOrder[] = [];

    for (let d = 1; d <= days; d++) {
      const arrivingOrders = pendingOrders.filter((order) => order.arrivalDay === d);
      const receivedQty = arrivingOrders.reduce((sum, order) => sum + order.quantity, 0);
      currentInv = Math.min(maxInventory, currentInv + receivedQty);
      pendingOrders = pendingOrders.filter((order) => order.arrivalDay > d);

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

      let orderPlacedQty = 0;
      let orderLeadTime: number | null = null;

      // Restocking logic (End of day): place one pending order with stochastic lead time.
      if (currentInv <= reorderPoint && pendingOrders.length === 0) {
        orderLeadTime = sampleUniformInt(leadTimeMin, leadTimeMax);
        orderPlacedQty = restockAmt;
        pendingOrders.push({
          quantity: restockAmt,
          leadTime: orderLeadTime,
          arrivalDay: d + orderLeadTime,
        });
      }

      const pendingUnitsEndOfDay = pendingOrders.reduce(
        (sum, order) => sum + order.quantity,
        0,
      );

      newHistory.push({
        day: d,
        demand,
        inventoryBefore: invBefore,
        inventoryAfter: currentInv,
        stockOutOccurred: stockOut,
        fulfilledDemand: fulfilled,
        lostDemand: lost,
        receivedQty,
        orderPlacedQty,
        orderLeadTime,
        pendingOrdersEndOfDay: pendingOrders.length,
        pendingUnitsEndOfDay,
      });
    }

    set({ history: newHistory, inventory: currentInv });
  }
}));
