import { requestUrl, RequestUrlParam } from 'obsidian';
import {
	SpeakersResponse,
	CreatePodcastRequest,
	CreateEpisodeResponse,
	EpisodeDetailResponse,
	SubscriptionResponse,
	Language
} from './types';

/**
 * ListenHub API 客户端
 */
export class ListenHubApiClient {
	private baseUrl = 'https://api.marswave.ai/openapi/v1';
	private apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	/**
	 * 更新 API Key
	 */
	setApiKey(apiKey: string) {
		this.apiKey = apiKey;
	}

	/**
	 * 发送 HTTP 请求
	 */
	private async request<T>(params: RequestUrlParam): Promise<T> {
		const headers = {
			'Authorization': `Bearer ${this.apiKey}`,
			'Content-Type': 'application/json',
			...params.headers
		};

		try {
			const response = await requestUrl({
				...params,
				headers,
				throw: false
			});

			if (response.status >= 400) {
				throw new Error(`HTTP ${response.status}: ${response.text}`);
			}

			const data = response.json;

			// ListenHub API 使用 code 字段表示业务状态
			if (data.code !== 0) {
				throw new Error(`API Error ${data.code}: ${data.message || 'Unknown error'}`);
			}

			return data as T;
		} catch (error: any) {
			console.error('ListenHub API request failed:', error);
			throw error;
		}
	}

	/**
	 * 获取可用音色列表
	 */
	async getSpeakers(language?: Language): Promise<SpeakersResponse> {
		const url = language
			? `${this.baseUrl}/speakers/list?language=${language}`
			: `${this.baseUrl}/speakers/list`;

		return this.request<SpeakersResponse>({
			url,
			method: 'GET'
		});
	}

	/**
	 * 创建播客单集
	 */
	async createPodcast(request: CreatePodcastRequest): Promise<CreateEpisodeResponse> {
		return this.request<CreateEpisodeResponse>({
			url: `${this.baseUrl}/podcast/episodes`,
			method: 'POST',
			body: JSON.stringify(request)
		});
	}

	/**
	 * 创建播客文本内容（两阶段生成-第一阶段）
	 */
	async createPodcastTextContent(request: CreatePodcastRequest): Promise<CreateEpisodeResponse> {
		return this.request<CreateEpisodeResponse>({
			url: `${this.baseUrl}/podcast/episodes/text-content`,
			method: 'POST',
			body: JSON.stringify(request)
		});
	}

	/**
	 * 生成播客音频（两阶段生成-第二阶段）
	 */
	async generatePodcastAudio(episodeId: string, scripts?: any[]): Promise<any> {
		const body = scripts ? { scripts } : {};

		return this.request({
			url: `${this.baseUrl}/podcast/episodes/${episodeId}/audio`,
			method: 'POST',
			body: JSON.stringify(body)
		});
	}

	/**
	 * 查询单集详情
	 */
	async getEpisode(episodeId: string): Promise<EpisodeDetailResponse> {
		return this.request<EpisodeDetailResponse>({
			url: `${this.baseUrl}/podcast/episodes/${episodeId}`,
			method: 'GET'
		});
	}

	/**
	 * 获取用户订阅信息
	 */
	async getSubscription(): Promise<SubscriptionResponse> {
		return this.request<SubscriptionResponse>({
			url: `${this.baseUrl}/user/subscription`,
			method: 'GET'
		});
	}

	/**
	 * 轮询等待单集生成完成
	 * @param episodeId 单集ID
	 * @param onProgress 进度回调
	 * @param timeout 超时时间（毫秒），默认5分钟
	 */
	async pollEpisodeResult(
		episodeId: string,
		onProgress?: (status: string, detail?: any) => void,
		timeout: number = 300000
	): Promise<EpisodeDetailResponse> {
		const startTime = Date.now();

		// 首次等待60秒
		await this.sleep(60000);
		onProgress?.('processing', { message: '正在生成中，请稍候...' });

		// 每10秒轮询一次
		while (Date.now() - startTime < timeout) {
			const response = await this.getEpisode(episodeId);
			const status = response.data.processStatus;

			onProgress?.(status, response.data);

			if (status === 'success') {
				return response;
			} else if (status === 'failed') {
				throw new Error(`生成失败: ${response.data.sourceProcessResult?.content || '未知错误'}`);
			}

			await this.sleep(10000);
		}

		throw new Error('生成超时，请稍后手动查询结果');
	}

	/**
	 * 延迟函数
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * 验证 API Key 是否有效
	 */
	async validateApiKey(): Promise<boolean> {
		try {
			await this.getSpeakers('zh');
			return true;
		} catch (error: any) {
			console.error('API Key validation failed:', error);
			return false;
		}
	}
}
