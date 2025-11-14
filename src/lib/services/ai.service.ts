import type {
	AIConfig,
	AIResponse,
	Message,
	VisionAnalysisRequest,
	VisionAnalysisResponse,
} from "../types/ai.types";

export class AIService {
	private config: AIConfig;

	constructor(config: AIConfig) {
		this.config = config;
	}

	async chat(messages: Message[]): Promise<AIResponse> {
		switch (this.config.provider) {
			case "openai":
				return this.chatOpenAI(messages);
			case "anthropic":
				return this.chatAnthropic(messages);
			case "custom":
				return this.chatCustom(messages);
			default:
				throw new Error(`Unsupported AI provider: ${this.config.provider}`);
		}
	}

	async analyzeVision(request: VisionAnalysisRequest): Promise<VisionAnalysisResponse> {
		const messages: Message[] = [
			{
				role: "user",
				content: [
					{
						type: "text",
						text: request.prompt,
					},
					{
						type: "image_url",
						image_url: {
							url: request.imageUrl,
							detail: request.detail || "auto",
						},
					},
				],
			},
		];

		const response = await this.chat(messages);

		return {
			description: response.content,
			elements: this.parseElements(response.content),
			suggestions: this.parseSuggestions(response.content),
		};
	}

	private async chatOpenAI(messages: Message[]): Promise<AIResponse> {
		const baseUrl = this.config.baseUrl || "https://api.openai.com/v1";
		const model = this.config.model || "gpt-4o";

		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.config.apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: messages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				})),
				temperature: this.config.temperature || 0.7,
				max_tokens: this.config.maxTokens || 4096,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI API error: ${error}`);
		}

		const data = await response.json();

		return {
			content: data.choices[0].message.content,
			usage: data.usage,
		};
	}

	private async chatAnthropic(messages: Message[]): Promise<AIResponse> {
		const baseUrl = this.config.baseUrl || "https://api.anthropic.com/v1";
		const model = this.config.model || "claude-3-5-sonnet-20241022";

		// Separate system messages
		const systemMessages = messages.filter((m) => m.role === "system");
		const nonSystemMessages = messages.filter((m) => m.role !== "system");

		const response = await fetch(`${baseUrl}/messages`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.config.apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model,
				max_tokens: this.config.maxTokens || 4096,
				temperature: this.config.temperature || 0.7,
				system: systemMessages.length > 0 ? systemMessages[0].content : undefined,
				messages: nonSystemMessages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				})),
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Anthropic API error: ${error}`);
		}

		const data = await response.json();

		return {
			content: data.content[0].text,
			usage: data.usage
				? {
						prompt_tokens: data.usage.input_tokens,
						completion_tokens: data.usage.output_tokens,
						total_tokens: data.usage.input_tokens + data.usage.output_tokens,
					}
				: undefined,
		};
	}

	private async chatCustom(messages: Message[]): Promise<AIResponse> {
		if (!this.config.baseUrl) {
			throw new Error("Custom provider requires baseUrl");
		}

		const response = await fetch(`${this.config.baseUrl}/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.config.apiKey}`,
			},
			body: JSON.stringify({
				messages,
				temperature: this.config.temperature || 0.7,
				max_tokens: this.config.maxTokens || 4096,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Custom API error: ${error}`);
		}

		const data = await response.json();

		return {
			content: data.content || data.message || data.text,
			usage: data.usage,
		};
	}

	private parseElements(content: string) {
		// Simple parsing - can be enhanced
		const elementRegex = /Element:\s*([^\n]+)/gi;
		const matches = content.matchAll(elementRegex);
		const elements = [];

		for (const match of matches) {
			elements.push({
				type: "element",
				description: match[1].trim(),
			});
		}

		return elements.length > 0 ? elements : undefined;
	}

	private parseSuggestions(content: string) {
		// Simple parsing - can be enhanced
		const suggestionRegex = /(?:Suggestion|Action):\s*([^\n]+)/gi;
		const matches = content.matchAll(suggestionRegex);
		const suggestions = [];

		for (const match of matches) {
			suggestions.push(match[1].trim());
		}

		return suggestions.length > 0 ? suggestions : undefined;
	}
}

export async function getStoredAIConfig(): Promise<AIConfig | null> {
	const result = await chrome.storage.local.get("aiConfig");
	return result.aiConfig || null;
}

export async function setStoredAIConfig(config: AIConfig): Promise<void> {
	await chrome.storage.local.set({ aiConfig: config });
}
