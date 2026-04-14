import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HistoryRecord = {
  id: string;
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

type HistoryRun = {
  id: string;
  createdAt: Date;
  days: number;
  lambda: number;
  reorderPoint: number;
  restockAmt: number;
  maxInventory: number;
  leadTimeMin: number;
  leadTimeMax: number;
  records: HistoryRecord[];
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function HistoryPage() {
  const runs: HistoryRun[] = await prisma.simulationRun.findMany({
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

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <header>
        <h1 className="text-3xl font-black text-platinum tracking-tight">
          Simulation <span className="text-orange-500">History</span>
        </h1>
        <p className="text-prussian-blue-800">
          Review all saved simulation runs and day-by-day results.
        </p>
      </header>

      {runs.length === 0 ? (
        <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl p-8">
          <p className="text-prussian-blue-800 font-semibold">
            No simulation history found yet. Run a simulation from the
            Simulation tab to start building history.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {runs.map((run) => (
            <section
              key={run.id}
              className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl overflow-hidden shadow-xl"
            >
              <div className="p-6 border-b border-prussian-blue-300 bg-prussian-blue-300/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-bold text-lg text-platinum">
                    Run on {formatDate(run.createdAt)}
                  </h2>
                  <span className="text-xs font-bold text-prussian-blue-700 uppercase">
                    {run.days} Days
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <InfoChip label="Lambda" value={run.lambda} />
                  <InfoChip label="Reorder Point" value={run.reorderPoint} />
                  <InfoChip label="Restock Amount" value={run.restockAmt} />
                  <InfoChip label="Max Inventory" value={run.maxInventory} />

                </div>
              </div>

              <div className="overflow-x-auto max-h-105">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs font-bold text-prussian-blue-800 uppercase bg-prussian-blue-500/30 sticky top-0">
                    <tr>
                      <th className="px-6 py-4">Day</th>
                      <th className="px-6 py-4">Demand</th>
                      <th className="px-6 py-4">Before</th>
                      <th className="px-6 py-4">After</th>
                      <th className="px-6 py-4">Fulfilled</th>
                      <th className="px-6 py-4">Lost</th>
                      <th className="px-6 py-4">Received</th>
                      <th className="px-6 py-4">Ordered</th>
                      <th className="px-6 py-4">Pending</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-prussian-blue-300">
                    {run.records.map((day) => (
                      <tr
                        key={day.id}
                        className="hover:bg-prussian-blue-300/20 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-platinum">
                          #{day.day}
                        </td>
                        <td className="px-6 py-4 text-orange-500 font-mono font-bold">
                          {day.demand}
                        </td>
                        <td className="px-6 py-4 text-platinum/70">
                          {day.inventoryBefore}
                        </td>
                        <td className="px-6 py-4 font-black">
                          {day.inventoryAfter}
                        </td>
                        <td className="px-6 py-4">{day.fulfilledDemand}</td>
                        <td className="px-6 py-4">{day.lostDemand}</td>
                        <td className="px-6 py-4">{day.receivedQty}</td>
                        <td className="px-6 py-4">{day.orderPlacedQty}</td>
                        <td className="px-6 py-4">{day.orderLeadTime ?? "-"}</td>
                        <td className="px-6 py-4">{day.pendingOrdersEod}</td>
                        <td className="px-6 py-4">
                          {day.stockOutOccurred ? (
                            <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-md text-[10px] uppercase font-bold">
                              Stock Out
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-md text-[10px] uppercase font-bold">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-3 rounded-lg border border-prussian-blue-300 bg-prussian-blue-500/40">
      <p className="uppercase text-prussian-blue-800 font-bold tracking-wide text-[10px]">
        {label}
      </p>
      <p className="text-platinum font-bold text-sm">{value}</p>
    </div>
  );
}
