import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ListenHubPlugin from '../main';
import { Language, PodcastMode } from './types';

export interface ListenHubSettings {
	apiKey: string;
	defaultLanguage: Language;
	defaultMode: PodcastMode;
	defaultSpeakerId: string;
	secondSpeakerId: string;
	autoDownload: boolean;
	showNotifications: boolean;
}

export const DEFAULT_SETTINGS: ListenHubSettings = {
	apiKey: '',
	defaultLanguage: 'zh',
	defaultMode: 'quick',
	defaultSpeakerId: 'CN-Man-Beijing-V2',
	secondSpeakerId: 'chat-girl-105-cn',
	autoDownload: false,
	showNotifications: true
};

export class ListenHubSettingTab extends PluginSettingTab {
	plugin: ListenHubPlugin;

	constructor(app: App, plugin: ListenHubPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'ListenHub 播客生成器设置' });

		// API Key 设置
		new Setting(containerEl)
			.setName('API Key')
			.setDesc('在 ListenHub 获取你的 API Key (需要 Pro/Business/Enterprise 订阅)')
			.addText(text => text
				.setPlaceholder('输入你的 API Key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}))
			.addButton(button => button
				.setButtonText('验证')
				.onClick(async () => {
					if (!this.plugin.settings.apiKey) {
						new Notice('请先输入 API Key');
						return;
					}

					const isValid = await this.plugin.apiClient.validateApiKey();
					if (isValid) {
						new Notice('✅ API Key 验证成功！');
					} else {
						new Notice('❌ API Key 验证失败，请检查是否正确');
					}
				}));

		// 获取 API Key 链接
		new Setting(containerEl)
			.setName('获取 API Key')
			.setDesc('点击下方链接访问 ListenHub 设置页面')
			.addButton(button => button
				.setButtonText('打开 API Keys 页面')
				.onClick(() => {
					window.open('https://listenhub.ai/settings/api-keys', '_blank');
				}));

		containerEl.createEl('h3', { text: '默认设置' });

		// 语言设置
		new Setting(containerEl)
			.setName('默认语言')
			.setDesc('生成播客时使用的默认语言')
			.addDropdown(dropdown => dropdown
				.addOption('zh', '中文')
				.addOption('en', 'English')
				.setValue(this.plugin.settings.defaultLanguage)
				.onChange(async (value) => {
					this.plugin.settings.defaultLanguage = value as Language;
					await this.plugin.saveSettings();
				}));

		// 模式设置
		new Setting(containerEl)
			.setName('默认模式')
			.setDesc('Quick: 快速生成 | Deep: 深度分析 | Debate: 双人辩论')
			.addDropdown(dropdown => dropdown
				.addOption('quick', 'Quick (快速)')
				.addOption('deep', 'Deep (深度)')
				.addOption('debate', 'Debate (辩论)')
				.setValue(this.plugin.settings.defaultMode)
				.onChange(async (value) => {
					this.plugin.settings.defaultMode = value as PodcastMode;
					await this.plugin.saveSettings();
				}));

		// 主音色设置
		new Setting(containerEl)
			.setName('默认主音色')
			.setDesc('第一个主播的音色 ID')
			.addText(text => text
				.setPlaceholder('CN-Man-Beijing-V2')
				.setValue(this.plugin.settings.defaultSpeakerId)
				.onChange(async (value) => {
					this.plugin.settings.defaultSpeakerId = value;
					await this.plugin.saveSettings();
				}))
			.addButton(button => button
				.setButtonText('查看音色列表')
				.onClick(() => {
					window.open('https://docs.marswave.ai/openapi-user.html#tag/speaker', '_blank');
				}));

		// 副音色设置（用于双人播客）
		new Setting(containerEl)
			.setName('默认副音色')
			.setDesc('双人播客时第二个主播的音色 ID')
			.addText(text => text
				.setPlaceholder('chat-girl-105-cn')
				.setValue(this.plugin.settings.secondSpeakerId)
				.onChange(async (value) => {
					this.plugin.settings.secondSpeakerId = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: '其他选项' });

		// 自动下载
		new Setting(containerEl)
			.setName('自动下载音频')
			.setDesc('生成完成后自动下载音频文件到 vault')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoDownload)
				.onChange(async (value) => {
					this.plugin.settings.autoDownload = value;
					await this.plugin.saveSettings();
				}));

		// 通知设置
		new Setting(containerEl)
			.setName('显示通知')
			.setDesc('在生成过程中显示通知消息')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNotifications)
				.onChange(async (value) => {
					this.plugin.settings.showNotifications = value;
					await this.plugin.saveSettings();
				}));

		// 查看余额
		containerEl.createEl('h3', { text: '账户信息' });

		new Setting(containerEl)
			.setName('查看积分余额')
			.setDesc('查询当前账户的积分余额和订阅状态')
			.addButton(button => button
				.setButtonText('查询余额')
				.onClick(async () => {
					if (!this.plugin.settings.apiKey) {
						new Notice('请先配置 API Key');
						return;
					}

					try {
						const response = await this.plugin.apiClient.getSubscription();
						const data = response.data;

						const message = [
							`📊 订阅计划: ${data.subscriptionPlan.name}`,
							`💰 总可用积分: ${data.totalAvailableCredits}`,
							`📅 月度积分: ${data.usageAvailableMonthlyCredits}/${data.usageTotalMonthlyCredits}`,
							`♾️ 永久积分: ${data.usageAvailablePermanentCredits}`,
							`⏰ 重置时间: ${new Date(data.resetAt).toLocaleDateString()}`
						].join('\n');

						new Notice(message, 8000);
					} catch (error) {
						new Notice(`查询失败: ${error.message}`);
					}
				}));
	}
}
