<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { GalleryVerticalEnd } from 'lucide-vue-next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();
</script>

<template>
    <div :class="cn('flex flex-col gap-6', props.class)">
        <form>
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4">
                    <div class="grid gap-3">
                        <Label for="password">{{ $t('auth.password') }}</Label>
                        <Input id="password" type="password" :placeholder="$t('auth.passwordPlaceholder')" required />
                    </div>
                    <div class="grid gap-3">
                        <Label for="confirmPassword">{{ $t('auth.confirmPassword') }}</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            :placeholder="$t('auth.confirmPasswordPlaceholder')"
                            required
                        />
                    </div>
                    <Button type="submit" class="w-full"> {{ $t('auth.reset') }} </Button>
                    <div class="text-center text-sm">
                        {{ $t('auth.remembered') }}
                        <router-link to="/auth/login" class="underline underline-offset-4">
                            {{ $t('auth.login') }}
                        </router-link>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
