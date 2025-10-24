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
                @drop.prevent="handleDrop"
                @dragover.prevent
            >
                <div class="text-center space-y-8 px-4">
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
                            class="relative p-12 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 border-4 border-dashed border-primary shadow-2xl shadow-primary/20"
                        >
                            <Upload
                                class="h-20 w-20 text-primary drop-shadow-lg"
                                style="animation: bounce 1s infinite"
                            />
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h2
                            class="text-5xl font-black bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent drop-shadow-sm"
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

        <div class="space-y-6 pb-8" @dragenter.prevent="handleDragEnter" @dragover.prevent @drop.prevent="handleDrop">
            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverFiles.title') }}</h1>
                        <p class="text-sm text-muted-foreground">{{ t('serverFiles.description') }}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Badge
                            v-if="uploading"
                            variant="outline"
                            class="text-sm px-3 py-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 animate-pulse"
                        >
                            <Upload class="h-3.5 w-3.5 mr-2 animate-bounce" />
                            {{ t('serverFiles.uploadingStatus') }}
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

            <!-- Hidden Search Results Warning -->
            <Card
                v-if="filteredFiles.length === 0 && searchQuery && hiddenMatchesExist"
                class="border-2 border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-orange-500/10 shadow-sm"
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
                                variant="outline"
                                size="sm"
                                :disabled="loading"
                                class="gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                                data-umami-event="Move files"
                                @click="showMoveDialog = true"
                            >
                                <FileEdit class="h-4 w-4" />
                                <span>{{ t('serverFiles.move', { defaultValue: 'Move' }) }}</span>
                            </Button>
                            <Button
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
                                                    v-if="file.file && isFileEditable(file) && isFileSizeValid(file)"
                                                    data-umami-event="Edit file"
                                                    :data-umami-event-file="file.name"
                                                    @click="openMonacoEditor(file)"
                                                >
                                                    <Code class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.edit') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem @click="renameFile(file)">
                                                    <FileEdit class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.rename') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    v-if="file.file"
                                                    data-umami-event="Download file"
                                                    :data-umami-event-file="file.name"
                                                    @click="downloadFile(file)"
                                                >
                                                    <Download class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.download') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem @click="copySingle(file.name)">
                                                    <Copy class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.copy') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    v-if="file.file && isArchive(file)"
                                                    @click="extractFile(file)"
                                                >
                                                    <Archive class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.extract') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem @click="changePermissions(file)">
                                                    <Settings class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.permissions') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
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
                                                                file.file &&
                                                                isFileEditable(file) &&
                                                                isFileSizeValid(file)
                                                            "
                                                            @click="openMonacoEditor(file)"
                                                        >
                                                            <Code class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.edit') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem @click="renameFile(file)">
                                                            <FileEdit class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.rename') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem v-if="file.file" @click="downloadFile(file)">
                                                            <Download class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.download') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem @click="copySingle(file.name)">
                                                            <Copy class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.copy') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            v-if="file.file && isArchive(file)"
                                                            @click="extractFile(file)"
                                                        >
                                                            <Archive class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.extract') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem @click="changePermissions(file)">
                                                            <Settings class="h-4 w-4 mr-2" />
                                                            {{ t('serverFiles.permissions') }}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
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
                                            v-if="file.file && isFileEditable(file) && isFileSizeValid(file)"
                                            @click="openMonacoEditor(file)"
                                        >
                                            <Code class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.edit') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem @click="renameFile(file)">
                                            <FileEdit class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.rename') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem v-if="file.file" @click="downloadFile(file)">
                                            <Download class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.download') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem @click="copySingle(file.name)">
                                            <Copy class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.copy') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem v-if="file.file && isArchive(file)" @click="extractFile(file)">
                                            <Archive class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.extract') }}
                                        </ContextMenuItem>
                                        <ContextMenuItem @click="changePermissions(file)">
                                            <Settings class="h-4 w-4 mr-2" />
                                            {{ t('serverFiles.permissions') }}
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem class="text-destructive" @click="deleteFile(file)">
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
        </div>

        <!-- Upload File Dialog -->
        <Dialog v-model:open="showUploadDialog">
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.uploadFile') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.uploadFileDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="uploadFile">{{ t('serverFiles.selectFile') }}</Label>
                        <Input
                            id="uploadFile"
                            ref="fileInput"
                            type="file"
                            :disabled="uploading"
                            @change="handleFileSelect"
                        />
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
                    <Button :disabled="!selectedFile || uploading" class="w-full sm:w-auto" @click="uploadFile">
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
                        {{ t('serverFiles.copyFiles', { defaultValue: 'Copy Files' }) }}
                    </DialogTitle>
                    <DialogDescription>
                        {{
                            t('serverFiles.copyFilesDescription', {
                                defaultValue: 'Copy the selected files to a new location.',
                            })
                        }}
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p class="text-sm text-blue-600 dark:text-blue-400">
                            {{ t('serverFiles.copyingFiles', { count: selectedFiles.length }) }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label for="copyDestination"
                            >{{ t('serverFiles.destination', { defaultValue: 'Destination Path' }) }} *</Label
                        >
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
                        {{ t('serverFiles.copy', { defaultValue: 'Copy' }) }}
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
                        {{ t('serverFiles.moveFiles', { defaultValue: 'Move Files' }) }}
                    </DialogTitle>
                    <DialogDescription>
                        {{
                            t('serverFiles.moveFilesDescription', {
                                defaultValue: 'Move the selected files to a new location.',
                            })
                        }}
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <p class="text-sm text-orange-600 dark:text-orange-400">
                            {{ t('serverFiles.movingFilesFromCurrent', { count: selectedFiles.length }) }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <Label for="moveDestination"
                            >{{ t('serverFiles.destination', { defaultValue: 'Destination Path' }) }} *</Label
                        >
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
                        {{ t('serverFiles.move', { defaultValue: 'Move' }) }}
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
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Server } from '@/types/server';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const toast = useToast();

// Server and loading state
const server = ref<Server | null>(null);
const loading = ref(false);

const uploading = ref(false);
const pulling = ref(false);
const loadingDownloads = ref(false);

// File data
const files = ref<FileItem[]>([]);
const currentPath = ref('/');
const selectedFiles = ref<string[]>([]);
const activeDownloads = ref<DownloadProcess[]>([]);
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
const showIgnoredContentDialog = ref(false);

// Drag and drop state
const isDraggingOver = ref(false);

// Ignored content state
const ignoredPatterns = ref<string[]>([]);
const newIgnoredPattern = ref('');

// Form data
const selectedFile = ref<File | null>(null);
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

// For range selection with Shift+Click
const lastSelectedIndex = ref<number>(-1);

// Keyboard shortcuts panel
const showKeyboardShortcuts = ref(false);

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

    // Add keyboard shortcuts (ESC to close drag overlay, / to focus search)
    window.addEventListener('keydown', handleKeyboard);

    // Add global drag over handler to keep overlay visible while dragging
    window.addEventListener('dragover', handleGlobalDragOver);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyboard);
    window.removeEventListener('dragover', handleGlobalDragOver);

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
                    defaultValue: `${selectedFiles.value.length} file(s) moved successfully`,
                }),
            );
            showMoveDialog.value = false;
            moveDestination.value = '';
            clearSelection();
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.moveError', { defaultValue: 'Failed to move files' }));
        }
    } catch (error) {
        console.error('Error moving files:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(
            err.response?.data?.message || t('serverFiles.moveError', { defaultValue: 'Failed to move files' }),
        );
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
            toast.warning(
                t('serverFiles.cannotEditFile', {
                    defaultValue:
                        'Cannot edit this file type. Binary files like archives, images, and executables cannot be edited as text.',
                }),
            );
            return;
        }

        // Check file size
        if (!isFileSizeValid(file)) {
            toast.warning(
                t('serverFiles.fileTooLarge', {
                    defaultValue: 'File is too large to edit (max 5MB). Please download it instead.',
                }),
            );
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

// File operation implementations
const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    selectedFile.value = target.files?.[0] || null;
};

const uploadFile = async () => {
    if (!selectedFile.value) return;

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
                        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    }
                },
            },
        );

        if (response.data.success) {
            toast.success(t('serverFiles.uploadSuccess'));
            showUploadDialog.value = false;
            selectedFile.value = null;
            uploadProgress.value = 0;
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.uploadError'));
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.uploadError'));
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
        isDraggingOver.value = true;
    }
};

const closeDragOverlay = () => {
    isDraggingOver.value = false;
};

const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    closeDragOverlay();

    if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) {
        return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);

    if (droppedFiles.length === 0) {
        return;
    }

    // Show a toast indicating upload is starting
    if (droppedFiles.length === 1 && droppedFiles[0]) {
        toast.info(t('serverFiles.uploadingFiles', { count: 1 }) + ` - ${droppedFiles[0].name}`);
    } else {
        toast.info(t('serverFiles.uploadingFiles', { count: droppedFiles.length }));
    }

    // Upload each file
    for (const file of droppedFiles) {
        await uploadDroppedFile(file);
    }

    // Refresh file list after all uploads
    await refreshFiles();
};

const uploadDroppedFile = async (file: File) => {
    uploading.value = true;

    try {
        const response = await axios.post(
            `/api/user/servers/${route.params.uuidShort}/upload-file?path=${encodeURIComponent(currentPath.value)}&filename=${encodeURIComponent(file.name)}`,
            file,
            {
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
            },
        );

        if (response.data.success) {
            toast.success(t('serverFiles.uploadSuccess') + `: ${file.name}`);
        } else {
            toast.error(`${file.name}: ${response.data.message || t('serverFiles.uploadError')}`);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(`${file.name}: ${err.response?.data?.message || t('serverFiles.uploadError')}`);
    } finally {
        uploading.value = false;
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

const compressSelected = async () => {
    if (selectedFiles.value.length === 0) {
        toast.error(t('serverFiles.noFilesSelected'));
        return;
    }

    loading.value = true;
    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/compress-files`, {
            root: currentPath.value,
            files: selectedFiles.value,
        });

        if (response.data.success) {
            toast.success(t('serverFiles.filesCompressed', { count: selectedFiles.value.length }));
            clearSelection();
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
            toast.success(
                t('serverFiles.pullStarted', { defaultValue: 'File download started! Check Active Downloads below.' }),
            );

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
            toast.error(
                response.data?.message || t('serverFiles.pullError', { defaultValue: 'Failed to start download' }),
            );
        }
    } catch (error) {
        console.error('Error pulling file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(
            err.response?.data?.message || t('serverFiles.pullError', { defaultValue: 'Failed to start download' }),
        );
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
        toast.warning(t('serverFiles.patternAlreadyExists', { defaultValue: 'This pattern already exists' }));
        return;
    }

    ignoredPatterns.value.push(pattern);
    saveIgnoredPatterns();
    newIgnoredPattern.value = '';
    toast.success(
        t('serverFiles.patternAdded', {
            defaultValue: 'Pattern added successfully',
        }),
    );
};

const removeIgnoredPattern = (index: number) => {
    ignoredPatterns.value.splice(index, 1);
    saveIgnoredPatterns();
    toast.success(
        t('serverFiles.patternRemoved', {
            defaultValue: 'Pattern removed successfully',
        }),
    );
};

const clearAllIgnoredPatterns = () => {
    ignoredPatterns.value = [];
    saveIgnoredPatterns();
    toast.success(
        t('serverFiles.allPatternsCleared', {
            defaultValue: 'All patterns cleared',
        }),
    );
};
</script>
