import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface OutagesTrendChartProps {
  data: { date: string; outages: number }[];
}

export function OutagesTrendChart({ data }: OutagesTrendChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="outageFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0abfc" stopOpacity={0.46} />
              <stop offset="48%" stopColor="#a78bfa" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#020617" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 8" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="date"
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
          <Area
            type="monotone"
            dataKey="outages"
            name="Active outages"
            stroke="#f0abfc"
            strokeWidth={2.6}
            fill="url(#outageFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
