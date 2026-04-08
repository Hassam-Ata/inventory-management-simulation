# Inventory Management Simulation Report

## Project Overview

This project is an interactive inventory management simulation built with Next.js and a shared client-side state store. It models how inventory changes over time when customer demand is random, restocking is triggered by a reorder policy, and long-term behavior is analyzed with a Markov chain.

The application is organized into four main screens:

- **Demand**: models customer arrivals using a Poisson distribution.
- **Markov**: shows the inventory states and their long-term transition behavior.
- **Simulation**: runs day-by-day inventory cycles and records the results.
- **Analysis**: summarizes the simulation output and gives policy recommendations.

The project is useful because it connects theory with a live simulation. Instead of only showing formulas, it demonstrates how demand, restocking, stock-outs, and inventory stability interact in practice.

## How the Project Works

The simulation is driven by a shared store in `lib/store/simulationStore.ts`. That store holds the main inventory parameters and provides the calculations used by every page:

- **Lambda** controls the average demand rate per day.
- **Reorder point** determines when restocking happens.
- **Restock amount** determines how many units are added.
- **Max inventory** caps the inventory level after restocking.
- **Initial inventory** sets the starting stock level.

Two core mathematical models are used:

1. **Poisson demand model** for customer arrivals.
2. **Markov chain model** for inventory state transitions.

The simulation page uses both models together to generate daily inventory records. The analysis page then turns those records into performance metrics and strategic recommendations.

## Demand Page

### What the page shows

The Demand page visualizes the Poisson distribution for daily customer arrivals. It lets the user adjust the average demand rate using a slider and immediately updates the distribution chart.

[place screenshot here]

### What is happening on this page

This screen shows how likely it is to receive 0, 1, 2, 3, and more customer requests in a single day. It displays:

- A bar chart of Poisson probabilities.
- The current value of $\lambda$.
- The maximum probability in the current distribution.
- A formula panel explaining the Poisson model.
- A short list of properties of the distribution.

### How the calculations are done

The Poisson probability of exactly $k$ arrivals is calculated using:

$$P(X = k) = \frac{e^{-\lambda} \cdot \lambda^k}{k!}$$

In the code, this is implemented in the shared store through `computePoissonProb(k)`. The function reads the current $\lambda$ value and returns the probability for each $k$.

The page generates labels from 0 to 10 and calculates the probability for each value. These values are passed into the bar chart so the distribution changes whenever the user adjusts the slider.

### Why this page is helpful

This page helps explain demand uncertainty. In inventory systems, demand is rarely constant, so the Poisson distribution is a realistic way to model how many requests may arrive each day. It is especially useful for understanding why stock-outs can happen even when average demand seems manageable.

## Markov Page

### What the page shows

The Markov page displays the inventory system as a state-based process. It presents both a visual summary of steady-state probabilities and the transition matrix that defines how inventory states move over time.

[place screenshot here]

### What is happening on this page

This screen focuses on long-term inventory behavior. It shows:

- The five inventory states: Stock-out, Low, Medium, High, and Full.
- A pie chart of steady-state probabilities.
- A radar chart for the same distribution.
- The transition matrix $P$.
- A state description card for each inventory level.

The transition matrix shows the probability of moving from one inventory state to another. Each row represents the current state, and each column represents the next state.

### How the calculations are done

The steady-state probabilities are calculated by solving:

$$\pi P = \pi$$

with the additional constraint:

$$\sum \pi_i = 1$$

This means the long-run probability vector $\pi$ must remain unchanged after applying the transition matrix.

In the implementation, the store transposes the matrix, subtracts the identity matrix, replaces one row with the normalization constraint, and then solves the linear system using matrix algebra. If the solver fails, the app falls back to a uniform distribution.

### Why this page is helpful

This page helps explain how inventory behaves over the long term instead of only day-by-day. It is useful for understanding system stability, stock-out risk, and whether the current inventory policy tends to keep the system in healthy states or push it toward shortages.

## Simulation Page

### What the page shows

The Simulation page runs a day-by-day inventory experiment and shows the inventory history in a line chart, summary metrics, and a recent activity table.

[place screenshot here]

### What is happening on this page

This is the operational core of the project. The page lets the user choose how many days to simulate, run the simulation, and reset the results. It displays:

- Inventory over time.
- Daily demand values.
- Fulfillment statistics.
- Parameter values such as reorder point, restock amount, and max capacity.
- A ledger of the most recent simulation days.

### How the calculations are done

Each day in the simulation follows this sequence:

1. A random demand value is sampled from the Poisson distribution.
2. The available inventory before demand is recorded.
3. Fulfilled demand is calculated as the smaller of demand and inventory.
4. Lost demand is the part of demand that could not be fulfilled.
5. Inventory is reduced by the fulfilled demand.
6. If inventory is less than or equal to the reorder point, a restock is triggered.
7. The restock amount is added, but the inventory cannot exceed the maximum capacity.

The store records every day in a history array. Each record stores:

- Day number.
- Demand.
- Inventory before demand.
- Inventory after restocking.
- Whether a stock-out occurred.
- Fulfilled demand.
- Lost demand.

The Poisson demand is sampled by generating a random number and walking through the cumulative distribution until the sampled probability range is reached.

### Why this page is helpful

This page is useful because it shows how the policy performs in practice. Users can see whether the reorder point is too low, whether demand is causing frequent shortages, and how restocking affects the inventory curve. It turns the mathematical model into a concrete operational timeline.

## Analysis Page

### What the page shows

The Analysis page interprets the simulation results and converts them into business-oriented metrics and recommendations.

[place screenshot here]

### What is happening on this page

This screen summarizes the overall performance of the system. It shows:

- Service level.
- Stock-out probability.
- Efficiency score.
- Inventory turnover.
- Benchmark comparison chart.
- Strategic recommendation cards.
- A policy recommendation based on the current demand rate.

If there is no simulation history yet, the page shows a message telling the user to run the simulation first.

### How the calculations are done

The analysis metrics are derived from the simulation history:

- **Total days** = number of simulation records.
- **Stock-out days** = number of days where a stock-out occurred.
- **Total demand** = sum of all daily demand values.
- **Lost demand** = sum of demand that could not be fulfilled.
- **Average inventory** = average of the inventory after each day.

From those values, the page calculates:

- **Stock-out probability** = stock-out days divided by total days.
- **Service level** = fulfilled demand divided by total demand.
- **Inventory turnover** = total demand divided by average inventory.
- **Efficiency score** = a heuristic score based on stock-out frequency.

The policy recommendation uses the current Poisson parameter and suggests a reorder point based on the demand rate. In the current implementation, it recommends a reorder point of roughly $1.5 \times \lambda$ units.

### Why this page is helpful

This page is important because it translates raw simulation output into decision-making guidance. It helps the user understand whether the current policy is efficient, whether stock-outs are too frequent, and how the reorder policy could be adjusted to improve service levels.

## How the Screens Work Together

The four screens form a complete workflow:

- The **Demand** page explains and controls the random demand model.
- The **Markov** page explains the long-term state behavior of the inventory system.
- The **Simulation** page applies those models in a daily operational run.
- The **Analysis** page evaluates the results and turns them into recommendations.

Together, they create a complete inventory management learning tool that connects theory, simulation, and decision support.

## Conclusion

This project demonstrates how inventory systems can be analyzed using probability, state transitions, and simulation. The demand page explains randomness, the Markov page explains long-term state behavior, the simulation page shows operational results, and the analysis page turns those results into actionable insights.

The application is helpful for learning, teaching, and experimenting with inventory policy choices because it makes the impact of demand variability and restocking rules visible in a practical way.
