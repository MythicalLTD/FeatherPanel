<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <!-- Drag and Drop Overlay -->
        <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div
                v-if="isDraggingOver"
                class="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
                style="pointer-events: auto"
                @drop.prevent="handleDrop"
                @dragover.prevent="handleDragOver"
                @dragenter.prevent="handleDragEnter"
                @dragleave.prevent="handleDragLeave"
            >
                <div class="text-center space-y-8 px-4" style="pointer-events: none">
                    <div class="relative inline-block">
                        <!-- Pulsing rings -->
                        <div class="absolute inset-0 -m-8">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-full h-full rounded-full bg-primary"></div>
                            </div>
                            <div class="absolute inset-0 animate-pulse">
                                <div class="w-full h-full rounded-full bg-primary/10"></div>
                            </div>
                        </div>
                        <!-- Icon container -->
                        <div
                            class="relative p-12 rounded-full bg-linear-to-br from-primary/30 via-primary/20 to-primary/10 border-4 border-dashed border-primary shadow-2xl shadow-primary/20"
                        >
                            <Upload
                                class="h-20 w-20 text-primary drop-shadow-lg"
                                style="animation: bounce 1s infinite"
                            />
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h2
                            class="text-5xl font-black bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent drop-shadow-sm"
                            style="line-height: 1.2"
                        >
                            🔥 {{ t('serverFiles.dropItHot') }} 🔥
                        </h2>
                        <p class="text-xl font-medium text-muted-foreground">{{ t('serverFiles.dropToUpload') }}</p>
                        <p class="text-sm text-muted-foreground/70 mt-2">{{ t('serverFiles.dragDropEscHint') }}</p>
                    </div>
                </div>
            </div>
        </Transition>

        <div
            class="space-y-6 pb-8"
            @dragenter.prevent="handleDragEnter"
            @dragover.prevent="handleDragOver"
            @drop.prevent="handleDrop"
        >
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverFiles.title') }}</h1>
                        <p class="text-sm text-muted-foreground">{{ t('serverFiles.description') }}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Badge
                            v-if="activeUploads.some((u) => u.status === 'uploading')"
                            variant="outline"
                            class="text-sm px-3 py-1.5 bg-linear-to-r from-green-500/20 to-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 animate-pulse"
                        >
                            <Upload class="h-3.5 w-3.5 mr-2 animate-bounce" />
                            {{
                                t('serverFiles.uploadingStatus', {
                                    count: activeUploads.filter((u) => u.status === 'uploading').length,
                                })
                            }}
                        </Badge>
                        <Badge variant="secondary" class="text-sm px-3 py-1.5">
                            {{ filteredFiles.length }} / {{ files.length }} items
                        </Badge>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        :disabled="loading"
                        class="flex items-center gap-2"
                        @click="refreshFiles"
                    >
                        <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                        <span>{{ t('common.refresh') }}</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        :disabled="loading"
                        class="flex items-center gap-2"
                        @click="showIgnoredContentDialog = true"
                    >
                        <Settings class="h-4 w-4" />
                        <span>{{ t('serverFiles.ignoredContent') }}</span>
                    </Button>
                    <Button
                        v-if="canCreateFiles"
                        variant="outline"
                        size="sm"
                        :disabled="loading"
                        class="flex items-center gap-2"
                        @click="showCreateFileDialog = true"
                    >
                        <FileText class="h-4 w-4" />
                        <span>{{ t('serverFiles.newFile') }}</span>
                    </Button>
                    <Button
                        v-if="canCreateFiles"
                        variant="outline"
                        size="sm"
                        :disabled="loading"
                        class="flex items-center gap-2"
                        @click="showUploadDialog = true"
                    >
                        <Upload class="h-4 w-4" />
                        <span>{{ t('serverFiles.uploadFile') }}</span>
                    </Button>
                    <Button
                        v-if="canCreateFiles"
                        variant="outline"
                        size="sm"
                        :disabled="loading"
                        class="flex items-center gap-2"
                        @click="showPullDialog = true"
                    >
                        <Download class="h-4 w-4" />
                        <span>{{ t('serverFiles.pullFile') }}</span>
                    </Button>
                    <Button
                        v-if="canCreateFiles"
                        size="sm"
                        :disabled="loading"
                        class="flex items-center gap-2"
                        @click="showCreateFolderDialog = true"
                    >
                        <FolderPlus class="h-4 w-4" />
                        <span>{{ t('serverFiles.createFolder') }}</span>
                    </Button>
                </div>
            </div>

            <!-- Plugin Widgets: After Header -->
            <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

            <!-- Enhanced Search Bar with Breadcrumbs -->
            <Card class="border-2 shadow-sm hover:shadow-md transition-all">
                <CardContent class="p-4">
                    <div class="space-y-4">
                        <!-- Breadcrumb Navigation -->
                        <div class="flex items-center gap-2 min-w-0 overflow-x-auto pb-2 border-b">
                            <Button
                                variant="ghost"
                                size="sm"
                                :disabled="loading"
                                class="shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
                                @click="navigateToPath('/')"
                            >
                                <Home class="h-4 w-4" />
                            </Button>
                            <template v-for="(segment, index) in pathSegments" :key="index">
                                <ChevronRight class="h-4 w-4 text-muted-foreground shrink-0" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    class="text-muted-foreground hover:text-foreground hover:bg-primary/10 whitespace-nowrap shrink-0 transition-all"
                                    :disabled="loading"
                                    @click="navigateToPath(getPathUpTo(index))"
                                >
                                    {{ segment }}
                                </Button>
                            </template>
                        </div>

                        <!-- Enhanced Search Input -->
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Search class="h-5 w-5 text-muted-foreground" />
                            </div>
                            <Input
                                ref="searchInput"
                                v-model="searchQuery"
                                :placeholder="t('serverFiles.searchPlaceholder')"
                                :disabled="loading || files.length === 0"
                                class="pl-10 pr-10 h-11 border-2 focus:border-primary transition-all"
                                @keydown.escape="clearSearch"
                            />
                            <Button
                                v-if="searchQuery"
                                variant="ghost"
                                size="sm"
                                class="absolute inset-y-0 right-0 h-full px-3 hover:bg-transparent"
                                @click="clearSearch"
                            >
                                <X class="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Plugin Widgets: After Search Bar -->
            <WidgetRenderer v-if="widgetsAfterSearchBar.length > 0" :widgets="widgetsAfterSearchBar" />

            <!-- Hidden Search Results Warning -->
            <Card
                v-if="filteredFiles.length === 0 && searchQuery && hiddenMatchesExist"
                class="border-2 border-orange-500/30 bg-linear-to-r from-orange-500/5 to-orange-500/10 shadow-sm"
            >
                <CardContent class="p-4">
                    <div class="flex items-start gap-4">
                        <div class="p-2 rounded-full bg-orange-500/20 shrink-0">
                            <Search class="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div class="flex-1 space-y-3">
                            <div>
                                <h3 class="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                    {{ t('serverFiles.noResultsButHidden') }}
                                </h3>
                                <p class="text-sm text-muted-foreground mt-1">
                                    {{
                                        t('serverFiles.noResultsButHiddenDescription', {
                                            query: searchQuery,
                                        })
                                    }}
                                </p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="border-orange-500/30 hover:bg-orange-500/10"
                                    @click="showIgnoredContentDialog = true"
                                >
                                    <Settings class="h-4 w-4 mr-2" />
                                    {{ t('serverFiles.manageIgnoredContent') }}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="border-orange-500/30 hover:bg-orange-500/10"
                                    @click="clearSearch"
                                >
                                    <X class="h-4 w-4 mr-2" />
                                    {{ t('serverFiles.clearSearch') }}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Active Uploads Card -->
            <Card
                v-if="activeUploads.length > 0"
                class="border-2 border-green-500/30 bg-linear-to-r from-green-500/5 to-green-500/10 shadow-sm"
            >
                <CardContent class="p-4">
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <div class="p-2 rounded-full bg-green-500/20">
                                    <Upload class="h-4 w-4 text-green-600 dark:text-green-400 animate-bounce" />
                                </div>
                                <div>
                                    <h3 class="text-sm font-semibold">{{ t('serverFiles.activeUploads') }}</h3>
                                    <p class="text-xs text-muted-foreground">
                                        {{
                                            t('serverFiles.uploadsInProgress', {
                                                count: activeUploads.filter((u) => u.status === 'uploading').length,
                                                total: activeUploads.length,
                                            })
                                        }}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" @click="clearCompletedUploads">
                                <X class="h-4 w-4" />
                            </Button>
                        </div>
                        <div class="space-y-2">
                            <div
                                v-for="upload in activeUploads"
                                :key="upload.id"
                                class="flex items-center justify-between p-3 rounded-lg bg-background border"
                            >
                                <div class="flex items-center gap-3 flex-1 min-w-0">
                                    <Upload
                                        :class="[
                                            'h-4 w-4 shrink-0',
                                            upload.status === 'uploading'
                                                ? 'text-green-600 dark:text-green-400 animate-pulse'
                                                : upload.status === 'completed'
                                                  ? 'text-green-600 dark:text-green-400'
                                                  : 'text-red-600 dark:text-red-400',
                                        ]"
                                    />
                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm font-medium truncate">{{ upload.fileName }}</p>
                                        <div
                                            v-if="upload.status === 'uploading'"
                                            class="mt-1.5 flex items-center gap-2"
                                        >
                                            <div class="flex-1 bg-secondary rounded-full h-1.5 max-w-[200px]">
                                                <div
                                                    class="bg-green-500 h-1.5 rounded-full transition-all"
                                                    :style="{ width: `${upload.progress}%` }"
                                                ></div>
                                            </div>
                                            <span class="text-xs text-muted-foreground font-mono">
                                                {{ upload.progress }}%
                                            </span>
                                        </div>
                                        <p
                                            v-else-if="upload.status === 'completed'"
                                            class="text-xs text-green-600 dark:text-green-400 mt-1"
                                        >
                                            {{ t('serverFiles.uploadCompleted') }}
                                        </p>
                                        <p v-else-if="upload.error" class="text-xs text-red-600 dark:text-red-400 mt-1">
                                            {{ upload.error }}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    v-if="upload.status === 'uploading'"
                                    variant="ghost"
                                    size="sm"
                                    class="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                    @click="cancelUpload(upload.id)"
                                >
                                    <X class="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Active Downloads Card -->
            <Card
                v-if="activeDownloads.length > 0"
                class="border-2 border-blue-500/30 bg-linear-to-r from-blue-500/5 to-blue-500/10 shadow-sm"
            >
                <CardContent class="p-4">
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <div class="p-2 rounded-full bg-blue-500/20">
                                    <Download class="h-4 w-4 text-blue-600 dark:text-blue-400 animate-bounce" />
                                </div>
                                <div>
                                    <h3 class="text-sm font-semibold">{{ t('serverFiles.activeDownloads') }}</h3>
                                    <p class="text-xs text-muted-foreground">
                                        {{ t('serverFiles.downloadsInProgress', { count: activeDownloads.length }) }}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" @click="refreshDownloads">
                                <RefreshCw :class="['h-4 w-4', loadingDownloads && 'animate-spin']" />
                            </Button>
                        </div>
                        <div class="space-y-2">
                            <div
                                v-for="download in activeDownloads"
                                :key="download.Identifier"
                                class="flex items-center justify-between p-3 rounded-lg bg-background border"
                            >
                                <div class="flex items-center gap-3 flex-1 min-w-0">
                                    <Download class="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm font-medium">{{ t('serverFiles.fileDownload') }}</p>
                                        <p class="text-xs text-muted-foreground truncate font-mono">
                                            {{ download.Identifier }}
                                        </p>
                                        <div class="mt-1.5 flex items-center gap-2">
                                            <div class="flex-1 bg-secondary rounded-full h-1.5 max-w-[200px]">
                                                <div
                                                    class="bg-blue-500 h-1.5 rounded-full transition-all"
                                                    :style="{ width: `${(download.Progress * 100).toFixed(1)}%` }"
                                                ></div>
                                            </div>
                                            <span class="text-xs text-muted-foreground font-mono">
                                                {{ (download.Progress * 100).toFixed(1) }}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    class="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                    @click="cancelDownload(download.Identifier)"
                                >
                                    <X class="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Plugin Widgets: Before Files List -->
            <WidgetRenderer
                v-if="!loading && files.length > 0 && widgetsBeforeFilesList.length > 0"
                :widgets="widgetsBeforeFilesList"
            />

            <!-- Enhanced File Actions Toolbar (Sticky) -->
            <Card
                v-if="selectedFiles.length > 0"
                class="sticky top-4 z-30 border border-primary/20 shadow-md bg-white/75 dark:bg-background/80 backdrop-blur-[2px] transition-colors"
                :class="{ 'shadow-primary/10': true, 'bg-white/75': true }"
                style="backdrop-filter: blur(2px)"
            >
                <CardContent class="p-4">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-center gap-3">
                            <div
                                class="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground"
                            >
                                <span class="text-sm font-bold">{{ selectedFiles.length }}</span>
                            </div>
                            <div>
                                <p class="text-sm font-semibold">
                                    {{ t('serverFiles.selectedFiles', { count: selectedFiles.length }) }}
                                </p>
                                <p class="text-xs text-muted-foreground">{{ t('serverFiles.chooseAction') }}</p>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <Button
                                v-if="canReadContent"
                                variant="outline"
                                size="sm"
                                :disabled="loading"
                                class="gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                                data-umami-event="Download files"
                                @click="downloadSelected"
                            >
                                <Download class="h-4 w-4" />
                                <span>{{ t('serverFiles.download') }}</span>
                            </Button>
                            <Button
                                v-if="canUpdateFiles"
                                variant="outline"
                                size="sm"
                                :disabled="loading"
                                class="gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                                data-umami-event="Copy files"
                                @click="showCopyDialog = true"
                            >
                                <Copy class="h-4 w-4" />
                                <span>{{ t('serverFiles.copy') }}</span>
                            </Button>
                            <Button
                                v-if="canUpdateFiles"
                                variant="outline"
                                size="sm"
                                :disabled="loading"
                                class="gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                                data-umami-event="Move files"
                                @click="showMoveDialog = true"
                            >
                                <FileEdit class="h-4 w-4" />
                                <span>{{ t('serverFiles.move') }}</span>
                            </Button>
                            <Button
                                v-if="canArchiveFiles"
                                variant="outline"
                                size="sm"
                                :disabled="loading"
                                class="gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                                @click="compressSelected"
                            >
                                <Archive class="h-4 w-4" />
                                <span>{{ t('serverFiles.compress') }}</span>
                            </Button>
                            <Button
                                v-if="canDeleteFiles"
                                variant="destructive"
                                size="sm"
                                :disabled="loading"
                                class="gap-2 shadow-sm"
                                @click="deleteSelected"
                            >
                                <Trash2 class="h-4 w-4" />
                                <span>{{ t('serverFiles.delete') }}</span>
                            </Button>
                            <Button variant="ghost" size="sm" class="gap-2 hover:bg-background" @click="clearSelection">
                                <X class="h-4 w-4" />
                                <span>{{ t('serverFiles.clear') }}</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Enhanced Files List -->
            <Card class="border-2 hover:border-primary/50 transition-colors shadow-sm">
                <CardHeader class="border-b">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FolderOpen class="h-5 w-5 text-primary" />
                        </div>
                        <div class="flex-1">
                            <CardTitle class="text-lg">{{ t('serverFiles.fileManager') }}</CardTitle>
                            <CardDescription class="text-sm">
                                {{ t('serverFiles.currentPath') }}:
                                <code class="text-xs bg-muted px-2 py-0.5 rounded">{{ currentPath }}</code>
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="p-0 file-list-container" @click="handleEmptySpaceClick">
                    <div v-if="loading">
                        <!-- Skeleton Loader -->
                        <div class="divide-y">
                            <!-- Header -->
                            <div class="bg-muted/50 px-4 py-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-5 h-5 bg-muted-foreground/20 rounded-md animate-pulse"></div>
                                        <div class="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse"></div>
                                    </div>
                                    <div class="hidden sm:flex items-center gap-6">
                                        <div class="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse"></div>
                                        <div class="h-4 w-20 bg-muted-foreground/20 rounded animate-pulse"></div>
                                        <div class="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                            <!-- Skeleton Files -->
                            <div v-for="i in 8" :key="i" class="px-4 py-3 animate-pulse">
                                <div class="flex items-center gap-3">
                                    <div class="w-5 h-5 bg-muted-foreground/20 rounded-md"></div>
                                    <div class="p-1.5 rounded-md bg-muted-foreground/10">
                                        <div class="h-5 w-5 bg-muted-foreground/20 rounded"></div>
                                    </div>
                                    <div class="flex-1">
                                        <div
                                            class="h-4 bg-muted-foreground/20 rounded"
                                            :style="{ width: `${Math.random() * 40 + 30}%` }"
                                        ></div>
                                    </div>
                                    <div class="hidden sm:flex items-center gap-6">
                                        <div class="h-3 w-16 bg-muted-foreground/20 rounded"></div>
                                        <div class="h-3 w-24 bg-muted-foreground/20 rounded"></div>
                                        <div class="h-8 w-8 bg-muted-foreground/20 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        v-else-if="files.length === 0"
                        class="flex flex-col items-center justify-center py-16 empty-space-click"
                    >
                        <div class="p-4 rounded-full bg-muted/50 mb-4">
                            <FolderOpen class="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p class="text-base font-medium text-muted-foreground">{{ t('serverFiles.emptyFolder') }}</p>
                        <p class="text-sm text-muted-foreground mt-1">{{ t('serverFiles.emptyFolderHint') }}</p>
                    </div>

                    <div v-else class="divide-y">
                        <!-- File List Header -->
                        <div class="bg-muted/50 px-4 py-3 empty-space-click">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <!-- Custom Select All Checkbox -->
                                    <div
                                        class="relative flex items-center justify-center w-5 h-5 border-2 rounded-md cursor-pointer transition-all duration-200 shadow-sm"
                                        :class="{
                                            'border-primary bg-primary': allFilesSelected || someFilesSelected,
                                            'border-input bg-background hover:border-primary hover:bg-primary/5':
                                                !allFilesSelected && !someFilesSelected && files.length > 0,
                                            'border-muted bg-muted cursor-not-allowed': files.length === 0,
                                        }"
                                        @click.stop="files.length > 0 && toggleSelectAll(!allFilesSelected)"
                                    >
                                        <!-- Full selection checkmark -->
                                        <svg
                                            v-if="allFilesSelected"
                                            class="w-3.5 h-3.5 text-primary-foreground"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fill-rule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clip-rule="evenodd"
                                            />
                                        </svg>
                                        <!-- Partial selection dash -->
                                        <div
                                            v-else-if="someFilesSelected"
                                            class="w-2.5 h-0.5 bg-primary-foreground rounded-full"
                                        ></div>
                                    </div>
                                    <span class="text-sm font-semibold">{{ t('serverFiles.name') }}</span>
                                </div>
                                <div class="hidden sm:flex items-center gap-6">
                                    <span class="text-sm font-semibold w-24 text-right">{{
                                        t('serverFiles.size')
                                    }}</span>
                                    <span class="text-sm font-semibold w-32 text-right">{{
                                        t('serverFiles.modified')
                                    }}</span>
                                    <span class="text-sm font-semibold w-20 text-center">{{
                                        t('serverFiles.actions')
                                    }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Go Up Directory -->
                        <div v-if="currentPath !== '/'" class="hover:bg-muted/30 transition-all cursor-pointer group">
                            <div class="flex items-center gap-3 px-4 py-3" @click.stop="navigateUp">
                                <div class="w-5"></div>
                                <div class="p-1.5 rounded-md bg-muted group-hover:bg-primary/10 transition-all">
                                    <FolderUp class="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <span class="text-sm font-medium group-hover:text-primary transition-all">
                                    {{ t('serverFiles.parentDirectory') }}
                                </span>
                            </div>
                        </div>

                        <!-- File Rows -->
                        <div>
                            <div
                                v-for="file in filteredFiles"
                                :key="file.name"
                                class="hover:bg-muted/30 transition-all duration-150 group"
                            >
                                <!-- Mobile Layout -->
                                <div
                                    class="sm:hidden px-4 py-3 cursor-pointer"
                                    @click.stop="handleRowClick($event, file)"
                                >
                                    <div class="flex items-start gap-3">
                                        <div class="flex items-center gap-3 flex-1 min-w-0">
                                            <!-- Custom File Checkbox -->
                                            <div
                                                class="relative flex items-center justify-center w-5 h-5 border-2 rounded-md cursor-pointer transition-all duration-200 shrink-0 shadow-sm"
                                                :class="{
                                                    'border-primary bg-primary': selectedFiles.includes(file.name),
                                                    'border-input bg-background hover:border-primary hover:bg-primary/5':
                                                        !selectedFiles.includes(file.name),
                                                }"
                                                @click.stop="toggleFileSelection(file.name)"
                                            >
                                                <svg
                                                    v-if="selectedFiles.includes(file.name)"
                                                    class="w-3.5 h-3.5 text-primary-foreground"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fill-rule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clip-rule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                            <div
                                                class="p-1.5 rounded-md transition-all"
                                                :class="file.file ? 'bg-blue-500/10' : 'bg-yellow-500/10'"
                                            >
                                                <component
                                                    :is="getFileIcon(file)"
                                                    class="h-5 w-5 shrink-0"
                                                    :class="
                                                        file.file
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : 'text-yellow-600 dark:text-yellow-400'
                                                    "
                                                />
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <div class="text-sm font-medium truncate">
                                                    <template
                                                        v-for="(seg, i) in getHighlightSegments(file.name)"
                                                        :key="i"
                                                    >
                                                        <mark
                                                            v-if="seg.match"
                                                            class="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded"
                                                            >{{ seg.text }}</mark
                                                        >
                                                        <span v-else>{{ seg.text }}</span>
                                                    </template>
                                                </div>
                                                <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                    <span>{{
                                                        file.file ? formatFileSize(file.size) : t('serverFiles.folder')
                                                    }}</span>
                                                    <span>•</span>
                                                    <span>{{ formatDate(file.modified) }}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger as-child>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    class="h-9 w-9 p-0 shrink-0 hover:bg-primary/10 hover:text-primary"
                                                    @click.stop
                                                >
                                                    <MoreVertical class="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" class="w-48">
                                                <DropdownMenuItem
                                                    v-if="
                                                        canUpdateFiles &&
                                                        file.file &&
                                                        isFileEditable(file) &&
                                                        isFileSizeValid(file)
                                                    "
                                                    data-umami-event="Edit file"
                                                    :data-umami-event-file="file.name"
                                                    @click="openMonacoEditor(file)"
                                                >
                                                    <Code class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.edit') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem v-if="canUpdateFiles" @click="renameFile(file)">
                                                    <FileEdit class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.rename') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    v-if="canReadContent && file.file"
                                                    data-umami-event="Download file"
                                                    :data-umami-event-file="file.name"
                                                    @click="downloadFile(file)"
                                                >
                                                    <Download class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.download') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem v-if="canUpdateFiles" @click="copySingle(file.name)">
                                                    <Copy class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.copy') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    v-if="canArchiveFiles && file.file && isArchive(file)"
                                                    @click="extractFile(file)"
                                                >
                                                    <Archive class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.extract') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    v-if="
                                                        canArchiveFiles &&
                                                        (!selectedFiles.length || selectedFiles.includes(file.name))
                                                    "
                                                    @click="compressSelected(file)"
                                                >
                                                    <Archive class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.compress') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    v-if="canUpdateFiles"
                                                    @click="changePermissions(file)"
                                                >
                                                    <Settings class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.permissions') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    v-if="canDeleteFiles"
                                                    class="text-destructive focus:text-destructive"
                                                    @click="deleteFile(file)"
                                                >
                                                    <Trash2 class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.delete') }}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                <!-- Desktop Layout -->
                                <ContextMenu>
                                    <ContextMenuTrigger as-child>
                                        <div
                                            class="hidden sm:flex items-center px-4 py-3 cursor-pointer gap-6"
                                            @click.stop="handleRowClick($event, file)"
                                        >
                                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                                <!-- Custom File Checkbox -->
                                                <div
                                                    class="relative flex items-center justify-center w-5 h-5 border-2 rounded-md cursor-pointer transition-all duration-200 shadow-sm"
                                                    :class="{
                                                        'border-primary bg-primary': selectedFiles.includes(file.name),
                                                        'border-input bg-background hover:border-primary hover:bg-primary/5':
                                                            !selectedFiles.includes(file.name),
                                                    }"
                                                    @click.stop="toggleFileSelection(file.name)"
                                                >
                                                    <svg
                                                        v-if="selectedFiles.includes(file.name)"
                                                        class="w-3.5 h-3.5 text-primary-foreground"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fill-rule="evenodd"
                                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                            clip-rule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                                <div
                                                    class="p-1.5 rounded-md transition-all"
                                                    :class="
                                                        file.file
                                                            ? 'bg-blue-500/10 group-hover:bg-blue-500/20'
                                                            : 'bg-yellow-500/10 group-hover:bg-yellow-500/20'
                                                    "
                                                >
                                                    <component
                                                        :is="getFileIcon(file)"
                                                        class="h-5 w-5 shrink-0"
                                                        :class="
                                                            file.file
                                                                ? 'text-blue-600 dark:text-blue-400'
                                                                : 'text-yellow-600 dark:text-yellow-400'
                                                        "
                                                    />
                                                </div>
                                                <span class="text-sm font-medium truncate">
                                                    <template
                                                        v-for="(seg, i) in getHighlightSegments(file.name)"
                                                        :key="i"
                                                    >
                                                        <mark
                                                            v-if="seg.match"
                                                            class="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded"
                                                            >{{ seg.text }}</mark
                                                        >
                                                        <span v-else>{{ seg.text }}</span>
                                                    </template>
                                                </span>
                                            </div>
                                            <div class="w-24 text-sm text-muted-foreground text-right">
                                                {{ file.file ? formatFileSize(file.size) : '-' }}
                                            </div>
                                            <div class="w-32 text-sm text-muted-foreground text-right">
                                                {{ formatDate(file.modified) }}
                                            </div>
                                            <div class="w-20 flex justify-center" @click.stop>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger as-child>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            class="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
                                                        >
                                                            <MoreVertical class="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" class="w-48">
                                                        <DropdownMenuItem
                                                            v-if="
                                                                canUpdateFiles &&
                                                                file.file &&
                                                                isFileEditable(file) &&
                                                                isFileSizeValid(file)
                                                            "
                                                            @click="openMonacoEditor(file)"
                                                        >
                                                            <Code class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.edit') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            v-if="canUpdateFiles"
                                                            @click="renameFile(file)"
                                                        >
                                                            <FileEdit class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.rename') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            v-if="canReadContent && file.file"
                                                            @click="downloadFile(file)"
                                                        >
                                                            <Download class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.download') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            v-if="canUpdateFiles"
                                                            @click="copySingle(file.name)"
                                                        >
                                                            <Copy class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.copy') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            v-if="canArchiveFiles && file.file && isArchive(file)"
                                                            @click="extractFile(file)"
                                                        >
                                                            <Archive class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.extract') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            v-if="canUpdateFiles"
                                                            @click="changePermissions(file)"
                                                        >
                                                            <Settings class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.permissions') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            v-if="canDeleteFiles"
                                                            class="text-destructive focus:text-destructive"
                                                            @click="deleteFile(file)"
                                                        >
                                                            <Trash2 class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.delete') }}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuItem
                                            v-if="
                                                canUpdateFiles &&
                                                file.file &&
                                                isFileEditable(file) &&
                                                isFileSizeValid(file)
                                            "
                                            @click="openMonacoEditor(file)"
                                        >
                                            <Code class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.edit') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem v-if="canUpdateFiles" @click="renameFile(file)">
                                            <FileEdit class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.rename') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem v-if="canReadContent && file.file" @click="downloadFile(file)">
                                            <Download class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.download') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem v-if="canUpdateFiles" @click="copySingle(file.name)">
                                            <Copy class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.copy') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem
                                            v-if="canArchiveFiles && file.file && isArchive(file)"
                                            @click="extractFile(file)"
                                        >
                                            <Archive class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.extract') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem
                                            v-if="
                                                canArchiveFiles &&
                                                (!selectedFiles.length || selectedFiles.includes(file.name))
                                            "
                                            @click="compressSelected(file)"
                                        >
                                            <Archive class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.compress') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem v-if="canUpdateFiles" @click="changePermissions(file)">
                                            <Settings class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.permissions') }}
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem
                                            v-if="canDeleteFiles"
                                            class="text-destructive"
                                            @click="deleteFile(file)"
                                        >
                                            <Trash2 class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.delete') }}
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Plugin Widgets: After Files List -->
            <WidgetRenderer
                v-if="!loading && files.length > 0 && widgetsAfterFilesList.length > 0"
                :widgets="widgetsAfterFilesList"
            />

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>

        <!-- Upload File Dialog -->
        <Dialog v-model:open="showUploadDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.uploadFile') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.uploadFileDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-3">
                        <div class="space-y-2">
                            <Label>{{ t('serverFiles.uploadType') }}</Label>
                            <div class="flex gap-2">
                                <Button
                                    type="button"
                                    :variant="!isFolderUpload ? 'default' : 'outline'"
                                    size="sm"
                                    class="flex-1"
                                    :disabled="uploading"
                                    @click="handleUploadModeChange(false)"
                                >
                                    <FileText class="h-4 w-4 mr-2" />
                                    {{ t('serverFiles.uploadFile') }}
                                </Button>
                                <Button
                                    type="button"
                                    :variant="isFolderUpload ? 'default' : 'outline'"
                                    size="sm"
                                    class="flex-1"
                                    :disabled="uploading"
                                    @click="handleUploadModeChange(true)"
                                >
                                    <Folder class="h-4 w-4 mr-2" />
                                    {{ t('serverFiles.uploadFolder') }}
                                </Button>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <Label for="uploadFile">
                                {{ isFolderUpload ? t('serverFiles.selectFolder') : t('serverFiles.selectFile') }}
                            </Label>
                            <Input
                                id="uploadFile"
                                ref="fileInput"
                                type="file"
                                :webkitdirectory="isFolderUpload"
                                :multiple="isFolderUpload"
                                :disabled="uploading"
                                @change="handleFileSelect"
                            />
                        </div>
                        <p v-if="isFolderUpload" class="text-xs text-muted-foreground">
                            {{ t('serverFiles.folderUploadHint') }}
                        </p>
                        <p v-if="selectedFilesFromFolder.length > 0" class="text-xs text-blue-600 dark:text-blue-400">
                            {{ t('serverFiles.filesSelectedFromFolder', { count: selectedFilesFromFolder.length }) }}
                        </p>
                    </div>

                    <!-- Upload Preview -->
                    <div v-if="uploadPreview.filesCount > 0" class="rounded-lg border bg-muted/50 p-4 space-y-3">
                        <div class="flex items-center gap-2">
                            <FileText class="h-5 w-5 text-primary" />
                            <h4 class="font-semibold text-sm">{{ t('serverFiles.uploadPreview') }}</h4>
                        </div>

                        <div class="space-y-2">
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-muted-foreground">{{ t('serverFiles.filesToUpload') }}</span>
                                <Badge variant="secondary" class="font-mono">
                                    {{ uploadPreview.filesCount }}
                                </Badge>
                            </div>
                            <div
                                v-if="uploadPreview.directoriesCount > 0"
                                class="flex items-center justify-between text-sm"
                            >
                                <span class="text-muted-foreground">{{ t('serverFiles.directoriesToCreate') }}</span>
                                <Badge variant="secondary" class="font-mono">
                                    {{ uploadPreview.directoriesCount }}
                                </Badge>
                            </div>
                        </div>

                        <!-- Structure Preview -->
                        <div v-if="uploadPreview.structure.length > 0" class="space-y-2">
                            <Label class="text-xs font-medium">{{ t('serverFiles.structurePreview') }}</Label>
                            <div class="max-h-48 overflow-y-auto rounded-md border bg-background p-3 space-y-1">
                                <div
                                    v-for="(item, index) in uploadPreview.structure"
                                    :key="index"
                                    class="flex items-center gap-2 text-xs font-mono"
                                    :class="
                                        item.type === 'directory'
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-muted-foreground'
                                    "
                                >
                                    <component
                                        :is="item.type === 'directory' ? Folder : FileText"
                                        class="h-3 w-3 shrink-0"
                                    />
                                    <span class="truncate">{{ item.path }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Confirmation Message -->
                        <div
                            v-if="uploadPreview.directoriesCount > 0"
                            class="rounded-md bg-green-500/10 border border-green-500/20 p-2"
                        >
                            <p class="text-xs text-green-600 dark:text-green-400 flex items-center gap-2">
                                <CheckCircle2 class="h-3.5 w-3.5 shrink-0" />
                                {{ t('serverFiles.subdirectoriesWillBePreserved') }}
                            </p>
                        </div>
                    </div>

                    <div v-if="uploadProgress > 0" class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span>{{ t('serverFiles.uploading') }}</span>
                            <span>{{ uploadProgress }}%</span>
                        </div>
                        <div class="w-full bg-secondary rounded-full h-2">
                            <div
                                class="bg-primary h-2 rounded-full transition-all"
                                :style="{ width: uploadProgress + '%' }"
                            ></div>
                        </div>
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="outline"
                        :disabled="uploading"
                        class="w-full sm:w-auto"
                        @click="showUploadDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </Button>
                    <Button
                        :disabled="(!selectedFile && selectedFilesFromFolder.length === 0) || uploading"
                        class="w-full sm:w-auto"
                        @click="uploadFile"
                    >
                        <Upload class="h-4 w-4 mr-2" />
                        {{ uploading ? t('serverFiles.uploading') : t('serverFiles.upload') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Create Folder Dialog -->
        <Dialog v-model:open="showCreateFolderDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.createFolder') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.createFolderDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="folderName">{{ t('serverFiles.folderName') }}</Label>
                        <Input
                            id="folderName"
                            v-model="newFolderName"
                            :placeholder="t('serverFiles.folderNamePlaceholder')"
                            @keyup.enter="createFolder"
                        />
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showCreateFolderDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!newFolderName" class="w-full sm:w-auto" @click="createFolder">
                        <FolderPlus class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.create') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Create File Dialog -->
        <Dialog v-model:open="showCreateFileDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.createFile') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.createFileDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="newFileName">{{ t('serverFiles.fileName') }}</Label>
                        <Input
                            id="newFileName"
                            v-model="newFileNameForCreate"
                            :placeholder="t('serverFiles.fileNamePlaceholder')"
                        />
                    </div>
                    <div class="space-y-2">
                        <Label for="newFileContent"
                            >{{ t('serverFiles.initialContent') }} ({{ t('common.optional') }})</Label
                        >
                        <textarea
                            id="newFileContent"
                            v-model="newFileContent"
                            class="w-full h-40 rounded-md border bg-background p-2 text-sm"
                        ></textarea>
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showCreateFileDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!newFileNameForCreate" class="w-full sm:w-auto" @click="createFile">
                        <FileText class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.create') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Copy Dialog removed: single-file copy runs immediately -->

        <!-- Delete Confirmation Dialog -->
        <Dialog v-model:open="showDeleteDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.confirmDeleteTitle') }}</DialogTitle>
                    <DialogDescription>
                        <template v-if="deleteMode === 'single'">
                            {{ t('serverFiles.confirmDelete', { name: deleteSingleName }) }}
                        </template>
                        <template v-else>
                            {{
                                t('serverFiles.confirmDeleteSelected', {
                                    count: selectedFiles.length,
                                    files: selectedFiles.join(', '),
                                })
                            }}
                        </template>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showDeleteDialog = false">{{
                        t('common.cancel')
                    }}</Button>
                    <Button variant="destructive" class="w-full sm:w-auto" @click="confirmDeleteProceed">{{
                        t('serverFiles.delete')
                    }}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Rename Dialog -->
        <Dialog v-model:open="showRenameDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.renameFile') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.renameFileDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="newName">{{ t('serverFiles.newName') }}</Label>
                        <Input id="newName" v-model="newFileName" @keyup.enter="confirmRename" />
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showRenameDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!newFileName" class="w-full sm:w-auto" @click="confirmRename">
                        <FileEdit class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.rename') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Permissions Dialog -->
        <Dialog v-model:open="showPermissionsDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.changePermissions') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.changePermissionsDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="permissions">{{ t('serverFiles.permissions') }}</Label>
                        <Input
                            id="permissions"
                            v-model="newPermissions"
                            placeholder="755"
                            @keyup.enter="confirmPermissions"
                        />
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showPermissionsDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!newPermissions" class="w-full sm:w-auto" @click="confirmPermissions">
                        <Settings class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.change') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Pull File Dialog -->
        <Dialog v-model:open="showPullDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <Download class="h-5 w-5 text-primary" />
                        {{ t('serverFiles.pullFile') }}
                    </DialogTitle>
                    <DialogDescription>{{ t('serverFiles.pullFileDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p class="text-sm text-blue-600 dark:text-blue-400">
                            {{ t('serverFiles.pullFileHint') }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label for="pullUrl">{{ t('serverFiles.fileUrl') }} *</Label>
                        <Input
                            id="pullUrl"
                            v-model="pullUrl"
                            placeholder="https://example.com/file.zip"
                            type="url"
                            @keyup.enter="pullUrl && pullFile()"
                        />
                        <p class="text-xs text-muted-foreground">{{ t('serverFiles.fileUrlHint') }}</p>
                    </div>
                    <div class="space-y-2">
                        <Label for="pullFileName">
                            {{ t('serverFiles.fileName') }}
                            <span class="text-muted-foreground">({{ t('common.optional') }})</span>
                        </Label>
                        <Input
                            id="pullFileName"
                            v-model="pullFileName"
                            :placeholder="t('serverFiles.fileNamePlaceholder')"
                            @keyup.enter="pullUrl && pullFile()"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverFiles.fileNameHint') }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">{{ t('serverFiles.currentDirectory') }}</Label>
                        <div class="p-2 rounded-md bg-muted text-sm font-mono">
                            {{ currentPath }}
                        </div>
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showPullDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!pullUrl || pulling" class="w-full sm:w-auto" @click="pullFile">
                        <Download :class="['h-4 w-4 mr-2', pulling && 'animate-bounce']" />
                        {{ pulling ? t('serverFiles.pulling') : t('serverFiles.pull') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Copy Dialog -->
        <Dialog v-model:open="showCopyDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <Copy class="h-5 w-5 text-primary" />
                        {{ t('serverFiles.copyFiles') }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ t('serverFiles.copyFilesDescription') }}
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p class="text-sm text-blue-600 dark:text-blue-400">
                            {{ t('serverFiles.copyingFiles', { count: selectedFiles.length }) }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label for="copyDestination">{{ t('serverFiles.destination') }} *</Label>
                        <Input
                            id="copyDestination"
                            v-model="copyDestination"
                            placeholder="/path/to/destination"
                            @keyup.enter="copyDestination && copySelected()"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverFiles.enterCopyDestination') }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">{{ t('serverFiles.currentDirectory') }}</Label>
                        <div class="p-2 rounded-md bg-muted text-sm font-mono">
                            {{ currentPath }}
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">{{ t('serverFiles.selectedFilesLabel') }}</Label>
                        <div class="max-h-32 overflow-y-auto p-2 rounded-md bg-muted text-sm">
                            <div v-for="file in selectedFiles" :key="file" class="py-1 font-mono text-xs">
                                {{ file }}
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showCopyDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!copyDestination || loading" class="w-full sm:w-auto" @click="copySelected">
                        <Copy class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.copy') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Move Dialog -->
        <Dialog v-model:open="showMoveDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <FileEdit class="h-5 w-5 text-primary" />
                        {{ t('serverFiles.moveFiles') }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ t('serverFiles.moveFilesDescription') }}
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <p class="text-sm text-orange-600 dark:text-orange-400">
                            {{ t('serverFiles.movingFilesFromCurrent', { count: selectedFiles.length }) }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label for="moveDestination">{{ t('serverFiles.destination') }} *</Label>
                        <Input
                            id="moveDestination"
                            v-model="moveDestination"
                            placeholder="/path/to/destination"
                            @keyup.enter="moveDestination && moveSelected()"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverFiles.enterMoveDestinationHint') }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">{{ t('serverFiles.currentDirectory') }}</Label>
                        <div class="p-2 rounded-md bg-muted text-sm font-mono">
                            {{ currentPath }}
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">{{ t('serverFiles.selectedFilesLabel') }}</Label>
                        <div class="max-h-32 overflow-y-auto p-2 rounded-md bg-muted text-sm">
                            <div v-for="file in selectedFiles" :key="file" class="py-1 font-mono text-xs">
                                {{ file }}
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showMoveDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!moveDestination || loading" class="w-full sm:w-auto" @click="moveSelected">
                        <FileEdit class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.move') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Compress Dialog -->
        <Dialog v-model:open="showCompressDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <Archive class="h-5 w-5 text-primary" />
                        {{ t('serverFiles.compressFiles') }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ t('serverFiles.compressFilesDescription') }}
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <p class="text-sm text-orange-600 dark:text-orange-400">
                            {{ t('serverFiles.compressingFilesFromCurrent', { count: compressionTargets.length }) }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label for="compressArchiveType">{{ t('serverFiles.archiveType') }} *</Label>
                        <Select v-model="compressArchiveType">
                            <SelectTrigger>
                                <SelectValue :placeholder="compressArchiveType" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="zip">ZIP (.zip)</SelectItem>
                                <SelectItem value="tar.gz">TAR GZIP (.tar.gz)</SelectItem>
                                <SelectItem value="tgz">TAR GZIP (.tgz)</SelectItem>
                                <SelectItem value="tar.bz2">TAR BZIP2 (.tar.bz2)</SelectItem>
                                <SelectItem value="tbz2">TAR BZIP2 (.tbz2)</SelectItem>
                                <SelectItem value="tar.xz">TAR XZ (.tar.xz)</SelectItem>
                                <SelectItem value="txz">TAR XZ (.txz)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p class="text-xs text-muted-foreground">{{ t('serverFiles.selectArchiveType') }}</p>
                    </div>
                    <div class="space-y-2">
                        <Label for="compressArchiveName">
                            {{ t('serverFiles.archiveName') }}
                            <span class="text-muted-foreground">({{ t('common.optional') }})</span>
                        </Label>
                        <Input
                            id="compressArchiveName"
                            v-model="compressArchiveName"
                            :placeholder="t('serverFiles.archiveNamePlaceholder')"
                        />
                        <p class="text-xs text-muted-foreground">{{ t('serverFiles.archiveNameHint') }}</p>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">{{ t('serverFiles.selectedFilesLabel') }}</Label>
                        <div class="max-h-32 overflow-y-auto p-2 rounded-md bg-muted text-sm">
                            <div v-for="file in compressionTargets" :key="file" class="py-1 font-mono text-xs">
                                {{ file }}
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showCompressDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="loading" class="w-full sm:w-auto" @click="confirmCompress">
                        <Archive class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.compress') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Ignored Content Dialog -->
        <Dialog v-model:open="showIgnoredContentDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <Settings class="h-5 w-5 text-primary" />
                        {{ t('serverFiles.ignoredContent') }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ t('serverFiles.ignoredContentDescription') }}
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p class="text-sm text-blue-600 dark:text-blue-400">
                            {{ t('serverFiles.ignoredContentHint') }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label for="newIgnoredPattern">{{ t('serverFiles.addIgnoredPattern') }}</Label>
                        <div class="flex gap-2">
                            <Input
                                id="newIgnoredPattern"
                                v-model="newIgnoredPattern"
                                :placeholder="t('serverFiles.ignoredPatternPlaceholder')"
                                @keyup.enter="addIgnoredPattern"
                            />
                            <Button :disabled="!newIgnoredPattern.trim()" @click="addIgnoredPattern">
                                <Plus class="h-4 w-4" />
                            </Button>
                        </div>
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverFiles.ignoredPatternExamples') }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label>{{ t('serverFiles.ignoredPatterns') }} ({{ ignoredPatterns.length }})</Label>
                        <div v-if="ignoredPatterns.length === 0" class="text-center py-8 text-sm text-muted-foreground">
                            {{ t('serverFiles.noIgnoredPatterns') }}
                        </div>
                        <div v-else class="max-h-64 overflow-y-auto space-y-2 p-2 rounded-md bg-muted/30">
                            <div
                                v-for="(pattern, index) in ignoredPatterns"
                                :key="index"
                                class="flex items-center justify-between p-2 rounded-md bg-background border"
                            >
                                <code class="text-sm font-mono">{{ pattern }}</code>
                                <Button variant="ghost" size="sm" @click="removeIgnoredPattern(index)">
                                    <X class="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                            <p class="text-sm font-medium">{{ t('serverFiles.hiddenFilesCount') }}</p>
                            <p class="text-xs text-muted-foreground">
                                {{ files.length - filteredFiles.length }}
                                {{ t('serverFiles.filesHidden') }}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" @click="clearAllIgnoredPatterns">
                            {{ t('serverFiles.clearAll') }}
                        </Button>
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showIgnoredContentDialog = false">
                        {{ t('common.close') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Keyboard Shortcuts Help Panel (Desktop Only) -->
        <div class="hidden lg:block fixed bottom-4 right-4 z-40">
            <Transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 translate-y-4"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 translate-y-4"
            >
                <Card
                    v-if="showKeyboardShortcuts"
                    class="w-[500px] max-w-[90vw] border-2 shadow-2xl bg-background/95 backdrop-blur-lg"
                >
                    <CardHeader class="border-b pb-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <CardTitle class="text-xl flex items-center gap-2">
                                    <div class="p-2 rounded-lg bg-primary/10">
                                        <Code class="h-5 w-5 text-primary" />
                                    </div>
                                    {{ t('serverFiles.shortcuts.title') }}
                                </CardTitle>
                                <CardDescription class="mt-1.5">
                                    {{ t('serverFiles.shortcuts.description') }}
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" @click="showKeyboardShortcuts = false">
                                <X class="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent class="pt-4 max-h-[60vh] overflow-y-auto">
                        <div class="space-y-4">
                            <!-- Selection Shortcuts -->
                            <div>
                                <h3 class="text-sm font-semibold mb-3 text-primary">
                                    {{ t('serverFiles.shortcuts.selection') }}
                                </h3>
                                <div class="space-y-2">
                                    <div
                                        class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                                    >
                                        <span class="text-sm">{{ t('serverFiles.shortcuts.selectAll') }}</span>
                                        <kbd
                                            class="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded-md"
                                            >Ctrl + A</kbd
                                        >
                                    </div>
                                    <div
                                        class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                                    >
                                        <span class="text-sm">{{ t('serverFiles.shortcuts.multiSelect') }}</span>
                                        <kbd
                                            class="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded-md"
                                            >Ctrl + Click</kbd
                                        >
                                    </div>
                                    <div
                                        class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                                    >
                                        <span class="text-sm">{{ t('serverFiles.shortcuts.rangeSelect') }}</span>
                                        <kbd
                                            class="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded-md"
                                            >Shift + Click</kbd
                                        >
                                    </div>
                                </div>
                            </div>

                            <!-- File Operations -->
                            <div>
                                <h3 class="text-sm font-semibold mb-3 text-primary">
                                    {{ t('serverFiles.shortcuts.operations') }}
                                </h3>
                                <div class="space-y-2">
                                    <div
                                        class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                                    >
                                        <span class="text-sm">{{ t('serverFiles.shortcuts.copyFiles') }}</span>
                                        <kbd
                                            class="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded-md"
                                            >Ctrl + C</kbd
                                        >
                                    </div>
                                    <div
                                        class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                                    >
                                        <span class="text-sm">{{ t('serverFiles.shortcuts.moveFiles') }}</span>
                                        <kbd
                                            class="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded-md"
                                            >Ctrl + X</kbd
                                        >
                                    </div>
                                    <div
                                        class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                                    >
                                        <span class="text-sm">{{ t('serverFiles.shortcuts.deleteFiles') }}</span>
                                        <kbd
                                            class="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded-md"
                                            >Ctrl + D</kbd
                                        >
                                    </div>
                                </div>
                            </div>

                            <!-- Navigation -->
                            <div>
                                <h3 class="text-sm font-semibold mb-3 text-primary">
                                    {{ t('serverFiles.shortcuts.navigation') }}
                                </h3>
                                <div class="space-y-2">
                                    <div
                                        class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                                    >
                                        <span class="text-sm">{{ t('serverFiles.shortcuts.focusSearch') }}</span>
                                        <div class="flex gap-2">
                                            <kbd
                                                class="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded-md"
                                                >Ctrl + F</kbd
                                            >
                                            <span class="text-muted-foreground">{{ t('serverFiles.or') }}</span>
                                            <kbd
                                                class="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded-md"
                                                >/</kbd
                                            >
                                        </div>
                                    </div>
                                    <div
                                        class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                                    >
                                        <span class="text-sm">{{ t('serverFiles.shortcuts.closeDialogs') }}</span>
                                        <kbd
                                            class="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded-md"
                                            >ESC</kbd
                                        >
                                    </div>
                                    <div
                                        class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                                    >
                                        <span class="text-sm">{{ t('serverFiles.shortcuts.toggleHelp') }}</span>
                                        <kbd
                                            class="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded-md"
                                            >?</kbd
                                        >
                                    </div>
                                </div>
                            </div>

                            <!-- Pro Tips -->
                            <div class="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <h3 class="text-sm font-semibold mb-2 text-blue-600 dark:text-blue-400">
                                    💡 {{ t('serverFiles.shortcuts.tips') }}
                                </h3>
                                <ul class="space-y-1.5 text-xs text-blue-600/80 dark:text-blue-400/80">
                                    <li>• {{ t('serverFiles.shortcuts.tip1') }}</li>
                                    <li>• {{ t('serverFiles.shortcuts.tip2') }}</li>
                                    <li>• {{ t('serverFiles.shortcuts.tip3') }}</li>
                                    <li>• {{ t('serverFiles.shortcuts.tip4') }}</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Transition>

            <!-- Toggle Button -->
            <Button
                variant="outline"
                size="sm"
                class="shadow-lg border-2 group hover:border-primary transition-all"
                @click="showKeyboardShortcuts = !showKeyboardShortcuts"
            >
                <Code class="h-4 w-4 mr-2 group-hover:text-primary transition-colors" />
                <span>
                    {{
                        showKeyboardShortcuts
                            ? t('serverFiles.hideKeyboardShortcuts')
                            : t('serverFiles.showKeyboardShortcuts')
                    }}
                </span>
                <kbd
                    class="ml-2 px-1.5 py-0.5 text-xs font-semibold bg-muted border border-border rounded group-hover:bg-primary/10 group-hover:border-primary/50 transition-all"
                    >?</kbd
                >
            </Button>
        </div>

        <!-- Navigation Guard Dialog -->
        <Dialog v-model:open="showNavigationGuardDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-3">
                        <div class="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                            <AlertTriangle class="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <div class="text-lg font-semibold">{{ t('serverFiles.uploadInProgressTitle') }}</div>
                            <div class="text-sm font-normal text-muted-foreground mt-0.5">
                                {{ t('serverFiles.uploadInProgressSubtitle') }}
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div class="py-4 space-y-4">
                    <div class="rounded-lg bg-orange-500/10 border border-orange-500/20 p-4">
                        <div class="flex items-start gap-3">
                            <Upload class="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                            <div class="flex-1 space-y-2">
                                <p class="text-sm font-medium text-orange-900 dark:text-orange-100">
                                    {{
                                        t('serverFiles.uploadInProgressMessage', {
                                            count: activeUploads.filter((u: UploadStatus) => u.status === 'uploading')
                                                .length,
                                        })
                                    }}
                                </p>
                                <div class="space-y-1.5">
                                    <div
                                        v-for="upload in activeUploads.filter(
                                            (u: UploadStatus) => u.status === 'uploading',
                                        )"
                                        :key="upload.id"
                                        class="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300"
                                    >
                                        <div class="flex-1 bg-orange-200 dark:bg-orange-900/30 rounded-full h-1.5">
                                            <div
                                                class="bg-orange-600 dark:bg-orange-400 h-1.5 rounded-full transition-all"
                                                :style="{ width: `${upload.progress}%` }"
                                            ></div>
                                        </div>
                                        <span class="font-mono text-orange-600 dark:text-orange-400 shrink-0">
                                            {{ upload.progress }}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p class="text-sm text-muted-foreground">
                        {{ t('serverFiles.uploadInProgressWarning') }}
                    </p>
                </div>
                <DialogFooter class="gap-3 flex-col sm:flex-row">
                    <Button variant="outline" class="w-full sm:w-auto order-2 sm:order-1" @click="handleStayOnPage">
                        {{ t('serverFiles.stayOnPage') }}
                    </Button>
                    <Button
                        variant="destructive"
                        class="w-full sm:w-auto order-1 sm:order-2"
                        @click="handleLeaveAnyway"
                    >
                        {{ t('serverFiles.leaveAnyway') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { useServerPermissions } from '@/composables/useServerPermissions';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-vue-next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
    RefreshCw,
    Upload,
    FolderPlus,
    Home,
    ChevronRight,
    Download,
    Copy,
    Archive,
    Trash2,
    X,
    FolderOpen,
    FolderUp,
    File,
    FileText,
    Image,
    Video,
    Music,
    Code,
    Settings,
    MoreVertical,
    FileEdit,
    Folder,
    Search,
    Plus,
    AlertTriangle,
} from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import type { Server } from '@/composables/types/server';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const toast = useToast();

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission checks
const canReadFiles = computed(() => hasServerPermission('file.read'));
const canReadContent = computed(() => hasServerPermission('file.read-content'));
const canCreateFiles = computed(() => hasServerPermission('file.create'));
const canUpdateFiles = computed(() => hasServerPermission('file.update'));
const canDeleteFiles = computed(() => hasServerPermission('file.delete'));
const canArchiveFiles = computed(() => hasServerPermission('file.archive'));

// Server and loading state
const server = ref<Server | null>(null);
const loading = ref(true);

const uploading = ref(false);
const pulling = ref(false);
const loadingDownloads = ref(false);

// File data
const files = ref<FileItem[]>([]);
const currentPath = ref('/');
const selectedFiles = ref<string[]>([]);
const activeDownloads = ref<DownloadProcess[]>([]);

// Upload status tracking
interface UploadStatus {
    id: string;
    fileName: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
    error?: string;
}

const activeUploads = ref<UploadStatus[]>([]);
const searchQuery = ref('');
const searchInput = ref<{ $el?: HTMLElement } | HTMLInputElement>();
const showCreateFileDialog = ref(false);
const newFileNameForCreate = ref('');
const newFileContent = ref('');
// Copy dialog removed – single-file copy only

// Dialog states
const showUploadDialog = ref(false);
const showCreateFolderDialog = ref(false);

const showRenameDialog = ref(false);
const showPermissionsDialog = ref(false);
const showPullDialog = ref(false);
const showCopyDialog = ref(false);
const showMoveDialog = ref(false);
const showCompressDialog = ref(false);
const showIgnoredContentDialog = ref(false);

// Drag and drop state
const isDraggingOver = ref(false);

// Ignored content state
const ignoredPatterns = ref<string[]>([]);
const newIgnoredPattern = ref('');

// Form data
const selectedFile = ref<File | null>(null);
const selectedFilesFromFolder = ref<File[]>([]);
const isFolderUpload = ref(false);
const uploadProgress = ref(0);
const newFolderName = ref('');

const renamingFile = ref<FileItem | null>(null);
const newFileName = ref('');
const permissionsFile = ref<FileItem | null>(null);
const newPermissions = ref('');
const pullUrl = ref('');
const pullFileName = ref('');
const copyDestination = ref('');
const moveDestination = ref('');
const compressArchiveName = ref('');
const compressArchiveType = ref('tar.gz');
const compressionTargets = ref<string[]>([]);

// For range selection with Shift+Click
const lastSelectedIndex = ref<number>(-1);

// Keyboard shortcuts panel
const showKeyboardShortcuts = ref(false);

// Navigation guard dialog
const showNavigationGuardDialog = ref(false);
const pendingNavigation = ref<(() => void) | null>(null);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-files');
const widgetsTopOfPage = computed(() => getWidgets('server-files', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-files', 'after-header'));
const widgetsAfterSearchBar = computed(() => getWidgets('server-files', 'after-search-bar'));
const widgetsBeforeFilesList = computed(() => getWidgets('server-files', 'before-files-list'));
const widgetsAfterFilesList = computed(() => getWidgets('server-files', 'after-files-list'));
const widgetsBottomOfPage = computed(() => getWidgets('server-files', 'bottom-of-page'));

// File input ref
const fileInput = ref<HTMLInputElement>();

// Types
interface FileItem {
    name: string;
    size: number;
    directory: boolean;
    file: boolean;
    symlink: boolean;
    mime: string;
    created: string;
    modified: string;
    mode: string;
    mode_bits: string;
}

interface DownloadProcess {
    Identifier: string;
    Progress: number;
}

// Computed properties
const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverFiles.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/files` },
]);

const pathSegments = computed(() => {
    return currentPath.value.split('/').filter((segment) => segment.length > 0);
});

const filteredFiles = computed(() => {
    let filtered = files.value || [];

    // Apply ignored patterns filter
    if (ignoredPatterns.value.length > 0) {
        filtered = filtered.filter((file) => {
            return !ignoredPatterns.value.some((pattern) => {
                // Convert wildcard pattern to regex
                const regexPattern = pattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
                    .replace(/\*/g, '.*'); // Convert * to .*
                const regex = new RegExp(`^${regexPattern}$`, 'i');
                return regex.test(file.name);
            });
        });
    }

    // Apply search query filter
    const query = searchQuery.value.trim().toLowerCase();
    if (query) {
        filtered = filtered.filter((f) => f.name.toLowerCase().includes(query));
    }

    return filtered;
});

const allFilesSelected = computed(() => {
    return filteredFiles.value.length > 0 && selectedFiles.value.length === filteredFiles.value.length;
});

const someFilesSelected = computed(() => {
    return selectedFiles.value.length > 0 && selectedFiles.value.length < filteredFiles.value.length;
});

// Check if uploads are active
const hasActiveUploads = computed(() => {
    return activeUploads.value.some((u) => u.status === 'uploading');
});

// Upload preview - analyze files and folders before upload
interface StructureItem {
    path: string;
    type: 'file' | 'directory';
}

interface UploadPreview {
    filesCount: number;
    directoriesCount: number;
    structure: StructureItem[];
}

const uploadPreview = computed<UploadPreview>(() => {
    const preview: UploadPreview = {
        filesCount: 0,
        directoriesCount: 0,
        structure: [],
    };

    // Handle single file upload
    if (selectedFile.value && !isFolderUpload.value) {
        preview.filesCount = 1;
        preview.structure = [
            {
                path: selectedFile.value.name,
                type: 'file',
            },
        ];
        return preview;
    }

    // Handle folder upload
    if (selectedFilesFromFolder.value.length > 0 && isFolderUpload.value) {
        preview.filesCount = selectedFilesFromFolder.value.length;

        // Detect root folder name to strip from preview
        const rootFolderName = detectRootFolderName(selectedFilesFromFolder.value);

        // Extract all directories (excluding root folder)
        const directories = extractDirectoriesFromFiles(selectedFilesFromFolder.value, rootFolderName);
        preview.directoriesCount = directories.size;

        // Build structure preview - show directories first, then files (without root folder)
        const structureMap = new Map<string, StructureItem>();

        // Add all directories (already stripped)
        directories.forEach((dirPath) => {
            structureMap.set(dirPath, {
                path: dirPath,
                type: 'directory',
            });
        });

        // Add all files with their relative paths (strip root folder)
        selectedFilesFromFolder.value.forEach((file) => {
            let relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
            relativePath = stripRootFolder(relativePath, rootFolderName);
            structureMap.set(relativePath, {
                path: relativePath,
                type: 'file',
            });
        });

        // Sort structure: directories first (by depth), then files
        const sortedStructure = Array.from(structureMap.values()).sort((a, b) => {
            // Directories first
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            // Then by depth (shallow first)
            const depthA = a.path.split('/').length;
            const depthB = b.path.split('/').length;
            if (depthA !== depthB) {
                return depthA - depthB;
            }
            // Finally alphabetically
            return a.path.localeCompare(b.path);
        });

        // Limit to first 20 items to avoid huge lists
        preview.structure = sortedStructure.slice(0, 20);
        if (sortedStructure.length > 20) {
            preview.structure.push({
                path: `... ${sortedStructure.length - 20} more items`,
                type: 'file',
            });
        }
    }

    return preview;
});

// Check if search query matches any ignored files
const hiddenMatchesExist = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query || ignoredPatterns.value.length === 0) return false;

    // Get files that were filtered out by ignored patterns
    const ignoredFiles = files.value.filter((file) => {
        return ignoredPatterns.value.some((pattern) => {
            const regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
            const regex = new RegExp(`^${regexPattern}$`, 'i');
            return regex.test(file.name);
        });
    });

    // Check if any ignored files match the search query
    return ignoredFiles.some((file) => file.name.toLowerCase().includes(query));
});

// Row click handler (Ctrl+Click to toggle selection, Shift+Click for range selection, regular click to navigate)
const handleRowClick = (event: MouseEvent, file: FileItem) => {
    const currentIndex = filteredFiles.value.findIndex((f) => f.name === file.name);

    if (event.shiftKey && lastSelectedIndex.value !== -1) {
        // Shift+Click: select range from last selected to current
        event.preventDefault();
        const start = Math.min(lastSelectedIndex.value, currentIndex);
        const end = Math.max(lastSelectedIndex.value, currentIndex);
        const rangeFiles = filteredFiles.value.slice(start, end + 1).map((f) => f.name);

        // Add all files in range to selection (don't deselect existing)
        rangeFiles.forEach((fileName) => {
            if (!selectedFiles.value.includes(fileName)) {
                selectedFiles.value.push(fileName);
            }
        });
    } else if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd+Click: toggle selection
        toggleFileSelection(file.name);
        lastSelectedIndex.value = currentIndex;
    } else {
        // Regular click: navigate to folder or open file
        handleFileClick(file);
        lastSelectedIndex.value = -1; // Reset range selection
    }
};

// Helper function to get the actual input element from the ref
const getSearchInputElement = (): HTMLInputElement | null => {
    if (!searchInput.value) return null;

    // Check if it's a component with $el
    if ('$el' in searchInput.value && searchInput.value.$el) {
        const input = searchInput.value.$el.querySelector('input');
        return input as HTMLInputElement | null;
    }

    // Otherwise it's already an HTMLInputElement
    return searchInput.value as HTMLInputElement;
};

// Event handlers for drag and drop
const handleKeyboard = (e: KeyboardEvent) => {
    // Check if the active element is an input, textarea, or contenteditable
    const target = e.target as HTMLElement;
    const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('contenteditable') === 'true';

    // Check if any dialog is open (don't handle shortcuts if dialogs are open)
    const isDialogOpen =
        showUploadDialog.value ||
        showCreateFolderDialog.value ||
        showCreateFileDialog.value ||
        showRenameDialog.value ||
        showPermissionsDialog.value ||
        showPullDialog.value ||
        showCopyDialog.value ||
        showMoveDialog.value ||
        showCompressDialog.value ||
        showDeleteDialog.value ||
        showIgnoredContentDialog.value;

    // ESC key to close drag overlay
    if (e.key === 'Escape') {
        if (isDraggingOver.value) {
            closeDragOverlay();
        }
    }

    // Forward slash (/) to focus search (only if not in an input field and no dialogs open)
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isInputField && !isDialogOpen) {
        e.preventDefault();
        nextTick(() => {
            const input = getSearchInputElement();
            input?.focus();
        });
    }

    // Ctrl+F - Focus search (prevent browser's default find and focus our search, unless dialog is open)
    if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !isDialogOpen) {
        e.preventDefault();
        e.stopPropagation();
        nextTick(() => {
            const input = getSearchInputElement();
            input?.focus();
        });
    }

    // Ctrl+A - Toggle select all files (only if not in an input field)
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isInputField) {
        e.preventDefault();
        // Toggle: if all selected, deselect all; otherwise select all
        toggleSelectAll(!allFilesSelected.value);
    }

    // Ctrl+D - Delete selected files (only if not in an input field)
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !isInputField) {
        e.preventDefault();
        if (selectedFiles.value.length > 0) {
            deleteSelected();
        }
    }

    // Ctrl+C - Copy selected files (only if not in an input field)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedFiles.value.length > 0 && !isInputField) {
        e.preventDefault();
        showCopyDialog.value = true;
    }

    // Ctrl+X - Move selected files (only if not in an input field)
    if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedFiles.value.length > 0 && !isInputField) {
        e.preventDefault();
        showMoveDialog.value = true;
    }

    // ? - Toggle keyboard shortcuts panel (only if not in an input field)
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !isInputField) {
        e.preventDefault();
        showKeyboardShortcuts.value = !showKeyboardShortcuts.value;
    }
};

// Prevent drag overlay from closing unless user presses ESC or drops files
const handleGlobalDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Set drop effect for Chrome compatibility
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
    }

    // Keep the overlay visible while dragging
    if (e.dataTransfer?.types && e.dataTransfer.types.includes('Files')) {
        isDraggingOver.value = true;
    }
};

// Download management functions
const refreshDownloads = async () => {
    if (!server.value) return;

    loadingDownloads.value = true;
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}/downloads-list`);
        if (response.data && response.data.success) {
            // Wings returns downloads array directly
            activeDownloads.value = response.data.data?.downloads || [];
        }
    } catch (error) {
        console.error('Error fetching downloads:', error);
        // Silently fail - don't show error toast for polling
    } finally {
        loadingDownloads.value = false;
    }
};

const cancelDownload = async (downloadId: string) => {
    try {
        const response = await axios.delete(
            `/api/user/servers/${route.params.uuidShort}/delete-pull-process/${downloadId}`,
        );

        if (response.data && response.data.success) {
            toast.success(t('serverFiles.downloadCancelledSuccess'));
            await refreshDownloads();
            await refreshFiles();
        } else {
            toast.error(response.data?.message || t('serverFiles.downloadCancelledError'));
        }
    } catch (error) {
        console.error('Error cancelling download:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.downloadCancelledError'));
    }
};

// Auto-refresh downloads every 60 seconds
let downloadsInterval: ReturnType<typeof setInterval> | null = null;

const startDownloadsPolling = () => {
    // Initial fetch
    refreshDownloads();

    // Poll every 60 seconds (1 minute)
    downloadsInterval = setInterval(() => {
        refreshDownloads();
    }, 60000);
};

const stopDownloadsPolling = () => {
    if (downloadsInterval) {
        clearInterval(downloadsInterval);
        downloadsInterval = null;
    }
};

// Navigation guards to prevent leaving during uploads
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasActiveUploads.value) {
        // Modern browsers ignore custom messages, but we still need to call preventDefault
        event.preventDefault();
        // Set returnValue for older browsers
        event.returnValue = t('serverFiles.uploadInProgressWarning');
        return t('serverFiles.uploadInProgressWarning');
    }
};

// Navigation guard handlers
const handleStayOnPage = () => {
    showNavigationGuardDialog.value = false;
    pendingNavigation.value = null;
};

const handleLeaveAnyway = () => {
    if (pendingNavigation.value) {
        pendingNavigation.value();
    }
};

// Vue Router navigation guard
onBeforeRouteLeave((to, from, next) => {
    if (hasActiveUploads.value) {
        // Show custom confirmation dialog
        pendingNavigation.value = () => {
            next();
            showNavigationGuardDialog.value = false;
            pendingNavigation.value = null;
        };
        showNavigationGuardDialog.value = true;
        // Block navigation for now, will proceed when user confirms
        next(false);
    } else {
        next();
    }
});

// Watch for route changes (browser back/forward navigation)
watch(
    () => route.query.path,
    (newPath) => {
        const targetPath = (newPath as string | undefined) || '/';
        if (targetPath !== currentPath.value) {
            // Navigate without updating URL (already changed by browser)
            navigateToPath(targetPath, false);
        }
    },
);

// Lifecycle
onMounted(async () => {
    await sessionStore.checkSessionOrRedirect(router);
    await settingsStore.fetchSettings();
    await fetchServer();

    // Wait for permission check to complete
    while (permissionsLoading.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Check if user has permission to read files
    if (!canReadFiles.value) {
        toast.error(t('serverFiles.noFileReadPermission'));
        router.push(`/server/${route.params.uuidShort}`);
        return;
    }

    // Load ignored patterns from localStorage
    loadIgnoredPatterns();

    // Initialize path from URL query parameter
    const pathFromUrl = route.query.path as string | undefined;
    if (pathFromUrl) {
        currentPath.value = pathFromUrl;
    }

    await refreshFiles();

    // Start polling for downloads
    startDownloadsPolling();

    // Fetch plugin widgets
    await fetchPluginWidgets();

    // Add keyboard shortcuts (ESC to close drag overlay, / to focus search)
    window.addEventListener('keydown', handleKeyboard);

    // Add global drag over handler to keep overlay visible while dragging
    window.addEventListener('dragover', handleGlobalDragOver);

    // Add beforeunload handler to warn about active uploads
    window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyboard);
    window.removeEventListener('dragover', handleGlobalDragOver);
    window.removeEventListener('beforeunload', handleBeforeUnload);

    // Stop downloads polling
    stopDownloadsPolling();
});

// Server fetching (following ServerLogs pattern)
async function fetchServer(): Promise<void> {
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (response.data.success) {
            server.value = response.data.data;
        } else {
            toast.error(t('serverFiles.failedToFetchServer'));
            router.push('/dashboard');
        }
    } catch {
        toast.error(t('serverFiles.failedToFetchServer'));
        router.push('/dashboard');
    }
}

// File operations
const refreshFiles = async () => {
    loading.value = true;
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}/files`, {
            params: { path: currentPath.value },
        });

        if (response.data.success) {
            files.value = response.data.data.contents || [];
            clearSelection();
        } else {
            toast.error(response.data.message || t('serverFiles.errorLoadingFiles'));
        }
    } catch (error) {
        console.error('Error loading files:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.errorLoadingFiles'));
    } finally {
        loading.value = false;
    }
};

const navigateToPath = (path: string, updateUrl: boolean = true) => {
    currentPath.value = path;
    searchQuery.value = ''; // Clear search filter when changing directories

    // Update URL for browser history (back/forward buttons)
    if (updateUrl) {
        router.push({
            name: 'ServerFiles',
            params: { uuidShort: route.params.uuidShort },
            query: { path: path === '/' ? undefined : path },
        });
    }

    refreshFiles();
};

const navigateUp = () => {
    const segments = currentPath.value.split('/').filter((s) => s.length > 0);
    segments.pop();
    navigateToPath('/' + segments.join('/'));
};

const getPathUpTo = (index: number) => {
    const segments = pathSegments.value.slice(0, index + 1);
    return '/' + segments.join('/');
};

const toggleSelectAll = (checked: boolean) => {
    if (checked) {
        // Select all files and folders from filtered results
        selectedFiles.value = [...filteredFiles.value.map((f) => f.name)];
    } else {
        clearSelection();
    }
};

const toggleFileSelection = (fileName: string) => {
    const index = selectedFiles.value.indexOf(fileName);
    if (index > -1) {
        selectedFiles.value.splice(index, 1);
    } else {
        selectedFiles.value.push(fileName);
    }
};

const clearSelection = () => {
    selectedFiles.value = [];
};

// Handle click on empty space to deselect
const handleEmptySpaceClick = () => {
    // Clear selection when clicking on card content (will be stopped by file rows)
    clearSelection();
};

const clearSearch = () => {
    searchQuery.value = '';
    nextTick(() => {
        const input = getSearchInputElement();
        input?.focus();
    });
};
const copySingle = async (fileName: string) => {
    try {
        const base = currentPath.value === '/' ? '' : currentPath.value.replace(/^\//, '');
        const rel = base ? `${base}/${fileName}`.replace(/\/+/g, '/') : fileName;
        const destination = `/${rel}`;
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/copy-files`, {
            location: destination,
            files: [rel],
        });
        if (response.data.success) {
            toast.success(t('serverFiles.filesCopied', { count: 1 }));
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.copyError'));
        }
    } catch (error) {
        console.error('Error copying file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.copyError'));
    }
};

// Copy selected files
const copySelected = async () => {
    if (selectedFiles.value.length === 0) {
        toast.error(t('serverFiles.noFilesSelected'));
        return;
    }

    if (!copyDestination.value) {
        toast.error(t('serverFiles.destinationRequired'));
        return;
    }

    loading.value = true;
    try {
        const base = currentPath.value === '/' ? '' : currentPath.value.replace(/^\//, '');
        const filePaths = selectedFiles.value.map((fileName) =>
            base ? `${base}/${fileName}`.replace(/\/+/g, '/') : fileName,
        );

        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/copy-files`, {
            location: copyDestination.value,
            files: filePaths,
        });

        if (response.data.success) {
            toast.success(t('serverFiles.filesCopied', { count: selectedFiles.value.length }));
            showCopyDialog.value = false;
            copyDestination.value = '';
            clearSelection();
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.copyError'));
        }
    } catch (error) {
        console.error('Error copying files:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.copyError'));
    } finally {
        loading.value = false;
    }
};

// Move selected files
const moveSelected = async () => {
    if (selectedFiles.value.length === 0) {
        toast.error(t('serverFiles.noFilesSelected'));
        return;
    }

    if (!moveDestination.value) {
        toast.error(t('serverFiles.destinationRequired'));
        return;
    }

    loading.value = true;
    try {
        const renamePayload = selectedFiles.value.map((fileName) => ({
            from: fileName,
            to: moveDestination.value.endsWith('/')
                ? moveDestination.value + fileName
                : `${moveDestination.value}/${fileName}`,
        }));

        const response = await axios.put(`/api/user/servers/${route.params.uuidShort}/rename`, {
            root: currentPath.value,
            files: renamePayload,
        });

        if (response.data.success) {
            toast.success(
                t('serverFiles.filesMoved', {
                    count: selectedFiles.value.length,
                }),
            );
            showMoveDialog.value = false;
            moveDestination.value = '';
            clearSelection();
            refreshFiles();
        } else {
            const errorMsg = response.data?.message || response.data?.error_message || t('serverFiles.moveError');
            toast.error(errorMsg);
        }
    } catch (error) {
        console.error('Error moving files:', error);
        const errorMessage = getErrorMessage(error, t('serverFiles.moveError'));
        toast.error(errorMessage);
    } finally {
        loading.value = false;
    }
};

const getHighlightSegments = (name: string) => {
    const q = searchQuery.value.trim();
    if (!q) return [{ text: name, match: false }];
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(safe, 'ig');
    const parts: Array<{ text: string; match: boolean }> = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(name)) !== null) {
        if (m.index > lastIndex) {
            parts.push({ text: name.slice(lastIndex, m.index), match: false });
        }
        parts.push({ text: m[0], match: true });
        lastIndex = m.index + m[0].length;
    }
    if (lastIndex < name.length) {
        parts.push({ text: name.slice(lastIndex), match: false });
    }
    return parts;
};

// Create file
const createFile = async () => {
    if (!newFileNameForCreate.value) return;
    try {
        const fullPath =
            (currentPath.value.endsWith('/') ? currentPath.value : currentPath.value + '/') +
            newFileNameForCreate.value;
        const response = await axios.post(
            `/api/user/servers/${route.params.uuidShort}/write-file?path=${encodeURIComponent(fullPath)}`,
            newFileContent.value,
            { headers: { 'Content-Type': 'text/plain' } },
        );

        if (response.data.success) {
            toast.success(t('serverFiles.fileCreated'));
            showCreateFileDialog.value = false;
            newFileNameForCreate.value = '';
            newFileContent.value = '';
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.createFileError'));
        }
    } catch (error) {
        console.error('Error creating file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.createFileError'));
    }
};

// Keyboard shortcuts are handled in the main onMounted hook above

// Check if a file is editable (text-based)
const isFileEditable = (file: FileItem): boolean => {
    if (!file.file) return false;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = file.mime?.toLowerCase() || '';

    // Binary file extensions that should NOT be editable
    const binaryExtensions = [
        // Archives
        'zip',
        'tar',
        'gz',
        'tgz',
        '7z',
        'rar',
        'bz2',
        'xz',
        'lzma',
        'cab',
        'iso',
        'dmg',
        'jar',
        'war',
        'ear',
        // Images
        'jpg',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'svg',
        'ico',
        'webp',
        'tiff',
        'tif',
        'psd',
        // Videos
        'mp4',
        'avi',
        'mov',
        'wmv',
        'flv',
        'mkv',
        'webm',
        'm4v',
        'mpg',
        'mpeg',
        // Audio
        'mp3',
        'wav',
        'flac',
        'aac',
        'ogg',
        'wma',
        'm4a',
        'opus',
        // Executables
        'exe',
        'dll',
        'so',
        'dylib',
        'bin',
        'app',
        'deb',
        'rpm',
        'msi',
        // Documents (binary formats)
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'odt',
        'ods',
        'odp',
        // Fonts
        'ttf',
        'otf',
        'woff',
        'woff2',
        'eot',
        // Database files
        'db',
        'sqlite',
        'sqlite3',
        'mdb',
        // Other binary
        'class',
        'pyc',
        'pyo',
        'o',
        'a',
        'lib',
    ];

    // Check if file extension is binary
    if (binaryExtensions.includes(ext)) {
        return false;
    }

    // Check MIME type for binary content
    if (
        mime.startsWith('image/') ||
        mime.startsWith('video/') ||
        mime.startsWith('audio/') ||
        mime.includes('application/octet-stream') ||
        mime.includes('application/pdf') ||
        mime.includes('application/zip') ||
        mime.includes('application/x-tar') ||
        mime.includes('application/gzip') ||
        mime.includes('application/x-executable') ||
        mime.includes('application/java-archive')
    ) {
        return false;
    }

    return true;
};

// Check file size (in bytes) - limit to 5MB for text editor
const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

const isFileSizeValid = (file: FileItem): boolean => {
    return file.size <= FILE_SIZE_LIMIT;
};

const handleFileClick = (file: FileItem) => {
    if (file.file) {
        // Check if file is editable before opening
        if (!isFileEditable(file)) {
            toast.warning(t('serverFiles.cannotEditFile'));
            return;
        }

        // Check file size
        if (!isFileSizeValid(file)) {
            toast.warning(t('serverFiles.fileTooLarge'));
            return;
        }

        openMonacoEditor(file);
    } else {
        const newPath = currentPath.value.endsWith('/')
            ? currentPath.value + file.name
            : currentPath.value + '/' + file.name;
        navigateToPath(newPath);
    }
};

const getFileIcon = (file: FileItem) => {
    if (!file.file) return Folder;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const mime = file.mime?.toLowerCase();

    if (mime?.startsWith('image/')) return Image;
    if (mime?.startsWith('video/')) return Video;
    if (mime?.startsWith('audio/')) return Music;

    // Programming/code files
    if (
        [
            'js',
            'ts',
            'vue',
            'html',
            'css',
            'php',
            'py',
            'java',
            'cpp',
            'c',
            'go',
            'rs',
            'rb',
            'swift',
            'kt',
            'scala',
        ].includes(ext || '')
    ) {
        return Code;
    }

    // Text files (including weird extensions like txtd, logd, etc.)
    if (
        ext &&
        ([
            'txt',
            'md',
            'json',
            'xml',
            'yml',
            'yaml',
            'log',
            'conf',
            'config',
            'ini',
            'env',
            'sh',
            'bash',
            'zsh',
        ].includes(ext) ||
            ext.startsWith('txt') || // txtd, txt1, etc.
            ext.startsWith('log') || // logd, log1, etc.
            ext.startsWith('conf') || // confd, conf1, etc.
            mime?.includes('text/') ||
            mime?.includes('application/json') ||
            mime?.includes('application/xml'))
    ) {
        return FileText;
    }

    return File;
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
};

const isArchive = (file: FileItem) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const mime = file.mime?.toLowerCase();

    // Exclude certain MIME types that would realisticly never be unarchived via the file manager.
    const archiveExceptions = ['application/java-archive', 'application/jar', 'application/jar-archive', 'application/x-java-archive'];
    if (mime && archiveExceptions.some(ex => mime.includes(ex))) return false;

    // Check by extension (including weird ones)
    const archiveExtensions = ['zip', 'tar', 'gz', 'tgz', '7z', 'rar', 'bz2', 'xz', 'lzma', 'cab', 'iso', 'dmg'];
    if (ext && archiveExtensions.includes(ext)) return true;

    // Check by MIME type
    if (
        mime &&
        (mime.includes('zip') ||
            mime.includes('tar') ||
            mime.includes('gzip') ||
            mime.includes('compress') ||
            mime.includes('archive') ||
            mime.includes('x-7z') ||
            mime.includes('x-rar'))
    ) {
        return true;
    }

    return false;
};

// Handle upload mode change (file/folder toggle)
const handleUploadModeChange = (folderMode: boolean) => {
    isFolderUpload.value = folderMode;
    // Reset file input
    if (fileInput.value) {
        fileInput.value.value = '';
    }
    // Clear selections
    selectedFile.value = null;
    selectedFilesFromFolder.value = [];
};

// File operation implementations
const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files || files.length === 0) {
        selectedFile.value = null;
        selectedFilesFromFolder.value = [];
        return;
    }

    if (isFolderUpload.value) {
        // Folder upload mode - get all files with their relative paths
        selectedFilesFromFolder.value = Array.from(files);
        selectedFile.value = null;
    } else {
        // Single file mode
        selectedFile.value = files[0] || null;
        selectedFilesFromFolder.value = [];
    }
};

// Error message extraction helper
const getErrorMessage = (err: unknown, fallback?: string): string => {
    if (typeof err === 'object' && err !== null) {
        const e = err as {
            response?: {
                data?: {
                    message?: string;
                    error_message?: string;
                    error_code?: string;
                };
            };
            message?: string;
        };

        // Return the error message from API response, checking multiple possible fields
        return (
            e.response?.data?.message ||
            e.response?.data?.error_message ||
            e.response?.data?.error_code ||
            e.message ||
            fallback ||
            t('serverFiles.uploadError')
        );
    }

    if (typeof err === 'string') {
        return err;
    }

    return fallback || t('serverFiles.uploadError');
};

// Upload status management
const addUpload = (fileName: string): string => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    activeUploads.value.push({
        id,
        fileName,
        progress: 0,
        status: 'uploading',
    });
    return id;
};

const updateUploadProgress = (id: string, progress: number) => {
    const upload = activeUploads.value.find((u) => u.id === id);
    if (upload) {
        upload.progress = progress;
    }
    // Update global uploading flag
    uploading.value = activeUploads.value.some((u) => u.status === 'uploading');
};

const completeUpload = (id: string, success: boolean, error?: string) => {
    const upload = activeUploads.value.find((u) => u.id === id);
    if (upload) {
        if (success) {
            upload.status = 'completed';
            upload.progress = 100;
        } else {
            upload.status = 'error';
            upload.error = error || t('serverFiles.uploadError');
        }
    }
    // Update global uploading flag
    uploading.value = activeUploads.value.some((u) => u.status === 'uploading');
};

const cancelUpload = (id: string) => {
    // Note: Axios doesn't support cancellation easily, but we can mark it as cancelled
    const upload = activeUploads.value.find((u) => u.id === id);
    if (upload) {
        upload.status = 'error';
        upload.error = t('serverFiles.uploadCancelled');
    }
    // Update global uploading flag
    uploading.value = activeUploads.value.some((u) => u.status === 'uploading');
};

const clearCompletedUploads = () => {
    activeUploads.value = activeUploads.value.filter((u) => u.status === 'uploading');
    // Update global uploading flag
    uploading.value = activeUploads.value.some((u) => u.status === 'uploading');
};

// Helper function to detect root folder name from file paths
// When uploading a folder, all paths start with the root folder name
// e.g., "daddy/config.yml", "daddy/flamecord/file.txt"
// Returns the root folder name or null if it can't be determined
const detectRootFolderName = (files: File[]): string | null => {
    if (files.length === 0) return null;

    // Find first file with a path
    const firstFile = files.find((f) => {
        const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
        return path && path.includes('/');
    });

    if (!firstFile) return null;

    const firstPath = (firstFile as File & { webkitRelativePath?: string }).webkitRelativePath;
    if (!firstPath) return null;

    // Get the first directory name from the path
    const firstPart = firstPath.split('/')[0];
    if (!firstPart) return null;

    // Check if ALL files have paths starting with this root
    const allHaveRoot = files.every((file) => {
        const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        // Either starts with root/ or is just the root name (for root-level files)
        return path.startsWith(`${firstPart}/`) || path === firstPart || !path.includes('/');
    });

    return allHaveRoot ? firstPart : null;
};

// Helper function to strip root folder from a path
const stripRootFolder = (path: string, rootFolder: string | null): string => {
    if (!rootFolder) return path;
    // If path starts with "rootFolder/", remove it
    if (path.startsWith(`${rootFolder}/`)) {
        return path.slice(rootFolder.length + 1);
    }
    // If path is just the root folder name, return empty (file is at root)
    if (path === rootFolder) {
        return '';
    }
    return path;
};

// Helper function to extract directory paths from files (excluding root folder)
const extractDirectoriesFromFiles = (files: File[], rootFolderName: string | null = null): Set<string> => {
    const directories = new Set<string>();

    for (const file of files) {
        // webkitRelativePath contains the full path relative to the selected folder
        // e.g., "daddy/subfolder/file.txt" -> we want "subfolder"
        let relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

        // Strip the root folder name if present
        relativePath = stripRootFolder(relativePath, rootFolderName);

        const pathParts = relativePath.split('/').slice(0, -1); // Remove filename, keep directories

        // Build cumulative paths (excluding root folder)
        let currentPath = '';
        for (const part of pathParts) {
            if (part) {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                directories.add(currentPath);
            }
        }
    }

    return directories;
};

// Helper function to create directory on server with proper path handling
const ensureDirectoryExists = async (relativeDirPath: string): Promise<void> => {
    // relativeDirPath is like "folderName" or "folderName/subfolder"
    // We need to create this directory structure in the current server path

    // Split the relative path into parts
    const pathParts = relativeDirPath.split('/').filter((p) => p.length > 0);

    // Build directories one by one from root to target
    let builtPath: string = '';
    for (let i = 0; i < pathParts.length; i++) {
        const dirName = pathParts[i];
        if (!dirName) continue;

        const currentDir: string = builtPath ? `${builtPath}/${dirName}` : dirName;

        // Calculate the parent path on the server
        const serverParentPath = builtPath
            ? currentPath.value === '/'
                ? `/${builtPath}`
                : `${currentPath.value}/${builtPath}`
            : currentPath.value;

        try {
            await axios.post(`/api/user/servers/${route.params.uuidShort}/create-directory`, {
                name: dirName,
                path: serverParentPath,
            });
        } catch (error) {
            // Ignore if directory already exists
            const err = error as { response?: { data?: { message?: string } } };
            const errorMsg = err.response?.data?.message?.toLowerCase() || '';
            if (!errorMsg.includes('already exists') && !errorMsg.includes('file exists')) {
                // Only throw if it's a real error, not just "already exists"
                console.warn(`Directory creation warning for ${currentDir}:`, errorMsg);
            }
        }

        builtPath = currentDir;
    }
};

const uploadFile = async () => {
    // Handle folder upload
    if (isFolderUpload.value && selectedFilesFromFolder.value.length > 0) {
        await uploadFolder(selectedFilesFromFolder.value);
        return;
    }

    // Handle single file upload
    if (!selectedFile.value) return;

    const uploadId = addUpload(selectedFile.value.name);
    uploading.value = true;
    uploadProgress.value = 0;

    try {
        const response = await axios.post(
            `/api/user/servers/${route.params.uuidShort}/upload-file?path=${encodeURIComponent(currentPath.value)}&filename=${encodeURIComponent(selectedFile.value.name)}`,
            selectedFile.value,
            {
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        uploadProgress.value = progress;
                        updateUploadProgress(uploadId, progress);
                    }
                },
            },
        );

        if (response.data.success) {
            completeUpload(uploadId, true);
            toast.success(t('serverFiles.uploadSuccess'));
            showUploadDialog.value = false;
            selectedFile.value = null;
            selectedFilesFromFolder.value = [];
            isFolderUpload.value = false;
            uploadProgress.value = 0;
            refreshFiles();

            // Remove completed upload after 3 seconds
            setTimeout(() => {
                const index = activeUploads.value.findIndex((u) => u.id === uploadId);
                if (index > -1) {
                    activeUploads.value.splice(index, 1);
                }
            }, 3000);
        } else {
            const errorMsg = response.data?.message || response.data?.error_message || t('serverFiles.uploadError');
            completeUpload(uploadId, false, errorMsg);
            toast.error(errorMsg);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        const errorMessage = getErrorMessage(error);
        completeUpload(uploadId, false, errorMessage);
        toast.error(errorMessage);
    } finally {
        uploading.value = false;
        if (fileInput.value) {
            fileInput.value.value = '';
        }
    }
};

// Upload folder with directory structure
const uploadFolder = async (files: File[]) => {
    if (files.length === 0) return;

    uploading.value = true;

    // Detect root folder name - we'll strip this from all paths
    // e.g., if uploading "daddy" folder, all paths start with "daddy/"
    // We want to create subdirectories like "flamecord", "logs" but NOT "daddy"
    const rootFolderName = detectRootFolderName(files);

    // Extract all directories that need to be created (excluding root folder)
    const directories = extractDirectoriesFromFiles(files, rootFolderName);

    // Sort directories to create parent directories first
    const sortedDirectories = Array.from(directories).sort((a, b) => {
        const depthA = a.split('/').length;
        const depthB = b.split('/').length;
        return depthA - depthB;
    });

    try {
        // Create all directories first (excluding root folder)
        if (sortedDirectories.length > 0) {
            toast.info(t('serverFiles.creatingDirectories', { count: sortedDirectories.length }));
            for (const dirPath of sortedDirectories) {
                await ensureDirectoryExists(dirPath);
            }
        }

        // Upload all files
        toast.info(t('serverFiles.uploadingFiles', { count: files.length }));
        for (const file of files) {
            let relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

            // Strip root folder from path
            relativePath = stripRootFolder(relativePath, rootFolderName);

            const pathParts = relativePath.split('/');
            const fileName = pathParts[pathParts.length - 1] || file.name;
            const dirPath = pathParts
                .slice(0, -1)
                .filter((p) => p.length > 0)
                .join('/');

            // Determine upload path - exclude root folder, only use subdirectories
            let uploadPath: string;
            if (dirPath) {
                // Upload to subdirectory (not root folder)
                uploadPath = currentPath.value === '/' ? `/${dirPath}` : `${currentPath.value}/${dirPath}`;
            } else {
                // File is at the root (after stripping root folder)
                uploadPath = currentPath.value;
            }

            // Use the stripped path for display
            const displayName = relativePath || fileName;
            const uploadId = addUpload(displayName);

            try {
                const response = await axios.post(
                    `/api/user/servers/${route.params.uuidShort}/upload-file?path=${encodeURIComponent(uploadPath)}&filename=${encodeURIComponent(fileName)}`,
                    file,
                    {
                        headers: {
                            'Content-Type': 'application/octet-stream',
                        },
                        onUploadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                updateUploadProgress(uploadId, progress);
                            }
                        },
                    },
                );

                if (response.data.success) {
                    completeUpload(uploadId, true);
                } else {
                    const errorMsg =
                        response.data?.message || response.data?.error_message || t('serverFiles.uploadError');
                    completeUpload(uploadId, false, errorMsg);
                }
            } catch (error) {
                console.error(`Error uploading file ${relativePath}:`, error);
                const errorMessage = getErrorMessage(error);
                completeUpload(uploadId, false, errorMessage);
            }
        }

        toast.success(t('serverFiles.folderUploadSuccess', { count: files.length }));
        showUploadDialog.value = false;
        selectedFilesFromFolder.value = [];
        isFolderUpload.value = false;
        refreshFiles();

        // Remove completed uploads after 3 seconds
        setTimeout(() => {
            activeUploads.value = activeUploads.value.filter((u) => u.status === 'uploading');
        }, 3000);
    } catch (error) {
        console.error('Error uploading folder:', error);
        const errorMessage = getErrorMessage(error);
        toast.error(errorMessage);
    } finally {
        uploading.value = false;
        if (fileInput.value) {
            fileInput.value.value = '';
        }
    }
};

// Drag and drop handlers
const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only show overlay if dragging files
    if (e.dataTransfer?.types && e.dataTransfer.types.includes('Files')) {
        // Set drop effect and effect allowed for Chrome compatibility
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
            // Chrome needs effectAllowed to be set
            if (e.dataTransfer.effectAllowed === 'uninitialized' || e.dataTransfer.effectAllowed === 'all') {
                e.dataTransfer.effectAllowed = 'copy';
            }
        }
        // Show overlay immediately - folder detection happens on drop
        isDraggingOver.value = true;
    }
};

// Handle dragover events - Chrome requires this to allow drops
const handleDragOver = (e: DragEvent) => {
    // CRITICAL: Chrome requires preventDefault on dragover to allow drops
    e.preventDefault();
    // Don't stop propagation - Chrome needs the event to bubble

    // Set drop effect and effect allowed for Chrome compatibility
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
        // Chrome needs effectAllowed to be set
        if (e.dataTransfer.effectAllowed === 'uninitialized' || e.dataTransfer.effectAllowed === 'all') {
            e.dataTransfer.effectAllowed = 'copy';
        }
    }

    // Keep overlay visible while dragging
    if (e.dataTransfer?.types && e.dataTransfer.types.includes('Files')) {
        isDraggingOver.value = true;
    }
};

const handleDragLeave = (e: DragEvent) => {
    // Only close overlay if we're leaving the main container (not just moving between child elements)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;

    // Check if we're actually leaving the drop zone
    if (!currentTarget.contains(relatedTarget)) {
        isDraggingOver.value = false;
    }
};

const closeDragOverlay = () => {
    isDraggingOver.value = false;
};

// Helper function to detect if dropped items contain folders
const detectFolderInItems = async (items: DataTransferItemList): Promise<boolean> => {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || item.kind !== 'file') continue;

        const itemWithHandle = item as DataTransferItem & {
            getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
        };

        if ('getAsFileSystemHandle' in itemWithHandle && typeof itemWithHandle.getAsFileSystemHandle === 'function') {
            try {
                const handle = await itemWithHandle.getAsFileSystemHandle();
                if (handle && handle.kind === 'directory') {
                    return true;
                }
            } catch {
                // If we can't check, continue to next item
                continue;
            }
        }
    }
    return false;
};

// Helper function to process dropped items (files only - folders are blocked)
const processDroppedItems = async (items: DataTransferItemList): Promise<File[]> => {
    const files: File[] = [];

    // First check if any folders are present
    const hasFolders = await detectFolderInItems(items);
    if (hasFolders) {
        throw new Error('FOLDER_DETECTED');
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;

        if (item.kind === 'file') {
            // Chrome: Try File System Access API first (if available)
            const itemWithHandle = item as DataTransferItem & {
                getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
            };

            if (
                'getAsFileSystemHandle' in itemWithHandle &&
                typeof itemWithHandle.getAsFileSystemHandle === 'function'
            ) {
                try {
                    const handle = await itemWithHandle.getAsFileSystemHandle();

                    if (handle && handle.kind === 'directory') {
                        // This should not happen if detectFolderInItems worked, but as a safeguard
                        throw new Error('FOLDER_DETECTED');
                    } else if (handle && handle.kind === 'file') {
                        // Regular file via File System Access API
                        const fileHandle = handle as FileSystemFileHandle;
                        const file = await fileHandle.getFile();
                        files.push(file);
                        continue; // Successfully got file, move to next item
                    }
                } catch (error) {
                    if ((error as Error).message === 'FOLDER_DETECTED') {
                        throw error;
                    }
                    // If File System Access API fails, fall through to getAsFile()
                }
            }

            // Fallback: Use getAsFile() - works in all browsers including Chrome
            // This is the most reliable method for Chrome
            try {
                const file = item.getAsFile();
                if (file) {
                    files.push(file);
                }
            } catch (error) {
                console.warn('Failed to get file from item:', error);
                // Continue to next item
            }
        }
    }

    return files;
};

const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    closeDragOverlay();

    if (!e.dataTransfer) {
        return;
    }

    let filesToUpload: File[] = [];

    // Chrome: Prioritize dataTransfer.files - it's more reliable
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const fileList = Array.from(e.dataTransfer.files);

        // Check if any files have webkitRelativePath (indicates folder was dragged)
        const hasFolderStructure = fileList.some(
            (f) =>
                (f as File & { webkitRelativePath?: string }).webkitRelativePath &&
                (f as File & { webkitRelativePath?: string }).webkitRelativePath!.includes('/'),
        );

        if (hasFolderStructure) {
            // Folder was dragged and browser gave us its contents via files API
            toast.error(t('serverFiles.folderDragDropNotSupported'));
            return;
        }

        filesToUpload = fileList;
    }
    // Fallback: Try DataTransferItem API if files API didn't work
    else if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        try {
            // Check for folders first
            const hasFolders = await detectFolderInItems(e.dataTransfer.items);
            if (hasFolders) {
                toast.error(t('serverFiles.folderDragDropNotSupported'));
                return;
            }

            // Process items
            filesToUpload = await processDroppedItems(e.dataTransfer.items);
        } catch (error) {
            // Check if error is about folder detection
            if ((error as Error).message === 'FOLDER_DETECTED') {
                toast.error(t('serverFiles.folderDragDropNotSupported'));
                return;
            }
            console.error('Error processing dropped items:', error);
            toast.error(t('serverFiles.uploadError'));
            return;
        }
    }

    if (filesToUpload.length === 0) {
        toast.warning(t('serverFiles.noFilesToUpload'));
        return;
    }

    // Upload as individual files
    if (filesToUpload.length === 1 && filesToUpload[0]) {
        toast.info(t('serverFiles.uploadingFiles', { count: 1 }) + ` - ${filesToUpload[0].name}`);
    } else {
        toast.info(t('serverFiles.uploadingFiles', { count: filesToUpload.length }));
    }

    // Upload each file sequentially with progress tracking
    for (const file of filesToUpload) {
        await uploadDroppedFile(file);
    }

    // Refresh file list after all uploads
    await refreshFiles();
};

const uploadDroppedFile = async (file: File) => {
    const uploadId = addUpload(file.name);
    uploading.value = activeUploads.value.some((u) => u.status === 'uploading');

    try {
        const response = await axios.post(
            `/api/user/servers/${route.params.uuidShort}/upload-file?path=${encodeURIComponent(currentPath.value)}&filename=${encodeURIComponent(file.name)}`,
            file,
            {
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        updateUploadProgress(uploadId, progress);
                    }
                },
            },
        );

        if (response.data.success) {
            completeUpload(uploadId, true);
            toast.success(t('serverFiles.uploadSuccess') + `: ${file.name}`);

            // Remove completed upload after 3 seconds
            setTimeout(() => {
                const index = activeUploads.value.findIndex((u) => u.id === uploadId);
                if (index > -1) {
                    activeUploads.value.splice(index, 1);
                }
            }, 3000);
        } else {
            const errorMsg = response.data?.message || response.data?.error_message || t('serverFiles.uploadError');
            completeUpload(uploadId, false, errorMsg);
            toast.error(`${file.name}: ${errorMsg}`);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        const errorMessage = getErrorMessage(error);
        completeUpload(uploadId, false, errorMessage);
        toast.error(`${file.name}: ${errorMessage}`);
    } finally {
        // Update global uploading flag based on active uploads
        uploading.value = activeUploads.value.some((u) => u.status === 'uploading');
    }
};

const createFolder = async () => {
    if (!newFolderName.value) return;

    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/create-directory`, {
            name: newFolderName.value,
            path: currentPath.value,
        });

        if (response.data.success) {
            toast.success(t('serverFiles.folderCreated'));
            showCreateFolderDialog.value = false;
            newFolderName.value = '';
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.createFolderError'));
        }
    } catch (error) {
        console.error('Error creating folder:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.createFolderError'));
    }
};

const openMonacoEditor = (file: FileItem) => {
    if (!file.file) return;

    router.push({
        name: 'ServerFileEditor',
        params: { uuidShort: route.params.uuidShort },
        query: {
            file: file.name,
            path: currentPath.value,
            readonly: 'false',
        },
    });
};

const downloadFile = (file: FileItem) => {
    const filePath = currentPath.value.endsWith('/')
        ? currentPath.value + file.name
        : currentPath.value + '/' + file.name;

    const url = `/api/user/servers/${route.params.uuidShort}/download-file?path=${encodeURIComponent(filePath)}`;
    window.open(url, '_blank');
};

const renameFile = (file: FileItem) => {
    renamingFile.value = file;
    newFileName.value = file.name;
    showRenameDialog.value = true;
};

const confirmRename = async () => {
    if (!renamingFile.value || !newFileName.value) return;

    try {
        const response = await axios.put(`/api/user/servers/${route.params.uuidShort}/rename`, {
            root: currentPath.value,
            files: [
                {
                    from: renamingFile.value.name,
                    to: newFileName.value,
                },
            ],
        });

        if (response.data.success) {
            toast.success(t('serverFiles.fileRenamed'));
            showRenameDialog.value = false;
            renamingFile.value = null;
            newFileName.value = '';
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.renameError'));
        }
    } catch (error) {
        console.error('Error renaming file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.renameError'));
    }
};

const showDeleteDialog = ref(false);
const deleteMode = ref<'single' | 'multi'>('single');
const deleteSingleName = ref('');

const deleteFile = (file: FileItem) => {
    deleteMode.value = 'single';
    deleteSingleName.value = file.name;
    showDeleteDialog.value = true;
};

const deleteSelected = async () => {
    if (selectedFiles.value.length === 0) {
        toast.error(t('serverFiles.noFilesSelected'));
        return;
    }
    deleteMode.value = 'multi';
    showDeleteDialog.value = true;
};

const confirmDeleteProceed = async () => {
    loading.value = true;
    try {
        if (deleteMode.value === 'single') {
            const response = await axios.delete(`/api/user/servers/${route.params.uuidShort}/delete-files`, {
                data: {
                    root: currentPath.value,
                    files: [deleteSingleName.value],
                },
            });
            if (response.data.success) {
                toast.success(t('serverFiles.fileDeleted'));
                refreshFiles();
            } else {
                toast.error(response.data.message || t('serverFiles.deleteError'));
            }
        } else {
            const response = await axios.delete(`/api/user/servers/${route.params.uuidShort}/delete-files`, {
                data: {
                    root: currentPath.value,
                    files: selectedFiles.value,
                },
            });
            if (response.data.success) {
                toast.success(t('serverFiles.filesDeleted', { count: selectedFiles.value.length }));
                clearSelection();
                refreshFiles();
            } else {
                toast.error(response.data.message || t('serverFiles.deleteError'));
            }
        }
    } catch (error) {
        console.error('Error deleting file(s):', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.deleteError'));
    } finally {
        loading.value = false;
        showDeleteDialog.value = false;
    }
};

// Mass copy disabled by design

const compressSelected = (file?: FileItem) => {
    let filesToCompress: string[] = [];

    if (selectedFiles.value.length > 0) {
        filesToCompress = [...selectedFiles.value];
    } else if (file) {
        filesToCompress = [file.name];
    } else {
        toast.error(t('serverFiles.noFilesSelected'));
        return;
    }

    compressionTargets.value = filesToCompress;
    // Reset dialog state
    compressArchiveName.value = '';
    compressArchiveType.value = 'tar.gz';
    showCompressDialog.value = true;
};

const confirmCompress = async () => {
    if (compressionTargets.value.length === 0) {
        toast.error(t('serverFiles.noFilesSelected'));
        return;
    }

    loading.value = true;
    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/compress-files`, {
            root: currentPath.value,
            files: compressionTargets.value,
            name: compressArchiveName.value || undefined,
            extension: compressArchiveType.value,
        });

        if (response.data.success) {
            toast.success(t('serverFiles.filesCompressed', { count: compressionTargets.value.length }));
            showCompressDialog.value = false;
            clearSelection();
            compressionTargets.value = [];
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.compressError'));
        }
    } catch (error) {
        console.error('Error compressing files:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.compressError'));
    } finally {
        loading.value = false;
        if (!showCompressDialog.value) {
            compressionTargets.value = [];
        }
    }
};

const extractFile = async (file: FileItem) => {
    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/decompress-archive`, {
            file: file.name,
            root: currentPath.value,
        });

        if (response.data.success) {
            toast.success(t('serverFiles.fileExtracted'));
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.extractError'));
        }
    } catch (error) {
        console.error('Error extracting file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.extractError'));
    }
};

const changePermissions = (file: FileItem) => {
    permissionsFile.value = file;
    newPermissions.value = file.mode_bits || '755';
    showPermissionsDialog.value = true;
};

const confirmPermissions = async () => {
    if (!permissionsFile.value || !newPermissions.value) return;

    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/change-permissions`, {
            root: currentPath.value,
            files: [
                {
                    file: permissionsFile.value.name,
                    mode: newPermissions.value,
                },
            ],
        });

        if (response.data.success) {
            toast.success(t('serverFiles.permissionsChanged'));
            showPermissionsDialog.value = false;
            permissionsFile.value = null;
            newPermissions.value = '';
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.permissionsError'));
        }
    } catch (error) {
        console.error('Error changing permissions:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.permissionsError'));
    }
};

const pullFile = async () => {
    if (!pullUrl.value) {
        toast.warning(t('serverFiles.pullUrlRequired'));
        return;
    }

    pulling.value = true;

    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/pull-file`, {
            url: pullUrl.value,
            root: currentPath.value,
            fileName: pullFileName.value || undefined,
            foreground: false, // Run in background
            useHeader: true, // Use headers for download
        });

        if (response.data && response.data.success) {
            toast.success(t('serverFiles.pullStarted'));

            showPullDialog.value = false;
            pullUrl.value = '';
            pullFileName.value = '';

            // Refresh downloads list immediately to show the new download
            await refreshDownloads();

            // Refresh files after a short delay to allow the download to complete
            setTimeout(() => {
                refreshFiles();
            }, 3000);
        } else {
            const errorMsg = response.data?.message || response.data?.error_message || t('serverFiles.pullError');
            toast.error(errorMsg);
        }
    } catch (error) {
        console.error('Error pulling file:', error);
        const errorMessage = getErrorMessage(error, t('serverFiles.pullError'));
        toast.error(errorMessage);
    } finally {
        pulling.value = false;
    }
};

const downloadSelected = () => {
    if (selectedFiles.value.length === 0) {
        toast.error(t('serverFiles.noFilesSelected'));
        return;
    }

    const filesToDownload = selectedFiles.value.filter((fileName) => {
        const file = files.value.find((f) => f.name === fileName);
        return file?.file; // Only download actual files, not directories
    });

    if (filesToDownload.length === 0) {
        toast.error(t('serverFiles.noDownloadableFiles'));
        return;
    }

    filesToDownload.forEach((fileName) => {
        const file = files.value.find((f) => f.name === fileName);
        if (file) {
            downloadFile(file);
        }
    });

    toast.success(t('serverFiles.downloadStarted', { count: filesToDownload.length }));
};

// Ignored content management functions
const getIgnoredPatternsKey = () => {
    return `featherpanel_server_ignored_files_${server.value?.uuid}`;
};

const loadIgnoredPatterns = () => {
    if (!server.value?.uuid) return;

    const key = getIgnoredPatternsKey();
    const saved = localStorage.getItem(key);

    if (saved) {
        try {
            ignoredPatterns.value = JSON.parse(saved);
        } catch (error) {
            console.error('Error loading ignored patterns:', error);
            ignoredPatterns.value = [];
        }
    }
};

const saveIgnoredPatterns = () => {
    if (!server.value?.uuid) return;

    const key = getIgnoredPatternsKey();
    localStorage.setItem(key, JSON.stringify(ignoredPatterns.value));
};

const addIgnoredPattern = () => {
    const pattern = newIgnoredPattern.value.trim();
    if (!pattern) return;

    if (ignoredPatterns.value.includes(pattern)) {
        toast.warning(t('serverFiles.patternAlreadyExists'));
        return;
    }

    ignoredPatterns.value.push(pattern);
    saveIgnoredPatterns();
    newIgnoredPattern.value = '';
    toast.success(t('serverFiles.patternAdded'));
};

const removeIgnoredPattern = (index: number) => {
    ignoredPatterns.value.splice(index, 1);
    saveIgnoredPatterns();
    toast.success(t('serverFiles.patternRemoved'));
};

const clearAllIgnoredPatterns = () => {
    ignoredPatterns.value = [];
    saveIgnoredPatterns();
    toast.success(t('serverFiles.allPatternsCleared'));
};
</script>
