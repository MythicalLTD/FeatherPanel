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

/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import React from 'react';
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/contexts/TranslationContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

interface SimplePieChartProps {
    title: string;
    description: string;
    data: { name: string; value: number }[];
}

export function SimplePieChart({ title, description, data }: SimplePieChartProps) {
    return (
        <Card className='col-span-1 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm'>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className='h-[300px]'>
                <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                        <Pie
                            data={data}
                            cx='50%'
                            cy='50%'
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey='value'
                            nameKey='name'
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                        />
                        <Legend layout='horizontal' verticalAlign='bottom' align='center' />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface TrendChartProps {
    title: string;
    description: string;
    data: { date: string; count: number }[];
}

export function TrendChart({ title, description, data }: TrendChartProps) {
    return (
        <Card className='col-span-1 lg:col-span-2 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm'>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className='h-[300px]'>
                <ResponsiveContainer width='100%' height='100%'>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                        <XAxis dataKey='date' className='text-xs' />
                        <YAxis className='text-xs' />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '0.5rem',
                                color: 'hsl(var(--foreground))',
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Line type='monotone' dataKey='count' stroke='#8b5cf6' strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface GrowthBarChartProps {
    title: string;
    description: string;
    data: { name: string; current: number; previous: number }[];
}

export function GrowthBarChart({ title, description, data }: GrowthBarChartProps) {
    const { t } = useTranslation();
    return (
        <Card className='col-span-1 lg:col-span-2 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm'>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className='h-[300px]'>
                <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                        <XAxis dataKey='name' className='text-xs' />
                        <YAxis className='text-xs' />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '0.5rem',
                                color: 'hsl(var(--foreground))',
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend />
                        <Bar
                            dataKey='current'
                            name={t('admin.analytics.users.activity.current')}
                            fill='#3b82f6'
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar
                            dataKey='previous'
                            name={t('admin.analytics.users.activity.previous')}
                            fill='#94a3b8'
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
