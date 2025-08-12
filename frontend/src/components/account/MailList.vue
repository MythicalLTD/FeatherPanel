<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-lg font-semibold">{{ $t('account.mail.title') }}</h3>
                <p class="text-sm text-muted-foreground">{{ $t('account.mail.description') }}</p>
            </div>
            <Button variant="outline" size="sm" :disabled="loading" @click="fetchMails">
                <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
                {{ $t('account.mail.refresh') }}
            </Button>
        </div>

        <!-- Search and Stats -->
        <div class="flex items-center gap-4">
            <div class="relative flex-1 max-w-sm">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input v-model="searchQuery" :placeholder="$t('account.mail.searchPlaceholder')" class="pl-10" />
            </div>
            <div class="text-sm text-muted-foreground">
                {{ $t('account.mail.totalMails', { count: filteredMails.length }) }}
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="text-center">
                <RefreshCw class="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p class="text-muted-foreground">{{ $t('account.mail.loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex items-center justify-center py-12">
            <div class="text-center">
                <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p class="text-destructive mb-2">{{ $t('account.mail.loadError') }}</p>
                <Button variant="outline" @click="fetchMails">
                    {{ $t('account.mail.tryAgain') }}
                </Button>
            </div>
        </div>

        <!-- Mail List -->
        <div v-else-if="filteredMails.length > 0" class="space-y-4">
            <div
                v-for="mail in filteredMails"
                :key="mail.id"
                class="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                        <h4 class="font-medium text-foreground mb-1">{{ mail.subject }}</h4>
                        <div class="flex items-center gap-2 mb-2">
                            <Button variant="outline" size="sm" class="h-6 px-2 text-xs" @click="openMailModal(mail)">
                                <Mail class="h-3 w-3 mr-1" />
                                {{ $t('account.mail.viewFull') }}
                            </Button>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 ml-4">
                        <Badge :variant="getStatusVariant(mail.status)" class="text-xs">
                            {{ $t(`account.mail.status.${mail.status}`) }}
                        </Badge>
                    </div>
                </div>

                <div class="flex items-center justify-between text-xs text-muted-foreground">
                    <div class="flex items-center gap-1">
                        <Clock class="h-3 w-3" />
                        <span>{{ formatDate(mail.created_at) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mail Modal -->
        <Dialog :open="mailModalOpen" @update:open="mailModalOpen = false">
            <DialogContent class="max-w-[90vw] w-[98vw] max-h-[98vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle class="text-xl font-semibold">
                        {{ selectedMail?.subject }}
                    </DialogTitle>
                    <DialogDescription class="flex items-center gap-4 text-sm text-muted-foreground">
                        <div class="flex items-center gap-2">
                            <Clock class="h-4 w-4" />
                            <span>{{ selectedMail ? formatDate(selectedMail.created_at) : '' }}</span>
                        </div>
                        <Badge :variant="getStatusVariant(selectedMail?.status || 'pending')">
                            {{ selectedMail ? $t(`account.mail.status.${selectedMail.status}`) : '' }}
                        </Badge>
                    </DialogDescription>
                </DialogHeader>

                <div class="flex-1 overflow-y-auto pr-2">
                    <iframe
                        v-if="selectedMail"
                        :srcdoc="getIframeContent(selectedMail.body)"
                        class="w-full h-full min-h-[70vh] border-0 bg-white"
                        sandbox="allow-same-origin"
                        title="Mail Content"
                    ></iframe>
                </div>

                <DialogFooter>
                    <Button variant="outline" @click="mailModalOpen = false">
                        {{ $t('account.mail.close') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Empty States -->
        <div v-if="!loading && !error && mails.length === 0" class="flex items-center justify-center py-12">
            <div class="text-center">
                <Mail class="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p class="text-foreground mb-1">{{ $t('account.mail.noMails') }}</p>
                <p class="text-sm text-muted-foreground">{{ $t('account.mail.noMailsDescription') }}</p>
            </div>
        </div>

        <div
            v-if="!loading && !error && filteredMails.length === 0 && mails.length > 0"
            class="flex items-center justify-center py-12"
        >
            <div class="text-center">
                <Search class="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p class="text-foreground mb-1">{{ $t('account.mail.noSearchResults') }}</p>
                <p class="text-sm text-muted-foreground">{{ $t('account.mail.tryDifferentSearch') }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/stores/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Search, RefreshCw, Clock, Mail, AlertCircle } from 'lucide-vue-next';

const { t: $t } = useI18n();
const sessionStore = useSessionStore();

// Types
interface MailItem {
    id: number;
    subject: string;
    body: string;
    status: 'pending' | 'sent' | 'failed';
    created_at: string;
}

// Reactive state
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');
const mails = ref<MailItem[]>([]);
const mailModalOpen = ref(false);
const selectedMail = ref<MailItem | null>(null);

// Computed properties
const filteredMails = computed(() => {
    if (!searchQuery.value.trim()) {
        return mails.value;
    }

    const query = searchQuery.value.toLowerCase();
    return mails.value.filter(
        (mail) => mail.subject?.toLowerCase().includes(query) || mail.body?.toLowerCase().includes(query),
    );
});

// Methods
const fetchMails = async () => {
    loading.value = true;
    error.value = null;

    try {
        await sessionStore.checkSessionOrRedirect();
        const response = await sessionStore.getSession();

        if (response?.mails?.data) {
            mails.value = response.mails.data;
        } else {
            mails.value = [];
        }
    } catch (err) {
        console.error('Failed to fetch mails:', err);
        error.value = $t('account.mail.fetchError');
    } finally {
        loading.value = false;
    }
};

const openMailModal = (mail: MailItem) => {
    selectedMail.value = mail;
    mailModalOpen.value = true;
};

const getIframeContent = (htmlContent: string): string => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }
                img {
                    max-width: 100%;
                    height: auto;
                }
                table {
                    max-width: 100%;
                    border-collapse: collapse;
                }
                td, th {
                    padding: 8px;
                    border: 1px solid #ddd;
                }
                button {
                    padding: 10px 20px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    margin: 10px 0;
                }
                button:hover {
                    background: #0056b3;
                }
                a {
                    color: #007bff;
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
                h1, h2, h3, h4, h5, h6 {
                    margin-top: 20px;
                    margin-bottom: 10px;
                }
                p {
                    margin-bottom: 15px;
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;
};

const getStatusVariant = (status: string) => {
    switch (status) {
        case 'pending':
            return 'secondary';
        case 'sent':
            return 'default';
        case 'failed':
            return 'destructive';
        default:
            return 'secondary';
    }
};

const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            return $t('account.mail.justNow');
        } else if (diffInHours < 24) {
            return $t('account.mail.hoursAgo', { hours: diffInHours });
        } else if (diffInHours < 48) {
            return $t('account.mail.yesterday');
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        }
    } catch {
        return 'Unknown';
    }
};

// Lifecycle
onMounted(() => {
    fetchMails();
});
</script>
