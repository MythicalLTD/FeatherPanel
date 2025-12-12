<!--
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
-->

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
                            {{ t('serverProxy.title') }}
                        </h1>
                        <p class="text-sm text-muted-foreground">
                            {{ t('serverProxy.description') }}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            v-if="canManageProxy && proxyEnabled"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="openCreateDrawer"
                        >
                            <Plus class="h-4 w-4" />
                            <span>{{ t('serverProxy.createProxy') }}</span>
                        </Button>
                    </div>
                </div>

                <!-- Info Banner -->
                <div
                    class="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border-2 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
                >
                    <div class="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Info class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div class="flex-1 min-w-0 space-y-1">
                        <h3 class="font-semibold text-blue-800 dark:text-blue-200">
                            {{ t('serverProxy.infoTitle') }}
                        </h3>
                        <p class="text-sm text-blue-700 dark:text-blue-300">
                            {{ t('serverProxy.infoDescription') }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Feature Disabled State -->
            <Alert v-if="!proxyEnabled" variant="destructive" class="border-2">
                <AlertTitle>{{ t('serverProxy.featureDisabled') }}</AlertTitle>
                <AlertDescription>
                    {{ t('serverProxy.featureDisabledDescription') }}
                </AlertDescription>
            </Alert>

            <!-- Main Content -->
            <Card v-else class="border-2">
                <CardHeader>
                    <div class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <ArrowRightLeft class="h-5 w-5 text-primary" />
                            </div>
                            <div class="flex-1">
                                <CardTitle class="text-lg">{{ t('serverProxy.proxiesTitle') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverProxy.proxiesDescription') }}
                                    <span class="text-muted-foreground">
                                        ({{ proxies.length }}/{{ settingsStore.serverProxyMaxPerServer }})
                                    </span>
                                </CardDescription>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <Button
                                v-if="canManageProxy"
                                variant="outline"
                                size="sm"
                                :disabled="loadingProxies"
                                @click="fetchProxies"
                            >
                                <RefreshCw :class="['h-4 w-4', loadingProxies && 'animate-spin']" />
                                <span class="hidden sm:inline">{{ t('common.refresh') }}</span>
                            </Button>
                            <Button
                                v-if="canManageProxy"
                                size="sm"
                                class="gap-2"
                                :disabled="proxies.length >= settingsStore.serverProxyMaxPerServer"
                                @click="openCreateDrawer"
                            >
                                <Plus class="h-4 w-4" />
                                <span>{{ t('serverProxy.createProxy') }}</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <!-- Loading State -->
                    <div v-if="loadingProxies" class="flex flex-col items-center justify-center py-12">
                        <RefreshCw class="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                        <p class="text-sm text-muted-foreground">{{ t('serverProxy.loading') }}</p>
                    </div>

                    <!-- Empty State -->
                    <div
                        v-else-if="!loadingProxies && proxies.length === 0"
                        class="flex flex-col items-center justify-center py-12 space-y-4"
                    >
                        <div class="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <ArrowRightLeft class="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div class="text-center space-y-2">
                            <h3 class="text-lg font-semibold">{{ t('serverProxy.noProxiesTitle') }}</h3>
                            <p class="text-sm text-muted-foreground max-w-md">
                                {{ t('serverProxy.noProxiesDescription') }}
                            </p>
                        </div>
                        <Button
                            v-if="canManageProxy"
                            size="lg"
                            class="gap-2 shadow-lg"
                            :disabled="proxies.length >= settingsStore.serverProxyMaxPerServer"
                            @click="openCreateDrawer"
                        >
                            <Plus class="h-5 w-5" />
                            {{ t('serverProxy.createProxy') }}
                        </Button>
                    </div>

                    <!-- Proxies List -->
                    <div v-else class="space-y-3">
                        <div
                            v-for="proxy in proxies"
                            :key="proxy.id"
                            class="group relative rounded-lg border-2 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                        >
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div class="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                        class="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                                        :class="proxy.ssl ? 'bg-green-500/10' : 'bg-muted'"
                                    >
                                        <component
                                            :is="proxy.ssl ? CheckCircle : ArrowRightLeft"
                                            class="h-5 w-5"
                                            :class="proxy.ssl ? 'text-green-500' : 'text-muted-foreground'"
                                        />
                                    </div>
                                    <div class="flex-1 min-w-0 space-y-1">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="font-mono font-semibold text-sm break-all">
                                                {{ proxy.domain }}
                                            </span>
                                            <Badge v-if="proxy.ssl" variant="default" class="text-xs">
                                                {{ proxy.use_lets_encrypt ? "Let's Encrypt" : 'SSL' }}
                                            </Badge>
                                            <Badge variant="secondary" class="text-xs font-mono">
                                                {{ proxy.ip }}:{{ proxy.port }}
                                            </Badge>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                                        >
                                            <span>
                                                {{ t('serverProxy.createdAt') }}: {{ formatDate(proxy.created_at) }}
                                            </span>
                                            <span v-if="proxy.use_lets_encrypt && proxy.client_email">
                                                {{ t('serverProxy.email') }}: {{ proxy.client_email }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="canManageProxy" class="flex flex-wrap items-center gap-2">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        class="flex items-center gap-2"
                                        :disabled="deletingProxyId === proxy.id"
                                        @click="deleteProxy(proxy)"
                                    >
                                        <Trash2 class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('common.delete') }}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- DNS Records Dialog -->
            <Dialog v-model:open="showDnsRecords">
                <DialogContent class="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{{ t('serverProxy.dnsRecordsTitle') }}</DialogTitle>
                        <DialogDescription>
                            {{ t('serverProxy.dnsRecordsDescription') }}
                        </DialogDescription>
                    </DialogHeader>
                    <div v-if="dnsRecords" class="space-y-4">
                        <Alert>
                            <Info class="h-4 w-4" />
                            <AlertTitle>{{ t('serverProxy.dnsRecordsInfo') }}</AlertTitle>
                            <AlertDescription>
                                {{ t('serverProxy.dnsRecordsInfoText') }}
                            </AlertDescription>
                        </Alert>

                        <!-- A Record (IPv4) -->
                        <div v-if="dnsRecords.targetIpv4" class="space-y-2">
                            <Label class="text-sm font-semibold">{{ t('serverProxy.dnsRecordA') }}</Label>
                            <div class="space-y-2 p-4 bg-muted rounded-lg">
                                <div class="flex items-center justify-between gap-4">
                                    <div class="flex-1 min-w-0">
                                        <div class="text-xs text-muted-foreground mb-1">
                                            {{ t('serverProxy.dnsRecordType') }}
                                        </div>
                                        <div class="font-mono text-sm">A</div>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-xs text-muted-foreground mb-1">
                                            {{ t('serverProxy.dnsRecordName') }}
                                        </div>
                                        <div class="font-mono text-sm break-all">{{ dnsRecords.domain }}</div>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-xs text-muted-foreground mb-1">
                                            {{ t('serverProxy.dnsRecordValue') }}
                                        </div>
                                        <div class="font-mono text-sm break-all">{{ dnsRecords.targetIpv4 }}</div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            @click="copyToClipboard(`${dnsRecords.domain} A ${dnsRecords.targetIpv4}`)"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- AAAA Record (IPv6) -->
                        <div v-if="dnsRecords.targetIpv6" class="space-y-2">
                            <Label class="text-sm font-semibold">{{ t('serverProxy.dnsRecordAAAA') }}</Label>
                            <div class="space-y-2 p-4 bg-muted rounded-lg">
                                <div class="flex items-center justify-between gap-4">
                                    <div class="flex-1 min-w-0">
                                        <div class="text-xs text-muted-foreground mb-1">
                                            {{ t('serverProxy.dnsRecordType') }}
                                        </div>
                                        <div class="font-mono text-sm">AAAA</div>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-xs text-muted-foreground mb-1">
                                            {{ t('serverProxy.dnsRecordName') }}
                                        </div>
                                        <div class="font-mono text-sm break-all">{{ dnsRecords.domain }}</div>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-xs text-muted-foreground mb-1">
                                            {{ t('serverProxy.dnsRecordValue') }}
                                        </div>
                                        <div class="font-mono text-sm break-all">{{ dnsRecords.targetIpv6 }}</div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            @click="
                                                copyToClipboard(`${dnsRecords.domain} AAAA ${dnsRecords.targetIpv6}`)
                                            "
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button @click="showDnsRecords = false">{{ t('common.close') }}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <!-- Create/Edit Proxy Drawer -->
            <Drawer v-model:open="drawerOpen">
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>{{ t('serverProxy.createProxy') }}</DrawerTitle>
                        <DrawerDescription>
                            {{ t('serverProxy.drawerDescription') }}
                        </DrawerDescription>
                    </DrawerHeader>
                    <div class="px-4 pb-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                        <form class="space-y-4" @submit.prevent="saveProxy">
                            <!-- Domain -->
                            <div class="space-y-2">
                                <Label for="domain">{{ t('serverProxy.domain') }}</Label>
                                <Input
                                    id="domain"
                                    v-model="form.domain"
                                    :placeholder="t('serverProxy.domainPlaceholder')"
                                    :disabled="saving"
                                />
                                <p v-if="errors.domain" class="text-sm text-destructive">{{ errors.domain }}</p>
                                <p class="text-xs text-muted-foreground">{{ t('serverProxy.domainHelp') }}</p>
                            </div>

                            <!-- Port -->
                            <div class="space-y-2">
                                <Label for="port">{{ t('serverProxy.port') }}</Label>
                                <Select v-model="form.port" :disabled="saving || loadingAllocations">
                                    <SelectTrigger>
                                        <SelectValue :placeholder="t('serverProxy.portPlaceholder')" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            v-for="allocation in allocations"
                                            :key="allocation.id"
                                            :value="String(allocation.port)"
                                        >
                                            {{ allocation.ip }}:{{ allocation.port }}
                                            <span
                                                v-if="allocation.is_primary"
                                                class="ml-2 text-xs text-muted-foreground"
                                            >
                                                ({{ t('serverAllocations.primary') }})
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p v-if="errors.port" class="text-sm text-destructive">{{ errors.port }}</p>
                                <p class="text-xs text-muted-foreground">{{ t('serverProxy.portHelp') }}</p>
                            </div>

                            <!-- SSL Toggle -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <Label for="ssl">{{ t('serverProxy.ssl') }}</Label>
                                    <div class="flex items-center gap-3">
                                        <input
                                            id="ssl"
                                            v-model="form.ssl"
                                            type="checkbox"
                                            :disabled="saving"
                                            class="proxy-checkbox"
                                        />
                                    </div>
                                </div>
                                <p class="text-xs text-muted-foreground">{{ t('serverProxy.sslHelp') }}</p>
                            </div>

                            <!-- DNS Instructions (shown when SSL/Let's Encrypt is enabled) -->
                            <div v-if="form.ssl && form.use_lets_encrypt" class="space-y-4">
                                <Card
                                    class="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"
                                >
                                    <CardHeader class="pb-3">
                                        <div class="flex items-center gap-3">
                                            <div
                                                class="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0"
                                            >
                                                <Network class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div class="flex-1">
                                                <CardTitle class="text-base text-blue-900 dark:text-blue-100">
                                                    {{ t('serverProxy.dnsVerificationRequired') }}
                                                </CardTitle>
                                                <CardDescription class="text-blue-700 dark:text-blue-300 mt-1">
                                                    {{ t('serverProxy.dnsVerificationDescription') }}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent class="space-y-4">
                                        <!-- DNS Records Display -->
                                        <div v-if="targetIp" class="space-y-3">
                                            <div class="text-sm font-medium text-foreground">
                                                {{ t('serverProxy.dnsRecordA') }}
                                            </div>
                                            <div class="rounded-lg border-2 bg-card p-4 space-y-3">
                                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div class="space-y-1.5">
                                                        <Label class="text-xs font-medium text-muted-foreground">
                                                            {{ t('serverProxy.dnsRecordType') }}
                                                        </Label>
                                                        <div
                                                            class="flex items-center gap-2 px-3 py-2 rounded-md bg-muted font-mono text-sm"
                                                        >
                                                            <Badge variant="secondary" class="font-mono">A</Badge>
                                                        </div>
                                                    </div>
                                                    <div class="space-y-1.5">
                                                        <Label class="text-xs font-medium text-muted-foreground">
                                                            {{ t('serverProxy.dnsRecordName') }}
                                                        </Label>
                                                        <div
                                                            class="px-3 py-2 rounded-md bg-muted font-mono text-sm break-all"
                                                        >
                                                            {{ form.domain.trim() || t('serverProxy.yourDomain') }}
                                                        </div>
                                                    </div>
                                                    <div class="space-y-1.5">
                                                        <Label class="text-xs font-medium text-muted-foreground">
                                                            {{ t('serverProxy.dnsRecordValue') }}
                                                        </Label>
                                                        <div
                                                            class="px-3 py-2 rounded-md bg-muted font-mono text-sm break-all"
                                                        >
                                                            {{ targetIp }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Verification Status -->
                                        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                                            <Button
                                                type="button"
                                                :disabled="!form.domain.trim() || !form.port || verifyingDns || saving"
                                                :variant="dnsVerified ? 'default' : 'default'"
                                                class="shrink-0"
                                                @click="verifyDns"
                                            >
                                                <Network v-if="!verifyingDns && !dnsVerified" class="h-4 w-4 mr-2" />
                                                <CheckCircle
                                                    v-else-if="dnsVerified"
                                                    class="h-4 w-4 mr-2 text-green-500"
                                                />
                                                <span v-if="verifyingDns" class="flex items-center gap-2">
                                                    <span
                                                        class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                                                    ></span>
                                                    {{ t('serverProxy.verifyingDns') }}
                                                </span>
                                                <span v-else-if="dnsVerified">
                                                    {{ t('serverProxy.dnsVerified') }}
                                                </span>
                                                <span v-else>
                                                    {{ t('serverProxy.verifyDns') }}
                                                </span>
                                            </Button>
                                            <div class="flex-1 min-w-0">
                                                <Alert
                                                    v-if="dnsVerificationError"
                                                    variant="destructive"
                                                    class="border-2"
                                                >
                                                    <AlertTriangle class="h-4 w-4" />
                                                    <AlertDescription class="text-sm">
                                                        {{ dnsVerificationError }}
                                                    </AlertDescription>
                                                </Alert>
                                                <Alert
                                                    v-else-if="dnsVerified"
                                                    class="border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                                                >
                                                    <CheckCircle class="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    <AlertDescription
                                                        class="text-sm text-green-800 dark:text-green-200"
                                                    >
                                                        {{ t('serverProxy.dnsVerificationSuccess') }}
                                                    </AlertDescription>
                                                </Alert>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <!-- SSL Options (shown when SSL is enabled) -->
                            <div v-if="form.ssl" class="space-y-4 border-l-2 border-primary/20 pl-4">
                                <!-- Use Let's Encrypt -->
                                <div class="space-y-2">
                                    <div class="flex items-center justify-between">
                                        <Label for="use_lets_encrypt">{{ t('serverProxy.useLetsEncrypt') }}</Label>
                                        <div class="flex items-center gap-3">
                                            <input
                                                id="use_lets_encrypt"
                                                v-model="form.use_lets_encrypt"
                                                type="checkbox"
                                                :disabled="saving"
                                                class="proxy-checkbox"
                                            />
                                        </div>
                                    </div>
                                    <p class="text-xs text-muted-foreground">
                                        {{ t('serverProxy.useLetsEncryptHelp') }}
                                    </p>
                                </div>

                                <!-- Let's Encrypt Email (shown when using Let's Encrypt) -->
                                <div v-if="form.use_lets_encrypt" class="space-y-2">
                                    <Label for="client_email">{{ t('serverProxy.clientEmail') }}</Label>
                                    <Input
                                        id="client_email"
                                        v-model="form.client_email"
                                        type="email"
                                        :placeholder="t('serverProxy.clientEmailPlaceholder')"
                                        :disabled="saving"
                                    />
                                    <p v-if="errors.client_email" class="text-sm text-destructive">
                                        {{ errors.client_email }}
                                    </p>
                                    <p class="text-xs text-muted-foreground">{{ t('serverProxy.clientEmailHelp') }}</p>
                                </div>

                                <!-- Custom SSL Certificate (shown when NOT using Let's Encrypt) -->
                                <div v-if="!form.use_lets_encrypt" class="space-y-4">
                                    <div class="space-y-2">
                                        <Label for="ssl_cert">{{ t('serverProxy.sslCert') }}</Label>
                                        <Textarea
                                            id="ssl_cert"
                                            v-model="form.ssl_cert"
                                            :placeholder="t('serverProxy.sslCertPlaceholder')"
                                            :disabled="saving"
                                            rows="6"
                                            class="font-mono text-xs"
                                        />
                                        <p v-if="errors.ssl_cert" class="text-sm text-destructive">
                                            {{ errors.ssl_cert }}
                                        </p>
                                        <p class="text-xs text-muted-foreground">{{ t('serverProxy.sslCertHelp') }}</p>
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="ssl_key">{{ t('serverProxy.sslKey') }}</Label>
                                        <Textarea
                                            id="ssl_key"
                                            v-model="form.ssl_key"
                                            :placeholder="t('serverProxy.sslKeyPlaceholder')"
                                            :disabled="saving"
                                            rows="6"
                                            class="font-mono text-xs"
                                        />
                                        <p v-if="errors.ssl_key" class="text-sm text-destructive">
                                            {{ errors.ssl_key }}
                                        </p>
                                        <p class="text-xs text-muted-foreground">{{ t('serverProxy.sslKeyHelp') }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Error Message -->
                            <Alert v-if="formError" variant="destructive" class="border-2">
                                <AlertTitle>{{ t('serverProxy.errorTitle') }}</AlertTitle>
                                <AlertDescription>{{ formError }}</AlertDescription>
                            </Alert>
                        </form>
                    </div>
                    <DrawerFooter>
                        <Button variant="outline" :disabled="saving" @click="closeDrawer">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button :disabled="saving || loadingAllocations" @click="saveProxy">
                            <span v-if="saving">{{ t('common.saving') }}</span>
                            <span v-else>{{ t('serverProxy.createProxy') }}</span>
                        </Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import type { BreadcrumbEntry } from '@/layouts/DashboardLayout.vue';
import { useToast } from 'vue-toastification';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    Info,
    ArrowRightLeft,
    Plus,
    Copy,
    Network,
    CheckCircle,
    AlertTriangle,
    Trash2,
    RefreshCw,
} from 'lucide-vue-next';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();

const serverUuid = computed(() => route.params.uuidShort as string);

// Check if proxy management is enabled
const proxyEnabled = computed(() => settingsStore.serverAllowUserMadeProxy);

interface ServerInfo {
    id: number;
    name: string;
    uuid: string;
}

interface ServerAllocation {
    id: number;
    node_id: number;
    ip: string;
    port: number;
    ip_alias?: string;
    notes?: string;
    is_primary?: boolean;
}

const serverInfo = ref<ServerInfo | null>(null);
const allocations = ref<ServerAllocation[]>([]);
const loadingAllocations = ref<boolean>(false);
const proxies = ref<Proxy[]>([]);
const loadingProxies = ref<boolean>(false);
const deletingProxyId = ref<number | null>(null);

interface Proxy {
    id: number;
    server_id: number;
    domain: string;
    ip: string;
    port: number;
    ssl: boolean;
    use_lets_encrypt: boolean;
    client_email?: string | null;
    ssl_cert?: string | null;
    ssl_key?: string | null;
    created_at: string;
    updated_at: string;
}

const breadcrumbs = computed<BreadcrumbEntry[]>(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: serverInfo.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverProxy.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/proxy` },
]);

function getAxiosErrorMessage(err: unknown, fallback: string): string {
    return axios.isAxiosError(err) && err.response?.data?.message ? err.response.data.message : fallback;
}

const loading = ref<boolean>(false);
const drawerOpen = ref<boolean>(false);
const saving = ref<boolean>(false);
const formError = ref<string | null>(null);
const showDnsRecords = ref<boolean>(false);
const dnsRecords = ref<{
    domain: string;
    targetIpv4: string | null;
    targetIpv6: string | null;
} | null>(null);
const dnsVerified = ref<boolean>(false);
const verifyingDns = ref<boolean>(false);
const dnsVerificationError = ref<string | null>(null);
const targetIp = ref<string | null>(null);

const form = reactive<{
    domain: string;
    port: string;
    ssl: boolean;
    use_lets_encrypt: boolean;
    client_email: string;
    ssl_cert: string;
    ssl_key: string;
}>({
    domain: '',
    port: '',
    ssl: false,
    use_lets_encrypt: false,
    client_email: '',
    ssl_cert: '',
    ssl_key: '',
});

const errors = reactive<{
    domain: string;
    port: string;
    client_email: string;
    ssl_cert: string;
    ssl_key: string;
}>({
    domain: '',
    port: '',
    client_email: '',
    ssl_cert: '',
    ssl_key: '',
});

const canManageProxy = computed<boolean>(() => {
    return sessionStore.hasPermission('proxy.manage');
});

async function fetchServerAllocations(): Promise<void> {
    if (!serverUuid.value) return;

    loadingAllocations.value = true;
    try {
        const { data } = await axios.get(`/api/user/servers/${serverUuid.value}/allocations`);

        if (!data.success) {
            toast.error(data.message || t('serverAllocations.failedToFetch'));
            return;
        }

        serverInfo.value = {
            id: data.data.server.id,
            name: data.data.server.name,
            uuid: data.data.server.uuid,
        };
        allocations.value = data.data.allocations ?? [];

        // Set default port from primary allocation
        const primary = allocations.value.find((a) => a.is_primary);
        if (primary) {
            form.port = String(primary.port);
        } else if (allocations.value.length > 0) {
            const firstAllocation = allocations.value[0];
            if (firstAllocation) {
                form.port = String(firstAllocation.port);
            }
        }
    } catch (error) {
        console.error('Failed to fetch server allocations for proxy:', error);
        toast.error(getAxiosErrorMessage(error, t('serverAllocations.failedToFetch')));
    } finally {
        loadingAllocations.value = false;
    }
}

function resetForm(): void {
    form.domain = '';
    form.port = '';
    form.ssl = false;
    form.use_lets_encrypt = false;
    form.client_email = '';
    form.ssl_cert = '';
    form.ssl_key = '';
    formError.value = null;
    errors.domain = '';
    errors.port = '';
    errors.client_email = '';
    errors.ssl_cert = '';
    errors.ssl_key = '';
    dnsVerified.value = false;
    dnsVerificationError.value = null;
    targetIp.value = null;
}

async function calculateTargetIp(): Promise<void> {
    if (!form.domain.trim() || !form.port) {
        targetIp.value = null;
        return;
    }

    // Get allocation to determine target IP
    const portNum = parseInt(form.port, 10);
    const allocation = allocations.value.find((a) => a.port === portNum);

    if (!allocation) {
        targetIp.value = null;
        return;
    }

    // For now, we'll get the target IP from the verify endpoint
    // But we can also calculate it here if we have node info
    // For simplicity, we'll fetch it during verification
    targetIp.value = allocation.ip; // Will be updated during verification if internal IP
}

async function verifyDns(): Promise<void> {
    if (!form.domain.trim() || !form.port) {
        dnsVerificationError.value = t('serverProxy.domainAndPortRequired');
        return;
    }

    verifyingDns.value = true;
    dnsVerificationError.value = null;
    dnsVerified.value = false;

    try {
        const { data } = await axios.post(`/api/user/servers/${serverUuid.value}/proxy/verify-dns`, {
            domain: form.domain.trim(),
            port: form.port.trim(),
        });

        if (data.success && data.data) {
            dnsVerified.value = data.data.verified === true;
            targetIp.value = data.data.expected_ip || null;

            if (data.data.verified) {
                dnsVerificationError.value = null;
                toast.success(data.data.message || t('serverProxy.dnsVerificationSuccess'));
            } else {
                dnsVerificationError.value = data.data.message || t('serverProxy.dnsVerificationFailed');
            }
        } else {
            dnsVerified.value = false;
            dnsVerificationError.value = data.message || t('serverProxy.dnsVerificationFailed');
        }
    } catch (error) {
        console.error('DNS verification failed:', error);
        dnsVerified.value = false;
        dnsVerificationError.value = getAxiosErrorMessage(error, t('serverProxy.dnsVerificationFailed'));
    } finally {
        verifyingDns.value = false;
    }
}

function openCreateDrawer(): void {
    resetForm();
    // Set default port from allocations
    if (allocations.value.length > 0) {
        const primary = allocations.value.find((a) => a.is_primary);
        if (primary) {
            form.port = String(primary.port);
        } else {
            const firstAllocation = allocations.value[0];
            if (firstAllocation) {
                form.port = String(firstAllocation.port);
            }
        }
    }
    drawerOpen.value = true;
}

function closeDrawer(): void {
    drawerOpen.value = false;
}

function copyToClipboard(text: string): void {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            toast.success(t('common.copiedToClipboard'));
        })
        .catch(() => {
            toast.error(t('common.failedToCopy'));
        });
}

function validateForm(): boolean {
    let valid = true;
    errors.domain = '';
    errors.port = '';
    errors.client_email = '';
    errors.ssl_cert = '';
    errors.ssl_key = '';
    formError.value = null;

    // Validate domain - required and must be valid format
    const domainTrimmed = form.domain?.trim() || '';
    if (!domainTrimmed) {
        errors.domain = t('serverProxy.validation.domainRequired');
        valid = false;
    } else {
        // More comprehensive domain validation
        // Must have at least one dot (e.g., example.com)
        if (!domainTrimmed.includes('.')) {
            errors.domain = t('serverProxy.validation.domainInvalid');
            valid = false;
        } else {
            // Check domain length (max 253 chars total, each label max 63)
            if (domainTrimmed.length > 253) {
                errors.domain = t('serverProxy.validation.domainInvalid');
                valid = false;
            } else {
                // Validate domain format: letters, numbers, dots, hyphens
                // Must start and end with alphanumeric, labels separated by dots
                const domainRegex =
                    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
                if (!domainRegex.test(domainTrimmed)) {
                    errors.domain = t('serverProxy.validation.domainInvalid');
                    valid = false;
                } else {
                    // Check each label length (max 63 chars)
                    const labels = domainTrimmed.split('.');
                    for (const label of labels) {
                        if (label.length > 63 || label.length === 0) {
                            errors.domain = t('serverProxy.validation.domainInvalid');
                            valid = false;
                            break;
                        }
                    }
                }
            }
        }
    }

    // Validate port - required and must be valid
    const portTrimmed = form.port?.trim() || '';
    if (!portTrimmed) {
        errors.port = t('serverProxy.validation.portRequired');
        valid = false;
    } else {
        const portNum = parseInt(portTrimmed, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            errors.port = t('serverProxy.validation.portInvalid');
            valid = false;
        } else {
            // Ensure port belongs to an allocation
            const hasMatchingAllocation = allocations.value.some((a) => a.port === portNum);
            if (!hasMatchingAllocation) {
                errors.port = t('serverProxy.validation.portNotAllocated');
                valid = false;
            }
        }
    }

    // SSL validation
    if (form.ssl === true) {
        if (form.use_lets_encrypt === true) {
            // Let's Encrypt requires email
            const emailTrimmed = form.client_email?.trim() || '';
            if (!emailTrimmed) {
                errors.client_email = t('serverProxy.validation.emailRequired');
                valid = false;
            } else {
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailTrimmed)) {
                    errors.client_email = t('serverProxy.validation.emailInvalid');
                    valid = false;
                }
            }
        } else {
            // Custom SSL requires both cert and key
            const certTrimmed = form.ssl_cert?.trim() || '';
            const keyTrimmed = form.ssl_key?.trim() || '';
            if (!certTrimmed) {
                errors.ssl_cert = t('serverProxy.validation.sslCertRequired');
                valid = false;
            }
            if (!keyTrimmed) {
                errors.ssl_key = t('serverProxy.validation.sslKeyRequired');
                valid = false;
            }
        }
    }

    return valid;
}

function getErrorMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;

        if (responseData) {
            // Try to extract the actual error message from nested structures
            if (responseData.error_message) {
                return responseData.error_message;
            }

            if (responseData.message) {
                // Check if message contains nested error info
                const message = responseData.message;

                // Try to extract error from Response: {...} pattern
                const responseMatch = message.match(/Response:\s*\{[^}]*"error":\s*"([^"]+)"/);
                if (responseMatch && responseMatch[1]) {
                    return responseMatch[1];
                }

                // Try to extract error from error field in nested structure
                if (message.includes('Failed to request certificate')) {
                    const certErrorMatch = message.match(/Failed to request certificate[^:]*:\s*(.+?)(?:\n|$)/);
                    if (certErrorMatch && certErrorMatch[1]) {
                        return certErrorMatch[1].trim();
                    }
                    return 'Failed to request certificate. Please check your domain DNS configuration and ensure port 80/443 is accessible.';
                }

                return message;
            }

            if (responseData.error) {
                return responseData.error;
            }

            // Check errors array
            if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
                const firstError = responseData.errors[0];
                if (firstError.detail) {
                    return firstError.detail;
                }
                if (firstError.message) {
                    return firstError.message;
                }
            }
        }

        return err.message || t('serverProxy.unknownError');
    }

    if (err instanceof Error) {
        return err.message;
    }

    return t('serverProxy.unknownError');
}

async function saveProxy(): Promise<void> {
    if (!serverUuid.value || !proxyEnabled.value || !validateForm()) {
        return;
    }

    // Require DNS verification for Let's Encrypt
    if (form.ssl && form.use_lets_encrypt && !dnsVerified.value) {
        toast.error(t('serverProxy.dnsVerificationRequiredError'));
        return;
    }

    saving.value = true;
    try {
        const { data } = await axios.post(`/api/user/servers/${serverUuid.value}/proxy/create`, {
            domain: form.domain.trim(),
            port: form.port.trim(),
            ssl: form.ssl,
            use_lets_encrypt: form.use_lets_encrypt,
            client_email: form.use_lets_encrypt ? form.client_email.trim() : '',
            ssl_cert: form.use_lets_encrypt ? '' : form.ssl_cert.trim(),
            ssl_key: form.use_lets_encrypt ? '' : form.ssl_key.trim(),
        });

        toast.success(t('serverProxy.createSuccess'));

        // Show DNS records
        if (data.data?.target_ip) {
            dnsRecords.value = {
                domain: form.domain.trim(),
                targetIpv4: data.data.target_ip || null,
                targetIpv6: data.data.node_public_ipv6 || null,
            };
            showDnsRecords.value = true;
        }

        closeDrawer();
        await fetchProxies();
    } catch (error) {
        console.error('Failed to create proxy:', error);
        formError.value = getErrorMessage(error);
        toast.error(formError.value);
    } finally {
        saving.value = false;
    }
}

async function fetchProxies(): Promise<void> {
    if (!serverUuid.value) return;

    loadingProxies.value = true;
    try {
        const { data } = await axios.get(`/api/user/servers/${serverUuid.value}/proxy`);

        if (!data.success) {
            toast.error(data.message || t('serverProxy.failedToFetch'));
            return;
        }

        proxies.value = data.data.proxies ?? [];
    } catch (error) {
        console.error('Failed to fetch proxies:', error);
        toast.error(getAxiosErrorMessage(error, t('serverProxy.failedToFetch')));
    } finally {
        loadingProxies.value = false;
    }
}

async function deleteProxy(proxy: Proxy): Promise<void> {
    if (!serverUuid.value) return;

    deletingProxyId.value = proxy.id;
    try {
        await axios.post(`/api/user/servers/${serverUuid.value}/proxy/delete`, {
            id: proxy.id,
        });

        toast.success(t('serverProxy.deleteSuccess'));
        await fetchProxies();
    } catch (error) {
        console.error('Failed to delete proxy:', error);
        toast.error(getAxiosErrorMessage(error, t('serverProxy.deleteFailed')));
    } finally {
        deletingProxyId.value = null;
    }
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

// Watch for domain/port changes to reset DNS verification
watch([() => form.domain, () => form.port], () => {
    if (form.ssl && form.use_lets_encrypt) {
        dnsVerified.value = false;
        dnsVerificationError.value = null;
        void calculateTargetIp();
    }
});

// Watch for SSL/Let's Encrypt changes
watch([() => form.ssl, () => form.use_lets_encrypt], () => {
    if (!form.ssl || !form.use_lets_encrypt) {
        dnsVerified.value = false;
        dnsVerificationError.value = null;
        targetIp.value = null;
    } else {
        void calculateTargetIp();
    }
});

onMounted(async () => {
    // Fetch settings first to check if proxy is enabled
    await settingsStore.fetchSettings();

    // Only fetch data if the feature is enabled
    if (settingsStore.serverAllowUserMadeProxy) {
        await Promise.all([fetchServerAllocations(), fetchProxies()]);
    }
});
</script>

<style scoped>
.proxy-checkbox {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.4rem;
    border: 2px solid hsl(var(--border));
    background-color: hsl(var(--background));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.1s ease;
}

.proxy-checkbox::after {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 0.2rem;
    background-color: transparent;
    transition: background-color 0.15s ease;
}

.proxy-checkbox:hover:not(:disabled) {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
}

.proxy-checkbox:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
}

.proxy-checkbox:active:not(:disabled) {
    transform: scale(0.96);
}

.proxy-checkbox:checked {
    background-color: hsl(var(--primary));
    border-color: hsl(var(--primary));
}

.proxy-checkbox:checked::after {
    background-color: hsl(var(--primary-foreground));
}

.proxy-checkbox:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.proxy-checkbox:disabled::after {
    background-color: transparent;
}
</style>
