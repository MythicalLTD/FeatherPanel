<template>
    <div class="performance-chart">
        <canvas ref="chartCanvas" :width="width" :height="height"></canvas>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

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
    width: 200,
    height: 64,
    color: '#60a5fa',
    unit: '',
    label: '',
});

const chartCanvas = ref<HTMLCanvasElement>();
let ctx: CanvasRenderingContext2D | null = null;
const animationFrame: number | null = null;

// Chart configuration
const chartConfig = {
    padding: 8,
    lineWidth: 2,
    pointRadius: 2,
    gridLines: 3,
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
        drawValueLabel(props.data[props.data.length - 1].value);
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

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Draw grid lines with value labels
    for (let i = 1; i < chartConfig.gridLines; i++) {
        const y = chartConfig.padding + (chartHeight / chartConfig.gridLines) * i;
        const value = maxValue - (maxValue / chartConfig.gridLines) * i;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(chartConfig.padding, y);
        ctx.lineTo(chartConfig.padding + chartWidth, y);
        ctx.stroke();

        // Draw value label
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toFixed(1), chartConfig.padding - 4, y);
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

    ctx.fillStyle = '#f9fafb';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    const x = props.width - chartConfig.padding;
    const y = chartConfig.padding;

    // Draw background
    const textMetrics = ctx.measureText(formattedValue);
    const padding = 4;
    const bgWidth = textMetrics.width + padding * 2;
    const bgHeight = 20;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x - bgWidth, y, bgWidth, bgHeight);

    // Draw text
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
    }
    return value.toFixed(1);
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
</script>

<style scoped>
.performance-chart {
    position: relative;
    display: inline-block;
}

canvas {
    display: block;
    border-radius: 4px;
}
</style>
