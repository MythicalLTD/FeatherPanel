<template>
    <br />
    <div class="space-y-4 max-w-6xl mx-auto px-2 sm:px-4">
        <!-- Header / Intro - neutral style -->
        <Card>
            <div class="p-5 sm:p-6">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div class="text-xl sm:text-2xl font-semibold text-foreground">Product & Licensing</div>
                        <p class="text-sm text-muted-foreground mt-1">
                            Overview of FeatherPanel's tech stack and third‑party licenses.
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-1 rounded border border-border bg-muted/40 text-xs">Open Source</span>
                        <span class="px-2.5 py-1 rounded border border-border bg-muted/40 text-xs">Transparency</span>
                    </div>
                </div>
            </div>
        </Card>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
                <div class="p-4 sm:p-6 text-sm text-muted-foreground">
                    <div class="flex items-start gap-3 mb-2">
                        <Layers class="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div class="font-semibold text-foreground">Tech Stack</div>
                    </div>
                    <ul class="list-disc list-inside space-y-1">
                        <li>Frontend: Vue 3, TypeScript, Vite</li>
                        <li>UI: Tailwind CSS, shadcn/ui (Vue)</li>
                        <li>Icons: lucide</li>
                        <li>Backend: PHP (FeatherPanel backend)</li>
                        <li>Container runtime: Docker (via Wings)</li>
                    </ul>
                </div>
            </Card>

            <Card>
                <div class="p-4 sm:p-6 text-sm text-muted-foreground">
                    <div class="flex items-start gap-3 mb-2">
                        <Scale class="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div class="font-semibold text-foreground">Third‑party Licenses</div>
                    </div>
                    <p>
                        Many dependencies are licensed under OSI‑approved licenses (e.g., MIT, Apache‑2.0). Refer to
                        your installation's LICENSE file and dependency license files for complete details.
                    </p>
                </div>
            </Card>

            <Card>
                <div class="p-4 sm:p-6 text-sm text-muted-foreground">
                    <div class="flex items-start gap-3 mb-2">
                        <Code class="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div class="font-semibold text-foreground">Your Responsibilities</div>
                    </div>
                    <p>
                        Ensure your Terms of Service and Privacy Policy reflect how you use these technologies. You are
                        responsible for compliance with third‑party licenses when distributing or modifying software.
                    </p>
                </div>
            </Card>
        </div>

        <!-- Technologies from package.json and composer.json -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
                <div class="p-4 sm:p-6 text-sm text-muted-foreground">
                    <div class="font-semibold text-foreground mb-2">Technologies (frontend: package.json)</div>
                    <ul class="list-disc list-inside space-y-1">
                        <li><span class="font-mono">vue</span>: UI framework</li>
                        <li><span class="font-mono">vue-router</span>: client-side routing</li>
                        <li><span class="font-mono">pinia</span>: state management</li>
                        <li><span class="font-mono">vite</span>: dev server and bundler</li>
                        <li><span class="font-mono">typescript</span>: type-safe development</li>
                        <li>
                            <span class="font-mono">tailwindcss</span> +
                            <span class="font-mono">@tailwindcss/vite</span>: styling and Vite integration
                        </li>
                        <li><span class="font-mono">lucide-vue-next</span>: icon set</li>
                        <li><span class="font-mono">axios</span>: HTTP client</li>
                        <li><span class="font-mono">vue-i18n</span>: internationalization</li>
                        <li><span class="font-mono">vee-validate</span>: form validation</li>
                        <li><span class="font-mono">vue-toastification</span>: toast notifications</li>
                        <li><span class="font-mono">@tanstack/vue-table</span>: data tables</li>
                        <li><span class="font-mono">vaul-vue</span>: drawers/sheets</li>
                        <li><span class="font-mono">@modyfi/vite-plugin-yaml</span>: YAML import support</li>
                        <li><span class="font-mono">vite-plugin-vue-devtools</span>: DX tooling</li>
                        <li>
                            <span class="font-mono">qrcode</span> / <span class="font-mono">vue-qrcode</span>: QR code
                            generation/rendering
                        </li>
                        <li>
                            <span class="font-mono">ace-builds</span> / <span class="font-mono">vue3-ace-editor</span>:
                            code editor
                        </li>
                        <li><span class="font-mono">vue-web-terminal</span>: web terminal UI</li>
                        <li><span class="font-mono">reka-ui</span>: UI primitives</li>
                        <li>
                            <span class="font-mono">class-variance-authority</span> /
                            <span class="font-mono">clsx</span> / <span class="font-mono">tailwind-merge</span>: class
                            utilities
                        </li>
                        <li><span class="font-mono">tw-animate-css</span>: animations</li>
                    </ul>
                </div>
            </Card>
            <Card>
                <div class="p-4 sm:p-6 text-sm text-muted-foreground">
                    <div class="font-semibold text-foreground mb-2">Technologies (backend: composer.json)</div>
                    <ul class="list-disc list-inside space-y-1">
                        <li><span class="font-mono">vlucas/phpdotenv</span>: env configuration loading</li>
                        <li><span class="font-mono">gravatarphp/gravatar</span>: Gravatar integration</li>
                        <li><span class="font-mono">phpmailer/phpmailer</span>: SMTP email sending</li>
                        <li><span class="font-mono">pragmarx/google2fa</span>: two‑factor auth (TOTP)</li>
                        <li><span class="font-mono">predis/predis</span>: Redis client</li>
                        <li><span class="font-mono">nikolaposa/rate-limit</span>: rate limiting utilities</li>
                        <li><span class="font-mono">guzzlehttp/guzzle</span>: HTTP client</li>
                        <li>
                            <span class="font-mono">symfony/* (routing,http-foundation,mime)</span>: HTTP, routing, MIME
                            helpers
                        </li>
                        <li><span class="font-mono">firebase/php-jwt</span>: JWT handling</li>
                        <li><span class="font-mono">symfony/yaml</span>: YAML parsing</li>
                        <li><span class="font-mono">dg/mysql-dump</span>: MySQL dump/backup</li>
                        <li><span class="font-mono">sentry/sentry</span>: error reporting</li>
                        <li><span class="font-mono">zircote/swagger-php</span>: OpenAPI annotations</li>
                        <li>
                            <span class="font-mono">ext-redis</span> / <span class="font-mono">ext-sodium</span>: PHP
                            extensions (Redis, cryptography)
                        </li>
                        <li><span class="font-mono">phpunit/phpunit</span> (dev): testing</li>
                        <li><span class="font-mono">friendsofphp/php-cs-fixer</span> (dev): code style</li>
                    </ul>
                </div>
            </Card>
        </div>

        <!-- Inspiration and framework notes -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
                <div class="p-4 sm:p-6 text-sm text-muted-foreground">
                    <div class="font-semibold text-foreground mb-2">Inspiration & Influences</div>
                    <p>
                        FeatherPanel takes inspiration from modern control panels and open‑source ecosystems. Ideas such
                        as modular extensions, structured configuration, and clear UX patterns influenced our approach.
                        We acknowledge prior art from community projects and general best practices across the
                        container/orchestration space.
                    </p>
                </div>
            </Card>
            <Card>
                <div class="p-4 sm:p-6 text-sm text-muted-foreground">
                    <div class="font-semibold text-foreground mb-2">Blueprint Framework</div>
                    <ul class="list-disc list-inside space-y-1">
                        <li>Manifest fields for metadata: identifier, name, version, author, website.</li>
                        <li>Compatibility targeting: <span class="font-mono">target</span> versions.</li>
                        <li>Distribution: export to <span class="font-mono">.fpa</span> (file format idea)</li>
                        <li>Discovery helpers: <span class="font-mono">tags</span>, description, icon, website.</li>
                    </ul>
                </div>
            </Card>
        </div>

        <!-- License Text box -->
        <Card>
            <div class="p-4 sm:p-6">
                <div class="flex items-start sm:items-center justify-between gap-3 mb-2">
                    <div>
                        <div class="font-semibold text-foreground">License Text</div>
                        <p class="text-xs text-muted-foreground">Paste or edit your MIT (or other) license here.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button size="sm" variant="outline" class="h-8" @click="copyLicense">
                            <ClipboardCopy class="h-4 w-4 mr-1" /> Copy
                        </Button>
                    </div>
                </div>
                <Textarea
                    v-model="licenseText"
                    rows="10"
                    class="font-mono text-xs min-h-[200px]"
                    placeholder="MIT License\n\nCopyright (c) YEAR AUTHOR\n\nPermission is hereby granted, free of charge, to any person obtaining a copy..."
                />
            </div>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Layers, Scale, Code } from 'lucide-vue-next';
import { ClipboardCopy } from 'lucide-vue-next';

const defaultMIT = `MIT License

Copyright (c) 2025 MythicalSystems
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

async function copyLicense() {
    try {
        await navigator.clipboard.writeText(licenseText.value);
    } catch {
        // no-op
    }
}
</script>
