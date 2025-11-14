import { AIService, getStoredAIConfig } from "../services/ai.service";
import type { Message } from "../types/ai.types";

export interface PageSummary {
	title: string;
	summary: string;
	mainTopics: string[];
	keyPoints: string[];
	pageType: string;
	technicalDetails?: {
		framework?: string;
		libraries?: string[];
		features?: string[];
	};
}

export class PageSummaryService {
	/**
	 * Generate a comprehensive summary of the current page
	 */
	static async generateSummary(): Promise<PageSummary> {
		const config = await getStoredAIConfig();

		if (!config) {
			throw new Error("AI configuration not found. Please configure AI settings.");
		}

		const aiService = new AIService(config);

		// Extract page content
		const pageContent = this.extractPageContent();

		const systemPrompt = `You are an expert at analyzing web pages and generating concise, accurate summaries.
Analyze the provided page content and return a JSON object with this exact structure:

{
  "title": "Main title or purpose of the page",
  "summary": "2-3 sentence summary of the page",
  "mainTopics": ["topic1", "topic2", "topic3"],
  "keyPoints": ["point1", "point2", "point3"],
  "pageType": "blog|documentation|product|landing|dashboard|app|other",
  "technicalDetails": {
    "framework": "React|Vue|Angular|Svelte|None",
    "libraries": ["library1", "library2"],
    "features": ["feature1", "feature2"]
  }
}

Focus on being concise and extracting the most important information.`;

		const messages: Message[] = [
			{ role: "system", content: systemPrompt },
			{
				role: "user",
				content: `Analyze this page content:\n\nURL: ${window.location.href}\nTitle: ${document.title}\n\nContent:\n${pageContent}`,
			},
		];

		const response = await aiService.chat(messages);

		// Parse JSON response
		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to parse AI response");
		}

		return JSON.parse(jsonMatch[0]);
	}

	/**
	 * Generate a quick summary (faster, less detailed)
	 */
	static async generateQuickSummary(): Promise<string> {
		const config = await getStoredAIConfig();

		if (!config) {
			throw new Error("AI configuration not found");
		}

		const aiService = new AIService(config);
		const pageContent = this.extractPageContent();

		const messages: Message[] = [
			{
				role: "user",
				content: `Summarize this web page in 1-2 sentences:\n\nTitle: ${document.title}\nURL: ${window.location.href}\n\nContent:\n${pageContent.substring(0, 2000)}`,
			},
		];

		const response = await aiService.chat(messages);
		return response.content;
	}

	/**
	 * Extract main content from the page
	 */
	private static extractPageContent(): string {
		// Remove script, style, and other non-content elements
		const clone = document.body.cloneNode(true) as HTMLElement;

		// Remove unwanted elements
		const unwantedSelectors = [
			"script",
			"style",
			"noscript",
			"iframe",
			"svg",
			"path",
			"[role='navigation']",
			"nav",
			"header",
			"footer",
			".advertisement",
			".ad",
			"[class*='cookie']",
		];

		for (const selector of unwantedSelectors) {
			const elements = clone.querySelectorAll(selector);
			for (const el of elements) {
				el.remove();
			}
		}

		// Get text content
		let content = clone.innerText;

		// Clean up whitespace
		content = content
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.join("\n");

		// Limit to 8000 characters for AI processing
		return content.substring(0, 8000);
	}

	/**
	 * Detect the type of page based on DOM structure
	 */
	static detectPageType(): string {
		// Check for common patterns
		if (document.querySelector('article[role="article"]')) return "blog";
		if (document.querySelector(".documentation, .docs")) return "documentation";
		if (document.querySelector('[class*="product"]')) return "product";
		if (document.querySelector('[class*="dashboard"]')) return "dashboard";
		if (document.querySelector("main")) return "app";

		// Check meta tags
		const ogType = document
			.querySelector('meta[property="og:type"]')
			?.getAttribute("content");
		if (ogType === "article") return "blog";

		return "webpage";
	}

	/**
	 * Extract main topics from page headers
	 */
	static extractMainTopics(): string[] {
		const topics: string[] = [];
		const headers = document.querySelectorAll("h1, h2, h3");

		for (const header of headers) {
			const text = header.textContent?.trim();
			if (text && text.length > 3 && text.length < 100) {
				topics.push(text);
			}
		}

		return topics.slice(0, 10); // Return top 10
	}

	/**
	 * Extract structured data from the page
	 */
	static extractStructuredData(): Record<string, unknown> | null {
		const ldJson = document.querySelector('script[type="application/ld+json"]');
		if (ldJson?.textContent) {
			try {
				return JSON.parse(ldJson.textContent);
			} catch (e) {
				return null;
			}
		}
		return null;
	}
}
