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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

interface SimplePieChartProps {
    title: string;
    description: string;
    data: { name: string; value: number }[];
}

export function SimplePieChart({ title, description, data }: SimplePieChartProps) {
    return (
        <Card className='border-border/50 bg-card/50 col-span-1 shadow-sm backdrop-blur-sm'>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className='h-87.5'>
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

interface SimpleBarChartProps {
    title: string;
    description: string;
    data: { name: string; value: number }[];
    color?: string;
}

export function SimpleBarChart({ title, description, data, color = '#3b82f6' }: SimpleBarChartProps) {
    return (
        <Card className='border-border/50 bg-card/50 col-span-1 shadow-sm backdrop-blur-sm lg:col-span-2'>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className='h-87.5'>
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
                        <Bar dataKey='value' fill={color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
