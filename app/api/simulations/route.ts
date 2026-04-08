import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SimulationPayload = {
  params: {
    lambda: number;
    reorderPoint: number;
    restockAmt: number;
    maxInventory: number;
    initialInventory: number;
  };
  history: Array<{
    day: number;
    demand: number;
    inventoryBefore: number;
    inventoryAfter: number;
    stockOutOccurred: boolean;
    fulfilledDemand: number;
    lostDemand: number;
  }>;
  endingInventory: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SimulationPayload;

    if (!body?.history?.length) {
      return NextResponse.json(
        { error: "Simulation history is required." },
        { status: 400 },
      );
    }

    const run = await prisma.simulationRun.create({
      data: {
        days: body.history.length,
        lambda: body.params.lambda,
        reorderPoint: body.params.reorderPoint,
        restockAmt: body.params.restockAmt,
        maxInventory: body.params.maxInventory,
        initialInventory: body.params.initialInventory,
        endingInventory: body.endingInventory,
        records: {
          create: body.history.map((day) => ({
            day: day.day,
            demand: day.demand,
            inventoryBefore: day.inventoryBefore,
            inventoryAfter: day.inventoryAfter,
            stockOutOccurred: day.stockOutOccurred,
            fulfilledDemand: day.fulfilledDemand,
            lostDemand: day.lostDemand,
          })),
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    console.error("Failed to save simulation run", error);
    return NextResponse.json(
      { error: "Failed to save simulation run." },
      { status: 500 },
    );
  }
}
