import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BoroughRisk } from "../../types";

interface BoroughRiskChartProps {
  data: BoroughRisk[];
}

export function BoroughRiskChart({ data }: BoroughRiskChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="boroughOutages" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0abfc" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.62} />
            </linearGradient>
            <linearGradient id="boroughStops" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fda4af" stopOpacity={0.92} />
              <stop offset="100%" stopColor="#be123c" stopOpacity={0.56} />
            </linearGradient>
            <linearGradient id="boroughChronic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#64748b" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 8" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="borough"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(232,121,249,0.08)" }}
            contentStyle={{
              background: "rgba(8, 7, 11, 0.92)",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.42)",
              color: "#f8fafc",
              fontSize: 12,
            }}
            labelStyle={{ color: "#f5d0fe" }}
          />
          <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
          <Bar
            dataKey="activeOutages"
            name="Active outages"
            fill="url(#boroughOutages)"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="atRiskStops"
            name="At-risk stops"
            fill="url(#boroughStops)"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="chronicOffenders"
            name="Chronic offenders"
            fill="url(#boroughChronic)"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
