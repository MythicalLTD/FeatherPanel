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
// FITNESS FOR A PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { ref, computed, onMounted } from 'vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from 'vue-toastification';
import {
    Layers,
    Scale,
    Code,
    ClipboardCopy,
    FileText,
    Shield,
    Package,
    Globe,
    Github,
    Heart,
    AlertTriangle,
} from 'lucide-vue-next';
import jsCookie from 'js-cookie';
import { useSessionStore } from '@/stores/session';
import Permissions from '@/lib/permissions';

const toast = useToast();
const sessionStore = useSessionStore();

const defaultMIT = `MIT License

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
SOFTWARE.`;

const licenseText = ref<string>(defaultMIT);

const dontTrackDevice = ref<boolean>(false);

const isOptedOut = computed(() => {
    return jsCookie.get('dontrackmydevice') === 'true';
});

const hasAdminPermission = computed(() => {
    return sessionStore.hasPermission(Permissions.ADMIN_DASHBOARD_VIEW);
});

onMounted(() => {
    dontTrackDevice.value = isOptedOut.value;
});

const handleTelemetryToggle = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    if (checked) {
        jsCookie.set('dontrackmydevice', 'true', { expires: 365 });
        toast.success('Telemetry disabled. Please refresh the page for changes to take effect.');
    } else {
        jsCookie.remove('dontrackmydevice');
        toast.success('Telemetry enabled. Please refresh the page for changes to take effect.');
    }
    dontTrackDevice.value = checked;
};

const frontendTechnologies = [
    { name: 'vue', description: 'UI framework', license: 'MIT' },
    { name: 'vue-router', description: 'Client-side routing', license: 'MIT' },
    { name: 'pinia', description: 'State management', license: 'MIT' },
    { name: 'vite', description: 'Dev server and bundler', license: 'MIT' },
    { name: 'typescript', description: 'Type-safe development', license: 'Apache-2.0' },
    { name: 'tailwindcss', description: 'Styling framework', license: 'MIT' },
    { name: '@tailwindcss/vite', description: 'Tailwind Vite integration', license: 'MIT' },
    { name: 'lucide-vue-next', description: 'Icon set', license: 'ISC' },
    { name: 'axios', description: 'HTTP client', license: 'MIT' },
    { name: 'vue-i18n', description: 'Internationalization', license: 'MIT' },
    { name: 'vee-validate', description: 'Form validation', license: 'MIT' },
    { name: 'vue-toastification', description: 'Toast notifications', license: 'MIT' },
    { name: '@tanstack/vue-table', description: 'Data tables', license: 'MIT' },
    { name: 'vaul-vue', description: 'Drawers/sheets', license: 'MIT' },
    { name: 'reka-ui', description: 'UI primitives', license: 'MIT' },
    { name: '@modyfi/vite-plugin-yaml', description: 'YAML import support', license: 'MIT' },
    { name: 'vite-plugin-vue-devtools', description: 'Development tooling', license: 'MIT' },
    { name: 'qrcode', description: 'QR code generation', license: 'MIT' },
    { name: 'vue-qrcode', description: 'QR code rendering', license: 'MIT' },
    { name: 'ace-builds', description: 'Code editor core', license: 'BSD-3-Clause' },
    { name: 'vue3-ace-editor', description: 'Code editor component', license: 'MIT' },
    { name: '@xterm/xterm', description: 'Terminal emulator', license: 'MIT' },
    { name: '@xterm/addon-fit', description: 'Terminal fit addon', license: 'MIT' },
    { name: '@xterm/addon-web-links', description: 'Terminal web links', license: 'MIT' },
    { name: 'class-variance-authority', description: 'Class utilities', license: 'MIT' },
    { name: 'clsx', description: 'Class utilities', license: 'MIT' },
    { name: 'tailwind-merge', description: 'Tailwind class merging', license: 'MIT' },
    { name: 'tw-animate-css', description: 'Animations', license: 'MIT' },
    { name: 'chart.js', description: 'Chart library', license: 'MIT' },
    { name: 'vue-chartjs', description: 'Vue Chart.js wrapper', license: 'MIT' },
    { name: 'dompurify', description: 'HTML sanitization', license: 'MPL-2.0' },
    { name: 'marked', description: 'Markdown parser', license: 'MIT' },
    { name: 'js-cookie', description: 'Cookie utilities', license: 'MIT' },
    { name: 'vue-turnstile', description: 'Cloudflare Turnstile', license: 'MIT' },
    { name: 'vuedraggable', description: 'Drag and drop', license: 'MIT' },
    { name: 'yaml', description: 'YAML parser', license: 'ISC' },
    { name: '@vueuse/core', description: 'Vue composition utilities', license: 'MIT' },
];

const backendTechnologies = [
    { name: 'vlucas/phpdotenv', description: 'Environment configuration', license: 'BSD-3-Clause' },
    { name: 'gravatarphp/gravatar', description: 'Gravatar integration', license: 'MIT' },
    { name: 'phpmailer/phpmailer', description: 'SMTP email sending', license: 'LGPL-2.1' },
    { name: 'pragmarx/google2fa', description: 'Two-factor authentication (TOTP)', license: 'MIT' },
    { name: 'predis/predis', description: 'Redis client', license: 'MIT' },
    { name: 'nikolaposa/rate-limit', description: 'Rate limiting utilities', license: 'MIT' },
    { name: 'guzzlehttp/guzzle', description: 'HTTP client', license: 'MIT' },
    { name: 'symfony/routing', description: 'HTTP routing', license: 'MIT' },
    { name: 'symfony/http-foundation', description: 'HTTP foundation', license: 'MIT' },
    { name: 'symfony/mime', description: 'MIME type handling', license: 'MIT' },
    { name: 'firebase/php-jwt', description: 'JWT handling', license: 'MIT' },
    { name: 'symfony/yaml', description: 'YAML parsing', license: 'MIT' },
    { name: 'dg/mysql-dump', description: 'MySQL dump/backup', license: 'GPL-3.0' },
    { name: 'ifsnop/mysqldump-php', description: 'MySQL dump alternative', license: 'GPL-3.0' },
    { name: 'zircote/swagger-php', description: 'OpenAPI annotations', license: 'Apache-2.0' },
    { name: 'mongodb/mongodb', description: 'MongoDB driver', license: 'Apache-2.0' },
    { name: 'cron/cron', description: 'Cron expression parser', license: 'MIT' },
    { name: 'cloudflare/sdk', description: 'Cloudflare SDK', license: 'MIT' },
    { name: 'ext-redis', description: 'Redis PHP extension', license: 'PHP-3.01' },
    { name: 'ext-sodium', description: 'Sodium cryptography extension', license: 'BSD-2-Clause' },
];

async function copyLicense(): Promise<void> {
    try {
        await navigator.clipboard.writeText(licenseText.value);
        toast.success('License text copied to clipboard');
    } catch {
        toast.error('Failed to copy license text');
    }
}
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="space-y-2">
            <h3 class="text-lg font-semibold text-foreground">Licenses & Third Party</h3>
            <p class="text-sm text-muted-foreground">
                Overview of FeatherPanel's technology stack, third-party dependencies, and licensing information.
            </p>
        </div>

        <!-- Legal Notice (Admin Only) -->
        <Card v-if="hasAdminPermission" class="border-amber-500/50 bg-amber-500/5">
            <CardHeader>
                <div class="flex items-center gap-2">
                    <AlertTriangle class="h-5 w-5 text-amber-500" />
                    <CardTitle class="text-amber-600 dark:text-amber-500">Legal Notice & Compliance</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div class="space-y-4 text-sm text-muted-foreground">
                    <div class="space-y-2">
                        <p>
                            <strong class="text-foreground">This page is legally required</strong> and may not be
                            removed or modified. It serves multiple legal compliance purposes:
                        </p>
                        <ul class="list-disc list-inside space-y-1.5 ml-2">
                            <li>
                                <strong class="text-foreground">GDPR Compliance (EU Regulation 2016/679):</strong>
                                Article 13 requires transparency about data processing. This page provides users with
                                information about third-party dependencies and telemetry, enabling informed consent and
                                the right to opt-out of data collection.
                            </li>
                            <li>
                                <strong class="text-foreground">EU Copyright Directive (2019/790):</strong> Requires
                                disclosure of third-party software and licenses used in the application.
                            </li>
                            <li>
                                <strong class="text-foreground">Open Source License Compliance:</strong> MIT License
                                (Section 2) and other OSI-approved licenses require attribution and license text
                                inclusion. GPL-3.0 components (e.g., dg/mysql-dump) require source code availability
                                disclosure.
                            </li>
                            <li>
                                <strong class="text-foreground">User Rights:</strong> This page is required for
                                <strong class="text-foreground">all users</strong> (not just administrators) to exercise
                                their right to opt-out of telemetry and data collection as per GDPR Article 7(3) and
                                Article 21.
                            </li>
                        </ul>
                    </div>
                    <div class="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                        <p class="text-sm">
                            <strong class="text-amber-600 dark:text-amber-500">Unauthorized Modifications:</strong> Any
                            modifications to this page not originating from the official GitHub repository (
                            <a
                                href="https://github.com/mythicalltd/featherpanel"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-primary hover:underline"
                            >
                                github.com/mythicalltd/featherpanel
                            </a>
                            ) may constitute:
                        </p>
                        <ul class="list-disc list-inside space-y-1 mt-2 ml-2 text-xs">
                            <li>Violation of the MIT License terms</li>
                            <li>Non-compliance with GDPR transparency requirements</li>
                            <li>Copyright infringement under applicable copyright laws</li>
                        </ul>
                        <p class="text-xs mt-2">
                            <strong class="text-foreground">MythicalSystems reserves the right</strong> to assert
                            copyright claims over modified panel instances that violate license terms or remove required
                            legal notices.
                        </p>
                    </div>
                    <p class="text-xs text-muted-foreground/80 pt-2 border-t border-border/50">
                        <strong>Note:</strong> This legal notice is only visible to administrators with the{' '}
                        <code class="font-mono">admin.dashboard.view</code> permission. However, the page itself and its
                        functionality (including telemetry opt-out) are accessible to all users as required by law.
                    </p>
                </div>
            </CardContent>
        </Card>

        <!-- Open Source Notice -->
        <Card class="border-primary/30 bg-primary/5">
            <CardHeader>
                <div class="flex items-center gap-2">
                    <Github class="h-5 w-5 text-primary" />
                    <CardTitle>Open Source Project</CardTitle>
                </div>
            </CardHeader>
            <CardContent class="space-y-4">
                <p class="text-sm text-muted-foreground">
                    FeatherPanel is an <strong class="text-foreground">open source</strong> project released under the{'
                    '} <strong class="text-foreground">MIT License</strong>. We welcome contributions from the
                    community!
                </p>
                <div class="flex items-center gap-2">
                    <Heart class="h-4 w-4 text-red-500" />
                    <p class="text-sm text-muted-foreground">
                        Whether you're fixing bugs, adding features, or improving documentation, your contributions help
                        make FeatherPanel better for everyone.
                    </p>
                </div>
                <div class="pt-2">
                    <a
                        href="https://github.com/mythicalltd/featherpanel"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                        <Github class="h-4 w-4" />
                        <span>Contribute on GitHub</span>
                    </a>
                </div>
            </CardContent>
        </Card>

        <!-- Telemetry Opt-Out -->
        <Card class="border-border/70">
            <CardHeader>
                <div class="flex items-center gap-2">
                    <Shield class="h-5 w-5 text-primary" />
                    <CardTitle>Privacy & Telemetry</CardTitle>
                </div>
                <CardDescription>Control your data sharing preferences</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
                <div class="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-muted/30">
                    <input
                        id="telemetry-opt-out"
                        type="checkbox"
                        :checked="dontTrackDevice"
                        class="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        @change="handleTelemetryToggle"
                    />
                    <div class="flex-1 space-y-1">
                        <Label for="telemetry-opt-out" class="text-sm font-medium text-foreground cursor-pointer">
                            Opt-out of Usage Telemetry
                        </Label>
                        <p class="text-xs text-muted-foreground">
                            By default, FeatherPanel shares anonymous usage data with MythicalSystems Studios to help
                            improve the software. You can opt-out at any time.
                        </p>
                    </div>
                </div>
                <p v-if="dontTrackDevice" class="text-xs text-muted-foreground flex items-center gap-2">
                    <Shield class="h-3 w-3" />
                    <span>Telemetry is currently disabled. Refresh the page for changes to take effect.</span>
                </p>
            </CardContent>
        </Card>

        <!-- Overview Cards -->
        <div class="grid gap-4 md:grid-cols-3">
            <Card class="border-border/70">
                <CardHeader class="pb-3">
                    <div class="flex items-center gap-2">
                        <div class="p-2 rounded-lg bg-primary/10">
                            <Layers class="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle class="text-base">Tech Stack</CardTitle>
                    </div>
                </CardHeader>
                <CardContent class="space-y-2 text-sm text-muted-foreground">
                    <p>Frontend: Vue 3, TypeScript, Vite</p>
                    <p>UI: Tailwind CSS, shadcn/ui</p>
                    <p>Backend: PHP (FeatherPanel)</p>
                    <p>Runtime: Docker (via Wings)</p>
                </CardContent>
            </Card>

            <Card class="border-border/70">
                <CardHeader class="pb-3">
                    <div class="flex items-center gap-2">
                        <div class="p-2 rounded-lg bg-primary/10">
                            <Scale class="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle class="text-base">Licensing</CardTitle>
                    </div>
                </CardHeader>
                <CardContent class="space-y-2 text-sm text-muted-foreground">
                    <p>
                        Most dependencies use OSI-approved licenses (MIT, Apache-2.0, etc.). Refer to your
                        installation's LICENSE file for complete details.
                    </p>
                </CardContent>
            </Card>

            <Card class="border-border/70">
                <CardHeader class="pb-3">
                    <div class="flex items-center gap-2">
                        <div class="p-2 rounded-lg bg-primary/10">
                            <Shield class="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle class="text-base">Your Responsibilities</CardTitle>
                    </div>
                </CardHeader>
                <CardContent class="space-y-2 text-sm text-muted-foreground">
                    <p>
                        Ensure your Terms of Service and Privacy Policy reflect how you use these technologies. You are
                        responsible for compliance with third-party licenses.
                    </p>
                </CardContent>
            </Card>
        </div>

        <!-- Frontend Technologies -->
        <Card class="border-border/70">
            <CardHeader>
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <Package class="h-5 w-5 text-primary" />
                        <CardTitle>Frontend Technologies</CardTitle>
                    </div>
                    <Badge variant="outline" class="text-xs">package.json</Badge>
                </div>
                <CardDescription>Technologies and dependencies used in the frontend application</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div
                        v-for="tech in frontendTechnologies"
                        :key="tech.name"
                        class="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <code class="text-xs font-mono font-semibold text-foreground">{{ tech.name }}</code>
                                <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4">
                                    {{ tech.license }}
                                </Badge>
                            </div>
                            <p class="text-xs text-muted-foreground">{{ tech.description }}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Backend Technologies -->
        <Card class="border-border/70">
            <CardHeader>
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <Code class="h-5 w-5 text-primary" />
                        <CardTitle>Backend Technologies</CardTitle>
                    </div>
                    <Badge variant="outline" class="text-xs">composer.json</Badge>
                </div>
                <CardDescription>Technologies and dependencies used in the backend application</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div
                        v-for="tech in backendTechnologies"
                        :key="tech.name"
                        class="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <code class="text-xs font-mono font-semibold text-foreground">{{ tech.name }}</code>
                                <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4">
                                    {{ tech.license }}
                                </Badge>
                            </div>
                            <p class="text-xs text-muted-foreground">{{ tech.description }}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Additional Information -->
        <div class="grid gap-4 md:grid-cols-2">
            <Card class="border-border/70">
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <Globe class="h-5 w-5 text-primary" />
                        <CardTitle>Inspiration & Influences</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p class="text-sm text-muted-foreground">
                        FeatherPanel takes inspiration from modern control panels and open-source ecosystems. Ideas such
                        as modular extensions, structured configuration, and clear UX patterns influenced our approach.
                        We acknowledge prior art from community projects and best practices across the
                        container/orchestration space.
                    </p>
                </CardContent>
            </Card>

            <Card class="border-border/70">
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <FileText class="h-5 w-5 text-primary" />
                        <CardTitle>Blueprint Framework</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <ul class="space-y-2 text-sm text-muted-foreground">
                        <li class="flex items-start gap-2">
                            <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span>Manifest fields for metadata: identifier, name, version, author, website</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span>Compatibility targeting: <code class="font-mono">target</code> versions</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span>Distribution: export to <code class="font-mono">.fpa</code> format</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span>Discovery helpers: tags, description, icon, website</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>

        <!-- License Text -->
        <Card class="border-border/70">
            <CardHeader>
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <FileText class="h-5 w-5 text-primary" />
                        <CardTitle>License Text</CardTitle>
                    </div>
                    <Button size="sm" variant="outline" @click="copyLicense">
                        <ClipboardCopy class="h-4 w-4 mr-2" />
                        Copy
                    </Button>
                </div>
                <CardDescription>FeatherPanel's MIT license text</CardDescription>
            </CardHeader>
            <CardContent>
                <Textarea
                    v-model="licenseText"
                    rows="12"
                    class="font-mono text-xs min-h-[300px] resize-none"
                    readonly
                />
            </CardContent>
        </Card>
    </div>
</template>
