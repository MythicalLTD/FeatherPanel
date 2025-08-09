<template>
    <div class="space-y-6">
        <div>
            <h3 class="text-lg font-semibold">{{ $t('account.editProfile') }}</h3>
            <p class="text-sm text-muted-foreground">{{ $t('account.editProfileDescription') }}</p>
        </div>

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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/stores/session';
import { toast } from 'vue-sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FormItem } from '@/components/ui/form';
import axios from 'axios';

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
});

// Form state
const isSubmitting = ref(false);

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
    await sessionStore.checkSessionOrRedirect();
    await initializeForm();
});
</script>
