<template>
    <ErrorLayout error-code="403" :title="$t('errors.notAllowed.title')" :message="$t('errors.notAllowed.message')" />
</template>
<script setup lang="ts">
import ErrorLayout from '@/layouts/ErrorLayout.vue';
</script>
