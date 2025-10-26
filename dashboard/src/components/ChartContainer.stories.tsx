import React from 'react';
import ChartContainer from './ChartContainer';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const meta = {
  title: 'Components/ChartContainer',
  component: ChartContainer,
  parameters: {
    a11y: {
      // default settings are adequate; this is a simple accessible example
    },
  },
};
export default meta;

const sample = Array.from({ length: 12 }).map((_, i) => ({
  x: i,
  y: Math.round(Math.random() * 100),
}));

export const Basic = {
  render: () => (
    <div className="w-[600px] h-[300px]">
      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sample}>
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Area
              dataKey="y"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  ),
};
