<template>
    <DashboardLayout :breadcrumbs="[{ text: $t('account.title'), isCurrent: true, href: '/dashboard/account' }]">
        <div class="flex flex-col gap-6">
            <div class="flex items-center gap-4">
                <h1 class="text-2xl font-bold">{{ $t('account.title') }}</h1>
            </div>

            <div class="grid gap-6">
                <!-- Profile Information Card -->
                <Card>
                    <div class="flex items-center gap-4 p-6">
                        <Avatar class="h-20 w-20">
                            <AvatarImage :src="user?.avatar || ''" :alt="user?.username || ''" />
                            <AvatarFallback>{{ user?.username?.charAt(0)?.toUpperCase() }}</AvatarFallback>
                        </Avatar>
                        <div class="flex flex-col gap-1">
                            <h2 class="text-xl font-semibold">{{ user?.username }}</h2>
                            <p class="text-muted-foreground">{{ user?.email }}</p>
                            <p class="text-sm text-muted-foreground">
                                {{ $t('account.memberSince') }} {{ formatDate(user?.first_seen) }}
                            </p>
                        </div>
                    </div>
                </Card>

                <!-- Edit Profile Form -->
                <Card>
                    <div class="p-6">
                        <h3 class="text-lg font-semibold mb-4">{{ $t('account.editProfile') }}</h3>

                        <form class="space-y-4" @submit.prevent="handleSubmit">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormItem>
                                    <Label for="username">{{ $t('account.username') }}</Label>
                                    <Input
                                        id="username"
                                        v-model="formData.username"
                                        :disabled="isSubmitting"
                                        :placeholder="$t('account.usernamePlaceholder')"
                                    />
                                </FormItem>

                                <FormItem>
                                    <Label for="email">{{ $t('account.email') }}</Label>
                                    <Input
                                        id="email"
                                        v-model="formData.email"
                                        type="email"
                                        :disabled="isSubmitting"
                                        :placeholder="$t('account.emailPlaceholder')"
                                    />
                                </FormItem>

                                <FormItem>
                                    <Label for="first_name">{{ $t('account.firstName') }}</Label>
                                    <Input
                                        id="first_name"
                                        v-model="formData.first_name"
                                        :disabled="isSubmitting"
                                        :placeholder="$t('account.firstNamePlaceholder')"
                                    />
                                </FormItem>

                                <FormItem>
                                    <Label for="last_name">{{ $t('account.lastName') }}</Label>
                                    <Input
                                        id="last_name"
                                        v-model="formData.last_name"
                                        :disabled="isSubmitting"
                                        :placeholder="$t('account.lastNamePlaceholder')"
                                    />
                                </FormItem>

                                <FormItem>
                                    <Label for="avatar">{{ $t('account.avatar') }}</Label>
                                    <Input
                                        id="avatar"
                                        v-model="formData.avatar"
                                        type="url"
                                        :disabled="isSubmitting"
                                        :placeholder="$t('account.avatarPlaceholder')"
                                    />
                                    <p class="text-xs text-muted-foreground mt-1">{{ $t('account.avatarHint') }}</p>
                                </FormItem>

                                <FormItem>
                                    <Label for="password">{{ $t('account.newPassword') }}</Label>
                                    <Input
                                        id="password"
                                        v-model="formData.password"
                                        type="password"
                                        :disabled="isSubmitting"
                                        :placeholder="$t('account.passwordPlaceholder')"
                                    />
                                    <p class="text-xs text-muted-foreground mt-1">
                                        {{ $t('account.passwordHint') }}
                                    </p>
                                </FormItem>
                            </div>

                            <FormItem>
                                <div class="flex items-center space-x-2">
                                    <Checkbox
                                        id="two_fa_enabled"
                                        v-model:checked="formData.two_fa_enabled"
                                        :disabled="isSubmitting"
                                    />
                                    <Label for="two_fa_enabled">{{ $t('account.twoFactorAuth') }}</Label>
                                </div>
                                <p class="text-xs text-muted-foreground mt-1">
                                    {{ $t('account.twoFactorHint') }}
                                </p>
                            </FormItem>

                            <div class="flex gap-3 pt-4">
                                <Button type="submit" :disabled="isSubmitting" class="min-w-[120px]">
                                    <span v-if="isSubmitting">{{ $t('account.saving') }}</span>
                                    <span v-else>{{ $t('account.saveChanges') }}</span>
                                </Button>

                                <Button type="button" variant="outline" :disabled="isSubmitting" @click="resetForm">
                                    {{ $t('account.reset') }}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/stores/session';
import { toast } from 'vue-sonner';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FormItem } from '@/components/ui/form';
import axios from 'axios';
import type { UserInfo } from '@/stores/session';

const { t: $t } = useI18n();
const sessionStore = useSessionStore();

// Form data with proper typing
const formData = ref({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    avatar: '',
    two_fa_enabled: false,
});

// Form state
const isSubmitting = ref(false);

// Computed user data with proper typing
const user = computed<UserInfo | null>(() => sessionStore.user);

// Initialize form with current user data
const initializeForm = () => {
    if (sessionStore.user) {
        formData.value = {
            username: sessionStore.user.username || '',
            email: sessionStore.user.email || '',
            first_name: sessionStore.user.first_name || '',
            last_name: sessionStore.user.last_name || '',
            password: '',
            avatar: sessionStore.user.avatar || '',
            two_fa_enabled: sessionStore.user.two_fa_enabled === 'true',
        };
    }
};

// Reset form to current values
const resetForm = () => {
    initializeForm();
};

// Handle form submission
const handleSubmit = async () => {
    try {
        isSubmitting.value = true;

        // Prepare data for API (remove empty password)
        const submitData = { ...formData.value };
        if (!submitData.password) {
            // Filter out the password field
            const filteredData = Object.fromEntries(
                Object.entries(formData.value).filter(([key]) => key !== 'password'),
            );
            Object.assign(submitData, filteredData);
        }

        // Make PATCH request to update session
        const response = await axios.patch('/api/user/session', submitData);

        if (response.data.success) {
            // Update local session data
            await sessionStore.checkSessionOrRedirect();

            // Show success toast
            toast($t('account.profileUpdated'));

            // Reset password field
            formData.value.password = '';
        } else {
            toast(response.data.message || $t('account.updateFailed'));
        }
    } catch (error: unknown) {
        console.error('Error updating profile:', error);

        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            if (axiosError.response?.data?.message) {
                toast(axiosError.response.data.message);
            } else {
                toast($t('account.unexpectedError'));
            }
        } else {
            toast($t('account.unexpectedError'));
        }
    } finally {
        isSubmitting.value = false;
    }
};

// Format date helper
const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return 'Unknown';
    }
};

// Initialize form on mount
onMounted(() => {
    initializeForm();
});
</script>
