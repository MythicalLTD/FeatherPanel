<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverDatabases.title') }}</h1>
                        <p class="text-sm text-muted-foreground">
                            {{ t('serverDatabases.description') }}
                            <span v-if="serverInfo" class="font-medium">
                                ({{ databases.length }}/{{ serverInfo.database_limit }})
                            </span>
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="refresh"
                        >
                            <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                            <span>{{ t('serverDatabases.refresh') }}</span>
                        </Button>
                        <Button
                            v-if="canCreateDatabases"
                            size="sm"
                            :disabled="loading || (serverInfo && databases.length >= serverInfo.database_limit)"
                            class="flex items-center gap-2"
                            data-umami-event="Create database"
                            @click="openCreateDatabaseDrawer"
                        >
                            <Plus class="h-4 w-4" />
                            <span>{{ t('serverDatabases.createDatabase') }}</span>
                        </Button>
                    </div>
                </div>

                <!-- Database Limit Warning -->
                <div
                    v-if="serverInfo && databases.length >= serverInfo.database_limit"
                    class="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border-2 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
                >
                    <div class="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                            {{ t('serverDatabases.databaseLimitReached') }}
                        </h3>
                        <p class="text-sm text-yellow-700 dark:text-yellow-300">
                            {{
                                t('serverDatabases.databaseLimitReachedDescription', {
                                    limit: serverInfo.database_limit,
                                })
                            }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading && databases.length === 0" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="!loading && databases.length === 0 && !searchQuery"
                class="flex flex-col items-center justify-center py-16 px-4"
            >
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5">
                                <Database class="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('serverDatabases.noDatabases') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{
                                serverInfo && serverInfo.database_limit === 0
                                    ? t('serverDatabases.noDatabasesNoLimit')
                                    : t('serverDatabases.noDatabasesDescription')
                            }}
                        </p>
                    </div>
                    <Button
                        v-if="canCreateDatabases && serverInfo && serverInfo.database_limit > 0"
                        size="lg"
                        class="gap-2 shadow-lg"
                        @click="openCreateDatabaseDrawer"
                    >
                        <Plus class="h-5 w-5" />
                        {{ t('serverDatabases.createDatabase') }}
                    </Button>
                </div>
            </div>

            <!-- Databases List -->
            <Card v-else class="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Database class="h-5 w-5 text-primary" />
                        </div>
                        <div class="flex-1">
                            <CardTitle class="text-lg">{{ t('serverDatabases.databases') }}</CardTitle>
                            <CardDescription class="text-sm">{{
                                t('serverDatabases.databasesDescription')
                            }}</CardDescription>
                        </div>
                        <Badge variant="secondary" class="text-xs">
                            {{ databases.length }} {{ databases.length === 1 ? 'database' : 'databases' }}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div
                            v-for="db in databases"
                            :key="db.id"
                            class="group relative rounded-lg border-2 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                        >
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div class="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                        class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"
                                    >
                                        <Database class="h-5 w-5 text-primary" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <h3 class="font-semibold text-sm truncate">{{ db.database }}</h3>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                                        >
                                            <span class="flex items-center gap-1">
                                                <User class="h-3 w-3" />
                                                {{ db.username }}
                                            </span>
                                            <span class="flex items-center gap-1 truncate">
                                                <Server class="h-3 w-3" />
                                                {{ db.database_host || 'N/A' }}:{{ db.database_port || 'N/A' }}
                                            </span>
                                            <Badge variant="outline" class="text-xs">
                                                {{ db.remote === '%' ? 'All Hosts' : db.remote }}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div
                                    v-if="canViewPassword || canDeleteDatabases"
                                    class="flex flex-wrap items-center gap-2"
                                >
                                    <Button
                                        v-if="canViewPassword"
                                        variant="outline"
                                        size="sm"
                                        class="flex items-center gap-2"
                                        data-umami-event="View database"
                                        :data-umami-event-database="db.database"
                                        @click="openViewDatabaseDrawer(db)"
                                    >
                                        <Eye class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('serverDatabases.view') }}</span>
                                    </Button>
                                    <Button
                                        v-if="canDeleteDatabases"
                                        variant="destructive"
                                        size="sm"
                                        class="flex items-center gap-2"
                                        data-umami-event="Delete database"
                                        :data-umami-event-database="db.database"
                                        @click="deleteDatabase(db)"
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
        </div>

        <!-- Create Database Drawer -->
        <Drawer
            class="w-full"
            :open="createDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeCreateDrawer();
                }
            "
        >
            <DrawerContent class="max-h-[90vh] overflow-y-auto">
                <DrawerHeader>
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Plus class="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DrawerTitle>{{ t('serverDatabases.createDatabase') }}</DrawerTitle>
                            <DrawerDescription>{{ t('serverDatabases.createDatabaseDescription') }}</DrawerDescription>
                        </div>
                    </div>
                </DrawerHeader>
                <form class="space-y-5 px-6 pb-6 pt-2" @submit.prevent="createDatabase">
                    <!-- Database Host -->
                    <div class="space-y-2">
                        <Label for="database-host" class="text-sm font-medium">
                            {{ t('serverDatabases.databaseHost') }}
                        </Label>
                        <Select v-model="createForm.database_host_id" required :disabled="availableHosts.length === 0">
                            <SelectTrigger class="w-full">
                                <SelectValue
                                    :placeholder="
                                        availableHosts.length === 0
                                            ? t('serverDatabases.noDatabaseHosts')
                                            : t('serverDatabases.selectDatabaseHost')
                                    "
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="host in availableHosts" :key="host.id" :value="host.id">
                                    {{ host.name }} ({{ host.database_type }})
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p
                            v-if="availableHosts.length === 0"
                            class="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1"
                        >
                            <AlertTriangle class="h-3 w-3" />
                            {{ t('serverDatabases.noDatabaseHostsDescription') }}
                        </p>
                        <p v-else class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.databaseHostHelp') }}
                        </p>
                    </div>

                    <!-- Database Name -->
                    <div class="space-y-2">
                        <Label for="database-name" class="text-sm font-medium">
                            {{ t('serverDatabases.databaseName') }}
                        </Label>
                        <Input
                            id="database-name"
                            v-model="createForm.database_name"
                            type="text"
                            :placeholder="t('serverDatabases.databaseNamePlaceholder')"
                            required
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.databaseNameHelp') }}
                        </p>
                    </div>

                    <!-- Remote Access -->
                    <div class="space-y-2">
                        <Label for="database-remote" class="text-sm font-medium">
                            {{ t('serverDatabases.remoteAccess') }}
                        </Label>
                        <Input
                            id="database-remote"
                            v-model="createForm.remote"
                            type="text"
                            :placeholder="'%'"
                            required
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.remoteAccessHelp') }}
                        </p>
                    </div>

                    <!-- Max Connections -->
                    <div class="space-y-2">
                        <Label for="database-max-connections" class="text-sm font-medium">
                            {{ t('serverDatabases.maxConnections') }}
                        </Label>
                        <Input
                            id="database-max-connections"
                            v-model="createForm.max_connections"
                            type="number"
                            min="0"
                            :placeholder="'0'"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.maxConnectionsHelp') }}
                        </p>
                    </div>

                    <div class="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" @click="closeCreateDrawer">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            :disabled="creating || availableHosts.length === 0"
                            class="flex items-center gap-2"
                        >
                            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
                            <span>{{ t('serverDatabases.create') }}</span>
                        </Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Database Info Drawer -->
        <Drawer
            class="w-full"
            :open="viewDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeViewDrawer();
                }
            "
        >
            <DrawerContent v-if="viewingDatabase" class="max-h-[90vh] overflow-y-auto">
                <DrawerHeader>
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Eye class="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DrawerTitle>{{ viewingDatabase.database }}</DrawerTitle>
                            <DrawerDescription>
                                {{ t('serverDatabases.databaseCredentials') }}
                            </DrawerDescription>
                        </div>
                    </div>
                </DrawerHeader>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 py-6 px-6">
                    <!-- Connection Details -->
                    <div class="space-y-6">
                        <div
                            class="border rounded-xl p-6 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800"
                        >
                            <h3 class="font-bold text-lg mb-4 flex items-center gap-3 text-blue-800 dark:text-blue-200">
                                <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
                                {{ t('serverDatabases.connectionDetails') }}
                            </h3>
                            <div class="space-y-4">
                                <!-- Host -->
                                <div>
                                    <Label class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">{{
                                        t('serverDatabases.host')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-blue-200 dark:border-blue-700"
                                        >
                                            {{ viewingDatabase.database_host || 'N/A' }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                            @click="copyToClipboard(viewingDatabase.database_host || '')"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Port -->
                                <div>
                                    <Label class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">{{
                                        t('serverDatabases.port')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-blue-200 dark:border-blue-700"
                                        >
                                            {{ viewingDatabase.database_port || 'N/A' }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                            @click="copyToClipboard((viewingDatabase.database_port || '').toString())"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Database Type -->
                                <div>
                                    <Label class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">{{
                                        t('serverDatabases.type')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-blue-200 dark:border-blue-700"
                                        >
                                            {{ viewingDatabase.database_type || 'N/A' }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                            @click="copyToClipboard(viewingDatabase.database_type || '')"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Database Info -->
                        <div
                            class="border rounded-xl p-6 bg-linear-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800"
                        >
                            <h3
                                class="font-bold text-lg mb-4 flex items-center gap-3 text-green-800 dark:text-green-200"
                            >
                                <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                                {{ t('serverDatabases.databaseInformation') }}
                            </h3>
                            <div class="space-y-4">
                                <!-- Database Name -->
                                <div>
                                    <Label class="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">{{
                                        t('serverDatabases.name')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-green-200 dark:border-green-700"
                                        >
                                            {{ viewingDatabase.database }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                            @click="copyToClipboard(viewingDatabase.database)"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Remote Access -->
                                <div>
                                    <Label class="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">{{
                                        t('serverDatabases.remoteAccess')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-green-200 dark:border-green-700"
                                        >
                                            {{ viewingDatabase.remote }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                            @click="copyToClipboard(viewingDatabase.remote)"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Max Connections -->
                                <div>
                                    <Label class="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">{{
                                        t('serverDatabases.maxConnections')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-green-200 dark:border-green-700"
                                        >
                                            {{ viewingDatabase.max_connections || 0 }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                            @click="copyToClipboard((viewingDatabase.max_connections || 0).toString())"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Credentials & Actions -->
                    <div class="space-y-4">
                        <!-- Credentials -->
                        <div
                            class="border rounded-xl p-6 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800"
                        >
                            <h3
                                class="font-bold text-lg mb-4 flex items-center gap-3 text-orange-800 dark:text-orange-200"
                            >
                                <span class="w-3 h-3 bg-orange-500 rounded-full"></span>
                                {{ t('serverDatabases.loginCredentials') }}
                            </h3>
                            <div class="space-y-4">
                                <!-- Username -->
                                <div>
                                    <Label
                                        class="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2 block"
                                        >{{ t('serverDatabases.username') }}</Label
                                    >
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-orange-200 dark:border-orange-700"
                                        >
                                            {{ viewingDatabase.username }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                            @click="copyToClipboard(viewingDatabase.username)"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Password -->
                                <div>
                                    <Label
                                        class="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2 block"
                                        >{{ t('serverDatabases.password') }}</Label
                                    >
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-orange-200 dark:border-orange-700"
                                        >
                                            {{
                                                showPassword
                                                    ? viewingDatabase.password
                                                    : '••••••••••••••••••••••••••••••••'
                                            }}
                                        </code>
                                        <div class="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                class="h-10 w-10 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                                @click="showPassword = !showPassword"
                                            >
                                                <Eye v-if="!showPassword" class="h-4 w-4" />
                                                <EyeOff v-else class="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                class="h-10 w-10 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                                @click="copyToClipboard(viewingDatabase.password)"
                                            >
                                                <Copy class="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Connection String -->
                        <div
                            class="border rounded-xl p-6 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800"
                        >
                            <h3 class="font-bold text-lg mb-4 flex items-center gap-3 text-blue-800 dark:text-blue-200">
                                <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
                                {{ t('serverDatabases.quickConnect') }}
                            </h3>
                            <div>
                                <Label class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">{{
                                    t('serverDatabases.connectionString')
                                }}</Label>
                                <div class="flex items-center gap-3">
                                    <code
                                        class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-sm font-mono break-all border border-blue-200 dark:border-blue-700"
                                    >
                                        {{ getConnectionString(showPassword) }}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                        @click="copyToClipboard(getConnectionString(true))"
                                    >
                                        <Copy class="h-4 w-4" />
                                    </Button>
                                </div>
                                <p class="text-sm text-blue-600 dark:text-blue-400 mt-2">
                                    {{ t('serverDatabases.connectionStringHelp') }}
                                </p>
                            </div>
                        </div>

                        <!-- Metadata -->
                        <div
                            class="border rounded-xl p-6 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-200 dark:border-gray-800"
                        >
                            <h3 class="font-bold text-lg mb-4 flex items-center gap-3 text-gray-800 dark:text-gray-200">
                                <span class="w-3 h-3 bg-gray-500 rounded-full"></span>
                                {{ t('serverDatabases.metadata') }}
                            </h3>
                            <div class="text-sm text-gray-700 dark:text-gray-300">
                                <div
                                    class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                    <span class="font-medium">{{ t('serverDatabases.created') }}:</span>
                                    <span class="font-mono">{{ formatDate(viewingDatabase.created_at) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DrawerFooter class="px-6">
                    <Button variant="ghost" size="sm" class="mr-auto" @click="clearRememberedChoice">
                        {{ t('serverDatabases.resetWarning') }}
                    </Button>
                    <Button type="button" variant="outline" @click="closeViewDrawer">
                        {{ t('common.close') }}
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>

        <!-- Sensitive Info Warning Dialog -->
        <AlertDialog v-model:open="showSensitiveInfoWarning">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle class="flex items-center gap-2">
                        <AlertTriangle class="h-5 w-5 text-orange-600" />
                        {{ t('serverDatabases.sensitiveInfoWarning') }}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ t('serverDatabases.sensitiveInfoDescription') }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div class="space-y-4">
                    <div class="flex items-center space-x-2">
                        <input
                            id="remember-choice"
                            v-model="rememberChoice"
                            type="checkbox"
                            class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label for="remember-choice" class="text-sm">
                            {{ t('serverDatabases.rememberChoice') }}
                        </Label>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
                    <AlertDialogAction @click="confirmViewSensitiveInfo">
                        {{ t('serverDatabases.viewDatabase') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- Confirmation Dialog -->
        <AlertDialog v-model:open="showConfirmDialog">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle class="flex items-center gap-2">
                        <div
                            class="h-10 w-10 rounded-lg flex items-center justify-center"
                            :class="[confirmDialog.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10']"
                        >
                            <AlertTriangle
                                v-if="confirmDialog.variant === 'destructive'"
                                class="h-5 w-5 text-destructive"
                            />
                            <Info v-else class="h-5 w-5 text-primary" />
                        </div>
                        <span>{{ confirmDialog.title }}</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription class="text-sm">
                        {{ confirmDialog.description }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter class="gap-2">
                    <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
                    <AlertDialogAction
                        :class="
                            confirmDialog.variant === 'destructive'
                                ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                                : ''
                        "
                        @click="onConfirmDialog"
                    >
                        <Loader2 v-if="confirmLoading" class="h-4 w-4 mr-2 animate-spin" />
                        {{ confirmDialog.confirmText }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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

import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServerPermissions } from '@/composables/useServerPermissions';

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from '@/components/ui/drawer';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Plus,
    Trash2,
    Loader2,
    Eye,
    EyeOff,
    Copy,
    AlertTriangle,
    Database,
    RefreshCw,
    User,
    Server,
    Info,
} from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';

type DatabaseItem = {
    id: number;
    server_id: number;
    database_host_id: number;
    database: string;
    username: string;
    remote: string;
    password: string;
    max_connections: number;
    created_at: string;
    updated_at: string;
    host_name?: string;
    host_type?: string;
    database_host_name?: string; // Added for new drawer
    database_type?: string; // Added for new drawer
    database_host?: string; // Added for new drawer
    database_port?: number; // Added for new drawer
};

type DatabaseHost = {
    id: number;
    name: string;
    database_type: string;
    database_host: string;
    database_port: number;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission checks
const canViewDatabases = computed(() => hasServerPermission('database.read'));
const canCreateDatabases = computed(() => hasServerPermission('database.create'));
const canDeleteDatabases = computed(() => hasServerPermission('database.delete'));
const canViewPassword = computed(() => hasServerPermission('database.view_password'));

const databases = ref<DatabaseItem[]>([]);
const availableHosts = ref<DatabaseHost[]>([]);
const loading = ref(false);
const creating = ref(false);
const searchQuery = ref('');
const server = ref<{ name: string } | null>(null);
const serverInfo = ref<{ database_limit: number } | null>(null);
const pagination = ref({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
});

// Drawer states
const createDrawerOpen = ref(false);
const viewDrawerOpen = ref(false);
const viewingDatabase = ref<DatabaseItem | null>(null);
const showPassword = ref(false);

// Confirm dialog state
const showConfirmDialog = ref(false);
const confirmDialog = ref({
    title: '' as string,
    description: '' as string,
    confirmText: '' as string,
    variant: 'default' as 'default' | 'destructive',
});
const confirmAction = ref<null | (() => Promise<void> | void)>(null);
const confirmLoading = ref(false);

// Sensitive info warning state
const showSensitiveInfoWarning = ref(false);
const rememberChoice = ref(false);

// Form data
const createForm = ref({
    database_host_id: '',
    database_name: '',
    remote: '%',
    max_connections: 0,
});

// Computed
const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverDatabases.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/databases` },
]);

// Lifecycle
onMounted(async () => {
    // Wait for permission check to complete
    while (permissionsLoading.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Check if user has permission to view databases
    if (!canViewDatabases.value) {
        toast.error(t('serverDatabases.noDatabasePermission'));
        await router.push(`/server/${route.params.uuidShort}`);
        return;
    }

    await Promise.all([fetchDatabases(), fetchAvailableHosts()]);
});

// Methods
function refresh() {
    fetchDatabases(pagination.value.current_page || 1);
}
async function fetchDatabases(page = pagination.value.current_page) {
    try {
        loading.value = true;

        // Fetch both databases and server info
        const [databasesResponse, serverResponse] = await Promise.all([
            axios.get(`/api/user/servers/${route.params.uuidShort}/databases`, {
                params: { page, per_page: pagination.value.per_page, search: searchQuery.value || undefined },
            }),
            axios.get(`/api/user/servers/${route.params.uuidShort}`),
        ]);

        if (!databasesResponse.data.success) {
            toast.error(databasesResponse.data.message || t('serverDatabases.failedToFetch'));
            return;
        }

        if (serverResponse.data.success) {
            serverInfo.value = {
                database_limit: serverResponse.data.data.database_limit,
            };
            server.value = { name: serverResponse.data.data.name };
        }

        databases.value = databasesResponse.data.data.data || [];
        pagination.value = databasesResponse.data.data.pagination;
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverDatabases.failedToFetch'));
            }
        } else {
            toast.error(t('serverDatabases.failedToFetch'));
        }
        console.error('Error fetching databases:', error);
    } finally {
        loading.value = false;
    }
}

async function fetchAvailableHosts() {
    try {
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/databases/hosts`);
        if (data.success) {
            availableHosts.value = data.data || [];
        } else {
            toast.error(data.message || t('serverDatabases.failedToFetchHosts'));
        }
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverDatabases.failedToFetchHosts'));
            }
        } else {
            toast.error(t('serverDatabases.failedToFetchHosts'));
        }
        console.error('Failed to fetch available hosts:', error);
    }
}

function formatDate(value?: string | null) {
    if (!value) return t('common.never');
    return new Date(value).toLocaleString();
}

// Create database
function openCreateDatabaseDrawer() {
    createDrawerOpen.value = true;
    createForm.value = {
        database_host_id: '',
        database_name: '',
        remote: '%',
        max_connections: 0,
    };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
}

async function createDatabase() {
    try {
        creating.value = true;

        // Validate form data
        if (!createForm.value.database_host_id || createForm.value.database_host_id === '') {
            toast.error(t('serverDatabases.selectDatabaseHost'));
            return;
        }

        if (!createForm.value.database_name.trim()) {
            toast.error(t('serverDatabases.databaseNameRequired'));
            return;
        }

        const { data } = await axios.post(`/api/user/servers/${route.params.uuidShort}/databases`, createForm.value);

        if (!data.success) {
            toast.error(data.message || data.error_message || t('serverDatabases.createFailed'));
            return;
        }

        toast.success(t('serverDatabases.createSuccess'));
        closeCreateDrawer();
        await fetchDatabases();
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverDatabases.createFailed'));
            }
        } else {
            toast.error(t('serverDatabases.createFailed'));
        }
        console.error('Error creating database:', error);
    } finally {
        creating.value = false;
    }
}

// Edit database
function openViewDatabaseDrawer(database: DatabaseItem) {
    viewingDatabase.value = database;
    showPassword.value = false; // Reset password visibility

    // Check if user has permission to view password
    if (!canViewPassword.value) {
        toast.error(t('serverDatabases.noPasswordPermission'));
        return;
    }

    // Check if user has already chosen to remember their choice
    const hasRememberedChoice = localStorage.getItem('featherpanel-remember-sensitive-info');

    if (hasRememberedChoice === 'true') {
        // User chose to remember, show password directly
        showPassword.value = true;
        viewDrawerOpen.value = true;
    } else {
        // Show warning first
        showSensitiveInfoWarning.value = true;
    }
}

function closeViewDrawer() {
    viewDrawerOpen.value = false;
    viewingDatabase.value = null;
    showPassword.value = false;
}

function clearRememberedChoice() {
    localStorage.removeItem('featherpanel-remember-sensitive-info');
    toast.success(t('serverDatabases.rememberedChoiceCleared'));
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

function getConnectionString(includePassword: boolean): string {
    if (!viewingDatabase.value) return '';

    const db = viewingDatabase.value;
    const password = includePassword ? db.password : '[password]';
    const dbType = (db.database_type || 'mysql').toLowerCase();

    switch (dbType) {
        case 'mysql':
        case 'mariadb':
            return `mysql://${db.username}:${password}@${db.database_host}:${db.database_port}/${db.database}`;
        case 'postgresql':
            return `postgresql://${db.username}:${password}@${db.database_host}:${db.database_port}/${db.database}`;
        default:
            return `${dbType}://${db.username}:${password}@${db.database_host}:${db.database_port}/${db.database}`;
    }
}

// Delete database
function deleteDatabase(database: DatabaseItem) {
    confirmDialog.value = {
        title: t('serverDatabases.confirmDeleteTitle'),
        description: t('serverDatabases.confirmDeleteDescription', { database: database.database }),
        confirmText: t('serverDatabases.confirmDelete'),
        variant: 'destructive',
    };
    confirmAction.value = () => deleteDatabaseConfirm(database.id);
    showConfirmDialog.value = true;
}

async function deleteDatabaseConfirm(databaseId: number) {
    try {
        confirmLoading.value = true;
        const { data } = await axios.delete(`/api/user/servers/${route.params.uuidShort}/databases/${databaseId}`);

        if (!data.success) {
            toast.error(data.message || data.error_message || t('serverDatabases.deleteFailed'));
            return;
        }

        toast.success(t('serverDatabases.deleteSuccess'));
        showConfirmDialog.value = false;
        await fetchDatabases();
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverDatabases.deleteFailed'));
            }
        } else {
            toast.error(t('serverDatabases.deleteFailed'));
        }
        console.error('Error deleting database:', error);
    } finally {
        confirmLoading.value = false;
    }
}

function onConfirmDialog() {
    if (!confirmAction.value) return;
    confirmLoading.value = true;
    confirmAction.value();
}

// Sensitive info warning logic
function confirmViewSensitiveInfo() {
    if (rememberChoice.value) {
        // Remember user's choice
        localStorage.setItem('featherpanel-remember-sensitive-info', 'true');
        showPassword.value = true; // Show password in drawer
    } else {
        // Don't remember, hide password
        showPassword.value = false; // Hide password in drawer
    }

    showSensitiveInfoWarning.value = false;
    viewDrawerOpen.value = true; // Open the drawer
}
</script>
