<script lang="ts">
	import { authState, API_BASE } from '$lib/auth.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import {
		ChevronLeft,
		Play,
		Pause,
		RotateCcw,
		CheckCircle2,
		Clock,
		Calendar,
		Trash2,
		Pencil,
		X,
		Loader2,
		Briefcase,
		Sparkles,
		Archive,
		Activity,
		User,
		Timer,
		Plus,
		LayoutGrid,
		MoreHorizontal,
		FastForward,
		Rewind,
		Target,
		GripVertical
	} from '@lucide/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	const { categoryId, taskId } = page.params;

	interface Subtask {
		id: string;
		title: string;
		is_completed: boolean;
	}

	interface Task {
		id: string;
		title: string;
		description: string;
		status: string;
		category_id: string;
		time_spent: number;
		duration: number; // in minutes
		subtasks: Subtask[];
		created_at: string;
	}

	let task = $state<Task | null>(null);
	let loading = $state(true);
	let isTimerRunning = $state(false);
	let timeLeft = $state(25 * 60); // 25 minutes default
	let timerInterval: any;
	let sessionStartTime = $state<number | null>(null);

	let newSubtaskTitle = $state('');
	let isAddingSubtask = $state(false);

	// Edit State
	let showEditModal = $state(false);
	let editTitle = $state('');
	let editDesc = $state('');
	let editDuration = $state(25);
	let isSaving = $state(false);

	let editingSubtaskId = $state<string | null>(null);
	let editingSubtaskTitle = $state('');
	
	let draggedIndex = $state<number | null>(null);
	let hoverIndex = $state<number | null>(null);
	let subtaskEditInput = $state<HTMLInputElement | null>(null);
	let newSubtaskInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (editingSubtaskId && subtaskEditInput) {
			subtaskEditInput.focus();
		}
	});

	$effect(() => {
		if (isAddingSubtask && newSubtaskInput) {
			newSubtaskInput.focus();
		}
	});

	async function fetchTask() {
		if (!authState.token) return;
		try {
			const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			if (res.ok) {
				task = await res.json();
				// Initialize timer from task duration if not already running
				if (!isTimerRunning && task) {
					timeLeft = task.duration * 60;
				}
			}
		} catch (error) {
			console.error('Error fetching task:', error);
		} finally {
			loading = false;
		}
	}

	async function toggleTimer() {
		if (isTimerRunning) {
			clearInterval(timerInterval);

			// Calculate elapsed time in this session and sync
			if (sessionStartTime && task) {
				const elapsedThisSession = Math.floor((Date.now() - sessionStartTime) / 1000);
				task.time_spent += elapsedThisSession;
				await saveTaskChanges();
			}
			sessionStartTime = null;
		} else {
			sessionStartTime = Date.now();
			timerInterval = setInterval(() => {
				if (timeLeft > 0) {
					timeLeft--;
				} else {
					clearInterval(timerInterval);
					isTimerRunning = false;

					// Final sync on completion
					if (sessionStartTime && task) {
						const elapsedThisSession = Math.floor((Date.now() - sessionStartTime) / 1000);
						task.time_spent += elapsedThisSession;
						saveTaskChanges();
					}
					sessionStartTime = null;
					alert('Session Completed!');
				}
			}, 1000);
		}
		isTimerRunning = !isTimerRunning;
	}

	function resetTimer() {
		clearInterval(timerInterval);
		isTimerRunning = false;
		if (task) {
			timeLeft = task.duration * 60;
		} else {
			timeLeft = 25 * 60;
		}
	}

	function formatTime(seconds: number) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	async function addSubtask() {
		if (!newSubtaskTitle.trim() || !task) return;

		const newSubtask = {
			id: 'temp-' + Math.random(),
			title: newSubtaskTitle,
			is_completed: false
		};

		task.subtasks = [...task.subtasks, newSubtask as Subtask];
		newSubtaskTitle = '';
		isAddingSubtask = false;

		// Sync with server
		await saveTaskChanges();
	}

	async function toggleSubtask(subTask: Subtask) {
		if (!task) return;
		subTask.is_completed = !subTask.is_completed;
		await saveTaskChanges();
	}

	async function deleteSubtask(subTaskId: string) {
		if (!task) return;
		task.subtasks = task.subtasks.filter((st) => st.id !== subTaskId);
		await saveTaskChanges();
	}

	function startEditSubtask(subTask: Subtask) {
		editingSubtaskId = subTask.id;
		editingSubtaskTitle = subTask.title;
	}

	async function saveSubtaskEdit() {
		if (!task || !editingSubtaskId) return;
		const subtask = task.subtasks.find((st) => st.id === editingSubtaskId);
		if (subtask) {
			subtask.title = editingSubtaskTitle;
			await saveTaskChanges();
		}
		editingSubtaskId = null;
	}

	function handleDragStart(index: number) {
		draggedIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		hoverIndex = index;
	}

	function handleDragEnd() {
		draggedIndex = null;
		hoverIndex = null;
	}

	async function handleDrop(e: DragEvent, targetIndex: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === targetIndex || !task) {
			draggedIndex = null;
			hoverIndex = null;
			return;
		}

		const subtasks = [...task.subtasks];
		const [draggedItem] = subtasks.splice(draggedIndex, 1);
		subtasks.splice(targetIndex, 0, draggedItem);

		task.subtasks = subtasks;
		await saveTaskChanges();

		draggedIndex = null;
		hoverIndex = null;
	}

	async function saveTaskChanges() {
		if (!task) return;
		try {
			const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify(task)
			});
			if (res.ok) {
				// We still re-fetch to ensure sync, but local state was already swapped
				await fetchTask();
			}
		} catch (err) {
			console.error(err);
		}
	}

	function openEditModal() {
		if (!task) return;
		editTitle = task.title;
		editDesc = task.description;
		editDuration = task.duration || 25;
		showEditModal = true;
	}

	async function updateTaskInfo() {
		if (!task || isSaving) return;
		isSaving = true;
		try {
			const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({
					...task,
					title: editTitle,
					description: editDesc,
					duration: editDuration
				})
			});
			if (res.ok) {
				showEditModal = false;
				await fetchTask();
			}
		} catch (err) {
			console.error(err);
		} finally {
			isSaving = false;
		}
	}

	onMount(fetchTask);
	onDestroy(() => clearInterval(timerInterval));
</script>

<svelte:head>
	<title>
		{isTimerRunning ? `(${formatTime(timeLeft)}) ` : ''}
		{task ? `${task.title} | Daily Tracking` : 'Daily Tracking'}
	</title>
</svelte:head>

<div class="font-display min-h-screen overflow-x-hidden bg-[#080808] pb-20 text-white">
	<!-- Header / Navigation -->
	<div class="mx-auto mb-12 flex max-w-5xl items-center justify-between px-6 pt-10">
		<a
			href="/{categoryId}"
			class="group flex items-center gap-4 text-white/40 transition-all hover:text-white"
		>
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 group-hover:bg-white/10"
			>
				<ChevronLeft class="h-5 w-5" />
			</div>
			<span class="text-xs font-black tracking-[0.3em] uppercase">Back to Sector</span>
		</a>
	</div>

	{#if loading}
		<div class="flex h-[60vh] flex-col items-center justify-center gap-6">
			<Loader2 class="h-12 w-12 animate-spin text-[#AF4949]" />
			<p class="text-xs tracking-[0.5em] text-white/20 uppercase">Calibrating Pulse...</p>
		</div>
	{:else if task}
		<main class="mx-auto max-w-7xl px-6 pb-24">
			<div class="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:items-start lg:gap-20">
				<!-- LEFT COLUMN: FOCUS CONTROL & TASK INFO -->
				<div class="flex flex-col gap-12 lg:col-span-7">
					<!-- Pomodoro Timer Section -->
					<section
						class="relative overflow-hidden rounded-[4rem] border border-white/5 bg-[#0A0A0A] p-16 shadow-2xl transition-all"
						in:fade={{ duration: 1000 }}
					>
						<!-- Decorative design -->
						<div class="pointer-events-none absolute top-0 right-0 p-12 opacity-[0.03]">
							<Sparkles class="h-40 w-40 text-white" />
						</div>

						<div class="relative z-10 flex flex-col items-center justify-center text-center">
							<span
								class="mb-8 block text-[10px] font-black tracking-[0.6em] text-white/20 uppercase"
								>Current Session: Deep Focus</span
							>

							<h1
								class="mb-10 text-[10rem] leading-none font-black tracking-tighter tabular-nums select-none lg:text-[14rem]"
								style="color: #AF4949; text-shadow: 0 0 80px rgba(175,73,73,0.3)"
							>
								{formatTime(timeLeft)}
							</h1>

							<div
								class="mb-12 flex items-center gap-3 rounded-full border border-white/5 bg-white/[0.02] px-6 py-2"
							>
								<div class="h-2 w-2 rounded-full bg-[#AF4949] shadow-[0_0_10px_#AF4949]"></div>
								<span class="text-[9px] font-black tracking-[0.4em] text-white/60 uppercase"
									>Pulse Active</span
								>
							</div>

							<!-- Timer Controls -->
							<div class="flex items-center gap-10">
								<button
									onclick={resetTimer}
									class="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40 transition-all hover:bg-white/10 hover:text-white"
								>
									<RotateCcw class="h-6 w-6" />
								</button>

								<button
									onclick={toggleTimer}
									class="group flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-[#AF4949] shadow-[0_25px_60px_-15px_rgba(175,73,73,0.6)] transition-all hover:scale-110 active:scale-95"
								>
									{#if isTimerRunning}
										<Pause class="h-10 w-10 fill-white text-white" />
									{:else}
										<Play class="ml-1 h-10 w-10 fill-white text-white" />
									{/if}
								</button>

								<button
									class="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40 transition-all hover:bg-white/10 hover:text-white"
								>
									<FastForward class="h-6 w-6" />
								</button>
							</div>
						</div>
					</section>

					<!-- Task Information Card -->
					<div
						class="group relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-[#121212] p-16 shadow-2xl"
						in:fly={{ y: 40, duration: 800 }}
					>
						<div class="mb-10 flex items-start justify-between">
							<div class="flex-1">
								<h2
									class="text-6xl leading-none font-black tracking-tighter text-white uppercase italic"
								>
									{task.title}
								</h2>
								<div class="mt-4 flex items-center gap-3">
									<div class="h-1 w-1 rounded-full bg-[#AF4949]"></div>
									<span class="text-[9px] font-black tracking-[0.3em] text-[#AF4949] uppercase">
										Focus Recorded: {Math.floor((task.time_spent || 0) / 60)}m {(task.time_spent ||
											0) % 60}s
									</span>
								</div>
							</div>
							<button
								onclick={openEditModal}
								class="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/20 transition-all hover:bg-white/10 hover:text-white"
							>
								<Pencil class="h-6 w-6" />
							</button>
						</div>

						<p class="max-w-2xl text-xl leading-relaxed font-light text-white/50 italic">
							{task.description || 'System awaiting further technical documentation for this node.'}
						</p>
					</div>
				</div>

				<!-- RIGHT COLUMN: MISSION CORE / SUBTASKS -->
				<div class="lg:col-span-5" in:fly={{ x: 40, duration: 800, delay: 200 }}>
					<header class="mb-12 flex items-center justify-between">
						<div>
							<h3 class="text-3xl font-black tracking-tighter text-white uppercase italic">
								Mission Core
							</h3>
							<div class="mt-2 flex items-center gap-3">
								<div class="h-[1px] w-12 bg-[#AF4949]"></div>
								<span class="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase"
									>{task.subtasks.filter((s) => s.is_completed).length} / {task.subtasks.length} Secured</span
								>
							</div>
						</div>
						<button
							onclick={() => (isAddingSubtask = true)}
							class="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white transition-all hover:scale-110 hover:bg-[#AF4949] active:scale-95"
						>
							<Plus class="h-6 w-6" />
						</button>
					</header>

					<div class="space-y-6">
						{#each task.subtasks as subtask, i (subtask.id)}
							<div
								class="group flex cursor-pointer items-center gap-6 rounded-[2.5rem] border border-white/5 bg-[#121212]/50 p-6 transition-all hover:bg-white/[0.04] {subtask.is_completed
									? 'opacity-40'
									: ''} {draggedIndex === i ? 'opacity-20 border-[#AF4949]' : ''} {hoverIndex === i && draggedIndex !== i ? 'border-t-2 border-[#AF4949]/50' : ''}"
								role="button"
								tabindex="0"
								draggable="true"
								ondragstart={() => handleDragStart(i)}
								ondragover={(e) => handleDragOver(e, i)}
								ondragend={handleDragEnd}
								ondrop={(e) => handleDrop(e, i)}
							>
								<!-- Drag Handle -->
								<div class="cursor-grab active:cursor-grabbing text-white/10 hover:text-white/40 transition-colors">
									<GripVertical class="h-5 w-5" />
								</div>

								<div
									class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all {subtask.is_completed
										? 'border-[#AF4949] bg-[#AF4949]'
										: 'border-white/10 group-hover:border-[#AF4949]/40'}"
									onclick={(e) => {
										e.stopPropagation();
										toggleSubtask(subtask);
									}}
									onkeydown={(e) => (e.key === ' ' || e.key === 'Enter') && toggleSubtask(subtask)}
									role="checkbox"
									aria-checked={subtask.is_completed}
									tabindex="0"
								>
									{#if subtask.is_completed}
										<CheckCircle2 class="h-6 w-6 text-white" />
									{/if}
								</div>

								{#if editingSubtaskId === subtask.id}
									<input
										type="text"
										bind:value={editingSubtaskTitle}
										class="flex-1 border-none bg-transparent text-lg font-bold text-white focus:outline-none"
										onkeydown={(e) => e.key === 'Enter' && saveSubtaskEdit()}
										bind:this={subtaskEditInput}
									/>
									<button
										onclick={saveSubtaskEdit}
										class="text-[#AF4949] transition-colors hover:text-white"
									>
										<CheckCircle2 class="h-5 w-5" />
									</button>
								{:else}
									<span
										class="flex-1 text-lg font-bold tracking-tight {subtask.is_completed
											? 'line-through'
											: ''}"
										onclick={() => startEditSubtask(subtask)}
										onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && startEditSubtask(subtask)}
										role="button"
										tabindex="0"
									>
										{subtask.title}
									</span>

									<div
										class="flex items-center gap-2 opacity-0 transition-all group-hover:opacity-100"
									>
										<button
											onclick={(e) => {
												e.stopPropagation();
												startEditSubtask(subtask);
											}}
											class="rounded-lg p-2 text-white/20 hover:bg-white/5 hover:text-white"
										>
											<Pencil class="h-4 w-4" />
										</button>
										<button
											onclick={(e) => {
												e.stopPropagation();
												deleteSubtask(subtask.id);
											}}
											class="rounded-lg p-2 text-white/20 hover:bg-white/5 hover:text-red-500"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								{/if}

								<span
									class="ml-4 text-[9px] font-black tracking-widest text-white/10 uppercase group-hover:text-[#AF4949]/60"
								>
									{subtask.is_completed ? 'Done' : 'Current'}
								</span>
							</div>
						{/each}

						{#if isAddingSubtask}
							<div
								class="flex items-center gap-6 rounded-[2.5rem] border border-[#AF4949]/30 bg-white/[0.02] p-7"
								transition:slide
							>
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-[#AF4949]/40"
								></div>
								<input
									type="text"
									bind:value={newSubtaskTitle}
									placeholder="Define sub-objective..."
									class="flex-1 border-none bg-transparent text-lg font-bold text-white placeholder:text-white/10 focus:outline-none"
									onkeydown={(e) => e.key === 'Enter' && addSubtask()}
									bind:this={newSubtaskInput}
								/>
								<button onclick={addSubtask} class="rounded-xl bg-[#AF4949] p-3 text-white">
									<Plus class="h-4 w-4" />
								</button>
							</div>
						{/if}

						{#if task.subtasks.length === 0 && !isAddingSubtask}
							<div
								class="flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-white/5 py-12"
							>
								<div class="mb-4 rounded-full bg-white/5 p-4">
									<Target class="h-8 w-8 text-white/10" />
								</div>
								<p class="text-sm font-bold tracking-widest text-white/10 uppercase">
									No core objectives
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</main>
	{/if}
</div>

{#if showEditModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-6">
		<div
			transition:fade={{ duration: 300 }}
			onclick={() => (showEditModal = false)}
			class="absolute inset-0 bg-black/95 backdrop-blur-2xl"
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Escape' && (showEditModal = false)}
		></div>

		<div
			transition:fly={{ y: 80, duration: 600 }}
			class="relative w-full max-w-2xl overflow-hidden rounded-[3.5rem] border border-white/10 bg-[#0d0d0d] p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)]"
		>
			<button
				onclick={() => (showEditModal = false)}
				class="absolute top-12 right-12 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40 transition-all hover:text-white"
			>
				<X class="h-6 w-6" />
			</button>

			<header class="mb-14">
				<span class="mb-3 block text-[10px] font-black tracking-[0.5em] text-[#AF4949] uppercase"
					>Task Adjustment</span
				>
				<h2 class="text-5xl font-black tracking-tighter text-white uppercase italic">
					Revise Objective
				</h2>
			</header>

			<div class="space-y-12">
				<div class="space-y-4">
					<label
						for="edit-title"
						class="ml-2 text-[10px] font-black tracking-[0.5em] text-white/30 uppercase"
						>Directive Title</label
					>
					<input
						id="edit-title"
						type="text"
						bind:value={editTitle}
						class="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-10 py-6 text-3xl font-bold text-white shadow-inner transition-all focus:ring-4 focus:ring-[#AF4949]/20 focus:outline-none"
					/>
				</div>

				<div class="space-y-4">
					<label
						for="edit-desc"
						class="ml-2 text-[10px] font-black tracking-[0.5em] text-white/30 uppercase"
						>Detailed Scope</label
					>
					<textarea
						id="edit-desc"
						bind:value={editDesc}
						class="min-h-[160px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-10 py-7 text-lg leading-relaxed font-light text-white shadow-inner transition-all focus:ring-4 focus:ring-[#AF4949]/20 focus:outline-none"
					></textarea>
				</div>

				<div class="space-y-4">
					<label
						for="edit-duration"
						class="ml-2 text-[10px] font-black tracking-[0.5em] text-white/30 uppercase"
						>Timer Pulse (Minutes)</label
					>
					<div class="flex items-center gap-6">
						<input
							id="edit-duration"
							type="number"
							bind:value={editDuration}
							min="1"
							max="120"
							class="w-32 rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-6 text-3xl font-bold text-white shadow-inner transition-all focus:ring-4 focus:ring-[#AF4949]/20 focus:outline-none"
						/>
						<span class="text-[10px] font-black tracking-[0.3em] text-white/20 uppercase"
							>Minutes Per Session</span
						>
					</div>
				</div>

				<div class="flex gap-6 pt-6">
					<button
						onclick={() => (showEditModal = false)}
						class="flex-1 rounded-2xl border border-white/5 bg-white/5 px-10 py-7 text-[10px] font-black tracking-[0.3em] text-white uppercase transition-all hover:bg-white/10"
					>
						Cancel
					</button>
					<button
						onclick={updateTaskInfo}
						disabled={!editTitle.trim() || isSaving}
						class="flex flex-2 items-center justify-center gap-4 rounded-2xl bg-[#AF4949] px-10 py-7 text-[10px] font-black tracking-[0.3em] text-white uppercase shadow-[0_20px_50px_-10px_rgba(175,73,73,0.5)] transition-all hover:bg-[#AF4949]/90 disabled:opacity-50"
					>
						{#if isSaving}
							<Loader2 class="h-5 w-5 animate-spin" />
						{/if}
						Save Changes
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;300;400;700;900&display=swap');

	:global(body) {
		margin: 0;
		background-color: #080808;
	}

	.font-display {
		font-family: 'Outfit', sans-serif;
	}

	/* Custom digital look for timer */
	h1 {
		font-variant-numeric: tabular-nums;
	}

	.shadow-2xl {
		box-shadow: 0 40px 100px -30px rgba(0, 0, 0, 0.9);
	}
</style>
