/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use client';

import React from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/contexts/TranslationContext';

// Colors for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

interface ActivityTrendChartProps {
    data: { date: string; count: number }[];
}

export function ActivityTrendChart({ data }: ActivityTrendChartProps) {
    const { t } = useTranslation();

    return (
        <Card className='col-span-1 lg:col-span-2 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm'>
            <CardHeader>
                <CardTitle>{t('admin.analytics.activity.trend_title')}</CardTitle>
                <CardDescription>{t('admin.analytics.activity.trend_desc')}</CardDescription>
            </CardHeader>
            <CardContent className='h-[300px]'>
                <ResponsiveContainer width='100%' height='100%'>
                    <LineChart data={data || []}>
                        <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                        <XAxis dataKey='date' className='text-xs' />
                        <YAxis className='text-xs' />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                            itemStyle={{ color: 'var(--foreground)' }}
                        />
                        <Line type='monotone' dataKey='count' stroke='#3b82f6' strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface ActivityBreakdownChartProps {
    data: { activity_type: string; count: number }[];
}

export function ActivityBreakdownChart({ data }: ActivityBreakdownChartProps) {
    const { t } = useTranslation();

    return (
        <Card className='col-span-1 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm'>
            <CardHeader>
                <CardTitle>{t('admin.analytics.activity.breakdown_title')}</CardTitle>
                <CardDescription>{t('admin.analytics.activity.breakdown_desc')}</CardDescription>
            </CardHeader>
            <CardContent className='h-[300px]'>
                <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                        <Pie
                            data={data || []}
                            cx='50%'
                            cy='50%'
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey='count'
                            nameKey='activity_type'
                        >
                            {(data || []).map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    stroke='hsl(var(--card))'
                                    strokeWidth={2}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '0.5rem',
                                color: 'hsl(var(--foreground))',
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        />
                        <Legend
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value, entry: any) => {
                                // Return the actual name (activity_type) instead of the dataKey name ("count")
                                return entry.payload?.activity_type || value;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface HourlyActivityChartProps {
    data: { hour: number; count: number }[];
}

export function HourlyActivityChart({ data }: HourlyActivityChartProps) {
    const { t } = useTranslation();

    return (
        <Card className='col-span-1 lg:col-span-3'>
            <CardHeader>
                <CardTitle>{t('admin.analytics.activity.hourly_title')}</CardTitle>
                <CardDescription>{t('admin.analytics.activity.hourly_desc')}</CardDescription>
            </CardHeader>
            <CardContent className='h-[300px]'>
                <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={data || []}>
                        <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                        <XAxis dataKey='hour' className='text-xs' tickFormatter={(val) => `${val}:00`} />
                        <YAxis className='text-xs' />
                        <Tooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                            itemStyle={{ color: 'var(--foreground)' }}
                            labelFormatter={(val) => `${val}:00 - ${val + 1}:00`}
                        />
                        <Bar dataKey='count' fill='#8b5cf6' radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
