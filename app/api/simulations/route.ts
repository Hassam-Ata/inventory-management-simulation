import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SimulationPayload = {
  params: {
    lambda: number;
    reorderPoint: number;
    restockAmt: number;
    maxInventory: number;
    initialInventory: number;
    leadTimeMin: number;
    leadTimeMax: number;
  };
  history: Array<{
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
  }>;
  endingInventory: number;
};

export async function GET() {
  try {
    const runs = await prisma.simulationRun.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        records: {
          orderBy: {
            day: "asc",
          },
        },
      },
    });

    return NextResponse.json(runs, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch simulation runs", error);
    return NextResponse.json(
      { error: "Failed to fetch simulation runs." },
      { status: 500 },
    );
  }
}

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
        leadTimeMin: body.params.leadTimeMin,
        leadTimeMax: body.params.leadTimeMax,
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
            receivedQty: day.receivedQty,
            orderPlacedQty: day.orderPlacedQty,
            orderLeadTime: day.orderLeadTime,
            pendingOrdersEod: day.pendingOrdersEndOfDay,
            pendingUnitsEod: day.pendingUnitsEndOfDay,
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
