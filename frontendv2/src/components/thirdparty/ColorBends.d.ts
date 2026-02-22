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

import type { CSSProperties, FC } from 'react';

export interface ColorBendsProps {
    className?: string;
    style?: CSSProperties;
    rotation?: number;
    speed?: number;
    colors?: string[];
    transparent?: boolean;
    autoRotate?: number;
    scale?: number;
    frequency?: number;
    warpStrength?: number;
    mouseInfluence?: number;
    parallax?: number;
    noise?: number;
}

declare const ColorBends: FC<ColorBendsProps>;
export default ColorBends;
