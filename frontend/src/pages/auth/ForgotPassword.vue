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
                        <Label for="email">{{ $t('auth.email') }}</Label>
                        <Input id="email" type="email" :placeholder="$t('auth.emailPlaceholder')" required />
                    </div>
                    <Button type="submit" class="w-full"> {{ $t('auth.sendReset') }} </Button>
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
