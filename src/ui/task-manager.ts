import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { GenerationTask } from '../types';
import ListenHubPlugin from '../../main';

export const TASK_VIEW_TYPE = 'listenhub-task-view';

export class TaskManagerView extends ItemView {
	plugin: ListenHubPlugin;
	tasks: Map<string, GenerationTask>;

	constructor(leaf: WorkspaceLeaf, plugin: ListenHubPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.tasks = new Map();
	}

	getViewType(): string {
		return TASK_VIEW_TYPE;
	}

	getDisplayText(): string {
		return '播客生成任务';
	}

	getIcon(): string {
		return 'mic';
	}

	async onOpen() {
		this.render();
	}

	addTask(task: GenerationTask) {
		this.tasks.set(task.episodeId, task);
		this.render();
	}

	updateTask(episodeId: string, updates: Partial<GenerationTask>) {
		const task = this.tasks.get(episodeId);
		if (task) {
			Object.assign(task, updates);
			this.render();
		}
	}

	removeTask(episodeId: string) {
		this.tasks.delete(episodeId);
		this.render();
	}

	render() {
		const container = this.containerEl.children[1];
		container.empty();

		container.createEl('h4', { text: '播客生成任务' });

		if (this.tasks.size === 0) {
			container.createEl('p', {
				text: '暂无生成任务',
				cls: 'listenhub-empty-state'
			});
			return;
		}

		const taskList = container.createEl('div', { cls: 'listenhub-task-list' });

		// 按时间倒序排列
		const sortedTasks = Array.from(this.tasks.values())
			.sort((a, b) => b.createdAt - a.createdAt);

		for (const task of sortedTasks) {
			this.renderTask(taskList, task);
		}
	}

	renderTask(container: HTMLElement, task: GenerationTask) {
		const taskEl = container.createEl('div', { cls: 'listenhub-task-item' });

		// 状态图标
		const statusIcon = this.getStatusIcon(task.status);
		taskEl.createEl('div', {
			text: statusIcon,
			cls: `listenhub-task-status status-${task.status}`
		});

		// 任务信息
		const infoEl = taskEl.createEl('div', { cls: 'listenhub-task-info' });

		infoEl.createEl('div', {
			text: task.title || task.fileName,
			cls: 'listenhub-task-title'
		});

		const metaEl = infoEl.createEl('div', { cls: 'listenhub-task-meta' });
		metaEl.createEl('span', { text: `模式: ${task.mode}` });
		metaEl.createEl('span', { text: `语言: ${task.language}` });
		metaEl.createEl('span', {
			text: new Date(task.createdAt).toLocaleString()
		});

		// 错误信息
		if (task.error) {
			infoEl.createEl('div', {
				text: `错误: ${task.error}`,
				cls: 'listenhub-task-error'
			});
		}

		// 操作按钮
		const actionsEl = taskEl.createEl('div', { cls: 'listenhub-task-actions' });

		if (task.status === 'success' && task.audioUrl) {
			// 复制链接
			actionsEl.createEl('button', { text: '复制链接' })
				.addEventListener('click', () => {
					navigator.clipboard.writeText(task.audioUrl!);
					new Notice('已复制音频链接');
				});

			// 打开播放
			actionsEl.createEl('button', { text: '播放' })
				.addEventListener('click', () => {
					window.open(task.audioUrl, '_blank');
				});

			// 下载
			actionsEl.createEl('button', { text: '下载' })
				.addEventListener('click', async () => {
					await this.downloadAudio(task);
				});
		}

		if (task.status === 'processing' || task.status === 'pending') {
			// 刷新状态
			actionsEl.createEl('button', { text: '刷新' })
				.addEventListener('click', async () => {
					await this.refreshTaskStatus(task.episodeId);
				});
		}

		// 删除任务
		actionsEl.createEl('button', { text: '删除' })
			.addEventListener('click', () => {
				this.removeTask(task.episodeId);
			});
	}

	getStatusIcon(status: string): string {
		switch (status) {
			case 'pending':
				return '⏳';
			case 'processing':
				return '🔄';
			case 'success':
				return '✅';
			case 'failed':
				return '❌';
			default:
				return '❓';
		}
	}

	async refreshTaskStatus(episodeId: string) {
		try {
			const response = await this.plugin.apiClient.getEpisode(episodeId);
			const detail = response.data;

			this.updateTask(episodeId, {
				status: detail.processStatus,
				title: detail.title,
				audioUrl: detail.audioUrl,
				error: detail.processStatus === 'failed'
					? detail.sourceProcessResult?.content
					: undefined
			});

			new Notice('状态已更新');
		} catch (error: any) {
			new Notice(`刷新失败: ${error.message}`);
		}
	}

	async downloadAudio(task: GenerationTask) {
		if (!task.audioUrl) {
			new Notice('音频链接不可用');
			return;
		}

		try {
			const response = await fetch(task.audioUrl);
			const blob = await response.blob();
			const arrayBuffer = await blob.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			const fileName = `${task.title || task.fileName}.mp3`;
			const filePath = `podcasts/${fileName}`;

			await this.app.vault.createBinary(filePath, buffer);
			new Notice(`音频已下载到: ${filePath}`);
		} catch (error: any) {
			new Notice(`下载失败: ${error.message}`);
		}
	}

	async onClose() {
		// 清理
	}
}
