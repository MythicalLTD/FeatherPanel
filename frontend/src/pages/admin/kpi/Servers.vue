<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Analytics', href: '/admin/kpi/analytics' },
            { text: 'Servers', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading server analytics...</span>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="text-center py-12">
                <p class="text-red-500">{{ error }}</p>
                <Button class="mt-4" @click="fetchAnalytics">Try Again</Button>
            </div>

            <!-- Content -->
            <div v-else class="p-6 space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">Server Analytics</h1>
                        <p class="text-muted-foreground">
                            Deep insights into server statistics, resource usage, and patterns
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button variant="outline" @click="fetchAnalytics">
                            <RefreshCw :size="16" class="mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                <!-- Overview Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Total Servers</CardTitle>
                            <Server class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ overview.total_servers.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">{{ overview.percentage_running }}% running</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Running</CardTitle>
                            <PlayCircle class="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                                {{ overview.running.toLocaleString() }}
                            </div>
                            <p class="text-xs text-muted-foreground mt-1">Active servers</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Suspended</CardTitle>
                            <Ban class="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold text-red-600 dark:text-red-400">
                                {{ overview.suspended.toLocaleString() }}
                            </div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ overview.percentage_suspended }}% of total
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Installing</CardTitle>
                            <Download class="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {{ overview.installing.toLocaleString() }}
                            </div>
                            <p class="text-xs text-muted-foreground mt-1">Being installed</p>
                        </CardContent>
                    </Card>
                </div>

                <!-- Charts Row 1 - Creation & Trends -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Server Creation Trend -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Server Creation Trend (30 Days)</CardTitle>
                            <CardDescription>Daily server creation volume</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px]">
                                <Line
                                    v-if="creationTrendChartData"
                                    :data="creationTrendChartData"
                                    :options="lineChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Resource Trends -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Resource Allocation Trends</CardTitle>
                            <CardDescription>Average resources over time (30 days)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px]">
                                <Line
                                    v-if="resourceTrendsChartData"
                                    :data="resourceTrendsChartData"
                                    :options="multiLineChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Charts Row 2 - Distribution -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Servers by Realm Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Servers by Realm</CardTitle>
                            <CardDescription>Server distribution across realms</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Doughnut
                                    v-if="serversByRealmChartData"
                                    :data="serversByRealmChartData"
                                    :options="doughnutChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Server Status Distribution Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Status Distribution</CardTitle>
                            <CardDescription>Servers by status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Pie v-if="statusChartData" :data="statusChartData" :options="pieChartOptions" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Charts Row 3 - Resource Distribution -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Memory Distribution -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Memory Distribution</CardTitle>
                            <CardDescription>Memory allocation ranges</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px]">
                                <Bar
                                    v-if="memoryDistributionChartData"
                                    :data="memoryDistributionChartData"
                                    :options="barChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Disk Distribution -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Disk Distribution</CardTitle>
                            <CardDescription>Disk allocation ranges</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px]">
                                <Bar
                                    v-if="diskDistributionChartData"
                                    :data="diskDistributionChartData"
                                    :options="barChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- CPU Distribution -->
                    <Card>
                        <CardHeader>
                            <CardTitle>CPU Distribution</CardTitle>
                            <CardDescription>CPU allocation ranges</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px]">
                                <Bar
                                    v-if="cpuDistributionChartData"
                                    :data="cpuDistributionChartData"
                                    :options="barChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Charts Row 4 - Age & Installation -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Server Age Distribution -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Server Age Distribution</CardTitle>
                            <CardDescription>How old are your servers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Doughnut
                                    v-if="ageDistributionChartData"
                                    :data="ageDistributionChartData"
                                    :options="doughnutChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Installation Stats -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Installation Statistics</CardTitle>
                            <CardDescription>Server installation metrics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4">
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="p-3 rounded-lg bg-green-500/10">
                                        <p class="text-xs text-muted-foreground">Installed</p>
                                        <p class="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                                            {{ installationStats.installed }}
                                        </p>
                                    </div>
                                    <div class="p-3 rounded-lg bg-orange-500/10">
                                        <p class="text-xs text-muted-foreground">Pending</p>
                                        <p class="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                                            {{ installationStats.not_installed }}
                                        </p>
                                    </div>
                                </div>
                                <div class="p-3 rounded-lg bg-red-500/10">
                                    <p class="text-xs text-muted-foreground">With Errors</p>
                                    <p class="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                                        {{ installationStats.with_errors }}
                                    </p>
                                </div>
                                <div class="p-3 rounded-lg border border-border">
                                    <p class="text-xs text-muted-foreground">Avg Installation Time</p>
                                    <p class="text-lg font-bold mt-1">
                                        {{ installationStats.avg_installation_time_minutes }} min
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Resource Usage Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-sm">Total Memory Allocated</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ formatMemory(resources.total_memory_mb) }}</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                Avg: {{ formatMemory(resources.avg_memory_mb) }} per server
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-sm">Total Disk Allocated</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ formatMemory(resources.total_disk_mb) }}</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                Avg: {{ formatMemory(resources.avg_disk_mb) }} per server
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-sm">Total CPU Allocated</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ resources.total_cpu_percent.toLocaleString() }}%</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                Avg: {{ resources.avg_cpu_percent }}% per server
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <!-- Database & Allocation Usage -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Database Usage Per Server -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Database Usage Per Server</CardTitle>
                            <CardDescription>How many databases servers typically have</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4 mb-6">
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="p-3 rounded-lg bg-muted/50">
                                        <p class="text-xs text-muted-foreground">With Databases</p>
                                        <p class="text-xl font-bold mt-1">{{ databaseUsage.servers_with_databases }}</p>
                                    </div>
                                    <div class="p-3 rounded-lg bg-muted/50">
                                        <p class="text-xs text-muted-foreground">Without Databases</p>
                                        <p class="text-xl font-bold mt-1">
                                            {{ databaseUsage.servers_without_databases }}
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between p-3 rounded-lg border border-border">
                                    <span class="text-sm text-muted-foreground">Average per Server</span>
                                    <Badge variant="default" class="text-sm">{{
                                        databaseUsage.avg_databases_per_server
                                    }}</Badge>
                                </div>
                                <div class="flex items-center justify-between p-3 rounded-lg border border-border">
                                    <span class="text-sm text-muted-foreground">Maximum per Server</span>
                                    <Badge variant="secondary" class="text-sm">{{
                                        databaseUsage.max_databases_per_server
                                    }}</Badge>
                                </div>
                            </div>

                            <!-- Distribution Chart -->
                            <div v-if="databaseUsage.distribution.length" class="space-y-2">
                                <p class="text-sm font-medium mb-3">Distribution</p>
                                <div
                                    v-for="item in databaseUsage.distribution.slice(0, 5)"
                                    :key="item.db_count"
                                    class="flex items-center justify-between"
                                >
                                    <span class="text-sm text-muted-foreground">{{ item.db_count }} databases</span>
                                    <Badge variant="outline" class="text-xs">{{ item.server_count }} servers</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Allocation Usage Per Server -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Allocation Usage Per Server</CardTitle>
                            <CardDescription>Top servers by allocation count</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4 mb-6">
                                <div class="flex items-center justify-between p-3 rounded-lg border border-border">
                                    <span class="text-sm text-muted-foreground">Average per Server</span>
                                    <Badge variant="default" class="text-sm">{{
                                        allocationStats.avg_allocations_per_server
                                    }}</Badge>
                                </div>
                                <div class="flex items-center justify-between p-3 rounded-lg border border-border">
                                    <span class="text-sm text-muted-foreground">Maximum per Server</span>
                                    <Badge variant="secondary" class="text-sm">{{
                                        allocationStats.max_allocations_per_server
                                    }}</Badge>
                                </div>
                            </div>

                            <!-- Top Servers -->
                            <div class="space-y-2">
                                <p class="text-sm font-medium mb-3">Top Servers</p>
                                <div
                                    v-for="(server, index) in allocationUsage.slice(0, 8)"
                                    :key="server.server_id"
                                    class="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div class="flex items-center gap-2 flex-1 min-w-0">
                                        <div
                                            class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs"
                                        >
                                            {{ index + 1 }}
                                        </div>
                                        <span class="text-sm truncate">{{ server.server_name }}</span>
                                    </div>
                                    <Badge variant="outline" class="font-mono text-xs">
                                        {{ server.allocation_count }}
                                        <span v-if="server.allocation_limit" class="text-muted-foreground">
                                            /{{ server.allocation_limit }}
                                        </span>
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Top Spells -->
                <Card>
                    <CardHeader>
                        <CardTitle>Most Popular Spells</CardTitle>
                        <CardDescription>Top 10 spells by server count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div
                                v-for="(spell, index) in serversBySpell.slice(0, 10)"
                                :key="spell.spell_id"
                                class="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                                <div class="flex items-center gap-3 flex-1 min-w-0">
                                    <div
                                        class="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs"
                                    >
                                        {{ index + 1 }}
                                    </div>
                                    <div class="min-w-0">
                                        <p class="font-medium text-sm truncate">{{ spell.spell_name }}</p>
                                        <p class="text-xs text-muted-foreground truncate">{{ spell.realm_name }}</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" class="font-mono text-xs ml-2">
                                    {{ spell.server_count }}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Top Docker Images -->
                <Card>
                    <CardHeader>
                        <CardTitle>Most Used Docker Images</CardTitle>
                        <CardDescription>Popular Docker images across servers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="space-y-2">
                            <div
                                v-for="(image, index) in imageUsage"
                                :key="image.image"
                                class="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                                <div class="flex items-center gap-3 flex-1 min-w-0">
                                    <div
                                        class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 font-semibold text-xs"
                                    >
                                        {{ index + 1 }}
                                    </div>
                                    <span class="font-mono text-xs truncate">{{ image.image }}</span>
                                </div>
                                <Badge variant="outline" class="font-mono text-xs ml-2">
                                    {{ image.count }} servers
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Server Limits -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Database Limits</CardTitle>
                            <CardDescription>Database limit statistics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Average Limit</span>
                                    <span class="font-semibold">{{ limits.avg_database_limit }}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Maximum Limit</span>
                                    <span class="font-semibold">{{ limits.max_database_limit }}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Unlimited Servers</span>
                                    <Badge>{{ limits.servers_no_database_limit }}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Backup Limits</CardTitle>
                            <CardDescription>Backup limit statistics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Average Limit</span>
                                    <span class="font-semibold">{{ limits.avg_backup_limit }}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Maximum Limit</span>
                                    <span class="font-semibold">{{ limits.max_backup_limit }}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Unlimited Servers</span>
                                    <Badge>{{ limits.servers_no_backup_limit }}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Configuration Patterns -->
                <Card>
                    <CardHeader>
                        <CardTitle>Server Configuration Patterns</CardTitle>
                        <CardDescription>Common configuration flags and settings</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <div class="p-3 rounded-lg border border-border text-center">
                                <p class="text-xs text-muted-foreground mb-2">Skip Scripts</p>
                                <p class="text-2xl font-bold">{{ configPatterns.skip_scripts_enabled }}</p>
                            </div>
                            <div class="p-3 rounded-lg border border-border text-center">
                                <p class="text-xs text-muted-foreground mb-2">OOM Disabled</p>
                                <p class="text-2xl font-bold">{{ configPatterns.oom_disabled }}</p>
                            </div>
                            <div class="p-3 rounded-lg border border-border text-center">
                                <p class="text-xs text-muted-foreground mb-2">Suspended</p>
                                <p class="text-2xl font-bold">{{ configPatterns.suspended }}</p>
                            </div>
                            <div class="p-3 rounded-lg border border-border text-center">
                                <p class="text-xs text-muted-foreground mb-2">With Swap</p>
                                <p class="text-2xl font-bold">{{ configPatterns.with_swap }}</p>
                            </div>
                            <div class="p-3 rounded-lg border border-border text-center">
                                <p class="text-xs text-muted-foreground mb-2">Thread Limit</p>
                                <p class="text-2xl font-bold">{{ configPatterns.with_thread_limit }}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Extended Analytics Section -->
                <div class="mt-8">
                    <h2 class="text-2xl font-bold mb-6">Extended Server Metrics</h2>

                    <!-- Feature Usage Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardHeader class="pb-3">
                                <CardTitle class="text-sm font-medium text-muted-foreground">Backups</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div class="text-2xl font-bold">{{ backupUsage.total_backups }}</div>
                                <p class="text-xs text-muted-foreground mt-1">
                                    {{ backupUsage.servers_with_backups }} servers with backups
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader class="pb-3">
                                <CardTitle class="text-sm font-medium text-muted-foreground">Schedules</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div class="text-2xl font-bold">{{ scheduleUsage.total_schedules }}</div>
                                <p class="text-xs text-muted-foreground mt-1">
                                    {{ scheduleUsage.total_tasks }} tasks configured
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader class="pb-3">
                                <CardTitle class="text-sm font-medium text-muted-foreground">Subusers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div class="text-2xl font-bold">{{ subuserStats.total_subusers }}</div>
                                <p class="text-xs text-muted-foreground mt-1">
                                    Avg: {{ subuserStats.avg_subusers_per_server }} per server
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader class="pb-3">
                                <CardTitle class="text-sm font-medium text-muted-foreground">Variables</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div class="text-2xl font-bold">{{ variableStats.total_variables }}</div>
                                <p class="text-xs text-muted-foreground mt-1">
                                    Avg: {{ variableStats.avg_variables_per_server }} per server
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <!-- Extended Stats Grid -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Backup Usage Details -->
                        <Card>
                            <CardHeader>
                                <CardTitle>Backup Usage</CardTitle>
                                <CardDescription>Top 10 servers by backup count</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div class="space-y-2">
                                    <div
                                        v-for="(server, index) in backupUsage.top_servers.slice(0, 10)"
                                        :key="server.server_id"
                                        class="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div class="flex items-center gap-2 flex-1 min-w-0">
                                            <div
                                                class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 font-semibold text-xs"
                                            >
                                                {{ index + 1 }}
                                            </div>
                                            <span class="text-sm truncate">{{ server.server_name }}</span>
                                        </div>
                                        <Badge variant="outline" class="font-mono text-xs">
                                            {{ server.backup_count }}
                                            <span v-if="server.backup_limit" class="text-muted-foreground">
                                                /{{ server.backup_limit }}
                                            </span>
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <!-- Schedule Usage Details -->
                        <Card>
                            <CardHeader>
                                <CardTitle>Schedule Usage</CardTitle>
                                <CardDescription>Top 10 servers by schedule count</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div class="space-y-2">
                                    <div
                                        v-for="(server, index) in scheduleUsage.top_servers.slice(0, 10)"
                                        :key="server.server_id"
                                        class="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div class="flex items-center gap-2 flex-1 min-w-0">
                                            <div
                                                class="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-500 font-semibold text-xs"
                                            >
                                                {{ index + 1 }}
                                            </div>
                                            <span class="text-sm truncate">{{ server.server_name }}</span>
                                        </div>
                                        <div class="flex gap-1">
                                            <Badge variant="default" class="text-xs"
                                                >{{ server.schedule_count }}s</Badge
                                            >
                                            <Badge variant="secondary" class="text-xs">{{ server.task_count }}t</Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <!-- Subuser Usage -->
                        <Card>
                            <CardHeader>
                                <CardTitle>Subuser Distribution</CardTitle>
                                <CardDescription>Top 10 servers by subuser count</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div class="space-y-2">
                                    <div
                                        v-for="(server, index) in subuserStats.top_servers.slice(0, 10)"
                                        :key="server.server_id"
                                        class="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div class="flex items-center gap-2 flex-1 min-w-0">
                                            <div
                                                class="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10 text-green-500 font-semibold text-xs"
                                            >
                                                {{ index + 1 }}
                                            </div>
                                            <span class="text-sm truncate">{{ server.server_name }}</span>
                                        </div>
                                        <Badge variant="outline" class="font-mono text-xs">
                                            {{ server.subuser_count }}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <!-- Server Activities & Variables -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <!-- Server Activity Stats -->
                        <Card>
                            <CardHeader>
                                <CardTitle>Server Activities</CardTitle>
                                <CardDescription>Most active servers</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div class="mb-4 p-3 rounded-lg bg-muted/50">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-sm text-muted-foreground">Total Activities</span>
                                        <span class="font-bold">{{
                                            serverActivityStats.total_activities.toLocaleString()
                                        }}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-muted-foreground">Today</span>
                                        <Badge variant="default">{{ serverActivityStats.today }}</Badge>
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <div
                                        v-for="(server, index) in serverActivityStats.top_servers.slice(0, 8)"
                                        :key="server.server_id"
                                        class="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div class="flex items-center gap-2 flex-1 min-w-0">
                                            <div
                                                class="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 font-semibold text-xs"
                                            >
                                                {{ index + 1 }}
                                            </div>
                                            <span class="text-sm truncate">{{ server.server_name }}</span>
                                        </div>
                                        <Badge variant="secondary" class="text-xs">
                                            {{ server.activity_count.toLocaleString() }}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <!-- Most Used Variables -->
                        <Card>
                            <CardHeader>
                                <CardTitle>Variable Usage</CardTitle>
                                <CardDescription>Most commonly used spell variables</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div class="space-y-2">
                                    <div
                                        v-for="(variable, index) in variableStats.top_variables.slice(0, 10)"
                                        :key="variable.env_variable"
                                        class="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div class="flex items-center gap-2 flex-1 min-w-0">
                                            <div
                                                class="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 font-semibold text-xs"
                                            >
                                                {{ index + 1 }}
                                            </div>
                                            <div class="min-w-0">
                                                <p class="text-sm font-medium truncate">{{ variable.name }}</p>
                                                <p class="text-xs text-muted-foreground font-mono truncate">
                                                    {{ variable.env_variable }}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" class="text-xs">
                                            {{ variable.usage_count }}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
/*
MIT License

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
SOFTWARE.
*/

import { ref, onMounted, computed } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, RefreshCw, PlayCircle, Ban, Download } from 'lucide-vue-next';
import axios from 'axios';
import { Doughnut, Pie, Line, Bar } from 'vue-chartjs';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
);

// Types
interface ServerOverview {
    total_servers: number;
    running: number;
    suspended: number;
    installing: number;
    by_status: { status: string; count: number }[];
    percentage_running: number;
    percentage_suspended: number;
}

interface RealmDistribution {
    realm_id: number;
    realm_name: string;
    server_count: number;
    percentage: number;
}

interface SpellDistribution {
    spell_id: number;
    spell_name: string;
    realm_name: string;
    server_count: number;
}

interface DatabaseUsage {
    total_servers: number;
    servers_with_databases: number;
    servers_without_databases: number;
    avg_databases_per_server: number;
    max_databases_per_server: number;
    distribution: { db_count: number; server_count: number }[];
}

interface AllocationUsageServer {
    server_id: number;
    server_name: string;
    allocation_limit: number | null;
    allocation_count: number;
}

interface AllocationStats {
    avg_allocations_per_server: number;
    max_allocations_per_server: number;
}

interface ResourceUsage {
    total_memory_mb: number;
    total_disk_mb: number;
    total_cpu_percent: number;
    avg_memory_mb: number;
    avg_disk_mb: number;
    avg_cpu_percent: number;
    servers_with_unlimited: number;
}

interface ImageUsage {
    image: string;
    count: number;
}

interface Limits {
    avg_database_limit: number;
    avg_backup_limit: number;
    max_database_limit: number;
    max_backup_limit: number;
    servers_no_database_limit: number;
    servers_no_backup_limit: number;
}

interface BackupUsage {
    total_backups: number;
    servers_with_backups: number;
    servers_without_backups: number;
    avg_backups_per_server: number;
    top_servers: {
        server_id: number;
        server_name: string;
        backup_limit: number | null;
        backup_count: number;
    }[];
}

interface ScheduleUsage {
    total_schedules: number;
    total_tasks: number;
    servers_with_schedules: number;
    avg_schedules_per_server: number;
    top_servers: {
        server_id: number;
        server_name: string;
        schedule_count: number;
        task_count: number;
    }[];
}

interface SubuserStats {
    total_subusers: number;
    servers_with_subusers: number;
    avg_subusers_per_server: number;
    top_servers: {
        server_id: number;
        server_name: string;
        subuser_count: number;
    }[];
}

interface ServerActivityStats {
    total_activities: number;
    today: number;
    top_servers: {
        server_id: number;
        server_name: string;
        activity_count: number;
    }[];
    top_events: {
        event: string;
        count: number;
    }[];
}

interface VariableStats {
    total_variables: number;
    avg_variables_per_server: number;
    top_variables: {
        name: string;
        env_variable: string;
        usage_count: number;
    }[];
}

// State
const loading = ref(false);
const error = ref<string | null>(null);
const overview = ref<ServerOverview>({
    total_servers: 0,
    running: 0,
    suspended: 0,
    installing: 0,
    by_status: [],
    percentage_running: 0,
    percentage_suspended: 0,
});
const serversByRealm = ref<RealmDistribution[]>([]);
const serversBySpell = ref<SpellDistribution[]>([]);
const databaseUsage = ref<DatabaseUsage>({
    total_servers: 0,
    servers_with_databases: 0,
    servers_without_databases: 0,
    avg_databases_per_server: 0,
    max_databases_per_server: 0,
    distribution: [],
});
const allocationUsage = ref<AllocationUsageServer[]>([]);
const allocationStats = ref<AllocationStats>({
    avg_allocations_per_server: 0,
    max_allocations_per_server: 0,
});
const resources = ref<ResourceUsage>({
    total_memory_mb: 0,
    total_disk_mb: 0,
    total_cpu_percent: 0,
    avg_memory_mb: 0,
    avg_disk_mb: 0,
    avg_cpu_percent: 0,
    servers_with_unlimited: 0,
});
const imageUsage = ref<ImageUsage[]>([]);
const limits = ref<Limits>({
    avg_database_limit: 0,
    avg_backup_limit: 0,
    max_database_limit: 0,
    max_backup_limit: 0,
    servers_no_database_limit: 0,
    servers_no_backup_limit: 0,
});
const backupUsage = ref<BackupUsage>({
    total_backups: 0,
    servers_with_backups: 0,
    servers_without_backups: 0,
    avg_backups_per_server: 0,
    top_servers: [],
});
const scheduleUsage = ref<ScheduleUsage>({
    total_schedules: 0,
    total_tasks: 0,
    servers_with_schedules: 0,
    avg_schedules_per_server: 0,
    top_servers: [],
});
const subuserStats = ref<SubuserStats>({
    total_subusers: 0,
    servers_with_subusers: 0,
    avg_subusers_per_server: 0,
    top_servers: [],
});
const serverActivityStats = ref<ServerActivityStats>({
    total_activities: 0,
    today: 0,
    top_servers: [],
    top_events: [],
});
const variableStats = ref<VariableStats>({
    total_variables: 0,
    avg_variables_per_server: 0,
    top_variables: [],
});
const creationTrend = ref<{ date: string; count: number }[]>([]);
const resourceTrends = ref<
    { date: string; avg_memory: number; avg_disk: number; avg_cpu: number; server_count: number }[]
>([]);
const ageDistribution = ref<{ age_group: string; count: number }[]>([]);
const resourceDistribution = ref<{
    memory: { memory_range: string; count: number }[];
    disk: { disk_range: string; count: number }[];
    cpu: { cpu_range: string; count: number }[];
}>({
    memory: [],
    disk: [],
    cpu: [],
});
const installationStats = ref({
    installed: 0,
    not_installed: 0,
    with_errors: 0,
    avg_installation_time_seconds: 0,
    avg_installation_time_minutes: 0,
});
const configPatterns = ref({
    skip_scripts_enabled: 0,
    oom_disabled: 0,
    suspended: 0,
    with_swap: 0,
    with_thread_limit: 0,
});

// Chart Data
const serversByRealmChartData = computed(() => {
    if (!serversByRealm.value.length) return null;

    const colors = [
        'rgb(99, 102, 241)',
        'rgb(59, 130, 246)',
        'rgb(139, 92, 246)',
        'rgb(168, 85, 247)',
        'rgb(236, 72, 153)',
        'rgb(251, 146, 60)',
        'rgb(34, 197, 94)',
        'rgb(16, 185, 129)',
    ];

    return {
        labels: serversByRealm.value.map((r) => r.realm_name),
        datasets: [
            {
                data: serversByRealm.value.map((r) => r.server_count),
                backgroundColor: colors,
            },
        ],
    };
});

const statusChartData = computed(() => {
    if (!overview.value.by_status.length) return null;

    const statusColors: Record<string, string> = {
        running: 'rgb(34, 197, 94)',
        stopped: 'rgb(156, 163, 175)',
        suspended: 'rgb(239, 68, 68)',
        installing: 'rgb(251, 146, 60)',
        offline: 'rgb(107, 114, 128)',
    };

    return {
        labels: overview.value.by_status.map((s) => s.status.charAt(0).toUpperCase() + s.status.slice(1)),
        datasets: [
            {
                data: overview.value.by_status.map((s) => s.count),
                backgroundColor: overview.value.by_status.map((s) => statusColors[s.status] || 'rgb(156, 163, 175)'),
            },
        ],
    };
});

const creationTrendChartData = computed(() => {
    if (!creationTrend.value.length) return null;

    return {
        labels: creationTrend.value.map((d) =>
            new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ),
        datasets: [
            {
                label: 'New Servers',
                data: creationTrend.value.map((d) => d.count),
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };
});

const resourceTrendsChartData = computed(() => {
    if (!resourceTrends.value.length) return null;

    return {
        labels: resourceTrends.value.map((d) =>
            new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ),
        datasets: [
            {
                label: 'Avg Memory (MB)',
                data: resourceTrends.value.map((d) => d.avg_memory),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                yAxisID: 'y',
                tension: 0.4,
            },
            {
                label: 'Avg CPU (%)',
                data: resourceTrends.value.map((d) => d.avg_cpu),
                borderColor: 'rgb(251, 146, 60)',
                backgroundColor: 'rgba(251, 146, 60, 0.1)',
                yAxisID: 'y1',
                tension: 0.4,
            },
        ],
    };
});

const ageDistributionChartData = computed(() => {
    if (!ageDistribution.value.length) return null;

    return {
        labels: ageDistribution.value.map((a) => a.age_group),
        datasets: [
            {
                data: ageDistribution.value.map((a) => a.count),
                backgroundColor: [
                    'rgb(34, 197, 94)',
                    'rgb(59, 130, 246)',
                    'rgb(139, 92, 246)',
                    'rgb(251, 146, 60)',
                    'rgb(156, 163, 175)',
                ],
            },
        ],
    };
});

const memoryDistributionChartData = computed(() => {
    if (!resourceDistribution.value.memory.length) return null;

    return {
        labels: resourceDistribution.value.memory.map((m) => m.memory_range),
        datasets: [
            {
                label: 'Servers',
                data: resourceDistribution.value.memory.map((m) => m.count),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderRadius: 4,
            },
        ],
    };
});

const diskDistributionChartData = computed(() => {
    if (!resourceDistribution.value.disk.length) return null;

    return {
        labels: resourceDistribution.value.disk.map((d) => d.disk_range),
        datasets: [
            {
                label: 'Servers',
                data: resourceDistribution.value.disk.map((d) => d.count),
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                borderRadius: 4,
            },
        ],
    };
});

const cpuDistributionChartData = computed(() => {
    if (!resourceDistribution.value.cpu.length) return null;

    return {
        labels: resourceDistribution.value.cpu.map((c) => c.cpu_range),
        datasets: [
            {
                label: 'Servers',
                data: resourceDistribution.value.cpu.map((c) => c.count),
                backgroundColor: 'rgba(251, 146, 60, 0.8)',
                borderRadius: 4,
            },
        ],
    };
});

// Chart Options
const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom' as const,
        },
    },
};

const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom' as const,
        },
    },
};

const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                precision: 0,
            },
        },
    },
};

const multiLineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index' as const,
        intersect: false,
    },
    scales: {
        y: {
            type: 'linear' as const,
            display: true,
            position: 'left' as const,
            title: {
                display: true,
                text: 'Memory (MB)',
            },
        },
        y1: {
            type: 'linear' as const,
            display: true,
            position: 'right' as const,
            title: {
                display: true,
                text: 'CPU (%)',
            },
            grid: {
                drawOnChartArea: false,
            },
        },
    },
};

const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                precision: 0,
            },
        },
    },
};

// Utility functions
const formatMemory = (mb: number): string => {
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toLocaleString()} MB`;
};

// Fetch analytics data
const fetchAnalytics = async () => {
    loading.value = true;
    error.value = null;

    try {
        const [
            overviewRes,
            byRealmRes,
            bySpellRes,
            dbUsageRes,
            allocUsageRes,
            resourcesRes,
            imagesRes,
            limitsRes,
            backupUsageRes,
            scheduleUsageRes,
            subuserStatsRes,
            serverActivityStatsRes,
            variableStatsRes,
            creationTrendRes,
            resourceTrendsRes,
            ageDistributionRes,
            resourceDistributionRes,
            installationStatsRes,
            configPatternsRes,
        ] = await Promise.all([
            axios.get('/api/admin/analytics/servers/overview'),
            axios.get('/api/admin/analytics/servers/by-realm'),
            axios.get('/api/admin/analytics/servers/by-spell'),
            axios.get('/api/admin/analytics/servers/database-usage'),
            axios.get('/api/admin/analytics/servers/allocation-usage'),
            axios.get('/api/admin/analytics/servers/resources'),
            axios.get('/api/admin/analytics/servers/images?limit=10'),
            axios.get('/api/admin/analytics/servers/limits'),
            axios.get('/api/admin/analytics/servers/backups'),
            axios.get('/api/admin/analytics/servers/schedules'),
            axios.get('/api/admin/analytics/servers/subusers'),
            axios.get('/api/admin/analytics/servers/server-activities'),
            axios.get('/api/admin/analytics/servers/variables'),
            axios.get('/api/admin/analytics/servers/creation-trend?days=30'),
            axios.get('/api/admin/analytics/servers/resource-trends?days=30'),
            axios.get('/api/admin/analytics/servers/age-distribution'),
            axios.get('/api/admin/analytics/servers/resource-distribution'),
            axios.get('/api/admin/analytics/servers/installation'),
            axios.get('/api/admin/analytics/servers/configuration'),
        ]);

        if (overviewRes.data?.success) {
            overview.value = overviewRes.data.data;
        }

        if (byRealmRes.data?.success) {
            serversByRealm.value = byRealmRes.data.data.realms;
        }

        if (bySpellRes.data?.success) {
            serversBySpell.value = bySpellRes.data.data.spells;
        }

        if (dbUsageRes.data?.success) {
            databaseUsage.value = dbUsageRes.data.data;
        }

        if (allocUsageRes.data?.success) {
            allocationUsage.value = allocUsageRes.data.data.top_servers;
            allocationStats.value = {
                avg_allocations_per_server: allocUsageRes.data.data.avg_allocations_per_server,
                max_allocations_per_server: allocUsageRes.data.data.max_allocations_per_server,
            };
        }

        if (resourcesRes.data?.success) {
            resources.value = resourcesRes.data.data;
        }

        if (imagesRes.data?.success) {
            imageUsage.value = imagesRes.data.data.images;
        }

        if (limitsRes.data?.success) {
            limits.value = limitsRes.data.data;
        }

        if (backupUsageRes.data?.success) {
            backupUsage.value = backupUsageRes.data.data;
        }

        if (scheduleUsageRes.data?.success) {
            scheduleUsage.value = scheduleUsageRes.data.data;
        }

        if (subuserStatsRes.data?.success) {
            subuserStats.value = subuserStatsRes.data.data;
        }

        if (serverActivityStatsRes.data?.success) {
            serverActivityStats.value = serverActivityStatsRes.data.data;
        }

        if (variableStatsRes.data?.success) {
            variableStats.value = variableStatsRes.data.data;
        }

        if (creationTrendRes.data?.success) {
            creationTrend.value = creationTrendRes.data.data.data;
        }

        if (resourceTrendsRes.data?.success) {
            resourceTrends.value = resourceTrendsRes.data.data.data;
        }

        if (ageDistributionRes.data?.success) {
            ageDistribution.value = ageDistributionRes.data.data.distribution;
        }

        if (resourceDistributionRes.data?.success) {
            resourceDistribution.value = resourceDistributionRes.data.data;
        }

        if (installationStatsRes.data?.success) {
            installationStats.value = installationStatsRes.data.data;
        }

        if (configPatternsRes.data?.success) {
            configPatterns.value = configPatternsRes.data.data;
        }
    } catch (err) {
        console.error('Failed to fetch server analytics:', err);
        error.value = 'Failed to load server analytics data';
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchAnalytics();
});
</script>
