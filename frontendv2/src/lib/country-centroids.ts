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

/**
 * Approximate country centroids (ISO 3166-1 alpha-2 → [lat, lng]).
 * Used only as a fallback when a location has a flag but no exact coordinates.
 */
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
    ad: [42.5462, 1.6016],
    ae: [23.4241, 53.8478],
    af: [33.9391, 67.71],
    al: [41.1533, 20.1683],
    am: [40.0691, 45.0382],
    ar: [-38.4161, -63.6167],
    at: [47.5162, 14.5501],
    au: [-25.2744, 133.7751],
    az: [40.1431, 47.5769],
    ba: [43.9159, 17.6791],
    be: [50.5039, 4.4699],
    bg: [42.7339, 25.4858],
    br: [-14.235, -51.9253],
    by: [53.7098, 27.9534],
    ca: [56.1304, -106.3468],
    ch: [46.8182, 8.2275],
    cl: [-35.6751, -71.543],
    cn: [35.8617, 104.1954],
    co: [4.5709, -74.2973],
    cy: [35.1264, 33.4299],
    cz: [49.8175, 15.473],
    de: [51.1657, 10.4515],
    dk: [56.2639, 9.5018],
    ee: [58.5953, 25.0136],
    eg: [26.8206, 30.8025],
    es: [40.4637, -3.7492],
    fi: [61.9241, 25.7482],
    fr: [46.2276, 2.2137],
    gb: [55.3781, -3.436],
    ge: [42.3154, 43.3569],
    gr: [39.0742, 21.8243],
    hk: [22.3193, 114.1694],
    hr: [45.1, 15.2],
    hu: [47.1625, 19.5033],
    id: [-0.7893, 113.9213],
    ie: [53.4129, -8.2439],
    il: [31.0461, 34.8516],
    in: [20.5937, 78.9629],
    is: [64.9631, -19.0208],
    it: [41.8719, 12.5674],
    jp: [36.2048, 138.2529],
    kr: [35.9078, 127.7669],
    kz: [48.0196, 66.9237],
    lt: [55.1694, 23.8813],
    lu: [49.8153, 6.1296],
    lv: [56.8796, 24.6032],
    md: [47.4116, 28.3699],
    mk: [41.6086, 21.7453],
    mx: [23.6345, -102.5528],
    my: [4.2105, 101.9758],
    nl: [52.1326, 5.2913],
    no: [60.472, 8.4689],
    nz: [-40.9006, 174.886],
    ph: [12.8797, 121.774],
    pl: [51.9194, 19.1451],
    pt: [39.3999, -8.2245],
    ro: [45.9432, 24.9668],
    rs: [44.0165, 21.0059],
    ru: [61.524, 105.3188],
    se: [60.1282, 18.6435],
    sg: [1.3521, 103.8198],
    si: [46.1512, 14.9955],
    sk: [48.669, 19.699],
    th: [15.87, 100.9925],
    tr: [38.9637, 35.2433],
    tw: [23.6978, 120.9605],
    ua: [48.3794, 31.1656],
    us: [37.0902, -95.7129],
    uy: [-32.5228, -55.7658],
    uz: [41.3775, 64.5853],
    vn: [14.0583, 108.2772],
    za: [-30.5595, 22.9375],
};

export type ResolvedCoordinates = {
    latitude: number;
    longitude: number;
    approximate: boolean;
};

export function resolveNodeCoordinates(input: {
    latitude?: number | null;
    longitude?: number | null;
    flag_code?: string | null;
}): ResolvedCoordinates | null {
    if (
        typeof input.latitude === 'number' &&
        Number.isFinite(input.latitude) &&
        typeof input.longitude === 'number' &&
        Number.isFinite(input.longitude)
    ) {
        return { latitude: input.latitude, longitude: input.longitude, approximate: false };
    }

    const code = (input.flag_code || '').trim().toLowerCase();
    if (code && COUNTRY_CENTROIDS[code]) {
        const [latitude, longitude] = COUNTRY_CENTROIDS[code];
        return { latitude, longitude, approximate: true };
    }

    return null;
}
