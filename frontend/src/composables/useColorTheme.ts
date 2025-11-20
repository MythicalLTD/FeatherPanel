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
export type AccentColor = 'default' | 'blue' | 'red' | 'rose' | 'orange' | 'green' | 'yellow' | 'violet';

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
};

// Global color theme state
const currentColorTheme = ref<ColorTheme>('neutral');
const currentAccentColor = ref<AccentColor>('default');

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
    const accentColorsToApply = isDark ? accentColors[accent].dark : accentColors[accent].light;

    // Create or update a style element for theme overrides with high specificity
    let styleElement = document.getElementById('color-theme-override');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'color-theme-override';
        document.head.appendChild(styleElement);
    }

    // Build CSS rules with !important to override default CSS
    const lightColors = { ...colorThemes[currentColorTheme.value].light, ...accentColors[accent].light };
    const darkColors = { ...colorThemes[currentColorTheme.value].dark, ...accentColors[accent].dark };

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
    if (
        savedAccent &&
        (savedAccent === 'default' ||
            savedAccent === 'blue' ||
            savedAccent === 'red' ||
            savedAccent === 'rose' ||
            savedAccent === 'orange' ||
            savedAccent === 'green' ||
            savedAccent === 'yellow' ||
            savedAccent === 'violet')
    ) {
        currentAccentColor.value = savedAccent as AccentColor;
    } else {
        currentAccentColor.value = 'default';
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
        ] as AccentColor[],
    };
}
