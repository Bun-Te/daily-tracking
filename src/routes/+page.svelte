<script lang="ts">
	import { authState, API_BASE } from '$lib/auth.svelte';
	import { onMount } from 'svelte';
	import {
		LayoutGrid,
		Search,
		Plus,
		LogOut,
		Briefcase,
		Heart,
		CreditCard,
		BookOpen,
		Users,
		User,
		Dumbbell,
		CheckCircle2,
		ChevronRight,
		Pencil,
		Trash2,
		X,
		Loader2,
		Settings2,
		ShieldCheck,
		Sparkles,
		Archive,
		Activity
	} from '@lucide/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	interface Category {
		id: string;
		name: string;
	}

	interface Task {
		id: string;
		title: string;
		description: string;
		status: string;
		category_id: string;
		created_at: string;
	}

	let categories = $state<Category[]>([]);
	let tasks = $state<Task[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');

	// Modal State
	let showModal = $state(false);
	let modalTitle = $state('New Category');
	let categoryName = $state('');
	let editingId = $state<string | null>(null);
	let isSaving = $state(false);
	let modalInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (showModal && modalInput) {
			modalInput.focus();
		}
	});

	const configMap: Record<string, { icon: any; color: string; desc: string }> = {
		work: {
			icon: Briefcase,
			color: '#C2516E',
			desc: 'Professional growth and daily business execution.'
		},
		discovery: {
			icon: Sparkles,
			color: '#8F60C8',
			desc: 'Exploratory research and moonshot prototyping sessions.'
		},
		vault: {
			icon: Archive,
			color: '#FFFFFF',
			desc: 'Archive of core assets, documentation, and reference kits.'
		},
		maintenance: {
			icon: Activity,
			color: '#AF4949',
			desc: 'System health checks and regular optimization cycles.'
		},
		health: {
			icon: Heart,
			color: '#AF4949',
			desc: 'Physical well-being and peak performance metrics.'
		},
		finance: {
			icon: CreditCard,
			color: '#8F60C8',
			desc: 'Capital management and long-term asset allocation.'
		},
		reading: {
			icon: BookOpen,
			color: '#C2516E',
			desc: 'Intellectual exploration and knowledge acquisition.'
		},
		family: {
			icon: Users,
			color: '#FFFFFF',
			desc: 'Core domestic operations and relationship building.'
		},
		fitness: {
			icon: Dumbbell,
			color: '#AF4949',
			desc: 'Strength conditioning and athletic milestones.'
		},
		default: {
			icon: LayoutGrid,
			color: '#8F60C8',
			desc: 'General management of uncategorized daily activities.'
		}
	};

	function getConfig(name: string) {
		if (!name) return configMap.default;
		const lower = name.toLowerCase();
		for (const key in configMap) {
			if (lower.includes(key)) return configMap[key];
		}
		return configMap.default;
	}

	async function fetchData() {
		if (!authState.token) return;

		try {
			const [catsRes, tasksRes] = await Promise.all([
				fetch(`${API_BASE}/categories`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				}),
				fetch(`${API_BASE}/tasks`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				})
			]);

			if (catsRes.ok) categories = await catsRes.json();
			if (tasksRes.ok) tasks = await tasksRes.json();
		} catch (error) {
			console.error('Error fetching data:', error);
		} finally {
			loading = false;
		}
	}

	onMount(fetchData);

	let filteredCategories = $derived(
		categories.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	function getTaskCount(categoryId: string) {
		return tasks.filter((t) => t.category_id === categoryId).length;
	}

	// CRUD Methods
	function openCreateModal() {
		modalTitle = 'New Category';
		categoryName = '';
		editingId = null;
		showModal = true;
	}

	function openEditModal(category: Category, e: Event) {
		e.stopPropagation();
		modalTitle = 'Edit Category';
		categoryName = category.name;
		editingId = category.id;
		showModal = true;
	}

	async function saveCategory() {
		if (!categoryName.trim() || isSaving) return;
		isSaving = true;

		const url = editingId
			? `${API_BASE}/categories/${editingId}`
			: `${API_BASE}/categories`;

		const method = editingId ? 'PUT' : 'POST';

		try {
			const res = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({ name: categoryName })
			});

			if (res.ok) {
				await fetchData();
				showModal = false;
			}
		} catch (error) {
			console.error('Error saving category:', error);
		} finally {
			isSaving = false;
		}
	}

	async function deleteCategory(category: Category, e: Event) {
		e.stopPropagation();
		if (
			!confirm(
				`Are you sure you want to delete "${category.name}"? This will also remove all tasks in it.`
			)
		)
			return;

		try {
			const res = await fetch(`${API_BASE}/categories/${category.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${authState.token}` }
			});

			if (res.ok) {
				await fetchData();
			}
		} catch (error) {
			console.error('Error deleting category:', error);
		}
	}
</script>

<div class="mx-auto min-h-screen max-w-7xl px-6 py-10 lg:px-12">
	<!-- Refined Header -->
	<header
		class="mb-20 flex flex-col justify-between gap-10 lg:flex-row lg:items-end"
		in:fly={{ y: -20, duration: 800 }}
	>
		<div>
			<h1 class="font-display mb-3 text-6xl font-black tracking-tight text-white uppercase italic">
				Task
			</h1>
			<p class="text-xl font-light text-white/40 italic">Orchestrating daily operational sectors</p>
		</div>

		<div class="flex flex-col items-center gap-4 sm:flex-row" in:fade={{ delay: 200 }}>
			<div class="group relative w-full sm:w-80">
				<Search
					class="absolute top-1/2 left-6 h-4 w-4 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-white"
				/>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search Sectors..."
					class="w-full rounded-2xl border border-white/10 bg-white/5 py-5 pr-8 pl-14 text-sm text-white transition-all focus:ring-4 focus:ring-[#AF4949]/20 focus:outline-none"
				/>
			</div>

			<button
				onclick={openCreateModal}
				class="flex w-full items-center gap-3 rounded-2xl bg-[#AF4949] px-10 py-5 text-[10px] font-black tracking-[0.2em] text-white uppercase shadow-2xl shadow-[#AF4949]/20 transition-all hover:scale-105 hover:bg-[#AF4949]/90 active:scale-95 sm:w-auto"
			>
				<Plus class="h-5 w-5" />
				Deploy Sector
			</button>

			<button
				onclick={() => authState.logout()}
				class="flex w-full justify-center rounded-2xl border border-white/10 bg-white/5 p-5 text-white/40 shadow-xl transition-all hover:bg-white/10 hover:text-white sm:w-auto"
				title="Logout"
			>
				<LogOut class="h-5 w-5" />
			</button>
		</div>
	</header>

	<!-- Categories Grid -->
	{#if loading}
		<div class="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _}
				<div class="h-64 animate-pulse rounded-[3.5rem] border border-white/5 bg-white/5"></div>
			{/each}
		</div>
	{:else if filteredCategories.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-[4rem] border border-white/5 bg-white/[0.02] py-40"
		>
			<div class="mb-8 rounded-full bg-white/5 p-10">
				<LayoutGrid class="h-16 w-16 text-white/20" />
			</div>
			<h3 class="mb-3 text-3xl font-bold tracking-tight text-white/40 italic">
				Operational Void Detected
			</h3>
			<p class="text-lg font-light tracking-widest text-white/20 uppercase">
				Waiting for initialization
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredCategories as category, i (category.id)}
				{@const config = getConfig(category.name)}
				<a
					href="/{category.id}"
					in:fly={{ y: 30, duration: 800, delay: i * 80 }}
					class="group shadow-3xl relative block overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#121212] transition-all hover:scale-[1.03] hover:border-white/20"
				>
					<!-- Floating Controls (Top Right) -->
					<div
						class="absolute top-8 right-8 z-10 flex translate-y-2 gap-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
					>
						<button
							onclick={(e) => openEditModal(category, e)}
							class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/60 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
						>
							<Pencil class="h-4 w-4" />
						</button>
						<button
							onclick={(e) => deleteCategory(category, e)}
							class="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/10 bg-red-400/10 text-red-400/60 backdrop-blur-md transition-all hover:text-red-400"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					</div>

					<!-- Watermark -->
					<div
						class="absolute right-0 bottom-0 translate-x-4 translate-y-4 p-4 opacity-[0.03] transition-opacity group-hover:opacity-[0.06]"
					>
						<config.icon class="h-40 w-40" />
					</div>

					<div class="p-10">
						<!-- Icon & Title -->
						<div class="mb-10 flex items-center gap-8">
							<div
								class="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 shadow-inner"
								style="background: linear-gradient(135deg, {config.color}15, {config.color}05)"
							>
								<config.icon class="h-10 w-10" style="color: {config.color}" />
								<div
									class="absolute inset-0 rounded-3xl opacity-10 blur-xl"
									style="background-color: {config.color}"
								></div>
							</div>
							<h2 class="text-4xl font-black tracking-tighter text-white uppercase italic">
								{category.name}
							</h2>
						</div>

						<!-- Description -->
						<p class="mb-12 min-h-[3rem] text-sm leading-relaxed font-light text-white/40">
							{config.desc}
						</p>

						<!-- Bottom Status Pill -->
						<div class="mt-auto flex items-center justify-between">
							<div
								class="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 shadow-inner"
							>
								<div
									class="h-2.5 w-2.5 rounded-full"
									style="background-color: {config.color}; box-shadow: 0 0 12px {config.color}dd"
								></div>
								<span class="text-[9px] font-black tracking-[0.3em] text-white/70 uppercase"
									>{getTaskCount(category.id)} Logs</span
								>
							</div>
							<ChevronRight
								class="h-5 w-5 translate-x-2 text-white/5 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-60"
							/>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<!-- Refined Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-6">
		<div
			transition:fade={{ duration: 300 }}
			onclick={() => (showModal = false)}
			onkeydown={(e) => e.key === 'Escape' && (showModal = false)}
			role="button"
			tabindex="0"
			aria-label="Close Modal"
			class="absolute inset-0 bg-black/90 backdrop-blur-2xl"
		></div>

		<div
			transition:fly={{ y: 80, duration: 600 }}
			class="shadow-3xl relative w-full max-w-xl overflow-hidden rounded-[4rem] border border-white/10 bg-[#0a0a0a] p-16"
		>
			<button
				onclick={() => (showModal = false)}
				class="absolute top-12 right-12 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40 shadow-xl transition-all hover:text-white"
			>
				<X class="h-6 w-6" />
			</button>

			<header class="mb-12">
				<span class="mb-2 block text-[10px] font-black tracking-[0.5em] text-[#AF4949] uppercase"
					>System Registry</span
				>
				<h2 class="mb-10 text-5xl font-black tracking-tighter text-white uppercase italic">
					{modalTitle}
				</h2>
			</header>

			<div class="space-y-12">
				<div class="space-y-4">
					<label
						for="cat-name"
						class="ml-2 block text-[10px] font-black tracking-[0.5em] text-white/30 uppercase"
						>Sector Identifier</label
					>
					<input
						id="cat-name"
						type="text"
						bind:value={categoryName}
						placeholder="Define Sector..."
						class="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-10 py-7 text-3xl font-bold text-white shadow-inner transition-all placeholder:text-white/10 focus:ring-4 focus:ring-[#AF4949]/20 focus:outline-none"
						onkeydown={(e) => e.key === 'Enter' && saveCategory()}
						bind:this={modalInput}
					/>
				</div>

				<div class="flex gap-6 pt-4">
					<button
						onclick={() => (showModal = false)}
						class="flex-1 rounded-2xl border border-white/5 bg-white/5 px-10 py-7 text-[10px] font-black tracking-[0.3em] text-white/40 uppercase transition-all hover:bg-white/10 hover:text-white"
					>
						Abort
					</button>
					<button
						onclick={saveCategory}
						disabled={!categoryName.trim() || isSaving}
						class="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-[#AF4949] px-10 py-7 text-[10px] font-black tracking-[0.3em] text-white uppercase shadow-[0_20px_50px_-10px_rgba(175,73,73,0.5)] transition-all hover:bg-[#AF4949]/90 disabled:opacity-50"
					>
						{#if isSaving}
							<Loader2 class="h-5 w-5 animate-spin" />
						{/if}
						{editingId ? 'Modify' : 'Initialize'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;300;400;700;900&display=swap');

	:global(body) {
		background-color: #080808;
		background-image:
			radial-gradient(circle at 10% 10%, #af494905 0%, transparent 40%),
			radial-gradient(circle at 90% 90%, #8f60c805 0%, transparent 40%);
		min-height: 100vh;
		font-family: 'Outfit', sans-serif;
		color: #fff;
		overflow-x: hidden;
	}

	.font-display {
		font-family: 'Outfit', sans-serif;
	}

	.shadow-3xl {
		box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 1);
	}
</style>
