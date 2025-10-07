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

        <div class="space-y-6" @dragenter.prevent="handleDragEnter" @dragover.prevent @drop.prevent="handleDrop">
            <!-- Header with improved design -->
            <div class="space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                            <div class="p-2 rounded-lg bg-primary/10">
                                <FolderOpen class="h-6 w-6 text-primary" />
                            </div>
                            {{ t('serverFiles.title') }}
                        </h1>
                        <p class="text-sm sm:text-base text-muted-foreground mt-2">
                            {{ t('serverFiles.description') }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span
                            v-if="uploading"
                            class="text-sm font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 animate-pulse flex items-center gap-2"
                        >
                            <Upload class="h-3.5 w-3.5 animate-bounce" />
                            Uploading...
                        </span>
                        <span
                            class="text-sm font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20"
                        >
                            {{ filteredFiles.length }} / {{ files.length }} items
                        </span>
                    </div>
                </div>

                <!-- Action buttons with better grouping -->
                <div class="flex flex-col sm:flex-row gap-3">
                    <div class="flex flex-wrap gap-2 flex-1">
                        <Button
                            variant="outline"
                            :disabled="loading"
                            class="gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
                            @click="refreshFiles"
                        >
                            <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                            <span>{{ t('common.refresh') }}</span>
                        </Button>
                        <Button
                            variant="outline"
                            :disabled="loading"
                            class="gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
                            @click="showCreateFileDialog = true"
                        >
                            <FileText class="h-4 w-4" />
                            <span>{{ t('serverFiles.newFile') }}</span>
                        </Button>
                        <Button
                            variant="outline"
                            :disabled="loading"
                            class="gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
                            @click="showUploadDialog = true"
                        >
                            <Upload class="h-4 w-4" />
                            <span>{{ t('serverFiles.uploadFile') }}</span>
                        </Button>
                        <Button
                            :disabled="loading"
                            class="gap-2 bg-primary hover:bg-primary/90 transition-all shadow-sm"
                            @click="showCreateFolderDialog = true"
                        >
                            <FolderPlus class="h-4 w-4" />
                            <span>{{ t('serverFiles.createFolder') }}</span>
                        </Button>
                    </div>
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
                                class="flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
                                @click="navigateToPath('/')"
                            >
                                <Home class="h-4 w-4" />
                            </Button>
                            <template v-for="(segment, index) in pathSegments" :key="index">
                                <ChevronRight class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    class="text-muted-foreground hover:text-foreground hover:bg-primary/10 whitespace-nowrap flex-shrink-0 transition-all"
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

            <!-- Enhanced File Actions Toolbar -->
            <Card
                v-if="selectedFiles.length > 0"
                class="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 shadow-sm"
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
                                <p class="text-xs text-muted-foreground">Choose an action below</p>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                :disabled="loading"
                                class="gap-2 hover:bg-primary/10 hover:text-primary transition-all"
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
                                <span>Clear</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Enhanced Files List -->
            <Card class="border-2 shadow-sm">
                <CardHeader class="border-b">
                    <div class="flex items-center justify-between">
                        <div>
                            <CardTitle class="flex items-center gap-2 text-xl">
                                <div class="p-1.5 rounded-md bg-primary/10">
                                    <FolderOpen class="h-5 w-5 text-primary" />
                                </div>
                                {{ t('serverFiles.fileManager') }}
                            </CardTitle>
                            <CardDescription class="mt-1.5">
                                {{ t('serverFiles.currentPath') }}:
                                <code class="text-xs bg-muted px-2 py-0.5 rounded">{{ currentPath }}</code>
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="p-0">
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

                    <div v-else-if="files.length === 0" class="flex flex-col items-center justify-center py-16">
                        <div class="p-4 rounded-full bg-muted/50 mb-4">
                            <FolderOpen class="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p class="text-base font-medium text-muted-foreground">{{ t('serverFiles.emptyFolder') }}</p>
                        <p class="text-sm text-muted-foreground mt-1">Create files or folders to get started</p>
                    </div>

                    <div v-else class="divide-y">
                        <!-- File List Header -->
                        <div class="bg-muted/50 px-4 py-3">
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
                                        @click="files.length > 0 && toggleSelectAll(!allFilesSelected)"
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
                            <div class="flex items-center gap-3 px-4 py-3" @click="navigateUp">
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
                                    @click="handleRowClick($event, file.name)"
                                    @contextmenu.prevent="handleRightClick($event, file)"
                                >
                                    <div class="flex items-start gap-3">
                                        <div class="flex items-center gap-3 flex-1 min-w-0">
                                            <!-- Custom File Checkbox -->
                                            <div
                                                class="relative flex items-center justify-center w-5 h-5 border-2 rounded-md cursor-pointer transition-all duration-200 flex-shrink-0 shadow-sm"
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
                                                    class="h-5 w-5 flex-shrink-0"
                                                    :class="
                                                        file.file
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : 'text-yellow-600 dark:text-yellow-400'
                                                    "
                                                />
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <div
                                                    class="text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors"
                                                    @click.stop="handleFileClick(file)"
                                                >
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
                                                    class="h-9 w-9 p-0 flex-shrink-0 hover:bg-primary/10 hover:text-primary"
                                                    @click.stop
                                                >
                                                    <MoreVertical class="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" class="w-48">
                                                <DropdownMenuItem
                                                    v-if="file.file && isFileEditable(file) && isFileSizeValid(file)"
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

                                <!-- Desktop Layout -->
                                <div
                                    class="hidden sm:flex items-center px-4 py-3 cursor-pointer gap-6"
                                    @click="handleRowClick($event, file.name)"
                                    @contextmenu.prevent="handleRightClick($event, file)"
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
                                                class="h-5 w-5 flex-shrink-0"
                                                :class="
                                                    file.file
                                                        ? 'text-blue-600 dark:text-blue-400'
                                                        : 'text-yellow-600 dark:text-yellow-400'
                                                "
                                            />
                                        </div>
                                        <span
                                            class="text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors"
                                            @click.stop="handleFileClick(file)"
                                        >
                                            <template v-for="(seg, i) in getHighlightSegments(file.name)" :key="i">
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
                                                    v-if="file.file && isFileEditable(file) && isFileSizeValid(file)"
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
            <DialogContent class="mx-4 sm:mx-0 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.pullFile') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.pullFileDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="pullUrl">{{ t('serverFiles.fileUrl') }}</Label>
                        <Input id="pullUrl" v-model="pullUrl" placeholder="https://example.com/file.zip" type="url" />
                    </div>
                    <div class="space-y-2">
                        <Label for="pullFileName">{{ t('serverFiles.fileName') }} ({{ t('common.optional') }})</Label>
                        <Input
                            id="pullFileName"
                            v-model="pullFileName"
                            :placeholder="t('serverFiles.fileNamePlaceholder')"
                        />
                    </div>
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" class="w-full sm:w-auto" @click="showPullDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!pullUrl" class="w-full sm:w-auto" @click="pullFile">
                        <Download class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.pull') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Context Menu -->
        <Teleport to="body">
            <div
                v-if="showContextMenu && contextMenuFile"
                class="fixed z-50 min-w-[200px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                :style="{ top: `${contextMenuPosition.y}px`, left: `${contextMenuPosition.x}px` }"
                @click.stop
            >
                <div
                    v-if="contextMenuFile.file && isFileEditable(contextMenuFile) && isFileSizeValid(contextMenuFile)"
                    class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="
                        openMonacoEditor(contextMenuFile);
                        closeContextMenu();
                    "
                >
                    <Code class="h-4 w-4 mr-2" />
                    {{ t('serverFiles.edit') }}
                </div>
                <div
                    class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="
                        renameFile(contextMenuFile);
                        closeContextMenu();
                    "
                >
                    <FileEdit class="h-4 w-4 mr-2" />
                    {{ t('serverFiles.rename') }}
                </div>
                <div
                    v-if="contextMenuFile.file"
                    class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="
                        downloadFile(contextMenuFile);
                        closeContextMenu();
                    "
                >
                    <Download class="h-4 w-4 mr-2" />
                    {{ t('serverFiles.download') }}
                </div>
                <div
                    class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="
                        copySingle(contextMenuFile.name);
                        closeContextMenu();
                    "
                >
                    <Copy class="h-4 w-4 mr-2" />
                    {{ t('serverFiles.copy') }}
                </div>
                <div
                    v-if="contextMenuFile.file && isArchive(contextMenuFile)"
                    class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="
                        extractFile(contextMenuFile);
                        closeContextMenu();
                    "
                >
                    <Archive class="h-4 w-4 mr-2" />
                    {{ t('serverFiles.extract') }}
                </div>
                <div
                    class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="
                        changePermissions(contextMenuFile);
                        closeContextMenu();
                    "
                >
                    <Settings class="h-4 w-4 mr-2" />
                    {{ t('serverFiles.permissions') }}
                </div>
                <div class="my-1 h-px bg-border"></div>
                <div
                    class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    @click="
                        deleteFile(contextMenuFile);
                        closeContextMenu();
                    "
                >
                    <Trash2 class="h-4 w-4 mr-2" />
                    {{ t('serverFiles.delete') }}
                </div>
            </div>
        </Teleport>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Removed shadcn-vue Checkbox import - using custom implementation
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

// File data
const files = ref<FileItem[]>([]);
const currentPath = ref('/');
const selectedFiles = ref<string[]>([]);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement>();
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

// Drag and drop state
const isDraggingOver = ref(false);

// Context menu state
const contextMenuFile = ref<FileItem | null>(null);
const contextMenuPosition = ref({ x: 0, y: 0 });
const showContextMenu = ref(false);

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
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return files.value;
    return (files.value || []).filter((f) => f.name.toLowerCase().includes(query));
});

const allFilesSelected = computed(() => {
    return filteredFiles.value.length > 0 && selectedFiles.value.length === filteredFiles.value.length;
});

const someFilesSelected = computed(() => {
    return selectedFiles.value.length > 0 && selectedFiles.value.length < filteredFiles.value.length;
});

// Row click handler (Ctrl+Click to toggle selection)
const handleRowClick = (event: MouseEvent, fileName: string) => {
    if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd+Click: toggle selection
        toggleFileSelection(fileName);
    }
    // Otherwise, do nothing (let the file name click handler do its job)
};

// Right-click handler (context menu)
const handleRightClick = (event: MouseEvent, file: FileItem) => {
    contextMenuFile.value = file;
    contextMenuPosition.value = { x: event.clientX, y: event.clientY };
    showContextMenu.value = true;
};

// Close context menu
const closeContextMenu = () => {
    showContextMenu.value = false;
    contextMenuFile.value = null;
};

// Event handlers for drag and drop
const handleKeyboard = (e: KeyboardEvent) => {
    // ESC key to close drag overlay or context menu
    if (e.key === 'Escape') {
        if (isDraggingOver.value) {
            closeDragOverlay();
        }
        if (showContextMenu.value) {
            closeContextMenu();
        }
    }

    // Forward slash (/) to focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchInput.value?.focus();
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

// Lifecycle
onMounted(async () => {
    await sessionStore.checkSessionOrRedirect(router);
    await settingsStore.fetchSettings();
    await fetchServer();
    await refreshFiles();

    // Add keyboard shortcuts (ESC to close drag overlay/context menu, / to focus search)
    window.addEventListener('keydown', handleKeyboard);

    // Add global drag over handler to keep overlay visible while dragging
    window.addEventListener('dragover', handleGlobalDragOver);

    // Close context menu on any click
    window.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyboard);
    window.removeEventListener('dragover', handleGlobalDragOver);
    window.removeEventListener('click', closeContextMenu);
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

const navigateToPath = (path: string) => {
    currentPath.value = path;
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

const clearSearch = () => {
    searchQuery.value = '';
    if (searchInput.value) {
        searchInput.value.focus();
    }
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
    if (!pullUrl.value) return;

    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/pull-file`, {
            url: pullUrl.value,
            root: currentPath.value,
            fileName: pullFileName.value || undefined,
        });

        if (response.data.success) {
            toast.success(t('serverFiles.pullStarted'));
            showPullDialog.value = false;
            pullUrl.value = '';
            pullFileName.value = '';
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.pullError'));
        }
    } catch (error) {
        console.error('Error pulling file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.pullError'));
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
</script>
