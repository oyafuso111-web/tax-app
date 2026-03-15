import { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../types';
import './YearlyChart.css';

interface YearlyChartProps {
    transactions: Transaction[];
    currentMonth: string; // YYYY-MM
}

export function YearlyChart({ transactions, currentMonth }: YearlyChartProps) {
    const currentYear = currentMonth.split('-')[0];

    const chartData = useMemo(() => {
        // Initialize array with 12 months
        let monthlyData = Array.from({ length: 12 }, (_, i) => ({
            name: `${i + 1}月`,
            MonthKey: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
            Income: 0,
            Expense: 0,
            CumulativeBalance: 0,
        }));

        // Aggregate transactions for the selected year
        transactions.forEach((t) => {
            if (t.date && t.date.startsWith(`${currentYear}-`)) {
                const monthIndex = parseInt(t.date.split('-')[1], 10) - 1;
                if (t.type === 'income') {
                    monthlyData[monthIndex].Income += t.amount;
                } else {
                    monthlyData[monthIndex].Expense += t.amount;
                }
            }
        });

        // Calculate cumulative balance
        let runningBalance = 0;
        monthlyData = monthlyData.map((data) => {
            runningBalance += (data.Income - data.Expense);
            return {
                ...data,
                CumulativeBalance: runningBalance
            };
        });

        return monthlyData;
    }, [transactions, currentYear]);

    // Check if there is absolutely no data for the year
    const hasData = chartData.some((data) => data.Income > 0 || data.Expense > 0);

    if (!hasData) {
        return (
            <div className="glass-panel yearly-chart-container empty-state">
                <p>{currentYear}年のデータはありません。</p>
            </div>
        );
    }

    return (
        <div className="glass-panel yearly-chart-container">
            <h3>{currentYear}年の年間推移</h3>
            <div className="yearly-chart-wrapper">
                <div className="chart-scroll-inner">
                    <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart
                            data={chartData}
                            margin={{
                                top: 20,
                                right: 10,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                            <YAxis
                                yAxisId="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b' }}
                                tickFormatter={(value) => `¥${value.toLocaleString()}`}
                                width={80}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b' }}
                                tickFormatter={(value) => `¥${value.toLocaleString()}`}
                                width={80}
                            />
                            <Tooltip
                                formatter={(value: any) => `¥${Number(value).toLocaleString()}`}
                                cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar yAxisId="left" dataKey="Income" name="収入" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar yAxisId="left" dataKey="Expense" name="支出" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="CumulativeBalance"
                                name="累積収支"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <p className="scroll-hint">← 横スクロールで各月の推移を確認できます →</p>
        </div>
    );
}
