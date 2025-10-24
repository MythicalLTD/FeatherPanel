<template>
    <div class="space-y-6">
        <div>
            <h3 class="text-lg font-semibold">{{ $t('account.editProfile') }}</h3>
            <p class="text-sm text-muted-foreground">{{ $t('account.editProfileDescription') }}</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-3">
                <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                <span class="text-muted-foreground">{{ $t('account.loadingProfile') }}</span>
            </div>
        </div>

        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
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
                    <AvatarUpload
                        v-model="formData.avatar"
                        :label="$t('account.avatar')"
                        :disabled="isSubmitting"
                        :is-uploading="isUploadingAvatar"
                        @file-selected="handleAvatarFileSelect"
                        @clear="handleAvatarClear"
                    />
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

            <div class="flex gap-3 pt-4">
                <Button type="submit" :disabled="isSubmitting" class="min-w-[120px]" data-umami-event="Profile update">
                    <span v-if="isSubmitting">{{ $t('account.saving') }}</span>
                    <span v-else>{{ $t('account.saveChanges') }}</span>
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    :disabled="isSubmitting"
                    data-umami-event="Reset profile form"
                    @click="resetForm"
                >
                    {{ $t('account.reset') }}
                </Button>
            </div>
        </form>
    </div>
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

import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/stores/session';
import { useToast } from 'vue-toastification';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FormItem } from '@/components/ui/form';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import axios from 'axios';

const { t: $t } = useI18n();
const sessionStore = useSessionStore();
const toast = useToast();

// Form data with proper typing
const formData = ref({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    avatar: '',
});

// Form state
const isSubmitting = ref(false);
const loading = ref(true);
const avatarFile = ref<File | null>(null);
const isUploadingAvatar = ref(false);

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
        };
    }
};

// Reset form to current values
const resetForm = () => {
    initializeForm();
    avatarFile.value = null;
};

// Handle avatar file selection from the component
const handleAvatarFileSelect = (file: File | null) => {
    avatarFile.value = file;
};

// Handle avatar clear from the component
const handleAvatarClear = () => {
    avatarFile.value = null;
    formData.value.avatar = '';
};

// Handle form submission
const handleSubmit = async () => {
    try {
        isSubmitting.value = true;

        // Prepare data for API - only include fields that have been changed
        const submitData: Record<string, string> = {};

        // Only include username if it's different from the original
        if (formData.value.username !== (sessionStore.user?.username || '')) {
            submitData.username = formData.value.username;
        }

        // Only include first_name if it's different from the original
        if (formData.value.first_name !== (sessionStore.user?.first_name || '')) {
            submitData.first_name = formData.value.first_name;
        }

        // Only include last_name if it's different from the original
        if (formData.value.last_name !== (sessionStore.user?.last_name || '')) {
            submitData.last_name = formData.value.last_name;
        }

        // Only include email if it's different from the original
        if (formData.value.email !== (sessionStore.user?.email || '')) {
            submitData.email = formData.value.email;
        }

        // Only include avatar if it's different from the original or if there's a new file
        if (formData.value.avatar !== (sessionStore.user?.avatar || '') || avatarFile.value) {
            if (avatarFile.value) {
                // Upload avatar file first
                isUploadingAvatar.value = true;
                try {
                    const formDataUpload = new FormData();
                    formDataUpload.append('avatar', avatarFile.value);

                    const uploadResponse = await axios.post('/api/user/avatar', formDataUpload, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });

                    if (uploadResponse.data.success) {
                        submitData.avatar = uploadResponse.data.data.avatar_url;
                    } else {
                        toast.error(uploadResponse.data.message || $t('account.avatarUploadFailed'));
                        return;
                    }
                } finally {
                    isUploadingAvatar.value = false;
                }
            } else {
                submitData.avatar = formData.value.avatar;
            }
        }

        // Only include password if user actually wants to change it
        if (formData.value.password && formData.value.password.trim() !== '') {
            submitData.password = formData.value.password;
        }

        // Check if anything was actually changed
        if (Object.keys(submitData).length === 0) {
            toast.info($t('account.noChanges'));
            return;
        }

        // Make PATCH request to update session
        const response = await axios.patch('/api/user/session', submitData);

        if (response.data.success) {
            // Update local session data
            await sessionStore.checkSessionOrRedirect();

            // Show success toast
            toast.success($t('account.profileUpdated'));

            // Reset password field
            formData.value.password = '';
        } else {
            toast.error(response.data.message || $t('account.updateFailed'));
        }
    } catch (error: unknown) {
        console.error('Error updating profile:', error);

        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else {
                toast.error($t('account.unexpectedError'));
            }
        } else {
            toast.error($t('account.unexpectedError'));
        }
    } finally {
        isSubmitting.value = false;
    }
};

// Initialize form on mount
onMounted(async () => {
    try {
        loading.value = true;
        await sessionStore.checkSessionOrRedirect();
        await initializeForm();
    } finally {
        loading.value = false;
    }
});
</script>
