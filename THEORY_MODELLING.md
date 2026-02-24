# Theory & Mechanics: Inventory Management Simulation

This document explains the mathematical foundations and the logic behind the simulation components of this project.

## 1. System Overview

The dashboard is designed as a feedback loop between **Demand** and **Supply**.

- **Demand** is stochastic (random) and follows a **Poisson Process**.
- **Supply** is managed via a **Reorder Point Policy**, where inventory levels transition between states modeled by a **Markov Chain**.

---

## 2. Poisson Demand Modeling

The Poisson distribution models the number of discrete events (customers) occurring in a fixed interval of time.

### The Formula

The probability of exactly $k$ customers arriving in a day is:
$$P(X=k) = \frac{e^{-\lambda} \cdot \lambda^k}{k!}$$

### Adjusting Lambda ($\lambda$)

**$\lambda$ (Lambda)** represents the **average arrival rate**.

- **Increasing $\lambda$**: Shifts the peak of the histogram to the right. The probability of "high demand" days increases, and the distribution spreads out (variance increases).
- **Decreasing $\lambda$**: Shifts the peak towards zero. The system becomes less active, and "low demand" days become more frequent.

**Impact on Simulation**: High $\lambda$ values will trigger more frequent restocking and increase the risk of stock-outs if the reorder point is too low.

---

## 3. Markov Chain Inventory States

Inventory levels are treated as a sequence of random variables where the current state only depends on the previous state (**Markov Property**).

### States defined:

1. **Stock-out**: Zero inventory.
2. **Low**: Just above zero, below reorder point.
3. **Medium**: Healthy stock levels.
4. **High**: Nearing capacity.
5. **Full**: At maximum capacity.

### Transition Matrix ($P$)

The matrix $P$ defines the probability of moving from state $i$ to state $j$.

- **Rows**: Represent the current state.
- **Columns**: Represent the next state.
- **Logic**: If the current state is "Stock-out", the probability of moving to "Full" depends on the restocking policy transition probabilities.

### Steady-State Probability ($\pi$)

We solve the equation $\pi P = \pi$ to find the long-term probability distribution. This tells us, over a long period, what percentage of time the system will spend in each state (e.g., "What is the 10-year probability of being in a Stock-out status?").

---

## 4. Multi-Cycle Simulation Logic

The simulation combines the static mathematical models into a dynamic time-series.

1. **Demand Sampling**: For each day, we generate a random number and compare it against the _Cumulative Distribution Function_ (CDF) of the Poisson model to "pick" how many customers arrived.
2. **State Mutation**:
   - `Inventory Before` - `Demand` = `Inventory After`.
   - If `Inventory After` $\le$ `Reorder Point`, add `Restock Amount`.
3. **Metrics Tracking**:
   - **Service Level**: Percentage of demand fulfilled without loss.
   - **Lost Demand**: Occurs when customer demand exceeds available inventory before a restock.

---

## 5. Long-Term Analysis

The analysis page aggregates simulation history to provide strategic advice:

- **Optimization**: If the "Stock-out probability" from the Markov solver is higher than the "Actual Stock-out rate" in simulation, the system may be experiencing higher-than-average variance.
- **Safety Stock**: The buffer held between the Reorder Point and zero.
