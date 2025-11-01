<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Header Section with Actions -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverStartup.title') }}</h1>
                        <p class="text-sm text-muted-foreground">
                            {{ t('serverStartup.description') }}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="fetchServer"
                        >
                            <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                            <span>{{ t('common.refresh') }}</span>
                        </Button>
                        <Button
                            v-if="hasAnyStartupPermission"
                            size="sm"
                            :disabled="saving || !hasChanges || hasErrors"
                            class="flex items-center gap-2"
                            data-umami-event="Save startup settings"
                            @click="saveChanges"
                        >
                            <Save :class="['h-4 w-4', saving && 'animate-pulse']" />
                            <span>{{ saving ? t('common.saving') : t('common.saveChanges') }}</span>
                        </Button>
                    </div>
                </div>

                <!-- Status Indicator -->
                <div v-if="hasChanges && !loading" class="flex items-center gap-2 text-sm">
                    <div class="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
                    <span class="text-muted-foreground">{{ t('common.unsavedChanges') }}</span>
                </div>
            </div>

            <!-- Plugin Widgets: After Header -->
            <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

            <!-- Loading State -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Content -->
            <div v-else-if="server" class="space-y-6">
                <!-- Startup Command Section -->
                <Card class="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Terminal class="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverStartup.startupCommand') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverStartup.startupHelp') }}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <Textarea
                            v-model="form.startup"
                            rows="5"
                            :disabled="!canUpdateStartup"
                            class="font-mono text-sm resize-none"
                            placeholder="Enter startup command..."
                        />
                        <div
                            v-if="defaultStartupCommand && isStartupModified"
                            class="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-muted"
                        >
                            <Info class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div class="flex-1 min-w-0 space-y-2">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="text-sm font-medium text-foreground">{{
                                        t('serverStartup.defaultStartupCommand')
                                    }}</span>
                                    <Button
                                        v-if="canUpdateStartup"
                                        variant="outline"
                                        size="sm"
                                        class="h-7 text-xs"
                                        @click="restoreDefaultStartup"
                                    >
                                        <RefreshCw class="h-3 w-3 mr-1" />
                                        {{ t('serverStartup.restoreDefault') }}
                                    </Button>
                                </div>
                                <code
                                    class="block text-xs font-mono text-muted-foreground bg-background p-2 rounded break-all"
                                    >{{ defaultStartupCommand }}</code
                                >
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Plugin Widgets: After Startup Command -->
                <WidgetRenderer
                    v-if="!loading && server && widgetsAfterStartupCommand.length > 0"
                    :widgets="widgetsAfterStartupCommand"
                />

                <!-- Docker Image Section -->
                <Card class="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Container class="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverStartup.dockerImage') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverStartup.dockerHelp') }}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <Input
                            v-model="form.image"
                            placeholder="ghcr.io/pterodactyl/yolks:java_21"
                            :disabled="!canUpdateDockerImage"
                            class="text-sm font-mono"
                        />
                        <div v-if="availableDockerImages.length" class="space-y-3">
                            <div class="flex items-center gap-2 text-sm font-medium">
                                <Boxes class="h-4 w-4 text-muted-foreground" />
                                <span>{{ t('serverStartup.availableImages') }}</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                <Button
                                    v-for="(img, idx) in availableDockerImages"
                                    :key="idx"
                                    type="button"
                                    :variant="form.image === img ? 'default' : 'outline'"
                                    size="sm"
                                    :disabled="!canUpdateDockerImage"
                                    class="text-xs font-mono justify-start h-auto py-2 px-3"
                                    @click="form.image = img"
                                >
                                    <div class="flex items-center gap-2 w-full">
                                        <Container class="h-3 w-3 shrink-0" />
                                        <span class="truncate text-left">{{ img }}</span>
                                    </div>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Plugin Widgets: After Docker Image -->
                <WidgetRenderer
                    v-if="!loading && server && widgetsAfterDockerImage.length > 0"
                    :widgets="widgetsAfterDockerImage"
                />

                <!-- Spell/Egg Selection Section -->
                <Card
                    v-if="canChangeSpell"
                    class="border-2 hover:border-primary/50 transition-colors border-orange-200 dark:border-orange-800"
                >
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                <Settings class="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverStartup.spellSelection') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverStartup.spellSelectionDescription') }}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div
                            class="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
                        >
                            <div class="flex items-start gap-3">
                                <AlertTriangle class="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm text-orange-800 dark:text-orange-200">
                                        {{ t('serverStartup.spellChangeWarning') }}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <!-- Current Spell Info -->
                        <div v-if="currentSpellInfo" class="p-3 rounded-lg bg-muted/30 border">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-xs text-muted-foreground mb-1">
                                        {{ t('serverStartup.currentSpell') }}
                                    </p>
                                    <p class="text-sm font-medium">{{ currentSpellInfo.name }}</p>
                                </div>
                                <Badge variant="secondary">{{ t('serverStartup.current') }}</Badge>
                            </div>
                        </div>

                        <!-- Realm Selection -->
                        <div class="space-y-2">
                            <Label for="realmSelect" class="text-sm font-medium">
                                {{ t('serverStartup.selectRealm') }}
                            </Label>
                            <Select
                                v-model="selectedRealmId"
                                :disabled="loadingRealms || loadingSpells"
                                @update:model-value="onRealmChange"
                            >
                                <SelectTrigger id="realmSelect">
                                    <SelectValue :placeholder="t('serverStartup.selectRealmPlaceholder')" />
                                </SelectTrigger>
                                <SelectContent>
                                    <div v-if="loadingRealms" class="p-4 text-center text-sm text-muted-foreground">
                                        {{ t('common.loading') }}...
                                    </div>
                                    <div
                                        v-else-if="availableRealms.length === 0"
                                        class="p-4 text-center text-sm text-muted-foreground"
                                    >
                                        {{ t('serverStartup.noRealmsAvailable') }}
                                    </div>
                                    <SelectItem
                                        v-for="realm in availableRealms"
                                        :key="realm.id"
                                        :value="String(realm.id)"
                                    >
                                        {{ realm.name }}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p v-if="selectedRealmInfo" class="text-xs text-muted-foreground">
                                {{ selectedRealmInfo.description }}
                            </p>
                        </div>

                        <!-- Spell Selection -->
                        <div class="space-y-2">
                            <Label for="spellSelect" class="text-sm font-medium">
                                {{ t('serverStartup.selectSpell') }}
                            </Label>
                            <Select
                                v-model="selectedSpellId"
                                :disabled="!selectedRealmId || loadingSpells"
                                @update:model-value="
                                    (value) => {
                                        if (typeof value === 'string' && value) {
                                            onSpellChange(value);
                                        }
                                    }
                                "
                            >
                                <SelectTrigger id="spellSelect">
                                    <SelectValue
                                        :placeholder="
                                            selectedRealmId
                                                ? t('serverStartup.selectSpellPlaceholder')
                                                : t('serverStartup.selectRealmFirst')
                                        "
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    <div v-if="loadingSpells" class="p-4 text-center text-sm text-muted-foreground">
                                        {{ t('common.loading') }}...
                                    </div>
                                    <div
                                        v-else-if="!selectedRealmId"
                                        class="p-4 text-center text-sm text-muted-foreground"
                                    >
                                        {{ t('serverStartup.selectRealmFirst') }}
                                    </div>
                                    <div
                                        v-else-if="availableSpells.length === 0"
                                        class="p-4 text-center text-sm text-muted-foreground"
                                    >
                                        {{ t('serverStartup.noSpellsAvailable') }}
                                    </div>
                                    <SelectItem
                                        v-for="spell in availableSpells"
                                        :key="spell.id"
                                        :value="String(spell.id)"
                                    >
                                        {{ spell.name }}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <!-- Selected Spell Info -->
                        <div v-if="selectedSpellInfo" class="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs text-muted-foreground mb-1">
                                        {{ t('serverStartup.selectedSpell') }}
                                    </p>
                                    <p class="text-sm font-medium">{{ selectedSpellInfo.name }}</p>
                                    <p
                                        v-if="selectedSpellInfo.description"
                                        class="text-xs text-muted-foreground mt-1 line-clamp-2"
                                    >
                                        {{ selectedSpellInfo.description }}
                                    </p>
                                </div>
                                <Badge variant="default">{{ t('serverStartup.selected') }}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Plugin Widgets: After Spell Selection -->
                <WidgetRenderer
                    v-if="!loading && server && canChangeSpell && widgetsAfterSpellSelection.length > 0"
                    :widgets="widgetsAfterSpellSelection"
                />

                <!-- Variables Section -->
                <Card class="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <Settings class="h-5 w-5 text-purple-500" />
                            </div>
                            <div class="flex-1">
                                <CardTitle class="text-lg">{{ t('serverStartup.variables') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverStartup.variablesHelp') }}
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" class="text-xs">
                                {{ viewableVariables.length }}
                                {{
                                    viewableVariables.length === 1
                                        ? t('serverStartup.variableSingular')
                                        : t('serverStartup.variablePlural')
                                }}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div v-if="viewableVariables.length === 0" class="text-center py-8 text-muted-foreground">
                            <Settings class="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p class="text-sm">{{ t('serverStartup.noVariablesConfigured') }}</p>
                        </div>
                        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div
                                v-for="v in viewableVariables"
                                :key="v.variable_id"
                                class="group relative rounded-lg border-2 bg-card p-4 space-y-3 transition-all hover:border-primary/50 hover:shadow-md"
                            >
                                <!-- Variable Header -->
                                <div class="flex items-start justify-between gap-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <h3 class="font-semibold text-sm truncate">{{ v.name }}</h3>
                                            <Badge
                                                v-if="!v.user_editable"
                                                variant="outline"
                                                class="text-[10px] px-1.5 py-0"
                                            >
                                                {{ t('serverStartup.readOnly') }}
                                            </Badge>
                                        </div>
                                        <p class="text-xs text-muted-foreground line-clamp-2">{{ v.description }}</p>
                                    </div>
                                    <Badge variant="secondary" class="text-[10px] px-2 py-0.5 font-mono shrink-0">
                                        {{ v.env_variable }}
                                    </Badge>
                                </div>

                                <!-- Variable Input -->
                                <div class="space-y-2">
                                    <Input
                                        v-model="variableValues[v.variable_id]"
                                        :placeholder="v.default_value || 'Enter value...'"
                                        :disabled="!v.user_editable"
                                        class="text-sm"
                                        :class="[
                                            variableErrors[v.variable_id] &&
                                                'border-red-500 focus-visible:ring-red-500',
                                            !v.user_editable && 'cursor-not-allowed opacity-60',
                                        ]"
                                        @input="validateOneVariable(v)"
                                        @keyup="validateOneVariable(v)"
                                        @change="validateOneVariable(v)"
                                    />
                                    <div
                                        v-if="variableErrors[v.variable_id]"
                                        class="flex items-center gap-1.5 text-xs text-red-500"
                                    >
                                        <AlertCircle class="h-3 w-3 shrink-0" />
                                        <span>{{ variableErrors[v.variable_id] }}</span>
                                    </div>
                                    <div
                                        v-if="v.rules"
                                        class="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                                    >
                                        <Info class="h-3 w-3 shrink-0 mt-0.5" />
                                        <code class="bg-muted px-2 py-0.5 rounded flex-1 break-all">{{ v.rules }}</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Plugin Widgets: After Variables -->
                <WidgetRenderer
                    v-if="!loading && server && widgetsAfterVariables.length > 0"
                    :widgets="widgetsAfterVariables"
                />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />

            <!-- Error State -->
            <div v-else class="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle class="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 class="text-lg font-semibold text-foreground mb-2">{{ t('serverStartup.notFound') }}</h3>
                <p class="text-sm text-muted-foreground max-w-md">{{ error }}</p>
                <Button variant="outline" size="sm" class="mt-4" @click="fetchServer">
                    <RefreshCw class="h-4 w-4 mr-2" />
                    Try Again
                </Button>
            </div>

            <!-- Variable Collection Modal for Spell Change -->
            <Dialog v-model:open="showVariableModal">
                <DialogContent class="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle class="flex items-center gap-2">
                            <AlertTriangle class="h-5 w-5 text-orange-500" />
                            {{ t('serverStartup.configureNewVariables') }}
                        </DialogTitle>
                        <DialogDescription>
                            {{ t('serverStartup.configureNewVariablesDescription') }}
                        </DialogDescription>
                    </DialogHeader>

                    <div v-if="pendingSpellChange" class="flex-1 overflow-y-auto space-y-4 pr-2">
                        <div
                            class="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
                        >
                            <div class="flex items-start gap-3">
                                <Info class="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm text-orange-800 dark:text-orange-200">
                                        {{ t('serverStartup.newSpellInfo') }}:
                                        <strong>{{ pendingSpellChange.spell.name }}</strong>
                                    </p>
                                    <p class="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                        {{ t('serverStartup.realmMayChange') }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div
                            v-if="pendingSpellChange.variables.length === 0"
                            class="text-center py-8 text-muted-foreground"
                        >
                            <Settings class="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p class="text-sm">{{ t('serverStartup.noVariablesInSpell') }}</p>
                        </div>

                        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div
                                v-for="v in pendingSpellChange.variables"
                                :key="v.variable_id"
                                class="group relative rounded-lg border-2 bg-card p-4 space-y-3 transition-all hover:border-primary/50"
                            >
                                <div class="flex items-start justify-between gap-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <h3 class="font-semibold text-sm truncate">{{ v.name }}</h3>
                                            <Badge
                                                v-if="v.rules && v.rules.includes('required')"
                                                variant="destructive"
                                                class="text-[10px] px-1.5 py-0"
                                            >
                                                {{ t('serverStartup.required') }}
                                            </Badge>
                                        </div>
                                        <p class="text-xs text-muted-foreground line-clamp-2">{{ v.description }}</p>
                                    </div>
                                    <Badge variant="secondary" class="text-[10px] px-2 py-0.5 font-mono shrink-0">
                                        {{ v.env_variable }}
                                    </Badge>
                                </div>

                                <div class="space-y-2">
                                    <Input
                                        v-model="newVariableValues[v.variable_id]"
                                        :placeholder="v.default_value || t('serverStartup.enterValue')"
                                        class="text-sm"
                                        :class="[
                                            newVariableErrors[v.variable_id] &&
                                                'border-red-500 focus-visible:ring-red-500',
                                        ]"
                                        @input="validateNewVariable(v)"
                                        @keyup="validateNewVariable(v)"
                                        @change="validateNewVariable(v)"
                                    />
                                    <div
                                        v-if="newVariableErrors[v.variable_id]"
                                        class="flex items-center gap-1.5 text-xs text-red-500"
                                    >
                                        <AlertCircle class="h-3 w-3 shrink-0" />
                                        <span>{{ newVariableErrors[v.variable_id] }}</span>
                                    </div>
                                    <div
                                        v-if="v.rules"
                                        class="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                                    >
                                        <Info class="h-3 w-3 shrink-0 mt-0.5" />
                                        <code class="bg-muted px-2 py-0.5 rounded flex-1 break-all">{{ v.rules }}</code>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- File Wipe Option -->
                        <div
                            class="p-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20"
                        >
                            <div class="flex items-start gap-3">
                                <div class="flex items-center h-5 mt-0.5">
                                    <input
                                        id="wipeFilesOnSpellChange"
                                        v-model="wipeFilesOnSpellChange"
                                        type="checkbox"
                                        class="w-4 h-4 text-orange-600 bg-background border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                                    />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <Label
                                        for="wipeFilesOnSpellChange"
                                        class="text-sm font-medium cursor-pointer text-orange-800 dark:text-orange-200"
                                    >
                                        {{ t('serverStartup.wipeFilesOnSpellChange') }}
                                    </Label>
                                    <p class="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                        {{ t('serverStartup.wipeFilesOnSpellChangeDescription') }}
                                    </p>
                                    <p
                                        v-if="wipeFilesOnSpellChange"
                                        class="text-xs font-semibold text-orange-800 dark:text-orange-200 mt-2"
                                    >
                                        ⚠️ {{ t('serverStartup.wipeFilesOnSpellChangeWarning') }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter class="gap-2">
                        <Button variant="outline" @click="cancelSpellChange">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button :disabled="hasNewVariableErrors" @click="confirmSpellChange">
                            {{ t('serverStartup.applySpellChange') }}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </DashboardLayout>
</template>

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
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import { useServerPermissions } from '@/composables/useServerPermissions';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import {
    RefreshCw,
    Save,
    Terminal,
    Container,
    Boxes,
    Settings,
    AlertCircle,
    Info,
    AlertTriangle,
} from 'lucide-vue-next';
import { useToast } from 'vue-toastification';

type Variable = {
    id: number;
    server_id: number;
    variable_id: number;
    variable_value: string;
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: number;
    user_editable: number;
    rules: string;
    field_type: string;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission checks
const canUpdateStartup = computed(() => {
    return hasServerPermission('startup.update') && settingsStore.serverAllowStartupChange;
});
const canUpdateDockerImage = computed(() => {
    return hasServerPermission('startup.docker-image');
});
const canChangeSpell = computed(() => {
    return settingsStore.serverAllowEggChange;
});
const hasAnyStartupPermission = computed(
    () => canUpdateStartup.value || canUpdateDockerImage.value || canChangeSpell.value,
);

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
interface ServerResponse {
    id: number;
    uuid: string;
    uuidShort: string;
    name: string;
    description?: string;
    startup?: string;
    image?: string;
    variables?: Variable[];
    spell?: { id?: number; name?: string; docker_images?: string | Record<string, string>; startup?: string } | null;
    realm?: { id?: number; name?: string } | null;
}

const server = ref<ServerResponse | null>(null);
const variables = ref<Variable[]>([]);
const availableDockerImages = ref<string[]>([]);
const defaultStartupCommand = ref<string>('');

const form = ref({
    startup: '',
    image: '',
});

const variableValues = ref<Record<number, string>>({});
const variableErrors = ref<Record<number, string>>({});

// Spell selection state
const availableRealms = ref<Array<{ id: number; name: string; description?: string }>>([]);
const loadingRealms = ref(false);
const selectedRealmId = ref<string>('');
const selectedRealmInfo = ref<{ id: number; name: string; description?: string } | null>(null);

const availableSpells = ref<Array<{ id: number; name: string; description?: string; realm_id: number }>>([]);
const loadingSpells = ref(false);
const selectedSpellId = ref<string>('');
const currentSpellInfo = ref<{ id: number; name: string } | null>(null);
const selectedSpellInfo = ref<{ id: number; name: string; description?: string } | null>(null);

// Variable collection modal state
const showVariableModal = ref(false);
const pendingSpellChange = ref<{
    spell: {
        id: number;
        name: string;
        startup?: string;
        docker_images?: string;
        realm_id: number;
    };
    variables: Variable[];
} | null>(null);
const newVariableValues = ref<Record<number, string>>({});
const newVariableErrors = ref<Record<number, string>>({});
const wipeFilesOnSpellChange = ref(false);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-startup');
const widgetsTopOfPage = computed(() => getWidgets('server-startup', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-startup', 'after-header'));
const widgetsAfterStartupCommand = computed(() => getWidgets('server-startup', 'after-startup-command'));
const widgetsAfterDockerImage = computed(() => getWidgets('server-startup', 'after-docker-image'));
const widgetsAfterSpellSelection = computed(() => getWidgets('server-startup', 'after-spell-selection'));
const widgetsAfterVariables = computed(() => getWidgets('server-startup', 'after-variables'));
const widgetsBottomOfPage = computed(() => getWidgets('server-startup', 'bottom-of-page'));

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverStartup.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/startup` },
]);

const viewableVariables = computed(() => variables.value.filter((v) => v.user_viewable === 1));

const editableVariables = computed(() => variables.value.filter((v) => v.user_editable === 1));

const hasChanges = computed(() => {
    if (!server.value) return false;
    const startupChanged = form.value.startup !== (server.value.startup || '');
    const imageChanged = form.value.image !== (server.value.image || '');
    const variableChanged = editableVariables.value.some(
        (v) => variableValues.value[v.variable_id] !== (v.variable_value || ''),
    );
    const spellChanged = selectedSpellId.value && selectedSpellId.value !== String(server.value.spell?.id || '');
    return startupChanged || imageChanged || variableChanged || spellChanged;
});

const isStartupModified = computed(() => {
    if (!defaultStartupCommand.value) return false;
    return form.value.startup !== defaultStartupCommand.value;
});

const hasErrors = computed(() => Object.values(variableErrors.value).some((m) => !!m));
const hasNewVariableErrors = computed(() => Object.values(newVariableErrors.value).some((m) => !!m));

async function fetchServer() {
    try {
        loading.value = true;
        error.value = null;
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (!data.success) throw new Error(data.message || 'Failed');
        server.value = data.data as ServerResponse;
        form.value.startup = server.value?.startup || '';
        // Store default startup command from spell
        defaultStartupCommand.value = server.value?.spell?.startup || '';
        variables.value = server.value?.variables || [];
        variableValues.value = {};
        variables.value.forEach((v) => {
            variableValues.value[v.variable_id] = v.variable_value ?? '';
        });
        // parse available docker images from spell
        try {
            const dockerImages = server.value?.spell?.docker_images;
            if (!dockerImages) {
                availableDockerImages.value = [];
            } else if (typeof dockerImages === 'string') {
                // If it's a string, parse it
                const dockerObj = JSON.parse(dockerImages) as Record<string, string>;
                availableDockerImages.value = Object.values(dockerObj) as string[];
            } else if (typeof dockerImages === 'object') {
                // If it's already an object, use it directly
                availableDockerImages.value = Object.values(dockerImages as Record<string, string>) as string[];
            } else {
                availableDockerImages.value = [];
            }
        } catch {
            availableDockerImages.value = [];
        }

        // Set Docker image - use server's image if it exists and is in available images, otherwise use first available
        if (server.value?.image && availableDockerImages.value.includes(server.value.image)) {
            form.value.image = server.value.image;
        } else if (availableDockerImages.value.length > 0 && availableDockerImages.value[0]) {
            // Auto-select first Docker image if current one is not available or not set
            form.value.image = availableDockerImages.value[0];
        } else {
            form.value.image = server.value?.image || '';
        }

        // Set current spell info
        if (server.value?.spell) {
            const spellId = (server.value.spell as { id?: number }).id || 0;
            currentSpellInfo.value = {
                id: spellId,
                name: (server.value.spell as { name?: string }).name || '',
            };
            selectedSpellId.value = String(spellId);
        }

        // Set current realm selection
        if (server.value?.realm) {
            const realmId = (server.value.realm as { id?: number }).id || 0;
            selectedRealmId.value = String(realmId);
            if (server.value.realm.name) {
                selectedRealmInfo.value = {
                    id: realmId,
                    name: (server.value.realm as { name?: string }).name || '',
                    description: (server.value.realm as { description?: string }).description,
                };
            }
        }

        // Fetch available realms and spells if spell change is allowed
        if (canChangeSpell.value) {
            await fetchAvailableRealms();
            if (selectedRealmId.value) {
                await fetchAvailableSpells(selectedRealmId.value);
                // Set selected spell info if current spell is in the list
                if (currentSpellInfo.value && selectedSpellId.value) {
                    const spell = availableSpells.value.find((s) => String(s.id) === selectedSpellId.value);
                    if (spell) {
                        selectedSpellInfo.value = {
                            id: spell.id,
                            name: spell.name,
                            description: spell.description,
                        };
                    }
                }
            }
        }
    } catch (e: unknown) {
        const err = e as { message?: string };
        error.value = err?.message || t('serverStartup.failedToFetchServer');
        toast.error(error.value);
        console.error(e);
    } finally {
        loading.value = false;
    }
}

function restoreDefaultStartup() {
    if (defaultStartupCommand.value) {
        form.value.startup = defaultStartupCommand.value;
        toast.info(t('serverStartup.defaultRestored'));
    }
}

async function fetchAvailableRealms() {
    try {
        loadingRealms.value = true;
        const { data } = await axios.get('/api/user/realms');

        if (data.success && data.data.realms) {
            availableRealms.value = data.data.realms;
        }
    } catch (e: unknown) {
        console.error('Failed to fetch realms:', e);
        toast.error(t('serverStartup.failedToFetchRealms'));
    } finally {
        loadingRealms.value = false;
    }
}

async function fetchAvailableSpells(realmId?: string) {
    if (!realmId) {
        availableSpells.value = [];
        return;
    }

    try {
        loadingSpells.value = true;
        const { data } = await axios.get('/api/user/spells', {
            params: {
                realm_id: realmId,
            },
        });

        if (data.success && data.data.spells) {
            availableSpells.value = data.data.spells;
        }
    } catch (e: unknown) {
        console.error('Failed to fetch spells:', e);
        toast.error(t('serverStartup.failedToFetchSpells'));
    } finally {
        loadingSpells.value = false;
    }
}

function onRealmChange(value: unknown) {
    const realmId = value != null && typeof value !== 'object' ? String(value) : null;

    if (!realmId) {
        selectedRealmId.value = '';
        selectedRealmInfo.value = null;
        availableSpells.value = [];
        selectedSpellId.value = '';
        selectedSpellInfo.value = null;
        return;
    }

    selectedRealmId.value = realmId;
    const realm = availableRealms.value.find((r) => String(r.id) === realmId);
    selectedRealmInfo.value = realm
        ? {
              id: realm.id,
              name: realm.name,
              description: realm.description,
          }
        : null;

    // Reset spell selection when realm changes
    selectedSpellId.value = '';
    selectedSpellInfo.value = null;

    // Fetch spells for selected realm
    fetchAvailableSpells(realmId);
}

async function onSpellChange(newSpellId: string) {
    if (!newSpellId || newSpellId === String(currentSpellInfo.value?.id)) {
        return;
    }

    // Update selected spell info from available spells
    const spell = availableSpells.value.find((s) => String(s.id) === newSpellId);
    if (spell) {
        selectedSpellInfo.value = {
            id: spell.id,
            name: spell.name,
            description: spell.description,
        };
    }

    try {
        // Fetch new spell details and variables
        const { data } = await axios.get(`/api/user/spells/${newSpellId}`);
        if (!data.success) throw new Error(data.message || 'Failed to fetch spell');

        const newSpell = data.data.spell;
        const newVariables = data.data.variables || [];

        // Update selected realm if spell is from different realm
        if (newSpell.realm_id && String(newSpell.realm_id) !== selectedRealmId.value) {
            const realm = availableRealms.value.find((r) => r.id === newSpell.realm_id);
            if (realm) {
                selectedRealmId.value = String(realm.id);
                selectedRealmInfo.value = {
                    id: realm.id,
                    name: realm.name,
                    description: realm.description,
                };
                // Fetch spells for the new realm
                await fetchAvailableSpells(String(realm.id));
            }
        }

        // Store pending spell change and open modal
        pendingSpellChange.value = {
            spell: {
                id: newSpell.id,
                name: newSpell.name,
                startup: newSpell.startup,
                docker_images: newSpell.docker_images,
                realm_id: newSpell.realm_id,
            },
            variables: newVariables.map((v: Variable & { id?: number }) => {
                // Map spell variable `id` to `variable_id` for consistency
                const variableId = (v.variable_id ?? v.id) as number;
                return {
                    ...v,
                    variable_id: variableId,
                    id: variableId, // Keep id for reference
                } as Variable;
            }),
        };

        // Initialize new variable values with defaults
        newVariableValues.value = {};
        newVariableErrors.value = {};
        pendingSpellChange.value.variables.forEach((v: Variable) => {
            const varId = v.variable_id;
            newVariableValues.value[varId] = v.default_value || '';
        });

        // Validate all variables
        pendingSpellChange.value.variables.forEach((v: Variable) => {
            validateNewVariable(v);
        });

        // Show modal
        showVariableModal.value = true;
    } catch (e: unknown) {
        const err = e as { message?: string };
        toast.error(err.message || t('serverStartup.failedToFetchSpell'));
        selectedSpellId.value = String(currentSpellInfo.value?.id || '');
        console.error(e);
    }
}

function validateNewVariable(v: Variable): void {
    const value = newVariableValues.value[v.variable_id] ?? '';
    const error = validateVariableAgainstRules(value, v.rules || '');
    if (error) {
        newVariableErrors.value[v.variable_id] = error;
    } else {
        delete newVariableErrors.value[v.variable_id];
    }
}

function validateAllNewVariables(): boolean {
    if (!pendingSpellChange.value) return false;

    pendingSpellChange.value.variables.forEach((v: Variable) => {
        validateNewVariable(v);
    });

    return !hasNewVariableErrors.value;
}

function cancelSpellChange(): void {
    showVariableModal.value = false;
    pendingSpellChange.value = null;
    newVariableValues.value = {};
    newVariableErrors.value = {};
    wipeFilesOnSpellChange.value = false;
    selectedSpellId.value = String(currentSpellInfo.value?.id || '');
}

async function confirmSpellChange(): Promise<void> {
    if (!pendingSpellChange.value) return;

    // Validate all variables
    const isValid = validateAllNewVariables();
    if (!isValid) {
        toast.error(t('serverStartup.pleaseFixErrors'));
        return;
    }

    try {
        // Apply the spell change
        showVariableModal.value = false;

        // Clear old variables
        variables.value = [];
        variableValues.value = {};
        variableErrors.value = {};

        // Set new variables with user-provided values
        pendingSpellChange.value.variables.forEach((v: Variable) => {
            const varValue = newVariableValues.value[v.variable_id] || v.default_value || '';
            variables.value.push({
                ...v,
                variable_value: varValue,
            });
            variableValues.value[v.variable_id] = varValue;
        });

        // Update startup command from new spell if available
        if (pendingSpellChange.value.spell.startup) {
            form.value.startup = pendingSpellChange.value.spell.startup;
            defaultStartupCommand.value = pendingSpellChange.value.spell.startup;
        }

        // Update available Docker images and auto-select first one
        try {
            if (pendingSpellChange.value.spell.docker_images) {
                const dockerImages = JSON.parse(pendingSpellChange.value.spell.docker_images);
                const imageArray = Object.values(dockerImages) as string[];
                availableDockerImages.value = imageArray;

                // Always auto-select the first Docker image if available
                if (imageArray.length > 0 && imageArray[0]) {
                    form.value.image = imageArray[0];
                } else {
                    form.value.image = '';
                }
            } else {
                availableDockerImages.value = [];
                form.value.image = '';
            }
        } catch {
            availableDockerImages.value = [];
            form.value.image = '';
        }

        // Update selectedSpellId to the new spell ID (needed for saveChanges to detect spell change)
        if (pendingSpellChange.value.spell.id) {
            selectedSpellId.value = String(pendingSpellChange.value.spell.id);
        }

        // Clear modal state (but keep wipeFilesOnSpellChange until saveChanges completes)
        pendingSpellChange.value = null;
        newVariableValues.value = {};
        newVariableErrors.value = {};
        // NOTE: Don't reset wipeFilesOnSpellChange here - it needs to persist until saveChanges() runs

        toast.info(t('serverStartup.spellChanged'));
    } catch (e: unknown) {
        console.error('Error confirming spell change:', e);
        toast.error(t('serverStartup.failedToApplySpellChange'));
    }
}

async function saveChanges() {
    try {
        saving.value = true;
        // Validate before saving
        const ok = validateAllVariables();
        if (!ok) {
            saving.value = false;
            return;
        }

        const payload: Record<string, unknown> = {
            startup: form.value.startup,
            image: form.value.image,
        };

        // Include spell_id if changed (will also update realm_id automatically on backend)
        const spellChanged =
            selectedSpellId.value && selectedSpellId.value !== String(currentSpellInfo.value?.id || '');

        if (spellChanged) {
            payload.spell_id = Number(selectedSpellId.value);

            // Include wipe_files if requested
            if (wipeFilesOnSpellChange.value) {
                payload.wipe_files = true;
            }

            // When spell changes, send ALL variables (not just editable ones)
            // This ensures all variables from the new spell are created
            const allVariablesPayload = variables.value.map((v) => ({
                variable_id: v.variable_id,
                variable_value: variableValues.value[v.variable_id] ?? '',
            }));
            payload.variables = allVariablesPayload;
        } else {
            // Normal update: only send variables that are user_editable
            const variablesPayload = editableVariables.value.map((v) => ({
                variable_id: v.variable_id,
                variable_value: variableValues.value[v.variable_id] ?? '',
            }));
            payload.variables = variablesPayload;
        }

        const { data } = await axios.put(`/api/user/servers/${route.params.uuidShort}`, payload);
        if (!data.success) throw new Error(data.message || 'Failed to save');

        // Reset wipeFilesOnSpellChange after successful save
        wipeFilesOnSpellChange.value = false;

        await fetchServer();
        toast.success(t('serverStartup.saveSuccess'));
    } catch (e: unknown) {
        const err = e as { message?: string };
        toast.error(err.message || t('serverStartup.saveError'));
        console.error(e);
    } finally {
        saving.value = false;
    }
}

onMounted(async () => {
    // Fetch settings first
    await settingsStore.fetchSettings();

    // Wait for permission check to complete
    while (permissionsLoading.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Check if user has any startup permissions
    if (!hasAnyStartupPermission.value) {
        toast.error(t('serverStartup.noStartupPermission'));
        await router.push(`/server/${route.params.uuidShort}`);
        return;
    }

    await fetchServer();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});

// Validation logic for variables based on rules string
function parseRules(rules: string): Array<{ type: string; value?: number | string }> {
    if (!rules) return [];
    const parts = rules.split('|');
    const parsed: Array<{ type: string; value?: number | string }> = [];
    for (const part of parts) {
        if (
            part === 'required' ||
            part === 'nullable' ||
            part === 'string' ||
            part === 'numeric' ||
            part === 'integer'
        ) {
            parsed.push({ type: part });
            continue;
        }
        const maxMatch = part.match(/^max:(\d+)$/);
        if (maxMatch) {
            parsed.push({ type: 'max', value: Number(maxMatch[1]) });
            continue;
        }
        const minMatch = part.match(/^min:(\d+)$/);
        if (minMatch) {
            parsed.push({ type: 'min', value: Number(minMatch[1]) });
            continue;
        }
        const regexMatch = part.match(/^regex:\/(.*)\/$/);
        if (regexMatch) {
            parsed.push({ type: 'regex', value: regexMatch[1] });
            continue;
        }
    }
    return parsed;
}

function normalizeRegexPattern(pattern: string): string {
    // Convert escaped backslashes from JSON (\\) into single backslashes for JS
    try {
        return pattern.replace(/\\\\/g, '\\');
    } catch {
        return pattern;
    }
}

function validateVariableAgainstRules(value: string, rules: string): string | '' {
    const parsed = parseRules(rules || '');
    const hasNullable = parsed.some((r) => r.type === 'nullable');
    const isRequired = parsed.some((r) => r.type === 'required');
    const isNumeric = parsed.some((r) => r.type === 'numeric' || r.type === 'integer');

    // Use the raw value, don't trim for regex patterns
    const val = value ?? '';

    // Handle required/nullable with trimmed check for empty
    const trimmedForEmptyCheck = val.trim();
    if (!isRequired && hasNullable && trimmedForEmptyCheck === '') return '';
    if (isRequired && trimmedForEmptyCheck === '') return t('serverStartup.fieldRequired');

    // If empty and not required, pass validation
    if (!isRequired && trimmedForEmptyCheck === '') return '';

    // Check numeric/integer (use trimmed value)
    if (isNumeric && !/^\d+$/.test(trimmedForEmptyCheck)) return t('serverStartup.fieldMustBeNumeric');

    // Check other rules (use raw value for regex, numeric value for min/max when numeric, length for strings)
    for (const rule of parsed) {
        if (rule.type === 'min' && typeof rule.value === 'number') {
            if (isNumeric) {
                // For numeric: check if the NUMBER value is >= min
                const numValue = Number(trimmedForEmptyCheck);
                if (isNaN(numValue) || numValue < rule.value) {
                    return t('serverStartup.minimumValue', { value: rule.value });
                }
            } else {
                // For strings: check length
                if (trimmedForEmptyCheck.length < rule.value) {
                    return t('serverStartup.minimumCharacters', { value: rule.value });
                }
            }
        }
        if (rule.type === 'max' && typeof rule.value === 'number') {
            if (isNumeric) {
                // For numeric: check if the NUMBER value is <= max
                const numValue = Number(trimmedForEmptyCheck);
                if (isNaN(numValue) || numValue > rule.value) {
                    return t('serverStartup.maximumValue', { value: rule.value });
                }
            } else {
                // For strings: check length
                if (trimmedForEmptyCheck.length > rule.value) {
                    return t('serverStartup.maximumCharacters', { value: rule.value });
                }
            }
        }
        if (rule.type === 'regex' && typeof rule.value === 'string') {
            try {
                const pattern = normalizeRegexPattern(rule.value as string);
                const re = new RegExp(pattern);
                // Test against trimmed value for regex
                if (!re.test(trimmedForEmptyCheck)) {
                    return t('serverStartup.valueDoesNotMatchFormat');
                }
            } catch (err) {
                console.error('Invalid regex pattern:', rule.value, err);
                // Ignore malformed regex
            }
        }
    }
    return '';
}

function validateOneVariable(v: Variable): void {
    const val = variableValues.value[v.variable_id] ?? '';
    const message = validateVariableAgainstRules(val, v.rules || '');

    // Always update the errors object to ensure reactivity
    if (message) {
        variableErrors.value = {
            ...variableErrors.value,
            [v.variable_id]: message,
        };
    } else {
        // Create new object without the error to ensure reactivity
        const newErrors = { ...variableErrors.value };
        delete newErrors[v.variable_id];
        variableErrors.value = newErrors;
    }
}

function validateAllVariables(): boolean {
    let ok = true;
    const newErrors: Record<number, string> = {};

    // Only validate viewable and editable variables
    for (const v of viewableVariables.value) {
        const val = variableValues.value[v.variable_id] ?? '';
        const message = validateVariableAgainstRules(val, v.rules || '');
        if (message) {
            newErrors[v.variable_id] = message;
            ok = false;
        }
    }

    // Update errors object to trigger reactivity
    variableErrors.value = newErrors;
    return ok;
}

// Watch for changes in variable values and validate immediately
watch(
    variableValues,
    (newVals, oldVals) => {
        // Only validate viewable variables that actually changed
        if (oldVals) {
            for (const v of viewableVariables.value) {
                if (newVals[v.variable_id] !== oldVals[v.variable_id]) {
                    validateOneVariable(v);
                }
            }
        }
    },
    { deep: true },
);
</script>
