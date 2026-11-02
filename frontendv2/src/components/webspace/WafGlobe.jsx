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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const LAND_URL = '/images/earth-land.png';

/** [name, ISO-3166 alpha-2, latitude, longitude] - rough country centres. */
const COUNTRIES = [
    ['Germany', 'DE', 51, 10],
    ['Netherlands', 'NL', 52.1, 5.3],
    ['United States', 'US', 39, -98],
    ['United Kingdom', 'GB', 54, -2],
    ['France', 'FR', 46.5, 2.5],
    ['Singapore', 'SG', 1.35, 103.8],
    ['India', 'IN', 21, 78],
    ['Vietnam', 'VN', 16, 107],
    ['China', 'CN', 35, 103],
    ['Russia', 'RU', 60, 90],
    ['Brazil', 'BR', -10, -52],
    ['Japan', 'JP', 36, 138],
    ['South Korea', 'KR', 36.5, 128],
    ['Canada', 'CA', 56, -96],
    ['Australia', 'AU', -25, 134],
    ['Italy', 'IT', 42.5, 12.5],
    ['Spain', 'ES', 40, -4],
    ['Poland', 'PL', 52, 19],
    ['Ukraine', 'UA', 49, 32],
    ['Turkey', 'TR', 39, 35],
    ['Indonesia', 'ID', -2, 118],
    ['Hong Kong', 'HK', 22.3, 114.2],
    ['Switzerland', 'CH', 46.8, 8.2],
    ['Austria', 'AT', 47.5, 14.5],
    ['Sweden', 'SE', 62, 15],
    ['Romania', 'RO', 46, 25],
    ['Czechia', 'CZ', 49.8, 15.5],
    ['Belgium', 'BE', 50.6, 4.6],
    ['Ireland', 'IE', 53, -8],
    ['Mexico', 'MX', 23, -102],
    ['Argentina', 'AR', -34, -64],
    ['South Africa', 'ZA', -29, 24],
    ['Egypt', 'EG', 26.8, 30.8],
    ['Iran', 'IR', 32, 53],
    ['Pakistan', 'PK', 30, 70],
    ['Thailand', 'TH', 15, 101],
    ['Philippines', 'PH', 12.8, 122],
    ['Bangladesh', 'BD', 24, 90],
    ['Nigeria', 'NG', 9, 8],
    ['Moldova', 'MD', 47, 28.5],
    ['Bulgaria', 'BG', 42.7, 25.5],
    ['Lithuania', 'LT', 55.3, 24],
    ['Finland', 'FI', 64, 26],
    ['Norway', 'NO', 61, 9],
    ['Denmark', 'DK', 56, 10],
    ['Portugal', 'PT', 39.5, -8],
    ['Hungary', 'HU', 47, 19.5],
    ['Israel', 'IL', 31, 35],
    ['Saudi Arabia', 'SA', 24, 45],
    ['United Arab Emirates', 'AE', 24, 54],
    ['Kazakhstan', 'KZ', 48, 67],
    ['Taiwan', 'TW', 23.7, 121],
    ['Greece', 'GR', 39, 22],
    ['Serbia', 'RS', 44, 21],
    ['Croatia', 'HR', 45.1, 15.2],
    ['Slovakia', 'SK', 48.7, 19.5],
    ['Slovenia', 'SI', 46.1, 14.8],
    ['Latvia', 'LV', 56.9, 24.6],
    ['Estonia', 'EE', 58.6, 25],
    ['Belarus', 'BY', 53.7, 28],
    ['Luxembourg', 'LU', 49.8, 6.1],
    ['Iceland', 'IS', 65, -18],
    ['Cyprus', 'CY', 35, 33],
    ['Georgia', 'GE', 42.3, 43.4],
    ['Armenia', 'AM', 40.1, 45],
    ['Azerbaijan', 'AZ', 40.4, 47.7],
    ['Uzbekistan', 'UZ', 41.4, 64.6],
    ['Mongolia', 'MN', 46.9, 103.8],
    ['Afghanistan', 'AF', 33.9, 67.7],
    ['Iraq', 'IQ', 33, 44],
    ['Syria', 'SY', 35, 38],
    ['Jordan', 'JO', 31.3, 36.8],
    ['Lebanon', 'LB', 33.9, 35.9],
    ['Kuwait', 'KW', 29.3, 47.5],
    ['Qatar', 'QA', 25.3, 51.2],
    ['Oman', 'OM', 21, 57],
    ['Yemen', 'YE', 15.5, 48],
    ['Sri Lanka', 'LK', 7.9, 80.7],
    ['Nepal', 'NP', 28.4, 84.1],
    ['Myanmar', 'MM', 21.9, 96],
    ['Cambodia', 'KH', 12.6, 105],
    ['Laos', 'LA', 18.2, 103.9],
    ['Malaysia', 'MY', 4.2, 102],
    ['North Korea', 'KP', 40, 127],
    ['New Zealand', 'NZ', -41, 174],
    ['Chile', 'CL', -35.7, -71.5],
    ['Colombia', 'CO', 4.6, -74.1],
    ['Peru', 'PE', -9.2, -75],
    ['Venezuela', 'VE', 6.4, -66.6],
    ['Ecuador', 'EC', -1.8, -78.2],
    ['Bolivia', 'BO', -16.3, -63.6],
    ['Paraguay', 'PY', -23.4, -58.4],
    ['Uruguay', 'UY', -32.5, -55.8],
    ['Costa Rica', 'CR', 9.7, -83.8],
    ['Panama', 'PA', 8.5, -80.8],
    ['Dominican Republic', 'DO', 18.7, -70.2],
    ['Cuba', 'CU', 21.5, -77.8],
    ['Morocco', 'MA', 31.8, -7.1],
    ['Algeria', 'DZ', 28, 3],
    ['Tunisia', 'TN', 34, 9],
    ['Libya', 'LY', 26.3, 17.2],
    ['Kenya', 'KE', 0.2, 37.9],
    ['Ethiopia', 'ET', 9.1, 40.5],
    ['Ghana', 'GH', 7.9, -1],
    ['Tanzania', 'TZ', -6.4, 34.9],
    ['Uganda', 'UG', 1.4, 32.3],
    ['Angola', 'AO', -11.2, 17.9],
    ['Senegal', 'SN', 14.5, -14.5],
    ['Cameroon', 'CM', 7.4, 12.4],
    ['Ivory Coast', 'CI', 7.5, -5.5],
    ['Sudan', 'SD', 12.9, 30.2],
    ['Zimbabwe', 'ZW', -19, 29.2],
    ['Mozambique', 'MZ', -18.7, 35.5],
    ['Zambia', 'ZM', -13.1, 27.8],
    ['Madagascar', 'MG', -18.8, 46.9],
    ['Malta', 'MT', 35.9, 14.4],
    ['Albania', 'AL', 41.2, 20.2],
    ['North Macedonia', 'MK', 41.6, 21.7],
    ['Bosnia and Herzegovina', 'BA', 43.9, 17.7],
    ['Montenegro', 'ME', 42.7, 19.4],
    ['Kyrgyzstan', 'KG', 41.2, 74.8],
    ['Tajikistan', 'TJ', 38.9, 71.3],
    ['Turkmenistan', 'TM', 38.9, 59.6],
    ['Bahrain', 'BH', 26, 50.5],
    ['Palestine', 'PS', 31.9, 35.2],
    ['Seychelles', 'SC', -4.7, 55.5],
    ['Mauritius', 'MU', -20.3, 57.6],
    ['Puerto Rico', 'PR', 18.2, -66.5],
    ['Jamaica', 'JM', 18.1, -77.3],
    ['Guatemala', 'GT', 15.8, -90.2],
    ['Honduras', 'HN', 15.2, -86.2],
    ['El Salvador', 'SV', 13.8, -88.9],
    ['Nicaragua', 'NI', 12.9, -85.2],
];

const GEO = new Map();
for (const [name, iso, lat, lon] of COUNTRIES) {
    GEO.set(name.toLowerCase(), [lat, lon]);
    GEO.set(iso.toLowerCase(), [lat, lon]);
}

/** Where the arcs end: the server. Germany is a neutral default. */
const HOME = [51, 10];

function latLon(lat, lon, r = 1) {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
    );
}

function useLandDots() {
    const [dots, setDots] = useState(null);
    useEffect(() => {
        let dead = false;
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, c.width, c.height).data;
            const pts = [];
            for (let lat = -84; lat <= 84; lat += 1.5) {
                const step = 1.5 / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
                for (let lon = -180; lon < 180; lon += step) {
                    const x = Math.min(c.width - 1, Math.floor(((lon + 180) / 360) * c.width));
                    const y = Math.min(c.height - 1, Math.floor(((90 - lat) / 180) * c.height));
                    if (data[(y * c.width + x) * 4] > 127) {
                        const v = latLon(lat, lon, 1);
                        pts.push(v.x, v.y, v.z);
                    }
                }
            }
            if (!dead) setDots(new Float32Array(pts));
        };
        img.src = LAND_URL;
        return () => {
            dead = true;
        };
    }, []);
    return dots;
}

function dotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    return new THREE.CanvasTexture(c);
}

function Land({ dots, color }) {
    const geometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(dots, 3));
        return g;
    }, [dots]);
    const map = useMemo(() => dotTexture(), []);
    return (
        <points geometry={geometry}>
            <pointsMaterial
                color={color}
                size={0.017}
                sizeAttenuation
                map={map}
                alphaTest={0.3}
                transparent
                opacity={0.95}
                depthWrite={false}
            />
        </points>
    );
}

const atmosphere = {
    vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 glow; varying vec3 vN; void main(){ float i = pow(0.68 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(glow, 1.0) * i; }`,
};

function Marker({ pos, size, color }) {
    const ring = useRef(null);
    const quat = useMemo(
        () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()),
        [pos],
    );
    useFrame(({ clock }) => {
        const m = ring.current;
        if (!m) return;
        const p = (clock.elapsedTime * 0.7) % 1;
        m.scale.setScalar(0.5 + p * 2);
        m.material.opacity = 0.9 * (1 - p);
    });
    return (
        <group position={pos.clone().multiplyScalar(1.004)} quaternion={quat}>
            <mesh>
                <circleGeometry args={[size, 24]} />
                <meshBasicMaterial color={color} />
            </mesh>
            <mesh ref={ring}>
                <ringGeometry args={[size * 1.2, size * 1.6, 32]} />
                <meshBasicMaterial color={color} transparent depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

function Arc({ from, to, color, offset }) {
    const curve = useMemo(() => {
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const lift = 1 + from.distanceTo(to) * 0.45;
        mid.normalize().multiplyScalar(lift);
        return new THREE.QuadraticBezierCurve3(
            from.clone().multiplyScalar(1.004),
            mid,
            to.clone().multiplyScalar(1.004),
        );
    }, [from, to]);
    const line = useMemo(
        () =>
            new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
                new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 }),
            ),
        [curve, color],
    );
    useEffect(
        () => () => {
            line.geometry.dispose();
            line.material.dispose();
        },
        [line],
    );
    const dot = useRef(null);
    useFrame(({ clock }) => {
        const t = (clock.elapsedTime * 0.22 + offset) % 1;
        dot.current?.position.copy(curve.getPoint(t));
    });
    return (
        <group>
            <primitive object={line} />
            <mesh ref={dot}>
                <sphereGeometry args={[0.014, 10, 10]} />
                <meshBasicMaterial color={color} />
            </mesh>
        </group>
    );
}

function Scene({ rows, color, rotate }) {
    const core = useMemo(() => new THREE.Color(color).multiplyScalar(0.07), [color]);
    const atmoUniforms = useMemo(() => ({ glow: { value: new THREE.Color(color) } }), [color]);
    const dots = useLandDots();
    const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
    const places = useMemo(
        () =>
            rows
                .map((r) => {
                    const g = GEO.get(r.name.trim().toLowerCase());
                    return g ? { name: r.name, pos: latLon(g[0], g[1]), weight: r.count / max } : null;
                })
                .filter((p) => p !== null)
                .slice(0, 10),
        [rows, max],
    );
    const home = useMemo(() => latLon(HOME[0], HOME[1]), []);

    return (
        <>
            <OrbitControls
                enablePan={false}
                enableZoom={false}
                autoRotate={rotate}
                autoRotateSpeed={0.7}
                rotateSpeed={0.5}
                minPolarAngle={Math.PI * 0.25}
                maxPolarAngle={Math.PI * 0.75}
            />
            <group scale={1.05}>
                <mesh>
                    <sphereGeometry args={[0.985, 64, 64]} />
                    <meshBasicMaterial color={core} />
                </mesh>
                <mesh scale={1.16}>
                    <sphereGeometry args={[1, 64, 64]} />
                    <shaderMaterial
                        {...atmosphere}
                        uniforms={atmoUniforms}
                        side={THREE.BackSide}
                        blending={THREE.AdditiveBlending}
                        transparent
                        depthWrite={false}
                    />
                </mesh>
                {dots ? <Land dots={dots} color={color} /> : null}
                {places.map((p, i) => (
                    <group key={p.name}>
                        <Marker pos={p.pos} size={0.018 + p.weight * 0.025} color={color} />
                        <Arc from={p.pos} to={home} color={color} offset={i / places.length} />
                    </group>
                ))}
            </group>
        </>
    );
}

function readPrimary() {
    const probe = document.createElement('span');
    probe.style.color = 'hsl(var(--primary))';
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    probe.remove();
    const m = rgb.match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    return new THREE.Color(`rgb(${Math.round(m[0])}, ${Math.round(m[1])}, ${Math.round(m[2])})`);
}

export function WafGlobe({ rows }) {
    const [rotate, setRotate] = useState(true);
    const [color, setColor] = useState('#8b5cf6');
    useEffect(() => {
        setRotate(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const apply = () => {
            const c = readPrimary();
            if (c) setColor((prev) => (prev === `#${c.getHexString()}` ? prev : `#${c.getHexString()}`));
        };
        apply();
        const mo = new MutationObserver(apply);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
        return () => mo.disconnect();
    }, []);
    return (
        <div className='h-[270px] w-full cursor-grab active:cursor-grabbing'>
            <Canvas camera={{ position: [0, 0.6, 3.6], fov: 40 }} dpr={[1, 2]}>
                <Scene rows={rows} color={color} rotate={rotate} />
            </Canvas>
        </div>
    );
}
