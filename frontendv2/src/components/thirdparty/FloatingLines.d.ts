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

import type { FC } from 'react';

export interface WavePosition {
    x?: number;
    y?: number;
    rotate?: number;
}

export interface FloatingLinesProps {
    linesGradient: string[];
    enabledWaves?: string[];
    lineCount?: number[];
    lineDistance?: number[];
    topWavePosition?: WavePosition;
    middleWavePosition?: WavePosition;
    bottomWavePosition?: WavePosition;
    animationSpeed?: number;
    interactive?: boolean;
    bendRadius?: number;
    bendStrength?: number;
    mouseDamping?: number;
    parallax?: boolean;
    parallaxStrength?: number;
    mixBlendMode?: string;
}

declare const FloatingLines: FC<FloatingLinesProps>;
export default FloatingLines;
