import type { VisionAnalysisRequest, VisionAnalysisResponse } from "../types/ai.types";
import { AIService, getStoredAIConfig } from "../services/ai.service";

export class VisionService {
	/**
	 * Capture screenshot of the current page
	 */
	static async captureScreenshot(
		options?: {
			format?: "png" | "jpeg";
			quality?: number;
		},
	): Promise<string> {
		// Get the active tab
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

		if (!tab.id) {
			throw new Error("No active tab found");
		}

		// Capture visible tab
		const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId!, {
			format: options?.format || "png",
			quality: options?.quality || 90,
		});

		return dataUrl;
	}

	/**
	 * Capture screenshot of a specific element
	 */
	static async captureElement(selector: string): Promise<string> {
		const element = document.querySelector(selector);
		if (!element) {
			throw new Error(`Element not found: ${selector}`);
		}

		const rect = element.getBoundingClientRect();

		// Use html2canvas if available, otherwise fall back to full screenshot
		// For now, return full screenshot (can be enhanced with cropping)
		return this.captureScreenshot();
	}

	/**
	 * Analyze screenshot with AI vision
	 */
	static async analyzeScreenshot(
		screenshot: string,
		prompt: string,
	): Promise<VisionAnalysisResponse> {
		const config = await getStoredAIConfig();

		if (!config) {
			throw new Error("AI configuration not found. Please configure AI settings.");
		}

		const aiService = new AIService(config);

		const request: VisionAnalysisRequest = {
			imageUrl: screenshot,
			prompt,
		};

		return aiService.analyzeVision(request);
	}

	/**
	 * Analyze page for automation opportunities
	 */
	static async analyzePageForAutomation(): Promise<VisionAnalysisResponse> {
		const screenshot = await this.captureScreenshot();

		const prompt = `Analyze this web page screenshot and identify:
1. All interactive elements (buttons, links, inputs, forms)
2. The main purpose of the page
3. Possible automation tasks that could be performed
4. Data that could be extracted

Provide specific selectors or descriptions for each element identified.`;

		return this.analyzeScreenshot(screenshot, prompt);
	}

	/**
	 * Find element by visual description
	 */
	static async findElementByDescription(
		description: string,
	): Promise<VisionAnalysisResponse> {
		const screenshot = await this.captureScreenshot();

		const prompt = `Find the element matching this description: "${description}"

Provide:
1. The exact location of the element (e.g., "top-right corner", "center of page")
2. A CSS selector that could be used to target it
3. The element's text content if visible
4. What type of element it is (button, link, input, etc.)`;

		return this.analyzeScreenshot(screenshot, prompt);
	}

	/**
	 * Compare two screenshots
	 */
	static async compareScreenshots(
		screenshot1: string,
		screenshot2: string,
	): Promise<string> {
		const config = await getStoredAIConfig();

		if (!config) {
			throw new Error("AI configuration not found");
		}

		const aiService = new AIService(config);

		const response = await aiService.chat([
			{
				role: "user",
				content: [
					{
						type: "text",
						text: "Compare these two screenshots and describe the differences:",
					},
					{
						type: "image_url",
						image_url: { url: screenshot1 },
					},
					{
						type: "image_url",
						image_url: { url: screenshot2 },
					},
				],
			},
		]);

		return response.content;
	}

	/**
	 * Extract text from screenshot using OCR via AI
	 */
	static async extractTextFromImage(screenshot: string): Promise<string> {
		const response = await this.analyzeScreenshot(
			screenshot,
			"Extract all visible text from this image. Return the text in reading order.",
		);

		return response.description;
	}

	/**
	 * Annotate screenshot with element information
	 */
	static async annotateScreenshot(
		elements: Array<{ selector: string; label: string }>,
	): Promise<string> {
		const screenshot = await this.captureScreenshot();

		// This would ideally draw annotations on the screenshot
		// For now, return the original screenshot
		// Can be enhanced with canvas drawing
		return screenshot;
	}
}
