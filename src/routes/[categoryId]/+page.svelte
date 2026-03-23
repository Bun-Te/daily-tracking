<script lang="ts">
	import { authState, API_BASE } from '$lib/auth.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		ChevronLeft,
		Plus,
		Search,
		CheckCircle2,
		Clock,
		Calendar,
		Trash2,
		Pencil,
		X,
		Loader2,
		LayoutGrid,
		Briefcase,
		Heart,
		CreditCard,
		BookOpen,
		Users,
		User,
		Dumbbell,
		Sparkles,
		Archive,
		Activity,
		Timer,
		MoreHorizontal,
		CheckCircle
	} from '@lucide/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	const categoryId = page.params.categoryId;

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
		created_at: string; // Fixed: Matches Go JSON tag
		updated_at: string;
	}

	let category = $state<Category | null>(null);
	let tasks = $state<Task[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');

	// Modal State
	let showTaskModal = $state(false);
	let taskName = $state('');
	let taskDesc = $state('');
	let taskStatus = $state('pending');
	let editingTaskId = $state<string | null>(null);
	let isSaving = $state(false);

	const categoryConfigs: Record<string, { icon: any; color: string; desc: string }> = {
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

	const statusConfigs: Record<string, { icon: any; color: string; label: string }> = {
		pending: { icon: Clock, color: '#94a3b8', label: 'Triage' },
		'in-progress': { icon: Timer, color: '#8F60C8', label: 'Processing' },
		completed: { icon: CheckCircle2, color: '#AF4949', label: 'Validated' }
	};

	function getCategoryConfig(name: string) {
		if (!name) return categoryConfigs.default;
		const lower = name.toLowerCase();
		for (const key in categoryConfigs) {
			if (lower.includes(key)) return categoryConfigs[key];
		}
		return categoryConfigs.default;
	}

	async function fetchData() {
		if (!authState.token) return;

		try {
			const [catRes, tasksRes] = await Promise.all([
				fetch(`${API_BASE}/categories/${categoryId}`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				}),
				fetch(`${API_BASE}/categories/${categoryId}/tasks`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				})
			]);

			if (catRes.ok) category = await catRes.json();
			if (tasksRes.ok) tasks = await tasksRes.json();
		} catch (error) {
			console.error('Error fetching data:', error);
		} finally {
			loading = false;
		}
	}

	onMount(fetchData);

	let filteredTasks = $derived(
		tasks.filter(
			(t) =>
				t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.description.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function openCreateTask() {
		editingTaskId = null;
		taskName = '';
		taskDesc = '';
		taskStatus = 'pending';
		showTaskModal = true;
	}

	function openEditTask(task: Task, e: Event) {
		e.stopPropagation();
		editingTaskId = task.id;
		taskName = task.title;
		taskDesc = task.description;
		taskStatus = task.status;
		showTaskModal = true;
	}

	async function toggleTaskStatus(task: Task, e: Event) {
		e.stopPropagation();
		const nextStatus =
			task.status === 'pending'
				? 'in-progress'
				: task.status === 'in-progress'
					? 'completed'
					: 'pending';

		try {
			const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({
					...task,
					status: nextStatus
				})
			});

			if (res.ok) {
				await fetchData();
			}
		} catch (error) {
			console.error('Error toggling status:', error);
		}
	}

	async function saveTask() {
		if (!taskName.trim() || isSaving) return;
		isSaving = true;

		const url = editingTaskId
			? `${API_BASE}/tasks/${editingTaskId}`
			: `${API_BASE}/tasks`;

		const method = editingTaskId ? 'PUT' : 'POST';

		try {
			const res = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({
					title: taskName,
					description: taskDesc,
					category_id: categoryId,
					status: taskStatus
				})
			});

			if (res.ok) {
				await fetchData();
				showTaskModal = false;
			}
		} catch (error) {
			console.error('Error saving task:', error);
		} finally {
			isSaving = false;
		}
	}

	async function deleteTask(id: string, e: Event) {
		e.stopPropagation();
		if (!confirm('Abort this activity log?')) return;
		try {
			await fetch(`${API_BASE}/tasks/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			await fetchData();
		} catch (err) {
			console.error(err);
		}
	}

	function formatDate(dateStr: string) {
		if (!dateStr) return 'No Date';
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return 'Invalid Date';
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
</script>

<div class="mx-auto min-h-screen max-w-7xl px-6 py-10 lg:px-12">
	<!-- Breadcrumb-style Back Button -->
	<a
		href="/"
		class="group mb-12 inline-flex items-center gap-4 text-white/40 transition-all hover:text-white"
	>
		<div
			class="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-colors group-hover:bg-white/10"
		>
			<ChevronLeft class="h-6 w-6 transition-transform group-hover:-translate-x-1" />
		</div>
		<div>
			<span class="mb-0.5 block text-[10px] font-black tracking-[0.4em] uppercase">Navigation</span>
			<span class="text-sm font-bold">Return to Task</span>
		</div>
	</a>

	{#if loading}
		<div class="space-y-12">
			<div class="h-48 animate-pulse rounded-[3rem] bg-white/5"></div>
			<div class="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
				{#each Array(6) as _}
					<div class="h-64 animate-pulse rounded-[2.5rem] bg-white/5"></div>
				{/each}
			</div>
		</div>
	{:else if category}
		{@const catConfig = getCategoryConfig(category.name)}
		<!-- Refined Header Section -->
		<header
			class="mb-20 flex flex-col justify-between gap-10 md:flex-row md:items-end"
			in:fly={{ y: 20, duration: 800 }}
		>
			<div class="flex items-center gap-8">
				<div
					class="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 shadow-2xl"
					style="background: linear-gradient(135deg, {catConfig.color}20, {catConfig.color}05)"
				>
					<catConfig.icon class="h-10 w-10" style="color: {catConfig.color}" />
					<div
						class="absolute -inset-2 rounded-[2rem] opacity-20 blur-xl"
						style="background-color: {catConfig.color}"
					></div>
				</div>
				<div>
					<h1
						class="font-display mb-2 text-6xl font-black tracking-tight text-white uppercase italic"
					>
						{category.name}
					</h1>
					<p class="max-w-lg text-lg leading-relaxed font-light text-white/40">{catConfig.desc}</p>
				</div>
			</div>

			<div class="flex flex-col items-center gap-4 sm:flex-row">
				<div class="group relative w-full sm:w-80">
					<Search
						class="absolute top-1/2 left-6 h-4 w-4 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-white"
					/>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Scan objectives..."
						class="w-full rounded-2xl border border-white/10 bg-white/5 py-5 pr-8 pl-14 text-sm text-white transition-all focus:border-[#AF4949]/40 focus:ring-4 focus:ring-[#AF4949]/20 focus:outline-none"
					/>
				</div>
				<button
					onclick={openCreateTask}
					class="flex w-full items-center gap-3 rounded-2xl bg-[#AF4949] px-10 py-5 text-[10px] font-black tracking-[0.2em] text-white uppercase shadow-[0_20px_40px_-10px_rgba(175,73,73,0.4)] transition-all hover:scale-105 hover:bg-[#AF4949]/90 active:scale-95 sm:w-auto"
				>
					<Plus class="h-5 w-5" />
					Initialize Log
				</button>
			</div>
		</header>

		<!-- Tasks Grid -->
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
			{#if filteredTasks.length === 0}
				<div
					class="col-span-full flex flex-col items-center justify-center rounded-[3rem] border border-white/5 bg-white/[0.02] py-32"
				>
					<div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
						<Timer class="h-8 w-8 text-white/20" />
					</div>
					<h3 class="text-2xl font-bold tracking-widest text-white/40 uppercase italic">
						Operational Silence
					</h3>
				</div>
			{:else}
				{#each filteredTasks as task, i (task.id)}
					{@const statusConfig = statusConfigs[task.status] || statusConfigs.pending}
					<a
						in:fly={{ y: 30, duration: 800, delay: i * 80 }}
						class="group relative cursor-pointer overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#121212] shadow-2xl transition-all hover:scale-[1.02] hover:border-white/20"
						href="/{categoryId}/task/{task.id}"
					>
						<!-- Hover Actions Banner -->
						<div
							class="absolute inset-x-0 top-0 z-10 flex translate-y-[-100%] justify-end gap-3 p-6 transition-transform duration-300 group-hover:translate-y-0"
						>
							<button
								onclick={(e) => openEditTask(task, e)}
								class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/60 backdrop-blur-md transition-all hover:text-white"
							>
								<Pencil class="h-4 w-4" />
							</button>
							<button
								onclick={(e) => deleteTask(task.id, e)}
								class="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/10 bg-red-400/10 text-red-400/60 backdrop-blur-md transition-all hover:text-red-400"
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</div>

						<!-- Card Content -->
						<div class="relative flex h-full flex-col p-10 pb-8">
							<!-- Watermark -->
							<div
								class="absolute right-0 bottom-0 translate-x-4 translate-y-4 p-4 opacity-[0.03] transition-opacity group-hover:opacity-[0.06]"
							>
								<statusConfig.icon class="h-40 w-40" />
							</div>

							<div class="mb-8 flex items-start gap-6">
								<!-- Status Toggle Ring -->
								<button
									onclick={(e) => toggleTaskStatus(task, e)}
									class="group/status relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border transition-all"
									style="background-color: {statusConfig.color}10; border-color: {statusConfig.color}30"
								>
									<statusConfig.icon
										class="h-8 w-8 transition-transform group-hover/status:scale-110"
										style="color: {statusConfig.color}"
									/>
									{#if task.status === 'in-progress'}
										<div
											class="absolute inset-0 animate-pulse rounded-2xl opacity-20"
											style="background-color: {statusConfig.color}"
										></div>
									{/if}
								</button>
								<div class="flex-1 pt-1">
									<h2
										class="mb-3 text-3xl leading-none font-black tracking-tighter text-white transition-colors group-hover:text-primary"
									>
										{task.title}
									</h2>
								</div>
							</div>

							<p class="mb-10 line-clamp-2 text-sm leading-relaxed font-light text-white/50 italic">
								{task.description || 'System awaiting further objective details...'}
							</p>

							<div class="mt-auto flex items-center justify-between">
								<div
									class="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 shadow-inner"
								>
									<div
										class="h-2 w-2 rounded-full"
										style="background-color: {statusConfig.color}; box-shadow: 0 0 12px {statusConfig.color}dd"
									></div>
									<span class="text-[9px] font-black tracking-[0.3em] text-white/70 uppercase"
										>{statusConfig.label}</span
									>
								</div>
								<div class="flex items-center gap-2 text-white/20">
									<Calendar class="h-3.5 w-3.5" />
									<span class="text-[10px] font-bold tracking-widest uppercase"
										>{formatDate(task.created_at)}</span
									>
								</div>
							</div>
						</div>

						<!-- Bottom Progress Bar decorative -->
						<div class="absolute bottom-0 left-0 h-1 w-full overflow-hidden bg-white/5">
							<div
								class="h-full transition-all duration-700"
								style="width: {task.status === 'completed'
									? '100'
									: task.status === 'in-progress'
										? '50'
										: '10'}%; background-color: {statusConfig.color}"
							></div>
						</div>
					</a>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<!-- Refined Modal -->
{#if showTaskModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-6">
		<div
			transition:fade={{ duration: 300 }}
			onclick={() => (showTaskModal = false)}
			class="absolute inset-0 bg-black/90 backdrop-blur-2xl"
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Escape' && (showTaskModal = false)}
		></div>

		<div
			transition:fly={{ y: 80, duration: 600 }}
			class="shadow-3xl relative w-full max-w-2xl overflow-hidden rounded-[3.5rem] border border-white/10 bg-[#0a0a0a] p-16"
		>
			<button
				onclick={() => (showTaskModal = false)}
				class="absolute top-12 right-12 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40 transition-all hover:text-white"
			>
				<X class="h-6 w-6" />
			</button>

			<header class="mb-14">
				<span class="mb-3 block text-[10px] font-black tracking-[0.5em] text-[#AF4949] uppercase"
					>Task Initialization</span
				>
				<h2 class="text-5xl font-black tracking-tighter text-white uppercase italic">
					{editingTaskId ? 'Revise Protocol' : 'Initial Registry'}
				</h2>
			</header>

			<div class="space-y-12">
				<div class="space-y-4">
					<label
						for="modal-title"
						class="ml-2 text-[10px] font-black tracking-[0.5em] text-white/30 uppercase"
						>Objective Subject</label
					>
					<input
						id="modal-title"
						type="text"
						bind:value={taskName}
						placeholder="Define directive..."
						class="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-10 py-6 text-3xl font-bold text-white shadow-inner transition-all placeholder:text-white/10 focus:ring-4 focus:ring-[#AF4949]/20 focus:outline-none"
					/>
				</div>

				<div class="space-y-5">
					<span class="ml-2 text-[10px] font-black tracking-[0.5em] text-white/30 uppercase"
						>Operational State</span
					>
					<div class="flex gap-4">
						{#each Object.entries(statusConfigs) as [id, config]}
							<button
								onclick={() => (taskStatus = id)}
								class="group/btn flex flex-1 flex-col items-center gap-3 rounded-[2rem] border p-6 transition-all {taskStatus ===
								id
									? 'border-white/20 bg-white/10'
									: 'border-white/5 bg-white/[0.02] text-white/20 hover:bg-white/5 hover:text-white'}"
							>
								<config.icon
									class="h-7 w-7"
									style="color: {taskStatus === id ? config.color : 'currentColor'}"
								/>
								<span class="text-[9px] font-black tracking-widest uppercase">{config.label}</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-4">
					<label
						for="modal-desc"
						class="ml-2 text-[10px] font-black tracking-[0.5em] text-white/30 uppercase"
						>Recorded Observations</label
					>
					<textarea
						id="modal-desc"
						bind:value={taskDesc}
						placeholder="Log detailed metrics and status updates..."
						class="min-h-[160px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-10 py-7 text-lg leading-relaxed font-light text-white shadow-inner transition-all focus:ring-4 focus:ring-[#AF4949]/20 focus:outline-none"
					></textarea>
				</div>

				<div class="flex gap-6 pt-6">
					<button
						onclick={() => (showTaskModal = false)}
						class="flex-1 rounded-2xl border border-white/5 bg-white/5 px-10 py-7 text-[10px] font-black tracking-[0.3em] text-white uppercase transition-all hover:bg-white/10"
					>
						Abort
					</button>
					<button
						onclick={saveTask}
						disabled={!taskName.trim() || isSaving}
						class="flex flex-1 items-center justify-center gap-4 rounded-2xl bg-[#AF4949] px-10 py-7 text-[10px] font-black tracking-[0.3em] text-white uppercase shadow-[0_20px_50px_-10px_rgba(175,73,73,0.5)] transition-all hover:bg-[#AF4949]/90 disabled:opacity-50"
					>
						{#if isSaving}
							<Loader2 class="h-5 w-5 animate-spin" />
						{/if}
						{editingTaskId ? 'Commit' : 'Initialize'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;300;400;700;900&display=swap');

	:global(body) {
		font-family: 'Outfit', sans-serif;
		background-color: #080808;
	}

	.font-display {
		font-family: 'Outfit', sans-serif;
	}

	.shadow-3xl {
		box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 1);
	}
</style>
