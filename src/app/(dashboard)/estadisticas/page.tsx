import { getCharges } from "@/actions/charges";
import { getMonthlyIncomeChart } from "@/actions/dashboard";
import { getExpenses } from "@/actions/expenses";
import { EstadisticasCharts } from "@/components/estadisticas/estadisticas-charts";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, CircleDollarSign, CreditCard, ReceiptText } from "lucide-react";

export default async function EstadisticasPage() {
  const [chartData, expenses, charges] = await Promise.all([
    getMonthlyIncomeChart(12),
    getExpenses(),
    getCharges(),
  ]);

  const expensesByType = [
    { name: "Operativo", value: 0 },
    { name: "Impuesto", value: 0 },
    { name: "Servicio", value: 0 },
    { name: "Otro", value: 0 },
  ];

  for (const expense of expenses) {
    const amount = parseFloat(expense.amount);
    if (expense.type === "OPERATIVE") expensesByType[0].value += amount;
    else if (expense.type === "TAX") expensesByType[1].value += amount;
    else if (expense.type === "SERVICE") expensesByType[2].value += amount;
    else expensesByType[3].value += amount;
  }

  const chargesByStatus = [
    { name: "Pendiente", value: 0, color: "#D4A15B" },
    { name: "Parcial", value: 0, color: "#C9B6E4" },
    { name: "Pagado", value: 0, color: "#7BBE9E" },
    { name: "Vencido", value: 0, color: "#D96C6C" },
  ];

  for (const charge of charges) {
    if (charge.derivedStatus === "PENDING") chargesByStatus[0].value += 1;
    else if (charge.derivedStatus === "PARTIAL") chargesByStatus[1].value += 1;
    else if (charge.derivedStatus === "PAID") chargesByStatus[2].value += 1;
    else if (charge.derivedStatus === "OVERDUE") chargesByStatus[3].value += 1;
  }

  const totalIncome = chartData.reduce((sum, item) => sum + item.total, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const pendingCharges = charges.filter((item) => item.derivedStatus === "PENDING").length;
  const overdueCharges = charges.filter((item) => item.derivedStatus === "OVERDUE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analitica base"
        title="Estadisticas"
        description="Lectura comparativa de ingresos, gastos y distribucion de estados para empezar a detectar patrones del estudio."
        stats={[
          { label: "Ventana", value: "12 meses" },
          { label: "Cobros analizados", value: `${charges.length}` },
          { label: "Gastos cargados", value: `${expenses.length}` },
          { label: "Vencidos", value: `${overdueCharges}` },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ingresos 12 meses"
          value={formatCurrency(totalIncome)}
          subtitle="Suma de pagos registrados en la ventana analizada."
          icon={CircleDollarSign}
          tone="rose"
        />
        <MetricCard
          label="Gastos acumulados"
          value={formatCurrency(totalExpenses)}
          subtitle="Total de egresos cargados dentro del sistema."
          icon={ReceiptText}
          tone="danger"
        />
        <MetricCard
          label="Pendientes"
          value={`${pendingCharges} cobro(s)`}
          subtitle="Compromisos aun abiertos y no vencidos."
          icon={CreditCard}
          tone="amber"
        />
        <MetricCard
          label="Resultado simple"
          value={formatCurrency(totalIncome - totalExpenses)}
          subtitle="Ingreso acumulado menos gastos cargados."
          icon={BarChart3}
          tone={totalIncome - totalExpenses >= 0 ? "sage" : "danger"}
        />
      </div>

      <EstadisticasCharts
        chartData={chartData}
        expensesByType={expensesByType}
        chargesByStatus={chargesByStatus}
      />
    </div>
  );
}
