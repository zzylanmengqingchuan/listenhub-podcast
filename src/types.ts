/**
 * ListenHub API 类型定义
 */

export interface Speaker {
	name: string;
	speakerId: string;
	demoAudioUrl: string;
	gender: 'male' | 'female';
	language: 'zh' | 'en';
}

export interface SpeakersResponse {
	code: number;
	message: string;
	data: {
		items: Speaker[];
	};
}

export interface CreatePodcastRequest {
	query: string;
	speakers: { speakerId: string }[];
	language: 'zh' | 'en';
	mode: 'quick' | 'deep' | 'debate';
	sources?: Array<{
		type: 'text' | 'url';
		content: string;
	}>;
}

export interface CreateEpisodeResponse {
	code: number;
	message: string;
	data: {
		episodeId: string;
	};
}

export interface Script {
	speakerId: string;
	speakerName: string;
	content: string;
}

export interface EpisodeDetail {
	episodeId: string;
	createdAt: number;
	failCode: number;
	processStatus: 'pending' | 'processing' | 'success' | 'failed';
	contentStatus?: 'text-success' | 'text-fail' | 'audio-success' | 'audio-fail';
	credits: number;
	title: string;
	outline: string;
	cover: string;
	audioUrl: string;
	audioStreamUrl?: string;
	scripts: Script[];
	sourceProcessResult?: {
		content: string;
		references: string[];
	};
}

export interface EpisodeDetailResponse {
	code: number;
	message: string;
	data: EpisodeDetail;
}

export interface UserSubscription {
	subscriptionStartedAt: number;
	subscriptionExpiresAt: number;
	usageAvailableMonthlyCredits: number;
	usageTotalMonthlyCredits: number;
	usageAvailablePermanentCredits: number;
	usageTotalPermanentCredits: number;
	usageAvailableLimitedTimeCredits: number;
	totalAvailableCredits: number;
	resetAt: number;
	platform: string;
	renewStatus: boolean;
	paidStatus: boolean;
	subscriptionPlan: {
		name: string;
		duration: string;
		platform: string;
	};
}

export interface SubscriptionResponse {
	code: number;
	message: string;
	data: UserSubscription;
}

export type PodcastMode = 'quick' | 'deep' | 'debate';
export type Language = 'zh' | 'en';

export interface GenerationTask {
	episodeId: string;
	fileName: string;
	mode: PodcastMode;
	language: Language;
	status: 'pending' | 'processing' | 'success' | 'failed';
	createdAt: number;
	audioUrl?: string;
	title?: string;
	error?: string;
}
