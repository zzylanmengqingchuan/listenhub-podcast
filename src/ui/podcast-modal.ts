import { App, Modal, Setting, Notice } from 'obsidian';
import { PodcastMode, Language, Speaker } from '../types';
import ListenHubPlugin from '../../main';

export class PodcastGenerationModal extends Modal {
	plugin: ListenHubPlugin;
	content: string;
	fileName: string;

	mode: PodcastMode;
	language: Language;
	speakers: string[];
	useDualSpeaker: boolean;

	onSubmit: (config: {
		mode: PodcastMode;
		language: Language;
		speakers: string[];
		content: string;
	}) => void;

	constructor(
		app: App,
		plugin: ListenHubPlugin,
		content: string,
		fileName: string,
		onSubmit: (config: any) => void
	) {
		super(app);
		this.plugin = plugin;
		this.content = content;
		this.fileName = fileName;
		this.onSubmit = onSubmit;

		// 初始化默认值
		this.mode = plugin.settings.defaultMode;
		this.language = plugin.settings.defaultLanguage;
		this.useDualSpeaker = this.mode === 'debate';
		this.speakers = this.useDualSpeaker
			? [plugin.settings.defaultSpeakerId, plugin.settings.secondSpeakerId]
			: [plugin.settings.defaultSpeakerId];
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: '生成播客' });

		// 显示文件名
		new Setting(contentEl)
			.setName('文章')
			.setDesc(this.fileName)
			.setDisabled(true);

		// 显示内容长度
		const wordCount = this.content.length;
		new Setting(contentEl)
			.setName('内容长度')
			.setDesc(`${wordCount} 字符`)
			.setDisabled(true);

		// 语言选择
		new Setting(contentEl)
			.setName('语言')
			.setDesc('选择播客语言')
			.addDropdown(dropdown => dropdown
				.addOption('zh', '中文')
				.addOption('en', 'English')
				.setValue(this.language)
				.onChange((value) => {
					this.language = value as Language;
				}));

		// 模式选择
		new Setting(contentEl)
			.setName('生成模式')
			.setDesc('Quick: 1-2分钟 | Deep: 2-4分钟 | Debate: 双人辩论')
			.addDropdown(dropdown => dropdown
				.addOption('quick', 'Quick (快速)')
				.addOption('deep', 'Deep (深度)')
				.addOption('debate', 'Debate (辩论)')
				.setValue(this.mode)
				.onChange((value) => {
					this.mode = value as PodcastMode;
					this.useDualSpeaker = this.mode === 'debate';
					this.updateSpeakerSettings();
				}));

		// 双人播客开关
		const dualSpeakerSetting = new Setting(contentEl)
			.setName('双人播客')
			.setDesc('使用两个音色进行对话')
			.addToggle(toggle => toggle
				.setValue(this.useDualSpeaker)
				.setDisabled(this.mode === 'debate')
				.onChange((value) => {
					this.useDualSpeaker = value;
					this.updateSpeakerSettings();
				}));

		// 第一个音色
		const speaker1Setting = new Setting(contentEl)
			.setName('主音色')
			.setDesc('第一个主播的音色')
			.addText(text => text
				.setPlaceholder('CN-Man-Beijing-V2')
				.setValue(this.speakers[0] || this.plugin.settings.defaultSpeakerId)
				.onChange((value) => {
					this.speakers[0] = value;
				}));

		// 第二个音色（仅双人模式显示）
		const speaker2Setting = new Setting(contentEl)
			.setName('副音色')
			.setDesc('第二个主播的音色')
			.addText(text => text
				.setPlaceholder('chat-girl-105-cn')
				.setValue(this.speakers[1] || this.plugin.settings.secondSpeakerId)
				.onChange((value) => {
					this.speakers[1] = value;
				}));

		// 保存设置引用以便动态更新
		this.updateSpeakerSettings = () => {
			speaker2Setting.settingEl.style.display = this.useDualSpeaker ? '' : 'none';

			if (this.useDualSpeaker && this.speakers.length === 1) {
				this.speakers.push(this.plugin.settings.secondSpeakerId);
			} else if (!this.useDualSpeaker && this.speakers.length > 1) {
				this.speakers = [this.speakers[0]];
			}
		};

		this.updateSpeakerSettings();

		// 预估积分
		new Setting(contentEl)
			.setName('预估积分')
			.setDesc('实际消耗以生成结果为准')
			.setDisabled(true);

		// 提交按钮
		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('取消')
				.onClick(() => {
					this.close();
				}))
			.addButton(button => button
				.setButtonText('开始生成')
				.setCta()
				.onClick(() => {
					this.submit();
				}));
	}

	updateSpeakerSettings!: () => void;

	submit() {
		// 验证
		if (!this.plugin.settings.apiKey) {
			new Notice('请先在设置中配置 API Key');
			return;
		}

		if (this.speakers.length === 0 || !this.speakers[0]) {
			new Notice('请至少选择一个音色');
			return;
		}

		if (this.useDualSpeaker && this.speakers.length < 2) {
			new Notice('双人播客需要选择两个音色');
			return;
		}

		if (this.mode === 'debate' && this.speakers.length < 2) {
			new Notice('辩论模式需要两个音色');
			return;
		}

		// 提交配置
		this.onSubmit({
			mode: this.mode,
			language: this.language,
			speakers: this.speakers,
			content: this.content
		});

		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
