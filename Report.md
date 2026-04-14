# Inventory Management Simulation Report

## Project Overview

This project is an interactive inventory management simulator built with Next.js, Zustand, Chart.js, and Prisma. It combines demand randomness, policy controls, Markov-state analytics, and saved-run comparison in one workflow.

The current application includes these major screens:

- Overview
- Poisson Demand
- Parameters
- Markov Chain
- Simulation
- Comparison
- History
- Analysis

The key objective is to connect mathematical models with operational behavior so policy choices can be tested and compared using both live and persisted simulation runs.

## System Architecture

### Core state and simulation engine

The shared simulation logic is implemented in `lib/store/simulationStore.ts`.

Main runtime parameters:

- Lambda ($\lambda$): average daily demand rate
- Reorder point
- Refill amount
- Max inventory
- Initial inventory

Main data structures:

- `history`: array of daily simulation records
- `transitionMatrix`: Markov transition matrix derived from the latest run

### Persistence layer

Simulation runs are stored in PostgreSQL through Prisma models:

- `SimulationRun`
- `DayRecord`

Relevant API endpoint:

- `app/api/simulations/route.ts`
	- `POST`: saves a run and its daily records
	- `GET`: returns saved runs with records for history and comparison

## Key Modeling Logic (Updated)

### 1. Poisson demand model

Daily demand follows:

$$
P(X=k)=\frac{e^{-\lambda}\lambda^k}{k!}
$$

The simulator samples demand by cumulative probability inversion (random number + cumulative Poisson mass).

### 2. Restocking policy with lead time $L=1$

The simulator now uses next-day replenishment:

1. Receive pending restock at day start (if any).
2. Sample and fulfill demand.
3. Compute lost demand and stock-out event.
4. If end-of-day inventory is at or below reorder point, place order to arrive next day.

This is more realistic than same-day replenishment and creates clearer low-inventory and stock-out dynamics.

### 3. Markov transition matrix from current run history

The transition matrix is no longer hardcoded. It is estimated from the current simulation run only.

State mapping uses inventory ratio $r=\frac{inventory}{maxInventory}$:

- Stock-out: $inventory \le 0$
- Low: $r \le 0.25$
- Medium: $0.25 < r \le 0.5$
- High: $0.5 < r \le 0.75$
- Full: $r > 0.75$

Transition counting includes:

- Day 0 -> Day 1 transition (initial inventory to first simulated day)
- All consecutive day transitions in the run

Each row is normalized to probabilities. If a row has no observed outgoing transitions, it falls back to an identity row for stochastic validity.

### 4. Steady-state probabilities

The Markov screen computes long-run state occupancy by solving:

$$
\pi P = \pi,\quad \sum_i \pi_i = 1
$$

The implementation forms a linear system from $P^T - I$ and a normalization row, then solves with LU decomposition.

## Page-by-Page Functionality

## Overview Page

Purpose:

- Entry screen explaining the system concept and flow (demand -> inventory state -> reorder logic).

## Poisson Demand Page

Purpose:

- Interactive explanation of demand uncertainty.

Main features:

- Lambda slider
- Poisson distribution bar chart
- Mathematical formula panel
- Quick statistical indicators

## Parameters Page (New)

Purpose:

- Central control deck for policy inputs and valid parameter ranges.

Main features:

- Dedicated slider controls for:
	- Max inventory
	- Reorder point
	- Refill amount
	- Initial inventory
- Lambda shown as live value (informational)
- Active range panel
- Live state-map panel showing numeric ranges for Stock-out, Low, Medium, High, Full based on current max inventory
- Restock logic summary for lead time $L=1$

UI notes:

- Sliders use a standard filled-track style where the thumb aligns with progress fill.
- Sliders are independent (one slider does not auto-adjust others).

## Markov Chain Page

Purpose:

- Analyze long-run state behavior of the latest run.

Main features:

- Transition matrix table
- Steady-state pie chart
- Steady-state radar chart
- State probability cards

Important update:

- Matrix values are empirically computed from run history, not static constants.

## Simulation Page

Purpose:

- Run day-by-day operational simulation and view detailed daily results.

Main features:

- Configurable number of simulation days
- Inventory and demand line chart
- Fulfillment/stock-out summary cards
- Day-level ledger
- Save-to-database flow with status feedback

Computation outputs captured per day:

- Demand
- Inventory before demand
- Inventory after demand (end-of-day state used by Markov estimation)
- Fulfilled and lost demand
- Stock-out flag

## Comparison Page (New)

Purpose:

- Compare 2 to 5 saved runs under explicit experimental constraints.

Two comparison modes:

1. Policy Strategy Comparison
2. System Stress Test / Sensitivity Analysis

Rule validation (enforced in UI):

- Both modes:
	- Must select 2 to 5 runs
	- Selected runs must have the same total simulation days
- Policy Strategy Comparison:
	- Lambda must be identical across selected runs
- System Stress Test / Sensitivity Analysis:
	- Reorder point must be constant
	- Refill amount must be constant
	- Lambda may vary

Outputs:

- Multi-run inventory trajectory chart
- Fulfillment vs stock-out percentage chart
- Comparative metrics table (lambda, policy params, fulfillment, stock-out, lost demand, ending inventory)

## History Page

Purpose:

- Browse persisted simulation runs and inspect day-level records.

Main features:

- Run cards with timestamp and parameter chips
- Detailed per-day table
- Lead-time and pending-order related columns supported by persistence model

## Analysis Page

Purpose:

- Convert simulation data into business-facing performance KPIs.

Metrics shown:

- Stock-out probability
- Service level
- Inventory turnover
- Efficiency score (project-specific heuristic)

Current formulas:

- Stock-out probability:

$$
\frac{stockOutDays}{totalDays}\times 100
$$

- Service level:

$$
\left(1-\frac{lostDemand}{totalDemand}\right)\times 100
$$

- Inventory turnover:

$$
\frac{totalDemand}{averageInventory}
$$

- Efficiency score:

$$
85-\left(\frac{stockOutDays}{totalDays}\times 100\right)
$$

The page also generates recommendation cards based on stock-out probability and turnover thresholds.

## End-to-End Workflow

Typical flow now is:

1. Tune policy parameters in Parameters.
2. Inspect demand profile in Poisson Demand.
3. Run simulation and persist selected runs.
4. Review long-run transitions in Markov Chain.
5. Compare multiple saved runs in Comparison using valid experimental constraints.
6. Use Analysis for KPI interpretation and policy guidance.
7. Audit raw saved records in History.

## Notes and Current Scope

- Markov transitions are computed from the in-memory current run history.
- Comparison operates on persisted history data from the database.
- The project currently supports fixed one-day replenishment delay in the main simulation flow.

## Conclusion

The project has evolved from a basic demand-simulation demo into a multi-page decision-support system that supports parameter tuning, empirical Markov modeling, run persistence, constrained multi-run comparison, and KPI-driven analysis.

It now provides a stronger experimentation loop for inventory policy design: configure -> simulate -> persist -> compare -> analyze.
