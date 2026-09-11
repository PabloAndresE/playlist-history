"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface Props {
  data: { date: string; trackCount: number }[];
}

export default function GrowthChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), "MMM d"),
  }));

  if (data.length < 2) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Need at least 2 snapshots to show growth
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "13px",
          }}
        />
        <Area
          type="monotone"
          dataKey="trackCount"
          stroke="#1DB954"
          fill="#1DB954"
          fillOpacity={0.1}
          strokeWidth={2}
          name="Tracks"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
