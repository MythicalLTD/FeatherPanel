/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

import { ref, onMounted, readonly } from 'vue';

export type ColorTheme = 'neutral' | 'stone' | 'zinc' | 'gray' | 'slate';
export type AccentColor =
    | 'default'
    | 'blue'
    | 'red'
    | 'rose'
    | 'orange'
    | 'green'
    | 'yellow'
    | 'violet'
    | 'cyan'
    | 'emerald'
    | 'indigo'
    | 'pink'
    | 'teal'
    | 'sky'
    | 'lime'
    | 'amber'
    | 'fuchsia'
    | 'custom';

// Color theme definitions based on shadcn-vue theming
const colorThemes: Record<ColorTheme, { light: Record<string, string>; dark: Record<string, string> }> = {
    neutral: {
        light: {
            '--background': 'oklch(1 0 0)',
            '--foreground': 'oklch(0.145 0 0)',
            '--card': 'oklch(1 0 0)',
            '--card-foreground': 'oklch(0.145 0 0)',
            '--popover': 'oklch(1 0 0)',
            '--popover-foreground': 'oklch(0.145 0 0)',
            '--primary': 'oklch(0.205 0 0)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--secondary': 'oklch(0.97 0 0)',
            '--secondary-foreground': 'oklch(0.205 0 0)',
            '--muted': 'oklch(0.97 0 0)',
            '--muted-foreground': 'oklch(0.556 0 0)',
            '--accent': 'oklch(0.97 0 0)',
            '--accent-foreground': 'oklch(0.205 0 0)',
            '--destructive': 'oklch(0.577 0.245 27.325)',
            '--destructive-foreground': 'oklch(0.577 0.245 27.325)',
            '--border': 'oklch(0.922 0 0)',
            '--input': 'oklch(0.922 0 0)',
            '--ring': 'oklch(0.708 0 0)',
            '--sidebar': 'oklch(0.985 0 0)',
            '--sidebar-foreground': 'oklch(0.145 0 0)',
            '--sidebar-primary': 'oklch(0.205 0 0)',
            '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
            '--sidebar-accent': 'oklch(0.97 0 0)',
            '--sidebar-accent-foreground': 'oklch(0.205 0 0)',
            '--sidebar-border': 'oklch(0.922 0 0)',
            '--sidebar-ring': 'oklch(0.708 0 0)',
        },
        dark: {
            '--background': 'oklch(0.145 0 0)',
            '--foreground': 'oklch(0.985 0 0)',
            '--card': 'oklch(0.145 0 0)',
            '--card-foreground': 'oklch(0.985 0 0)',
            '--popover': 'oklch(0.145 0 0)',
            '--popover-foreground': 'oklch(0.985 0 0)',
            '--primary': 'oklch(0.985 0 0)',
            '--primary-foreground': 'oklch(0.205 0 0)',
            '--secondary': 'oklch(0.269 0 0)',
            '--secondary-foreground': 'oklch(0.985 0 0)',
            '--muted': 'oklch(0.269 0 0)',
            '--muted-foreground': 'oklch(0.708 0 0)',
            '--accent': 'oklch(0.269 0 0)',
            '--accent-foreground': 'oklch(0.985 0 0)',
            '--destructive': 'oklch(0.396 0.141 25.723)',
            '--destructive-foreground': 'oklch(0.637 0.237 25.331)',
            '--border': 'oklch(0.269 0 0)',
            '--input': 'oklch(0.269 0 0)',
            '--ring': 'oklch(0.439 0 0)',
            '--sidebar': 'oklch(0.205 0 0)',
            '--sidebar-foreground': 'oklch(0.985 0 0)',
            '--sidebar-primary': 'oklch(0.488 0.243 264.376)',
            '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
            '--sidebar-accent': 'oklch(0.269 0 0)',
            '--sidebar-accent-foreground': 'oklch(0.985 0 0)',
            '--sidebar-border': 'oklch(0.269 0 0)',
            '--sidebar-ring': 'oklch(0.439 0 0)',
        },
    },
    stone: {
        light: {
            '--background': 'oklch(0.99 0 0)',
            '--foreground': 'oklch(0.129 0.042 264.695)',
            '--card': 'oklch(0.99 0 0)',
            '--card-foreground': 'oklch(0.129 0.042 264.695)',
            '--popover': 'oklch(0.99 0 0)',
            '--popover-foreground': 'oklch(0.129 0.042 264.695)',
            '--primary': 'oklch(0.208 0.042 265.755)',
            '--primary-foreground': 'oklch(0.984 0.003 247.858)',
            '--secondary': 'oklch(0.968 0.007 247.896)',
            '--secondary-foreground': 'oklch(0.208 0.042 265.755)',
            '--muted': 'oklch(0.968 0.007 247.896)',
            '--muted-foreground': 'oklch(0.554 0.046 257.417)',
            '--accent': 'oklch(0.968 0.007 247.896)',
            '--accent-foreground': 'oklch(0.208 0.042 265.755)',
            '--destructive': 'oklch(0.577 0.245 27.325)',
            '--destructive-foreground': 'oklch(0.577 0.245 27.325)',
            '--border': 'oklch(0.929 0.013 255.508)',
            '--input': 'oklch(0.929 0.013 255.508)',
            '--ring': 'oklch(0.704 0.04 256.788)',
            '--sidebar': 'oklch(0.984 0.003 247.858)',
            '--sidebar-foreground': 'oklch(0.129 0.042 264.695)',
            '--sidebar-primary': 'oklch(0.208 0.042 265.755)',
            '--sidebar-primary-foreground': 'oklch(0.984 0.003 247.858)',
            '--sidebar-accent': 'oklch(0.968 0.007 247.896)',
            '--sidebar-accent-foreground': 'oklch(0.208 0.042 265.755)',
            '--sidebar-border': 'oklch(0.929 0.013 255.508)',
            '--sidebar-ring': 'oklch(0.704 0.04 256.788)',
        },
        dark: {
            '--background': 'oklch(0.129 0.042 264.695)',
            '--foreground': 'oklch(0.984 0.003 247.858)',
            '--card': 'oklch(0.208 0.042 265.755)',
            '--card-foreground': 'oklch(0.984 0.003 247.858)',
            '--popover': 'oklch(0.208 0.042 265.755)',
            '--popover-foreground': 'oklch(0.984 0.003 247.858)',
            '--primary': 'oklch(0.929 0.013 255.508)',
            '--primary-foreground': 'oklch(0.208 0.042 265.755)',
            '--secondary': 'oklch(0.279 0.041 260.031)',
            '--secondary-foreground': 'oklch(0.984 0.003 247.858)',
            '--muted': 'oklch(0.279 0.041 260.031)',
            '--muted-foreground': 'oklch(0.704 0.04 256.788)',
            '--accent': 'oklch(0.279 0.041 260.031)',
            '--accent-foreground': 'oklch(0.984 0.003 247.858)',
            '--destructive': 'oklch(0.704 0.191 22.216)',
            '--destructive-foreground': 'oklch(0.637 0.237 25.331)',
            '--border': 'oklch(1 0 0 / 10%)',
            '--input': 'oklch(1 0 0 / 15%)',
            '--ring': 'oklch(0.551 0.027 264.364)',
            '--sidebar': 'oklch(0.208 0.042 265.755)',
            '--sidebar-foreground': 'oklch(0.984 0.003 247.858)',
            '--sidebar-primary': 'oklch(0.488 0.243 264.376)',
            '--sidebar-primary-foreground': 'oklch(0.984 0.003 247.858)',
            '--sidebar-accent': 'oklch(0.279 0.041 260.031)',
            '--sidebar-accent-foreground': 'oklch(0.984 0.003 247.858)',
            '--sidebar-border': 'oklch(1 0 0 / 10%)',
            '--sidebar-ring': 'oklch(0.551 0.027 264.364)',
        },
    },
    zinc: {
        light: {
            '--background': 'oklch(1 0 0)',
            '--foreground': 'oklch(0.13 0.028 261.692)',
            '--card': 'oklch(1 0 0)',
            '--card-foreground': 'oklch(0.13 0.028 261.692)',
            '--popover': 'oklch(1 0 0)',
            '--popover-foreground': 'oklch(0.13 0.028 261.692)',
            '--primary': 'oklch(0.21 0.034 264.665)',
            '--primary-foreground': 'oklch(0.985 0.002 247.839)',
            '--secondary': 'oklch(0.967 0.003 264.542)',
            '--secondary-foreground': 'oklch(0.21 0.034 264.665)',
            '--muted': 'oklch(0.967 0.003 264.542)',
            '--muted-foreground': 'oklch(0.556 0.022 261.325)',
            '--accent': 'oklch(0.967 0.003 264.542)',
            '--accent-foreground': 'oklch(0.21 0.034 264.665)',
            '--destructive': 'oklch(0.577 0.245 27.325)',
            '--destructive-foreground': 'oklch(0.577 0.245 27.325)',
            '--border': 'oklch(0.928 0.006 264.531)',
            '--input': 'oklch(0.928 0.006 264.531)',
            '--ring': 'oklch(0.707 0.022 261.325)',
            '--sidebar': 'oklch(0.985 0.002 247.839)',
            '--sidebar-foreground': 'oklch(0.13 0.028 261.692)',
            '--sidebar-primary': 'oklch(0.21 0.034 264.665)',
            '--sidebar-primary-foreground': 'oklch(0.985 0.002 247.839)',
            '--sidebar-accent': 'oklch(0.967 0.003 264.542)',
            '--sidebar-accent-foreground': 'oklch(0.21 0.034 264.665)',
            '--sidebar-border': 'oklch(0.928 0.006 264.531)',
            '--sidebar-ring': 'oklch(0.707 0.022 261.325)',
        },
        dark: {
            '--background': 'oklch(0.13 0.028 261.692)',
            '--foreground': 'oklch(0.985 0.002 247.839)',
            '--card': 'oklch(0.21 0.034 264.665)',
            '--card-foreground': 'oklch(0.985 0.002 247.839)',
            '--popover': 'oklch(0.21 0.034 264.665)',
            '--popover-foreground': 'oklch(0.985 0.002 247.839)',
            '--primary': 'oklch(0.928 0.006 264.531)',
            '--primary-foreground': 'oklch(0.21 0.034 264.665)',
            '--secondary': 'oklch(0.278 0.033 256.848)',
            '--secondary-foreground': 'oklch(0.985 0.002 247.839)',
            '--muted': 'oklch(0.278 0.033 256.848)',
            '--muted-foreground': 'oklch(0.707 0.022 261.325)',
            '--accent': 'oklch(0.278 0.033 256.848)',
            '--accent-foreground': 'oklch(0.985 0.002 247.839)',
            '--destructive': 'oklch(0.704 0.191 22.216)',
            '--destructive-foreground': 'oklch(0.637 0.237 25.331)',
            '--border': 'oklch(1 0 0 / 10%)',
            '--input': 'oklch(1 0 0 / 15%)',
            '--ring': 'oklch(0.551 0.027 264.364)',
            '--sidebar': 'oklch(0.21 0.034 264.665)',
            '--sidebar-foreground': 'oklch(0.985 0.002 247.839)',
            '--sidebar-primary': 'oklch(0.488 0.243 264.376)',
            '--sidebar-primary-foreground': 'oklch(0.985 0.002 247.839)',
            '--sidebar-accent': 'oklch(0.278 0.033 256.848)',
            '--sidebar-accent-foreground': 'oklch(0.985 0.002 247.839)',
            '--sidebar-border': 'oklch(1 0 0 / 10%)',
            '--sidebar-ring': 'oklch(0.551 0.027 264.364)',
        },
    },
    gray: {
        light: {
            '--background': 'oklch(1 0 0)',
            '--foreground': 'oklch(0.145 0 0)',
            '--card': 'oklch(1 0 0)',
            '--card-foreground': 'oklch(0.145 0 0)',
            '--popover': 'oklch(1 0 0)',
            '--popover-foreground': 'oklch(0.145 0 0)',
            '--primary': 'oklch(0.205 0 0)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--secondary': 'oklch(0.97 0 0)',
            '--secondary-foreground': 'oklch(0.205 0 0)',
            '--muted': 'oklch(0.97 0 0)',
            '--muted-foreground': 'oklch(0.556 0 0)',
            '--accent': 'oklch(0.97 0 0)',
            '--accent-foreground': 'oklch(0.205 0 0)',
            '--destructive': 'oklch(0.577 0.245 27.325)',
            '--destructive-foreground': 'oklch(0.577 0.245 27.325)',
            '--border': 'oklch(0.922 0 0)',
            '--input': 'oklch(0.922 0 0)',
            '--ring': 'oklch(0.708 0 0)',
            '--sidebar': 'oklch(0.985 0 0)',
            '--sidebar-foreground': 'oklch(0.145 0 0)',
            '--sidebar-primary': 'oklch(0.205 0 0)',
            '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
            '--sidebar-accent': 'oklch(0.97 0 0)',
            '--sidebar-accent-foreground': 'oklch(0.205 0 0)',
            '--sidebar-border': 'oklch(0.922 0 0)',
            '--sidebar-ring': 'oklch(0.708 0 0)',
        },
        dark: {
            '--background': 'oklch(0.145 0 0)',
            '--foreground': 'oklch(0.985 0 0)',
            '--card': 'oklch(0.145 0 0)',
            '--card-foreground': 'oklch(0.985 0 0)',
            '--popover': 'oklch(0.145 0 0)',
            '--popover-foreground': 'oklch(0.985 0 0)',
            '--primary': 'oklch(0.985 0 0)',
            '--primary-foreground': 'oklch(0.205 0 0)',
            '--secondary': 'oklch(0.269 0 0)',
            '--secondary-foreground': 'oklch(0.985 0 0)',
            '--muted': 'oklch(0.269 0 0)',
            '--muted-foreground': 'oklch(0.708 0 0)',
            '--accent': 'oklch(0.269 0 0)',
            '--accent-foreground': 'oklch(0.985 0 0)',
            '--destructive': 'oklch(0.396 0.141 25.723)',
            '--destructive-foreground': 'oklch(0.637 0.237 25.331)',
            '--border': 'oklch(0.269 0 0)',
            '--input': 'oklch(0.269 0 0)',
            '--ring': 'oklch(0.439 0 0)',
            '--sidebar': 'oklch(0.205 0 0)',
            '--sidebar-foreground': 'oklch(0.985 0 0)',
            '--sidebar-primary': 'oklch(0.488 0.243 264.376)',
            '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
            '--sidebar-accent': 'oklch(0.269 0 0)',
            '--sidebar-accent-foreground': 'oklch(0.985 0 0)',
            '--sidebar-border': 'oklch(0.269 0 0)',
            '--sidebar-ring': 'oklch(0.439 0 0)',
        },
    },
    slate: {
        light: {
            '--background': 'oklch(0.99 0 0)',
            '--foreground': 'oklch(0.129 0.042 264.695)',
            '--card': 'oklch(0.99 0 0)',
            '--card-foreground': 'oklch(0.129 0.042 264.695)',
            '--popover': 'oklch(0.99 0 0)',
            '--popover-foreground': 'oklch(0.129 0.042 264.695)',
            '--primary': 'oklch(0.208 0.042 265.755)',
            '--primary-foreground': 'oklch(0.984 0.003 247.858)',
            '--secondary': 'oklch(0.968 0.007 247.896)',
            '--secondary-foreground': 'oklch(0.208 0.042 265.755)',
            '--muted': 'oklch(0.968 0.007 247.896)',
            '--muted-foreground': 'oklch(0.554 0.046 257.417)',
            '--accent': 'oklch(0.968 0.007 247.896)',
            '--accent-foreground': 'oklch(0.208 0.042 265.755)',
            '--destructive': 'oklch(0.577 0.245 27.325)',
            '--destructive-foreground': 'oklch(0.577 0.245 27.325)',
            '--border': 'oklch(0.929 0.013 255.508)',
            '--input': 'oklch(0.929 0.013 255.508)',
            '--ring': 'oklch(0.704 0.04 256.788)',
            '--sidebar': 'oklch(0.984 0.003 247.858)',
            '--sidebar-foreground': 'oklch(0.129 0.042 264.695)',
            '--sidebar-primary': 'oklch(0.208 0.042 265.755)',
            '--sidebar-primary-foreground': 'oklch(0.984 0.003 247.858)',
            '--sidebar-accent': 'oklch(0.968 0.007 247.896)',
            '--sidebar-accent-foreground': 'oklch(0.208 0.042 265.755)',
            '--sidebar-border': 'oklch(0.929 0.013 255.508)',
            '--sidebar-ring': 'oklch(0.704 0.04 256.788)',
        },
        dark: {
            '--background': 'oklch(0.129 0.042 264.695)',
            '--foreground': 'oklch(0.984 0.003 247.858)',
            '--card': 'oklch(0.208 0.042 265.755)',
            '--card-foreground': 'oklch(0.984 0.003 247.858)',
            '--popover': 'oklch(0.208 0.042 265.755)',
            '--popover-foreground': 'oklch(0.984 0.003 247.858)',
            '--primary': 'oklch(0.929 0.013 255.508)',
            '--primary-foreground': 'oklch(0.208 0.042 265.755)',
            '--secondary': 'oklch(0.279 0.041 260.031)',
            '--secondary-foreground': 'oklch(0.984 0.003 247.858)',
            '--muted': 'oklch(0.279 0.041 260.031)',
            '--muted-foreground': 'oklch(0.704 0.04 256.788)',
            '--accent': 'oklch(0.279 0.041 260.031)',
            '--accent-foreground': 'oklch(0.984 0.003 247.858)',
            '--destructive': 'oklch(0.704 0.191 22.216)',
            '--destructive-foreground': 'oklch(0.637 0.237 25.331)',
            '--border': 'oklch(1 0 0 / 10%)',
            '--input': 'oklch(1 0 0 / 15%)',
            '--ring': 'oklch(0.551 0.027 264.364)',
            '--sidebar': 'oklch(0.208 0.042 265.755)',
            '--sidebar-foreground': 'oklch(0.984 0.003 247.858)',
            '--sidebar-primary': 'oklch(0.488 0.243 264.376)',
            '--sidebar-primary-foreground': 'oklch(0.984 0.003 247.858)',
            '--sidebar-accent': 'oklch(0.279 0.041 260.031)',
            '--sidebar-accent-foreground': 'oklch(0.984 0.003 247.858)',
            '--sidebar-border': 'oklch(1 0 0 / 10%)',
            '--sidebar-ring': 'oklch(0.551 0.027 264.364)',
        },
    },
};

// Accent color definitions (primary, accent, ring colors)
const accentColors: Record<AccentColor, { light: Record<string, string>; dark: Record<string, string> }> = {
    default: {
        light: {
            '--primary': 'oklch(0.205 0 0)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0 0)',
            '--accent-foreground': 'oklch(0.205 0 0)',
            '--ring': 'oklch(0.708 0 0)',
        },
        dark: {
            '--primary': 'oklch(0.985 0 0)',
            '--primary-foreground': 'oklch(0.205 0 0)',
            '--accent': 'oklch(0.269 0 0)',
            '--accent-foreground': 'oklch(0.985 0 0)',
            '--ring': 'oklch(0.439 0 0)',
        },
    },
    blue: {
        light: {
            '--primary': 'oklch(0.522 0.177 251.116)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 251.116)',
            '--accent-foreground': 'oklch(0.522 0.177 251.116)',
            '--ring': 'oklch(0.522 0.177 251.116)',
        },
        dark: {
            '--primary': 'oklch(0.696 0.17 251.116)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 251.116)',
            '--accent-foreground': 'oklch(0.696 0.17 251.116)',
            '--ring': 'oklch(0.696 0.17 251.116)',
        },
    },
    red: {
        light: {
            '--primary': 'oklch(0.577 0.245 27.325)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 27.325)',
            '--accent-foreground': 'oklch(0.577 0.245 27.325)',
            '--ring': 'oklch(0.577 0.245 27.325)',
        },
        dark: {
            '--primary': 'oklch(0.704 0.191 22.216)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 27.325)',
            '--accent-foreground': 'oklch(0.704 0.191 22.216)',
            '--ring': 'oklch(0.704 0.191 22.216)',
        },
    },
    rose: {
        light: {
            '--primary': 'oklch(0.646 0.222 16.439)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 16.439)',
            '--accent-foreground': 'oklch(0.646 0.222 16.439)',
            '--ring': 'oklch(0.646 0.222 16.439)',
        },
        dark: {
            '--primary': 'oklch(0.645 0.246 16.439)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 16.439)',
            '--accent-foreground': 'oklch(0.645 0.246 16.439)',
            '--ring': 'oklch(0.645 0.246 16.439)',
        },
    },
    orange: {
        light: {
            '--primary': 'oklch(0.7 0.15 70)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 70)',
            '--accent-foreground': 'oklch(0.7 0.15 70)',
            '--ring': 'oklch(0.7 0.15 70)',
        },
        dark: {
            '--primary': 'oklch(0.769 0.188 70.08)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 70)',
            '--accent-foreground': 'oklch(0.769 0.188 70.08)',
            '--ring': 'oklch(0.769 0.188 70.08)',
        },
    },
    green: {
        light: {
            '--primary': 'oklch(0.6 0.118 184.704)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 184.704)',
            '--accent-foreground': 'oklch(0.6 0.118 184.704)',
            '--ring': 'oklch(0.6 0.118 184.704)',
        },
        dark: {
            '--primary': 'oklch(0.696 0.17 184.704)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 184.704)',
            '--accent-foreground': 'oklch(0.696 0.17 184.704)',
            '--ring': 'oklch(0.696 0.17 184.704)',
        },
    },
    yellow: {
        light: {
            '--primary': 'oklch(0.828 0.189 84.429)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.97 0.007 84.429)',
            '--accent-foreground': 'oklch(0.828 0.189 84.429)',
            '--ring': 'oklch(0.828 0.189 84.429)',
        },
        dark: {
            '--primary': 'oklch(0.828 0.189 84.429)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 84.429)',
            '--accent-foreground': 'oklch(0.828 0.189 84.429)',
            '--ring': 'oklch(0.828 0.189 84.429)',
        },
    },
    violet: {
        light: {
            '--primary': 'oklch(0.488 0.243 264.376)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 264.376)',
            '--accent-foreground': 'oklch(0.488 0.243 264.376)',
            '--ring': 'oklch(0.488 0.243 264.376)',
        },
        dark: {
            '--primary': 'oklch(0.488 0.243 264.376)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.269 0.033 264.376)',
            '--accent-foreground': 'oklch(0.488 0.243 264.376)',
            '--ring': 'oklch(0.488 0.243 264.376)',
        },
    },
    cyan: {
        light: {
            '--primary': 'oklch(0.6 0.15 200)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 200)',
            '--accent-foreground': 'oklch(0.6 0.15 200)',
            '--ring': 'oklch(0.6 0.15 200)',
        },
        dark: {
            '--primary': 'oklch(0.696 0.17 200)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 200)',
            '--accent-foreground': 'oklch(0.696 0.17 200)',
            '--ring': 'oklch(0.696 0.17 200)',
        },
    },
    emerald: {
        light: {
            '--primary': 'oklch(0.6 0.12 160)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 160)',
            '--accent-foreground': 'oklch(0.6 0.12 160)',
            '--ring': 'oklch(0.6 0.12 160)',
        },
        dark: {
            '--primary': 'oklch(0.696 0.17 160)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 160)',
            '--accent-foreground': 'oklch(0.696 0.17 160)',
            '--ring': 'oklch(0.696 0.17 160)',
        },
    },
    indigo: {
        light: {
            '--primary': 'oklch(0.522 0.177 270)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 270)',
            '--accent-foreground': 'oklch(0.522 0.177 270)',
            '--ring': 'oklch(0.522 0.177 270)',
        },
        dark: {
            '--primary': 'oklch(0.696 0.17 270)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 270)',
            '--accent-foreground': 'oklch(0.696 0.17 270)',
            '--ring': 'oklch(0.696 0.17 270)',
        },
    },
    pink: {
        light: {
            '--primary': 'oklch(0.646 0.222 350)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 350)',
            '--accent-foreground': 'oklch(0.646 0.222 350)',
            '--ring': 'oklch(0.646 0.222 350)',
        },
        dark: {
            '--primary': 'oklch(0.645 0.246 350)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 350)',
            '--accent-foreground': 'oklch(0.645 0.246 350)',
            '--ring': 'oklch(0.645 0.246 350)',
        },
    },
    teal: {
        light: {
            '--primary': 'oklch(0.6 0.12 180)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 180)',
            '--accent-foreground': 'oklch(0.6 0.12 180)',
            '--ring': 'oklch(0.6 0.12 180)',
        },
        dark: {
            '--primary': 'oklch(0.696 0.17 180)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 180)',
            '--accent-foreground': 'oklch(0.696 0.17 180)',
            '--ring': 'oklch(0.696 0.17 180)',
        },
    },
    sky: {
        light: {
            '--primary': 'oklch(0.6 0.15 220)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 220)',
            '--accent-foreground': 'oklch(0.6 0.15 220)',
            '--ring': 'oklch(0.6 0.15 220)',
        },
        dark: {
            '--primary': 'oklch(0.696 0.17 220)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 220)',
            '--accent-foreground': 'oklch(0.696 0.17 220)',
            '--ring': 'oklch(0.696 0.17 220)',
        },
    },
    lime: {
        light: {
            '--primary': 'oklch(0.7 0.15 120)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.97 0.007 120)',
            '--accent-foreground': 'oklch(0.7 0.15 120)',
            '--ring': 'oklch(0.7 0.15 120)',
        },
        dark: {
            '--primary': 'oklch(0.769 0.188 120)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 120)',
            '--accent-foreground': 'oklch(0.769 0.188 120)',
            '--ring': 'oklch(0.769 0.188 120)',
        },
    },
    amber: {
        light: {
            '--primary': 'oklch(0.75 0.15 75)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.97 0.007 75)',
            '--accent-foreground': 'oklch(0.75 0.15 75)',
            '--ring': 'oklch(0.75 0.15 75)',
        },
        dark: {
            '--primary': 'oklch(0.769 0.188 75)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 75)',
            '--accent-foreground': 'oklch(0.769 0.188 75)',
            '--ring': 'oklch(0.769 0.188 75)',
        },
    },
    fuchsia: {
        light: {
            '--primary': 'oklch(0.646 0.222 320)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 320)',
            '--accent-foreground': 'oklch(0.646 0.222 320)',
            '--ring': 'oklch(0.646 0.222 320)',
        },
        dark: {
            '--primary': 'oklch(0.645 0.246 320)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 320)',
            '--accent-foreground': 'oklch(0.645 0.246 320)',
            '--ring': 'oklch(0.645 0.246 320)',
        },
    },
    custom: {
        light: {
            '--primary': 'oklch(0.522 0.177 251.116)',
            '--primary-foreground': 'oklch(0.985 0 0)',
            '--accent': 'oklch(0.97 0.007 251.116)',
            '--accent-foreground': 'oklch(0.522 0.177 251.116)',
            '--ring': 'oklch(0.522 0.177 251.116)',
        },
        dark: {
            '--primary': 'oklch(0.696 0.17 251.116)',
            '--primary-foreground': 'oklch(0.145 0 0)',
            '--accent': 'oklch(0.269 0.033 251.116)',
            '--accent-foreground': 'oklch(0.696 0.17 251.116)',
            '--ring': 'oklch(0.696 0.17 251.116)',
        },
    },
};

// Global color theme state
const currentColorTheme = ref<ColorTheme>('neutral');
const currentAccentColor = ref<AccentColor>('default');
const customColor = ref<{ light: string; dark: string } | null>(null);

// Apply color theme to document
const applyColorTheme = (theme: ColorTheme, isDarkMode?: boolean) => {
    if (typeof window === 'undefined' || !document.documentElement) {
        return;
    }

    const isDark = isDarkMode ?? document.documentElement.classList.contains('dark');
    const themeColors = isDark ? colorThemes[theme].dark : colorThemes[theme].light;
    const accentColorsToApply = isDark
        ? accentColors[currentAccentColor.value].dark
        : accentColors[currentAccentColor.value].light;

    // Create or update a style element for theme overrides with high specificity
    let styleElement = document.getElementById('color-theme-override');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'color-theme-override';
        document.head.appendChild(styleElement);
    }

    // Build CSS rules with !important to override default CSS
    const lightColors = { ...colorThemes[theme].light, ...accentColors[currentAccentColor.value].light };
    const darkColors = { ...colorThemes[theme].dark, ...accentColors[currentAccentColor.value].dark };

    const lightRules = Object.entries(lightColors)
        .map(([property, value]) => `    ${property}: ${value} !important;`)
        .join('\n');

    const darkRules = Object.entries(darkColors)
        .map(([property, value]) => `    ${property}: ${value} !important;`)
        .join('\n');

    // Apply both light and dark theme colors, but only the active one will be used
    styleElement.textContent = `
        :root:not(.dark) {
${lightRules}
        }
        :root.dark,
        .dark {
${darkRules}
        }
    `;

    // Also set directly on documentElement as fallback
    const allColors = { ...themeColors, ...accentColorsToApply };
    Object.entries(allColors).forEach(([property, value]) => {
        document.documentElement.style.setProperty(property, value);
    });

    // Store theme
    localStorage.setItem('color-theme', theme);
    currentColorTheme.value = theme;

    // Dispatch custom event
    window.dispatchEvent(
        new CustomEvent('color-theme-changed', {
            detail: { theme, isDark },
        }),
    );
};

// Convert hex/rgb to oklch
const hexToOklch = (hex: string): string => {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse hex to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Convert RGB to linear RGB
    const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const rLinear = toLinear(r);
    const gLinear = toLinear(g);
    const bLinear = toLinear(b);

    // Convert to XYZ (D65)
    const x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375;
    const y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.072175;
    const z = rLinear * 0.0193339 + gLinear * 0.119192 + bLinear * 0.9503041;

    // Convert XYZ to Lab
    const xn = x / 0.95047;
    const yn = y / 1.0;
    const zn = z / 1.08883;

    const fx = xn > 0.008856 ? Math.pow(xn, 1 / 3) : 7.787 * xn + 16 / 116;
    const fy = yn > 0.008856 ? Math.pow(yn, 1 / 3) : 7.787 * yn + 16 / 116;
    const fz = zn > 0.008856 ? Math.pow(zn, 1 / 3) : 7.787 * zn + 16 / 116;

    const l = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bLab = 200 * (fy - fz);

    // Convert Lab to LCH
    const c = Math.sqrt(a * a + bLab * bLab);
    const h = Math.atan2(bLab, a) * (180 / Math.PI);
    const hNormalized = h < 0 ? h + 360 : h;

    // Convert to OKLCH (simplified conversion)
    const lOk = l / 100;
    const cOk = c / 150; // Approximate chroma scaling
    const hOk = hNormalized;

    return `oklch(${lOk.toFixed(3)} ${cOk.toFixed(3)} ${hOk.toFixed(1)})`;
};

// Generate accent colors from a base color
const generateAccentColors = (baseColor: string, isDark: boolean): Record<string, string> => {
    // Parse oklch
    const match = baseColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
    if (!match || !match[1] || !match[2] || !match[3]) {
        // Fallback if not oklch format
        return accentColors.default[isDark ? 'dark' : 'light'];
    }

    const l = match[1];
    const c = match[2];
    const h = match[3];
    const lightness = parseFloat(l);
    const chroma = parseFloat(c);
    const hue = parseFloat(h);

    // Generate variants
    const primaryDark = isDark ? lightness : Math.min(0.7, lightness + 0.15);
    const accentLight = isDark ? 0.269 : 0.97;
    const accentChroma = isDark ? 0.033 : 0.007;
    const ringLight = lightness;

    return {
        '--primary': `oklch(${primaryDark.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`,
        '--primary-foreground': isDark ? 'oklch(0.145 0 0)' : 'oklch(0.985 0 0)',
        '--accent': `oklch(${accentLight.toFixed(3)} ${accentChroma.toFixed(3)} ${hue.toFixed(1)})`,
        '--accent-foreground': `oklch(${primaryDark.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`,
        '--ring': `oklch(${ringLight.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`,
    };
};

// Apply accent color
const applyAccentColor = (accent: AccentColor, isDarkMode?: boolean) => {
    if (typeof window === 'undefined' || !document.documentElement) {
        return;
    }

    const isDark = isDarkMode ?? document.documentElement.classList.contains('dark');

    // Store accent color FIRST so applyColorTheme uses the new value
    localStorage.setItem('accent-color', accent);
    currentAccentColor.value = accent;

    // Force synchronous update by directly updating the style element
    const themeColors = isDark ? colorThemes[currentColorTheme.value].dark : colorThemes[currentColorTheme.value].light;

    // Get accent colors - use custom if available, otherwise use predefined
    let accentColorsToApply: Record<string, string>;
    if (accent === 'custom' && customColor.value) {
        accentColorsToApply = isDark
            ? generateAccentColors(customColor.value.dark, true)
            : generateAccentColors(customColor.value.light, false);
    } else {
        accentColorsToApply = isDark ? accentColors[accent].dark : accentColors[accent].light;
    }

    // Create or update a style element for theme overrides with high specificity
    let styleElement = document.getElementById('color-theme-override');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'color-theme-override';
        document.head.appendChild(styleElement);
    }

    // Build CSS rules with !important to override default CSS
    const lightAccentColors =
        accent === 'custom' && customColor.value
            ? generateAccentColors(customColor.value.light, false)
            : accentColors[accent].light;
    const darkAccentColors =
        accent === 'custom' && customColor.value
            ? generateAccentColors(customColor.value.dark, true)
            : accentColors[accent].dark;

    const lightColors = { ...colorThemes[currentColorTheme.value].light, ...lightAccentColors };
    const darkColors = { ...colorThemes[currentColorTheme.value].dark, ...darkAccentColors };

    const lightRules = Object.entries(lightColors)
        .map(([property, value]) => `    ${property}: ${value} !important;`)
        .join('\n');

    const darkRules = Object.entries(darkColors)
        .map(([property, value]) => `    ${property}: ${value} !important;`)
        .join('\n');

    // Apply both light and dark theme colors, but only the active one will be used
    styleElement.textContent = `
        :root:not(.dark) {
${lightRules}
        }
        :root.dark,
        .dark {
${darkRules}
        }
    `;

    // Also set directly on documentElement as fallback
    const allColors = { ...themeColors, ...accentColorsToApply };
    Object.entries(allColors).forEach(([property, value]) => {
        document.documentElement.style.setProperty(property, value);
    });

    // Dispatch custom event
    window.dispatchEvent(
        new CustomEvent('accent-color-changed', {
            detail: { accent, isDark },
        }),
    );
};

// Initialize color theme when DOM is ready
const initializeColorTheme = () => {
    if (typeof window === 'undefined' || !document.documentElement) {
        return;
    }

    // Load base color theme
    const savedTheme = localStorage.getItem('color-theme');
    if (
        savedTheme &&
        (savedTheme === 'neutral' ||
            savedTheme === 'stone' ||
            savedTheme === 'zinc' ||
            savedTheme === 'gray' ||
            savedTheme === 'slate')
    ) {
        currentColorTheme.value = savedTheme as ColorTheme;
    } else {
        currentColorTheme.value = 'neutral';
    }

    // Load accent color
    const savedAccent = localStorage.getItem('accent-color');
    const validAccentColors: AccentColor[] = [
        'default',
        'blue',
        'red',
        'rose',
        'orange',
        'green',
        'yellow',
        'violet',
        'cyan',
        'emerald',
        'indigo',
        'pink',
        'teal',
        'sky',
        'lime',
        'amber',
        'fuchsia',
        'custom',
    ];
    if (savedAccent && validAccentColors.includes(savedAccent as AccentColor)) {
        currentAccentColor.value = savedAccent as AccentColor;
    } else {
        currentAccentColor.value = 'default';
    }

    // Load custom color if accent is custom
    if (currentAccentColor.value === 'custom') {
        const savedCustomColor = localStorage.getItem('custom-accent-color');
        if (savedCustomColor) {
            try {
                customColor.value = JSON.parse(savedCustomColor);
            } catch {
                customColor.value = null;
            }
        }
    }

    const isDark = document.documentElement.classList.contains('dark');
    applyColorTheme(currentColorTheme.value, isDark);
};

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeColorTheme);
    } else {
        // DOM is already ready
        initializeColorTheme();
    }
}

export function useColorTheme() {
    // Set specific color theme
    const setColorTheme = (theme: ColorTheme) => {
        const isDark = document.documentElement.classList.contains('dark');
        applyColorTheme(theme, isDark);
    };

    // Listen for theme changes to reapply color theme
    const setupThemeListener = () => {
        window.addEventListener('theme-changed', (event: Event) => {
            // Reapply color theme when theme changes
            const customEvent = event as CustomEvent<{ theme: string }>;
            const isDark = customEvent.detail?.theme === 'dark' || document.documentElement.classList.contains('dark');

            // Use a small delay to ensure DOM has updated
            setTimeout(() => {
                applyColorTheme(currentColorTheme.value, isDark);
            }, 100);
        });
    };

    // Set accent color
    const setAccentColor = (accent: AccentColor) => {
        const isDark = document.documentElement.classList.contains('dark');
        applyAccentColor(accent, isDark);
    };

    // Set custom color
    const setCustomColor = (hexColor: string) => {
        const lightOklch = hexToOklch(hexColor);
        // For dark mode, adjust lightness
        const darkMatch = lightOklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
        let darkOklch = lightOklch;
        if (darkMatch && darkMatch[1] && darkMatch[2] && darkMatch[3]) {
            const l = darkMatch[1];
            const c = darkMatch[2];
            const h = darkMatch[3];
            const lightness = parseFloat(l);
            const chroma = parseFloat(c);
            const hue = parseFloat(h);
            // Increase lightness for dark mode
            const darkLightness = Math.min(0.7, lightness + 0.15);
            darkOklch = `oklch(${darkLightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`;
        }

        customColor.value = {
            light: lightOklch,
            dark: darkOklch,
        };

        localStorage.setItem('custom-accent-color', JSON.stringify(customColor.value));
        currentAccentColor.value = 'custom';
        const isDark = document.documentElement.classList.contains('dark');
        applyAccentColor('custom', isDark);
    };

    // Get custom color (returns hex)
    const getCustomColor = (): string | null => {
        if (!customColor.value) return null;

        // Convert oklch to hex (simplified - use current theme)
        const isDark = document.documentElement.classList.contains('dark');
        const oklch = isDark ? customColor.value.dark : customColor.value.light;

        // For now, return the oklch value - we'll need a proper converter
        // But for the color picker, we can extract RGB from computed style
        return oklch;
    };

    // Setup listener on mount
    onMounted(() => {
        setupThemeListener();
    });

    return {
        currentColorTheme: readonly(currentColorTheme),
        currentAccentColor: readonly(currentAccentColor),
        setColorTheme,
        setAccentColor,
        applyColorTheme,
        applyAccentColor,
        availableThemes: ['neutral', 'stone', 'zinc', 'gray', 'slate'] as ColorTheme[],
        availableAccentColors: [
            'default',
            'blue',
            'red',
            'rose',
            'orange',
            'green',
            'yellow',
            'violet',
            'cyan',
            'emerald',
            'indigo',
            'pink',
            'teal',
            'sky',
            'lime',
            'amber',
            'fuchsia',
            'custom',
        ] as AccentColor[],
        setCustomColor,
        getCustomColor,
        hexToOklch,
    };
}
