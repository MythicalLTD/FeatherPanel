<template>
    <div class="performance-chart">
        <canvas ref="chartCanvas" :width="width" :height="height"></canvas>
    </div>
</template>

<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { ref, onMounted, onUnmounted, watch } from 'vue';
import { formatBytes } from '@/lib/format';

interface ChartDataPoint {
    timestamp: number;
    value: number;
}

interface Props {
    data: ChartDataPoint[];
    width?: number;
    height?: number;
    color?: string;
    // eslint-disable-next-line vue/require-default-prop
    maxValue?: number;
    unit?: string;
    label?: string;
}

const props = withDefaults(defineProps<Props>(), {
    width: 280,
    height: 80,
    color: '#60a5fa',
    unit: '',
    label: '',
});

const chartCanvas = ref<HTMLCanvasElement>();
let ctx: CanvasRenderingContext2D | null = null;
const animationFrame: number | null = null;

// Chart configuration
const chartConfig = {
    padding: 12,
    lineWidth: 2.5,
    pointRadius: 2.5,
    gridLines: 4,
    animationDuration: 300,
};

onMounted(() => {
    if (chartCanvas.value) {
        ctx = chartCanvas.value.getContext('2d');
        drawChart();
    }
});

onUnmounted(() => {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
});

watch(
    () => props.data,
    () => {
        if (ctx) {
            drawChart();
        }
    },
    { deep: true },
);

function drawChart(): void {
    if (!ctx || !chartCanvas.value) return;

    const canvas = chartCanvas.value;
    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (props.data.length === 0) {
        drawEmptyState();
        return;
    }

    // Calculate chart area
    const chartWidth = width - chartConfig.padding * 2;
    const chartHeight = height - chartConfig.padding * 2;

    // Find data range
    const values = props.data.map((d) => d.value);
    const minValue = Math.min(...values);
    const maxValue = props.maxValue || Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // Draw grid lines
    drawGridLines(chartWidth, chartHeight, maxValue);

    // Draw chart line
    drawChartLine(chartWidth, chartHeight, minValue, valueRange);

    // Draw current value label
    if (props.data.length > 0) {
        const lastDataPoint = props.data[props.data.length - 1];
        if (lastDataPoint) {
            drawValueLabel(lastDataPoint.value);
        }
    }
}

function drawEmptyState(): void {
    if (!ctx) return;

    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = props.width / 2;
    const centerY = props.height / 2;

    ctx.fillText('No data', centerX, centerY);
}

function drawGridLines(chartWidth: number, chartHeight: number, maxValue: number): void {
    if (!ctx) return;

    // More subtle grid lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);

    // Draw grid lines with value labels
    for (let i = 1; i < chartConfig.gridLines; i++) {
        const y = chartConfig.padding + (chartHeight / chartConfig.gridLines) * i;
        const value = maxValue - (maxValue / chartConfig.gridLines) * i;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(chartConfig.padding, y);
        ctx.lineTo(chartConfig.padding + chartWidth, y);
        ctx.stroke();

        // Draw value label with better visibility
        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toFixed(1), chartConfig.padding - 6, y);
    }

    ctx.setLineDash([]);
}

function drawChartLine(chartWidth: number, chartHeight: number, minValue: number, valueRange: number): void {
    if (!ctx || props.data.length === 0) return;

    const { padding } = chartConfig;

    // Create gradient
    const gradient = ctx.createLinearGradient(padding, padding, padding, padding + chartHeight);
    gradient.addColorStop(0, props.color + '40');
    gradient.addColorStop(1, props.color + '10');

    // Draw area
    ctx.fillStyle = gradient;
    ctx.beginPath();

    props.data.forEach((point, index) => {
        const x = padding + (index / (props.data.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

        if (index === 0) {
            ctx?.moveTo(x, y);
        } else {
            ctx?.lineTo(x, y);
        }
    });

    // Complete the area
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = props.color;
    ctx.lineWidth = chartConfig.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    props.data.forEach((point, index) => {
        const x = padding + (index / (props.data.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

        if (index === 0) {
            ctx?.moveTo(x, y);
        } else {
            ctx?.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = props.color;
    props.data.forEach((point, index) => {
        const x = padding + (index / (props.data.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

        ctx?.beginPath();
        ctx?.arc(x, y, chartConfig.pointRadius, 0, Math.PI * 2);
        ctx?.fill();
    });
}

function drawValueLabel(value: number): void {
    if (!ctx) return;

    const formattedValue = formatValue(value);

    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    const x = props.width - chartConfig.padding;
    const y = chartConfig.padding;

    // Draw background with better contrast
    const textMetrics = ctx.measureText(formattedValue);
    const padding = 6;
    const bgWidth = textMetrics.width + padding * 2;
    const bgHeight = 24;

    // Dark background with subtle border
    ctx.fillStyle = '#111827';
    ctx.fillRect(x - bgWidth - 1, y - 1, bgWidth + 2, bgHeight + 2);

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x - bgWidth, y, bgWidth, bgHeight);

    // Draw text with better visibility
    ctx.fillStyle = '#f9fafb';
    ctx.fillText(formattedValue, x - padding, y + padding);
}

function formatValue(value: number): string {
    if (props.unit === 'B') {
        return formatBytes(value);
    } else if (props.unit === '%') {
        return value.toFixed(1) + '%';
    } else if (props.unit === 'MiB') {
        return value.toFixed(1) + ' MiB';
    } else if (props.unit === 'GiB') {
        return value.toFixed(1) + ' GiB';
    }
    return value.toFixed(1);
}
</script>

<style scoped>
.performance-chart {
    position: relative;
    display: inline-block;
    width: 100%;
}

canvas {
    display: block;
    border-radius: 6px;
    width: 100%;
    height: auto;
    max-width: 100%;
}
</style>
