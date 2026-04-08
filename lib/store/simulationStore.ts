import { create } from 'zustand';
import * as math from 'mathjs';

export type InventoryState = 'Stock-out' | 'Low' | 'Medium' | 'High' | 'Full';

const INVENTORY_STATES: InventoryState[] = ['Stock-out', 'Low', 'Medium', 'High', 'Full'];

export interface SimulationParams {
  lambda: number; // Avg customers per day
  dynamicLambdaEnabled: boolean;
  dynamicLambdaWindow: number;
  reorderPoint: number;
  restockAmt: number;
  maxInventory: number;
  initialInventory: number;
  leadTimeDays: number;
  zScore: number;
  targetServiceLevel: number;
}

export interface DayRecord {
  day: number;
  demand: number;
  lambdaUsed: number;
  inventoryBefore: number;
  inventoryAfter: number;
  pendingOrders: number;
  pipelineStock: number;
  receivedStock: number;
  orderedStock: number;
  stockOutOccurred: boolean;
  fulfilledDemand: number;
  lostDemand: number;
}

export interface CostParams {
  holdingCostPerUnitPerDay: number;
  stockOutCostPerUnit: number;
  orderingCostPerOrder: number;
}

export interface CostSummary {
  holdingCost: number;
  stockOutCost: number;
  orderingCost: number;
  totalCost: number;
}

export interface MarkovComparisonRow {
  metric: string;
  theoretical: number;
  simulation: number;
}

export interface OptimizationResult {
  reorderPoint: number;
  restockAmt: number;
  serviceLevel: number;
  totalCost: number;
}

export interface MonteCarloResult {
  averageServiceLevel: number;
  confidenceInterval95: [number, number];
  stockOutDistribution: number[];
  averageTotalCost: number;
}

export type ScenarioPreset = 'high-demand' | 'low-inventory' | 'aggressive-restocking';

interface PendingOrder {
  quantity: number;
  arrivalDay: number;
}

interface SimulationStore {
  params: SimulationParams;
  costParams: CostParams;
  history: DayRecord[];
  inventory: number;
  
  // Markov Transition Matrix
  // [Stock-out, Low, Medium, High, Full]
  transitionMatrix: number[][];
  dynamicTransitionMatrixEnabled: boolean;
  
  setParams: (params: Partial<SimulationParams>) => void;
  setCostParams: (params: Partial<CostParams>) => void;
  setDynamicTransitionMatrixEnabled: (enabled: boolean) => void;
  runSimulation: (days: number) => void;
  runScenarioPreset: (preset: ScenarioPreset, days?: number) => void;
  resetSimulation: () => void;
  computePoissonProb: (k: number, lambdaOverride?: number) => number;
  getSteadyStateProbabilities: () => number[];
  getDynamicTransitionMatrix: () => number[][];
  getEffectiveTransitionMatrix: () => number[][];
  getStateDistributionFromSimulation: () => number[];
  getMarkovComparison: () => MarkovComparisonRow[];
  getCostSummary: () => CostSummary;
  getOptimizationRecommendation: () => OptimizationResult;
  runMonteCarlo: (runs: number, days: number) => MonteCarloResult;
  getRiskAnalysis: (daysAhead: number) => {
    stockOutProbabilityPercent: number;
    worstCaseDemandSpike: number;
    minimumInventoryReached: number;
  };
}

function samplePoisson(lambda: number): number {
  let demand = 0;
  let cumProb = 0;
  const randomValue = Math.random();

  while (true) {
    const prob = (Math.exp(-lambda) * Math.pow(lambda, demand)) / math.factorial(demand);
    cumProb += prob;
    if (randomValue <= cumProb || demand > 50) {
      break;
    }
    demand++;
  }

  return demand;
}

function getInventoryState(inventory: number, maxInventory: number): InventoryState {
  if (inventory <= 0) {
    return 'Stock-out';
  }

  const ratio = inventory / maxInventory;
  if (ratio <= 0.25) {
    return 'Low';
  }
  if (ratio <= 0.5) {
    return 'Medium';
  }
  if (ratio <= 0.8) {
    return 'High';
  }

  return 'Full';
}

function getStateIndex(state: InventoryState): number {
  return INVENTORY_STATES.indexOf(state);
}

function fallbackMatrix(size: number): number[][] {
  return Array.from({ length: size }, () => new Array(size).fill(1 / size));
}

function computeSteadyState(matrix: number[][]): number[] {
  const size = matrix.length;
  const A = math.transpose(matrix) as number[][];

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
  } catch (error) {
    console.error('Failed to solve steady state', error);
    return new Array(size).fill(1 / size);
  }
}

function buildDynamicTransitionMatrix(history: DayRecord[], maxInventory: number): number[][] {
  const size = INVENTORY_STATES.length;
  if (history.length < 2) {
    return fallbackMatrix(size);
  }

  const transitions = Array.from({ length: size }, () => new Array(size).fill(0));
  const totals = new Array(size).fill(0);

  for (let i = 1; i < history.length; i++) {
    const prev = getInventoryState(history[i - 1].inventoryAfter, maxInventory);
    const next = getInventoryState(history[i].inventoryAfter, maxInventory);
    const fromIndex = getStateIndex(prev);
    const toIndex = getStateIndex(next);
    transitions[fromIndex][toIndex] += 1;
    totals[fromIndex] += 1;
  }

  return transitions.map((row, rowIndex) => {
    if (totals[rowIndex] === 0) {
      return new Array(size).fill(1 / size);
    }
    return row.map((count) => count / totals[rowIndex]);
  });
}

function calculateCostSummary(history: DayRecord[], costParams: CostParams): CostSummary {
  let holdingCost = 0;
  let stockOutCost = 0;
  let orderingCost = 0;

  for (const day of history) {
    holdingCost += day.inventoryAfter * costParams.holdingCostPerUnitPerDay;
    stockOutCost += day.lostDemand * costParams.stockOutCostPerUnit;
    if (day.orderedStock > 0) {
      orderingCost += costParams.orderingCostPerOrder;
    }
  }

  return {
    holdingCost,
    stockOutCost,
    orderingCost,
    totalCost: holdingCost + stockOutCost + orderingCost,
  };
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = (sortedValues.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function simulateDays(
  days: number,
  params: SimulationParams,
  initialInventory: number,
  startHistory: DayRecord[] = [],
): { history: DayRecord[]; endingInventory: number } {
  let currentInv = initialInventory;
  const newHistory: DayRecord[] = [];
  const pendingOrders: PendingOrder[] = [];

  for (let day = 1; day <= days; day++) {
    const globalDay = startHistory.length + day;

    let receivedStock = 0;
    for (let idx = pendingOrders.length - 1; idx >= 0; idx--) {
      if (pendingOrders[idx].arrivalDay === globalDay) {
        receivedStock += pendingOrders[idx].quantity;
        pendingOrders.splice(idx, 1);
      }
    }

    if (receivedStock > 0) {
      currentInv = Math.min(currentInv + receivedStock, params.maxInventory);
    }

    const combinedHistory = [...startHistory, ...newHistory];
    const dynamicWindow = Math.max(1, params.dynamicLambdaWindow);
    const recentDays = combinedHistory.slice(-dynamicWindow);
    const dynamicLambda = recentDays.length
      ? recentDays.reduce((sum, rec) => sum + rec.demand, 0) / recentDays.length
      : params.lambda;
    const lambdaUsed = params.dynamicLambdaEnabled ? dynamicLambda : params.lambda;

    const demand = samplePoisson(Math.max(0.1, lambdaUsed));
    const invBefore = currentInv;
    const fulfilled = Math.min(demand, currentInv);
    const lost = Math.max(0, demand - currentInv);
    currentInv -= fulfilled;

    const stockOut = lost > 0;
    let orderedStock = 0;
    if (currentInv <= params.reorderPoint) {
      orderedStock = params.restockAmt;
      pendingOrders.push({
        quantity: params.restockAmt,
        arrivalDay: globalDay + Math.max(0, params.leadTimeDays),
      });
    }

    const pendingOrdersQty = pendingOrders.reduce((sum, order) => sum + order.quantity, 0);

    newHistory.push({
      day: globalDay,
      demand,
      lambdaUsed,
      inventoryBefore: invBefore,
      inventoryAfter: currentInv,
      pendingOrders: pendingOrders.length,
      pipelineStock: pendingOrdersQty,
      receivedStock,
      orderedStock,
      stockOutOccurred: stockOut,
      fulfilledDemand: fulfilled,
      lostDemand: lost,
    });
  }

  return {
    history: newHistory,
    endingInventory: currentInv,
  };
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  params: {
    lambda: 3,
    dynamicLambdaEnabled: false,
    dynamicLambdaWindow: 7,
    reorderPoint: 5,
    restockAmt: 15,
    maxInventory: 20,
    initialInventory: 15,
    leadTimeDays: 2,
    zScore: 1.65,
    targetServiceLevel: 95,
  },
  costParams: {
    holdingCostPerUnitPerDay: 1,
    stockOutCostPerUnit: 7,
    orderingCostPerOrder: 25,
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
  dynamicTransitionMatrixEnabled: false,

  setParams: (newParams) => set((state) => ({ 
    params: { ...state.params, ...newParams } 
  })),

  setCostParams: (newParams) =>
    set((state) => ({
      costParams: { ...state.costParams, ...newParams },
    })),

  setDynamicTransitionMatrixEnabled: (enabled) =>
    set({ dynamicTransitionMatrixEnabled: enabled }),

  computePoissonProb: (k, lambdaOverride) => {
    const { lambda } = get().params;
    const effectiveLambda = lambdaOverride ?? lambda;
    // P(X=k) = (e^-lambda * lambda^k) / k!
    return (Math.exp(-effectiveLambda) * Math.pow(effectiveLambda, k)) / math.factorial(k);
  },

  getSteadyStateProbabilities: () => {
    return computeSteadyState(get().getEffectiveTransitionMatrix());
  },

  getDynamicTransitionMatrix: () => {
    const { history, params } = get();
    return buildDynamicTransitionMatrix(history, params.maxInventory);
  },

  getEffectiveTransitionMatrix: () => {
    const { dynamicTransitionMatrixEnabled, transitionMatrix } = get();
    if (dynamicTransitionMatrixEnabled) {
      return get().getDynamicTransitionMatrix();
    }
    return transitionMatrix;
  },

  getStateDistributionFromSimulation: () => {
    const { history, params } = get();
    if (history.length === 0) {
      return new Array(INVENTORY_STATES.length).fill(0);
    }

    const counts = new Array(INVENTORY_STATES.length).fill(0);
    history.forEach((record) => {
      const state = getInventoryState(record.inventoryAfter, params.maxInventory);
      counts[getStateIndex(state)] += 1;
    });

    return counts.map((count) => count / history.length);
  },

  getMarkovComparison: () => {
    const theoretical = get().getSteadyStateProbabilities();
    const simulation = get().getStateDistributionFromSimulation();
    return [
      {
        metric: 'Stock-out',
        theoretical: theoretical[0] ?? 0,
        simulation: simulation[0] ?? 0,
      },
      {
        metric: 'Medium',
        theoretical: theoretical[2] ?? 0,
        simulation: simulation[2] ?? 0,
      },
    ];
  },

  resetSimulation: () => set((state) => ({
    history: [],
    inventory: state.params.initialInventory
  })),

  runSimulation: (days) => {
    const { params, history, inventory } = get();
    const result = simulateDays(days, params, history.length ? history[history.length - 1].inventoryAfter : inventory, history);
    set({ history: [...history, ...result.history], inventory: result.endingInventory });
  },

  runScenarioPreset: (preset, days = 30) => {
    const base = get().params;
    let nextParams: Partial<SimulationParams> = {};

    if (preset === 'high-demand') {
      nextParams = { lambda: Math.max(base.lambda + 2, base.lambda * 1.35) };
    }
    if (preset === 'low-inventory') {
      nextParams = { initialInventory: Math.max(1, Math.floor(base.initialInventory * 0.5)) };
    }
    if (preset === 'aggressive-restocking') {
      nextParams = {
        reorderPoint: Math.min(base.maxInventory - 1, base.reorderPoint + 3),
        restockAmt: Math.min(base.maxInventory, base.restockAmt + 5),
      };
    }

    set((state) => ({
      params: { ...state.params, ...nextParams },
      history: [],
      inventory: (nextParams.initialInventory ?? state.params.initialInventory),
    }));

    get().runSimulation(days);
  },

  getCostSummary: () => {
    const { history, costParams } = get();
    return calculateCostSummary(history, costParams);
  },

  getOptimizationRecommendation: () => {
    const { params, costParams } = get();
    let best: OptimizationResult = {
      reorderPoint: params.reorderPoint,
      restockAmt: params.restockAmt,
      serviceLevel: 0,
      totalCost: Number.POSITIVE_INFINITY,
    };

    for (let reorderPoint = 1; reorderPoint <= params.maxInventory - 1; reorderPoint++) {
      for (let restockAmt = 2; restockAmt <= params.maxInventory; restockAmt += 2) {
        const testParams: SimulationParams = {
          ...params,
          reorderPoint,
          restockAmt,
        };

        const simulation = simulateDays(60, testParams, testParams.initialInventory);
        const totalDemand = simulation.history.reduce((sum, day) => sum + day.demand, 0);
        const lostDemand = simulation.history.reduce((sum, day) => sum + day.lostDemand, 0);
        const serviceLevel = totalDemand > 0 ? ((totalDemand - lostDemand) / totalDemand) * 100 : 100;
        const costs = calculateCostSummary(simulation.history, costParams);

        if (serviceLevel >= params.targetServiceLevel && costs.totalCost < best.totalCost) {
          best = {
            reorderPoint,
            restockAmt,
            serviceLevel,
            totalCost: costs.totalCost,
          };
        }
      }
    }

    if (!Number.isFinite(best.totalCost)) {
      const fallbackSimulation = simulateDays(60, params, params.initialInventory);
      const totalDemand = fallbackSimulation.history.reduce((sum, day) => sum + day.demand, 0);
      const lostDemand = fallbackSimulation.history.reduce((sum, day) => sum + day.lostDemand, 0);
      const serviceLevel = totalDemand > 0 ? ((totalDemand - lostDemand) / totalDemand) * 100 : 100;
      const costs = calculateCostSummary(fallbackSimulation.history, costParams);
      return {
        reorderPoint: params.reorderPoint,
        restockAmt: params.restockAmt,
        serviceLevel,
        totalCost: costs.totalCost,
      };
    }

    return best;
  },

  runMonteCarlo: (runs, days) => {
    const { params, costParams } = get();
    const serviceLevels: number[] = [];
    const stockOutDistribution: number[] = [];
    const totalCosts: number[] = [];

    for (let i = 0; i < runs; i++) {
      const simulation = simulateDays(days, params, params.initialInventory);
      const totalDemand = simulation.history.reduce((sum, day) => sum + day.demand, 0);
      const lostDemand = simulation.history.reduce((sum, day) => sum + day.lostDemand, 0);
      const stockOutDays = simulation.history.filter((day) => day.stockOutOccurred).length;
      const serviceLevel = totalDemand > 0 ? ((totalDemand - lostDemand) / totalDemand) * 100 : 100;
      const costs = calculateCostSummary(simulation.history, costParams);

      serviceLevels.push(serviceLevel);
      stockOutDistribution.push(stockOutDays);
      totalCosts.push(costs.totalCost);
    }

    const sortedLevels = [...serviceLevels].sort((a, b) => a - b);
    const avgServiceLevel = serviceLevels.reduce((sum, level) => sum + level, 0) / Math.max(1, serviceLevels.length);
    const avgCost = totalCosts.reduce((sum, cost) => sum + cost, 0) / Math.max(1, totalCosts.length);

    return {
      averageServiceLevel: avgServiceLevel,
      confidenceInterval95: [percentile(sortedLevels, 0.025), percentile(sortedLevels, 0.975)],
      stockOutDistribution,
      averageTotalCost: avgCost,
    };
  },

  getRiskAnalysis: (daysAhead) => {
    const { params, history } = get();
    const combinedDemands = history.map((entry) => entry.demand);
    const demandValues = combinedDemands.length > 0 ? combinedDemands : [params.lambda];
    const mean = demandValues.reduce((sum, value) => sum + value, 0) / demandValues.length;
    const variance = demandValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / demandValues.length;
    const stdDev = Math.sqrt(variance);

    const forecastDemand = mean * daysAhead + params.zScore * stdDev * Math.sqrt(daysAhead);
    const currentInventory = get().inventory;
    const pipelineStock = history.length > 0 ? history[history.length - 1].pipelineStock : 0;
    const stockOutProbabilityPercent = Math.max(0, Math.min(100, ((forecastDemand - (currentInventory + pipelineStock)) / Math.max(1, forecastDemand)) * 100));
    const worstCaseDemandSpike = Math.ceil(mean + 2.5 * stdDev);
    const minimumInventoryReached = history.length ? Math.min(...history.map((day) => day.inventoryAfter)) : currentInventory;

    return {
      stockOutProbabilityPercent,
      worstCaseDemandSpike,
      minimumInventoryReached,
    };
  },
}));
