export type AIProvider = "openai" | "anthropic" | "custom";

export interface AIConfig {
	provider: AIProvider;
	apiKey: string;
	model?: string;
	baseUrl?: string;
	temperature?: number;
	maxTokens?: number;
}

export interface Message {
	role: "user" | "assistant" | "system";
	content: string | MessageContent[];
}

export interface MessageContent {
	type: "text" | "image_url";
	text?: string;
	image_url?: {
		url: string;
		detail?: "low" | "high" | "auto";
	};
}

export interface AIResponse {
	content: string;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface VisionAnalysisRequest {
	imageUrl: string;
	prompt: string;
	detail?: "low" | "high" | "auto";
}

export interface VisionAnalysisResponse {
	description: string;
	elements?: ElementDescription[];
	suggestions?: string[];
}

export interface ElementDescription {
	type: string;
	description: string;
	location?: string;
	selector?: string;
}

export interface AutomationTask {
	id: string;
	type: "click" | "type" | "navigate" | "extract" | "wait" | "scroll" | "custom";
	description: string;
	selector?: string;
	value?: string;
	url?: string;
	waitCondition?: WaitCondition;
	metadata?: Record<string, unknown>;
}

export interface WaitCondition {
	type: "selector" | "navigation" | "timeout" | "custom";
	value: string | number;
	timeout?: number;
}

export interface AutomationPlan {
	id: string;
	name: string;
	description: string;
	tasks: AutomationTask[];
	createdAt: number;
	updatedAt: number;
}

export interface ExecutionResult {
	taskId: string;
	success: boolean;
	error?: string;
	data?: unknown;
	screenshot?: string;
	timestamp: number;
}

export interface AutomationContext {
	url: string;
	title: string;
	screenshot?: string;
	html?: string;
	accessibility?: AccessibilityTree;
}

export interface AccessibilityTree {
	role: string;
	name?: string;
	children?: AccessibilityTree[];
}
