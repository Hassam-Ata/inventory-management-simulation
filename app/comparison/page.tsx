import { prisma } from "@/lib/prisma";
import ComparisonDashboard from "@/components/ComparisonDashboard";

export const dynamic = "force-dynamic";

type ComparisonRecord = {
  id: string;
  simulationRunId: string;
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
  pendingOrdersEod: number;
  pendingUnitsEod: number;
};

type ComparisonRun = {
  id: string;
  createdAt: Date;
  days: number;
  lambda: number;
  reorderPoint: number;
  restockAmt: number;
  maxInventory: number;
  initialInventory: number;
  leadTimeMin: number;
  leadTimeMax: number;
  endingInventory: number;
  records: ComparisonRecord[];
};

export default async function ComparisonPage() {
  const runs = (await prisma.simulationRun.findMany({
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
  })) as unknown as ComparisonRun[];

  const serializedRuns = runs.map((run) => ({
    ...run,
    createdAt: run.createdAt.toISOString(),
    records: run.records.map((record) => ({
      ...record,
    })),
  }));

  return <ComparisonDashboard runs={serializedRuns} />;
}
