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

			// 格式化音频时长（秒转分钟）
			const durationMin = detail.audioDuration ? Math.round(detail.audioDuration / 60000) : 0;

			// 构建插入内容
			const audioSection = `

---

## 🎙️ 播客音频

**标题**: ${detail.title}
**时长**: ${durationMin} 分钟 | **积分**: ${detail.credits} | **模式**: ${mode}

<audio controls src="${detail.audioUrl}" style="width: 100%"></audio>

[📱 在 ListenHub 中打开](${listenhubUrl})

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
