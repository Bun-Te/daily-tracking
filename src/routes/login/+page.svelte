<script lang="ts">
    import { authState } from '$lib/auth.svelte';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    let username = $state('');
    let password = $state('');
    let error = $state('');
    let loading = $state(false);

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        loading = true;
        error = '';
        
        const success = await authState.login(username, password);
        if (success) {
            goto('/');
        } else {
            error = 'Invalid credentials. Please try again.';
        }
        loading = false;
    }

    onMount(() => {
        if (authState.isAuthenticated) {
            goto('/');
        }
    });
</script>

<div class="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <div class="mb-8 text-center">
            <h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-fill-transparent">
                DailyTrack
            </h1>
            <p class="text-gray-400">Sign in to manage your productivity</p>
        </div>

        <div class="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
            {#if error}
                <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {error}
                </div>
            {/if}

            <form onsubmit={handleSubmit} class="space-y-6">
                <div class="space-y-2">
                    <label for="username" class="text-sm font-medium text-gray-300">Username</label>
                    <input 
                        type="text" 
                        id="username" 
                        bind:value={username}
                        required
                        class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                        placeholder="Enter your username"
                    />
                </div>

                <div class="space-y-2">
                    <label for="password" class="text-sm font-medium text-gray-300">Password</label>
                    <input 
                        type="password" 
                        id="password" 
                        bind:value={password}
                        required
                        class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {#if loading}
                        <div class="flex items-center justify-center gap-2">
                            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Signing in...
                        </div>
                    {:else}
                        Sign In
                    {/if}
                </button>
            </form>

            <div class="mt-8 pt-6 border-t border-white/10 text-center">
                <p class="text-sm text-gray-400">
                    Use your workplace credentials to login
                </p>
            </div>
        </div>
    </div>
</div>
