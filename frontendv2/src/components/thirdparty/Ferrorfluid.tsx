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

import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

export interface FerrofluidProps {
    className?: string;
    dpr?: number;
    paused?: boolean;
    colors?: string[];
    speed?: number;
    scale?: number;
    turbulence?: number;
    fluidity?: number;
    rimWidth?: number;
    sharpness?: number;
    shimmer?: number;
    glow?: number;
    flowDirection?: 'up' | 'down' | 'left' | 'right';
    opacity?: number;
    mouseInteraction?: boolean;
    mouseStrength?: number;
    mouseRadius?: number;
    mouseDampening?: number;
    mixBlendMode?: string;
}

type RGB = [number, number, number];

const MAX_COLORS = 8;

const hexToRGB = (hex: string): RGB => {
    const c = hex.replace('#', '').padEnd(6, '0');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    return [r, g, b];
};

const prepColors = (input?: string[]) => {
    const base = (input && input.length ? input : ['#4F46E5', '#06B6D4', '#E0F2FE']).slice(0, MAX_COLORS);
    const count = base.length;
    const arr: RGB[] = [];
    for (let i = 0; i < MAX_COLORS; i++) arr.push(hexToRGB(base[Math.min(i, base.length - 1)]));
    const avg: RGB = [0, 0, 0];
    for (let i = 0; i < count; i++) {
        avg[0] += arr[i][0];
        avg[1] += arr[i][1];
        avg[2] += arr[i][2];
    }
    avg[0] /= count;
    avg[1] /= count;
    avg[2] /= count;
    return { arr, count, avg };
};

const flowVec = (d?: string): [number, number] => {
    switch (d) {
        case 'up':
            return [0, 1];
        case 'down':
            return [0, -1];
        case 'left':
            return [-1, 0];
        case 'right':
            return [1, 0];
        default:
            return [0, -1];
    }
};

const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
precision highp float;

uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;

uniform vec3  uColor0;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform vec3  uColor4;
uniform vec3  uColor5;
uniform vec3  uColor6;
uniform vec3  uColor7;
uniform float uColorCount;

uniform vec3  uMouseColor;
uniform vec2  uFlow;
uniform float uSpeed;
uniform float uScale;
uniform float uTurbulence;
uniform float uFluidity;
uniform float uRimWidth;
uniform float uSharpness;
uniform float uShimmer;
uniform float uGlow;
uniform float uOpacity;
uniform float uMouseEnabled;
uniform float uMouseStrength;
uniform float uMouseRadius;

varying vec2 vUv;

#define PI 3.14159265

vec3 palette(float h) {
  float count = max(uColorCount, 1.0);
  if (count <= 1.0) return uColor0;
  float t = clamp(h, 0.0, 0.999999) * (count - 1.0);
  float seg = floor(t);
  float f = fract(t);
  vec3 cA = uColor0;
  vec3 cB = uColor1;
  if (seg >= 1.0) { cA = uColor1; cB = uColor2; }
  if (seg >= 2.0) { cA = uColor2; cB = uColor3; }
  if (seg >= 3.0) { cA = uColor3; cB = uColor4; }
  if (seg >= 4.0) { cA = uColor4; cB = uColor5; }
  if (seg >= 5.0) { cA = uColor5; cB = uColor6; }
  if (seg >= 6.0) { cA = uColor6; cB = uColor7; }
  return mix(cA, cB, f);
}

float hash(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float smin(float a, float b, float k) {
  float r = exp2(-a / k) + exp2(-b / k);
  return -k * log2(r);
}

float sinlerp(float a, float b, float w) {
  return mix(a, b, (sin(w * PI - PI / 2.0) + 1.0) / 2.0);
}

float vn(vec2 p, float s, float seed) {
  vec2 cellp = floor(p / s);
  vec2 relp = mod(p, s);
  float g1 = hash(vec3(cellp, seed));
  float g2 = hash(vec3(cellp.x + 1.0, cellp.y, seed));
  float g3 = hash(vec3(cellp.x + 1.0, cellp.y + 1.0, seed));
  float g4 = hash(vec3(cellp.x, cellp.y + 1.0, seed));
  float bx = sinlerp(g1, g2, relp.x / s);
  float tx = sinlerp(g4, g3, relp.x / s);
  return sinlerp(bx, tx, relp.y / s);
}

float dbn(vec2 p, float s, float seed) {
  float o = s / 2.0;
  float n0 = vn(p, s, seed);
  float n1 = vn(p + vec2(o, o), s, seed + 0.1);
  float n2 = vn(p + vec2(-o, o), s, seed + 0.2);
  float n3 = vn(p + vec2(o, -o), s, seed + 0.3);
  float n4 = vn(p + vec2(-o, -o), s, seed + 0.4);
  return (2.0 * n0 + 1.5 * n1 + 1.25 * n2 + 1.125 * n3 + n4) / 7.0;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  float ref = 700.0 / max(uScale, 0.05);
  vec2 p = fragCoord / iResolution.y * ref;

  float spd = 200.0 * uSpeed;
  float t = iTime;

  vec2 dir = uFlow;
  vec2 perp = vec2(-dir.y, dir.x);

  float distort1 = vn(p + perp * (t * spd), 60.0, 10.0) * 50.0 * uTurbulence;
  float distort2 = vn(p - perp * (t * spd), 120.0, 15.0) * 100.0 * uTurbulence;

  float peaks = dbn(p + distort1 + dir * (t * spd * 0.5), 40.0, 1.0);
  float peaks2 = dbn(p + distort2 - dir * (t * spd * 0.5), 40.0, 0.0);

  float mapeaks = smin(peaks, peaks2, max(uFluidity, 0.001));

  float mGlow = 0.0;
  if (uMouseEnabled > 0.5) {
    vec2 mp = iMouse / iResolution.y * ref;
    float md = length(p - mp) / ref;
    float rr = max(uMouseRadius, 0.02);
    mGlow = exp(-md * md / (rr * rr)) * uMouseStrength;
  }

  float band = (uRimWidth - abs((mapeaks - 0.4) * 2.0)) * 5.0;
  float ltn = clamp(band - vn(p + dir * (t * spd * 0.5), 60.0, 12.0) * uShimmer, 0.0, 1.0);
  ltn = pow(ltn, uSharpness) * uGlow;
  ltn *= clamp(1.0 - mGlow, 0.0, 1.0);

  float h = clamp(0.5 + (peaks - peaks2) * 0.8, 0.0, 1.0);
  vec3 col = palette(h);

  vec3 outc = col * ltn;
  float a = clamp(max(outc.r, max(outc.g, outc.b)), 0.0, 1.0);
  fragColor = vec4(outc, a * uOpacity);
}

void main() {
  vec4 color;
  mainImage(color, vUv * iResolution.xy);
  gl_FragColor = color;
}
`;

const Ferrofluid: React.FC<FerrofluidProps> = ({
    className,
    dpr,
    paused = false,
    colors = ['#ffffff', '#ffffff', '#ffffff'],
    speed = 0.5,
    scale = 1.6,
    turbulence = 1,
    fluidity = 0.1,
    rimWidth = 0.2,
    sharpness = 2.5,
    shimmer = 1.5,
    glow = 2,
    flowDirection = 'down',
    opacity = 1,
    mouseInteraction = true,
    mouseStrength = 1,
    mouseRadius = 0.35,
    mouseDampening = 0.15,
    mixBlendMode,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const propsRef = useRef({
        paused,
        colors,
        speed,
        scale,
        turbulence,
        fluidity,
        rimWidth,
        sharpness,
        shimmer,
        glow,
        flowDirection,
        opacity,
        mouseInteraction,
        mouseStrength,
        mouseRadius,
        mouseDampening,
    });
    propsRef.current = {
        paused,
        colors,
        speed,
        scale,
        turbulence,
        fluidity,
        rimWidth,
        sharpness,
        shimmer,
        glow,
        flowDirection,
        opacity,
        mouseInteraction,
        mouseStrength,
        mouseRadius,
        mouseDampening,
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let active = true;
        let rafId = 0;
        let lastTime = 0;
        const mouseTarget: [number, number] = [0, 0];

        const renderer = new Renderer({
            dpr: dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
            alpha: true,
            antialias: true,
        });
        const gl = renderer.gl;
        const canvas = gl.canvas as HTMLCanvasElement;
        gl.clearColor(0, 0, 0, 0);
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        container.appendChild(canvas);

        const initial = propsRef.current;
        const { arr, count, avg } = prepColors(initial.colors);

        const uniforms = {
            iResolution: { value: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1] },
            iMouse: { value: [0, 0] },
            iTime: { value: 0 },
            uColor0: { value: arr[0] },
            uColor1: { value: arr[1] },
            uColor2: { value: arr[2] },
            uColor3: { value: arr[3] },
            uColor4: { value: arr[4] },
            uColor5: { value: arr[5] },
            uColor6: { value: arr[6] },
            uColor7: { value: arr[7] },
            uColorCount: { value: count },
            uMouseColor: { value: avg },
            uFlow: { value: flowVec(initial.flowDirection) },
            uSpeed: { value: initial.speed },
            uScale: { value: initial.scale },
            uTurbulence: { value: initial.turbulence },
            uFluidity: { value: initial.fluidity },
            uRimWidth: { value: initial.rimWidth },
            uSharpness: { value: initial.sharpness },
            uShimmer: { value: initial.shimmer },
            uGlow: { value: initial.glow },
            uOpacity: { value: initial.opacity },
            uMouseEnabled: { value: initial.mouseInteraction ? 1 : 0 },
            uMouseStrength: { value: initial.mouseStrength },
            uMouseRadius: { value: initial.mouseRadius },
        };

        const program = new Program(gl, {
            vertex,
            fragment,
            uniforms,
            transparent: true,
            depthTest: false,
        });

        const geometry = new Triangle(gl);
        const mesh = new Mesh(gl, { geometry, program });

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const width = Math.max(rect.width, 1);
            const height = Math.max(rect.height, 1);
            renderer.setSize(width, height);
            uniforms.iResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight, 1];
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(container);

        const onPointerMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const sc = renderer.dpr || 1;
            const x = (e.clientX - rect.left) * sc;
            const y = (rect.height - (e.clientY - rect.top)) * sc;
            mouseTarget[0] = x;
            mouseTarget[1] = y;
            if (propsRef.current.mouseDampening <= 0) {
                uniforms.iMouse.value = [x, y];
            }
        };
        if (mouseInteraction) {
            canvas.addEventListener('pointermove', onPointerMove);
        }

        const loop = (t: number) => {
            if (!active) return;
            rafId = requestAnimationFrame(loop);

            const props = propsRef.current;
            const { arr: nextColors, count: nextCount, avg: nextAvg } = prepColors(props.colors);
            uniforms.uColor0.value = nextColors[0];
            uniforms.uColor1.value = nextColors[1];
            uniforms.uColor2.value = nextColors[2];
            uniforms.uColor3.value = nextColors[3];
            uniforms.uColor4.value = nextColors[4];
            uniforms.uColor5.value = nextColors[5];
            uniforms.uColor6.value = nextColors[6];
            uniforms.uColor7.value = nextColors[7];
            uniforms.uColorCount.value = nextCount;
            uniforms.uMouseColor.value = nextAvg;
            uniforms.uFlow.value = flowVec(props.flowDirection);
            uniforms.uSpeed.value = props.speed;
            uniforms.uScale.value = props.scale;
            uniforms.uTurbulence.value = props.turbulence;
            uniforms.uFluidity.value = props.fluidity;
            uniforms.uRimWidth.value = props.rimWidth;
            uniforms.uSharpness.value = props.sharpness;
            uniforms.uShimmer.value = props.shimmer;
            uniforms.uGlow.value = props.glow;
            uniforms.uOpacity.value = props.opacity;
            uniforms.uMouseEnabled.value = props.mouseInteraction ? 1 : 0;
            uniforms.uMouseStrength.value = props.mouseStrength;
            uniforms.uMouseRadius.value = props.mouseRadius;

            uniforms.iTime.value = t * 0.001;
            if (props.mouseDampening > 0) {
                if (!lastTime) lastTime = t;
                const dt = (t - lastTime) / 1000;
                lastTime = t;
                const tau = Math.max(1e-4, props.mouseDampening);
                let factor = 1 - Math.exp(-dt / tau);
                if (factor > 1) factor = 1;
                const cur = uniforms.iMouse.value as number[];
                cur[0] += (mouseTarget[0] - cur[0]) * factor;
                cur[1] += (mouseTarget[1] - cur[1]) * factor;
            } else {
                lastTime = t;
            }

            if (!props.paused) {
                renderer.render({ scene: mesh });
            }
        };
        rafId = requestAnimationFrame(loop);

        return () => {
            active = false;
            cancelAnimationFrame(rafId);
            ro.disconnect();
            if (mouseInteraction) canvas.removeEventListener('pointermove', onPointerMove);
            if (canvas.parentElement === container) {
                container.removeChild(canvas);
            }
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        };
    }, [dpr, mouseInteraction]);

    return (
        <div
            ref={containerRef}
            className={`relative h-full w-full overflow-hidden ${className ?? ''}`}
            style={{
                ...(mixBlendMode && { mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode'] }),
            }}
        />
    );
};

export default Ferrofluid;
