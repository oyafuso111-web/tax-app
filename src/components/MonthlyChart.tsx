import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Transaction } from '../types';
import { isSameMonth } from '../utils';
import './MonthlyChart.css';

interface MonthlyChartProps {
    transactions: Transaction[];
    currentMonth: string; // YYYY-MM
}

const COLORS = ['#10b981', '#ef4444']; // success-color and danger-color from variables

export function MonthlyChart({ transactions, currentMonth }: MonthlyChartProps) {
    const chartData = useMemo(() => {
        let income = 0;
        let expense = 0;

        transactions
            .filter((t) => isSameMonth(t.date, currentMonth))
            .forEach((t) => {
                if (t.type === 'income') {
                    income += t.amount;
                } else {
                    expense += t.amount;
                }
            });

        // Don't render empty chart if no data
        if (income === 0 && expense === 0) return [];

        return [
            { name: '収入', value: income },
            { name: '支出', value: expense },
        ];
    }, [transactions, currentMonth]);

    if (chartData.length === 0) {
        return null;
    }

    return (
        <div className="glass-panel chart-container">
            <h3>収支の内訳</h3>
            <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => `¥${Number(value).toLocaleString()}`}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
