<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { authState } from '$lib/auth.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { browser } from '$app/environment';

	let { children } = $props();
	let isAuthenticated = $derived(authState.isAuthenticated);
	let isInitializing = $state(true);

	onMount(() => {
		authState.reload();
		// Give it a tiny tick to propagate
		setTimeout(() => {
			isInitializing = false;
		}, 100);
	});

	$effect(() => {
		if (isInitializing) return;
		console.log('Auth status changed:', isAuthenticated, page.url.pathname);
		if (browser && !isAuthenticated && page.url.pathname !== '/login') {
			goto('/login');
		}
	});

	// Redirect to Dashboard if logged in on login page
	$effect(() => {
		if (isInitializing) return;
		if (browser && authState.isAuthenticated && page.url.pathname === '/login') {
			goto('/');
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-[#050505] text-white">
	{#if isInitializing}
		<div class="flex items-center justify-center min-h-screen">
			<div class="animate-pulse flex items-center gap-2 text-gray-400">
				<div class="w-2 h-2 bg-purple-500 rounded-full"></div>
				Verifying session...
			</div>
		</div>
	{:else}
		{@render children()}
	{/if}
</div>
