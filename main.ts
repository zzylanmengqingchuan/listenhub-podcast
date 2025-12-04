import {
	App,
	Editor,
	MarkdownView,
	Menu,
	Notice,
	Plugin,
	TFile,
	WorkspaceLeaf
} from 'obsidian';

import { ListenHubApiClient } from './src/api-client';
import {
	ListenHubSettings,
	DEFAULT_SETTINGS,
	ListenHubSettingTab
} from './src/settings';
import { PodcastGenerationModal } from './src/ui/podcast-modal';
import { PodcastMode, Language } from './src/types';

export default class ListenHubPlugin extends Plugin {
	settings!: ListenHubSettings;
	apiClient!: ListenHubApiClient;
	currentFile: TFile | null = null;

	async onload() {
		await this.loadSettings();

		// 初始化 API 客户端
		this.apiClient = new ListenHubApiClient(this.settings.apiKey);

		// 添加功能区图标
		this.addRibbonIcon('mic', '生成播客', async (evt: MouseEvent) => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				await this.generatePodcastFromCurrentFile();
			} else {
				new Notice('请先打开一个 Markdown 文件');
			}
		});

		// 添加命令：生成单人播客
		this.addCommand({
			id: 'generate-solo-podcast',
			name: '生成单人播客',
			editorCallback: async (editor: Editor) => {
				await this.generatePodcastFromCurrentFile();
			}
		});

		// 添加命令：生成双人播客
		this.addCommand({
			id: 'generate-dual-podcast',
			name: '生成双人播客',
			editorCallback: async (editor: Editor) => {
				await this.generatePodcastFromCurrentFile(true);
			}
		});

		// 添加命令：查询积分余额
		this.addCommand({
			id: 'check-credits',
			name: '查询积分余额',
			callback: async () => {
				await this.checkCredits();
			}
		});

		// 添加右键菜单
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFile && file.extension === 'md') {
					menu.addItem((item) => {
						item
							.setTitle('生成播客')
							.setIcon('mic')
							.onClick(async () => {
								await this.generatePodcastFromFile(file);
							});
					});
				}
			})
		);

		// 添加编辑器右键菜单
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				menu.addItem((item) => {
					item
						.setTitle('生成播客')
						.setIcon('mic')
						.onClick(async () => {
							await this.generatePodcastFromCurrentFile();
						});
				});
			})
		);

		// 添加设置标签页
		this.addSettingTab(new ListenHubSettingTab(this.app, this));

		console.log('ListenHub 插件已加载');
	}

	onunload() {
		console.log('ListenHub 插件已卸载');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// 更新 API 客户端的 API Key
		if (this.apiClient) {
			this.apiClient.setApiKey(this.settings.apiKey);
		}
	}

	/**
	 * 从当前打开的文件生成播客
	 */
	async generatePodcastFromCurrentFile(useDualSpeaker: boolean = false) {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('请先打开一个 Markdown 文件');
			return;
		}

		const file = activeView.file;
		if (!file) {
			new Notice('无法获取当前文件');
			return;
		}

		await this.generatePodcastFromFile(file, useDualSpeaker);
	}

	/**
	 * 从指定文件生成播客
	 */
	async generatePodcastFromFile(file: TFile, useDualSpeaker: boolean = false) {
		// 检查 API Key
		if (!this.settings.apiKey) {
			new Notice('请先在设置中配置 API Key');
			return;
		}

		try {
			// 读取文件内容
			const content = await this.app.vault.read(file);

			if (content.length < 100) {
				new Notice('文章内容太短，请至少输入 100 字符');
				return;
			}

			// 保存当前文件引用
			this.currentFile = file;

			// 打开配置对话框
			const modal = new PodcastGenerationModal(
				this.app,
				this,
				content,
				file.basename,
				async (config) => {
					await this.startGeneration(file, config);
				}
			);

			// 设置默认双人模式
			if (useDualSpeaker) {
				modal.useDualSpeaker = true;
			}

			modal.open();
		} catch (error: any) {
			new Notice(`读取文件失败: ${error.message}`);
			console.error(error);
		}
	}

	/**
	 * 开始生成播客
	 */
	async startGeneration(
		file: TFile,
		config: {
			mode: PodcastMode;
			language: Language;
			speakers: string[];
			content: string;
		}
	) {
		const { mode, language, speakers, content } = config;

		try {
			// 显示通知
			if (this.settings.showNotifications) {
				new Notice('正在创建播客任务...');
			}

			// 调用 API 创建播客
			const response = await this.apiClient.createPodcast({
				query: content,
				speakers: speakers.map(id => ({ speakerId: id })),
				language,
				mode,
				sources: [
					{
						type: 'text',
						content: content
					}
				]
			});

			const episodeId = response.data.episodeId;

			if (this.settings.showNotifications) {
				new Notice(`播客任务已创建，正在生成中...`);
			}

			// 开始轮询
			await this.pollEpisodeResult(episodeId, file, mode);

		} catch (error: any) {
			new Notice(`创建失败: ${error.message}`);
			console.error('Failed to create podcast:', error);
		}
	}

	/**
	 * 轮询查询生成结果
	 */
	async pollEpisodeResult(episodeId: string, file: TFile, mode: PodcastMode) {
		try {
			const result = await this.apiClient.pollEpisodeResult(
				episodeId,
				(status, detail) => {
					// 显示进度通知
					if (this.settings.showNotifications && status === 'processing') {
						// 静默处理，避免过多通知
					}
				}
			);

			// 生成成功
			const detail = result.data;

			if (this.settings.showNotifications) {
				new Notice(`✅ 播客生成成功!\n标题: ${detail.title}\n积分: ${detail.credits}`);
			}

			// 插入音频到笔记
			await this.insertAudioToNote(file, detail, mode);

		} catch (error: any) {
			new Notice(`❌ 播客生成失败: ${error.message}`);
			console.error('Podcast generation failed:', error);
		}
	}

	/**
	 * 插入音频播放器到笔记
	 */
	async insertAudioToNote(file: TFile, detail: any, mode: PodcastMode) {
		try {
			const currentContent = await this.app.vault.read(file);

			// 生成 ListenHub 链接
			const listenhubUrl = `https://listenhub.ai/zh/episode/${detail.episodeId}`;

			// 格式化音频时长
			const durationMin = detail.audioDuration ? Math.round(detail.audioDuration / 60000) : 0;
			const hours = Math.floor(durationMin / 60);
			const minutes = durationMin % 60;
			const durationText = hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes} 分钟`;

			// 格式化日期
			const dateText = new Date().toLocaleDateString('zh-CN', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			});

			// 模式名称映射
			const modeMap: Record<string, string> = {
				'deep': '深度解读',
				'solo': '单人播客',
				'dialogue': '双人对话'
			};
			const modeText = modeMap[mode] || mode;

			// 构建插入内容 - 美化后的音频卡片
			const audioSection = `

---

<div class="listenhub-audio-card">
  <div class="listenhub-audio-header">
    <div class="listenhub-logo">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13v10l7-5-7-5z"/>
      </svg>
      <span class="listenhub-brand">播客音频</span>
    </div>
  </div>

  <div class="listenhub-audio-content">
    <h3 class="listenhub-audio-title">${detail.title}</h3>

    <div class="listenhub-audio-meta">
      <span class="meta-item">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
        </svg>
        ${durationText}
      </span>
      <span class="meta-item">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
        ${dateText}
      </span>
      <span class="meta-item meta-mode">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        ${modeText}
      </span>
      <span class="meta-item meta-credits">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
        </svg>
        ${detail.credits} 积分
      </span>
    </div>

    <div class="listenhub-audio-player">
      <audio controls src="${detail.audioUrl}"></audio>
    </div>

    <div class="listenhub-audio-footer">
      <a href="${listenhubUrl}" class="listenhub-open-link" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
        </svg>
        在 ListenHub 中打开
      </a>
    </div>
  </div>
</div>

---
`;

			// 追加到笔记末尾
			const newContent = currentContent + audioSection;
			await this.app.vault.modify(file, newContent);

			if (this.settings.showNotifications) {
				new Notice('✅ 音频播放器已插入到笔记');
			}
		} catch (error: any) {
			new Notice(`插入音频失败: ${error.message}`);
			console.error('Failed to insert audio:', error);
		}
	}

	/**
	 * 查询积分余额
	 */
	async checkCredits() {
		if (!this.settings.apiKey) {
			new Notice('请先在设置中配置 API Key');
			return;
		}

		try {
			const response = await this.apiClient.getSubscription();
			const data = response.data;

			const message = [
				`📊 订阅计划: ${data.subscriptionPlan.name}`,
				`💰 总可用积分: ${data.totalAvailableCredits}`,
				`📅 月度积分: ${data.usageAvailableMonthlyCredits}/${data.usageTotalMonthlyCredits}`,
				`♾️ 永久积分: ${data.usageAvailablePermanentCredits}`,
				`⏰ 重置时间: ${new Date(data.resetAt).toLocaleDateString()}`
			].join('\n');

			new Notice(message, 10000);
		} catch (error: any) {
			new Notice(`查询失败: ${error.message}`);
			console.error('Failed to check credits:', error);
		}
	}
}
