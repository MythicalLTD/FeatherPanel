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

/** Cookie used so SSR can resolve the UI locale on hard refresh. */
export const LOCALE_COOKIE_NAME = 'fp_locale';

/** Cookie used so SSR can match the user's sidebar icon library (avoids Lucide→Tabler swap). */
export const ICON_LIBRARY_COOKIE_NAME = 'fp_icon_library';
