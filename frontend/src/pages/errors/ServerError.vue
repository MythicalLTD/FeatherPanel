<template>
    <ErrorLayout error-code="500" :title="$t('errors.serverError.title')" :message="$t('errors.serverError.message')" />
</template>
<script setup lang="ts">
import ErrorLayout from '@/layouts/ErrorLayout.vue';
</script>
