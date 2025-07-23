<template>
    <ErrorLayout error-code="404" :title="$t('errors.notFound.title')" :message="$t('errors.notFound.message')" />
</template>
<script setup lang="ts">
import ErrorLayout from '@/layouts/ErrorLayout.vue';
</script>
