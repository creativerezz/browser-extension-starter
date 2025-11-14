import type {
	AutomationTask,
	AutomationPlan,
	ExecutionResult,
	AutomationContext,
} from "../types/ai.types";
import { DOMUtils } from "./dom-utils";
import { VisionService } from "./vision";
import { AIService, getStoredAIConfig } from "../services/ai.service";

export interface OrchestrationOptions {
	onProgress?: (result: ExecutionResult) => void;
	onError?: (error: Error, taskId: string) => void;
	continueOnError?: boolean;
	screenshotOnError?: boolean;
	aiAssisted?: boolean;
}

export class AutomationOrchestrator {
	private results: ExecutionResult[] = [];
	private currentContext: AutomationContext | null = null;

	async executePlan(
		plan: AutomationPlan,
		options?: OrchestrationOptions,
	): Promise<ExecutionResult[]> {
		console.log(`🚀 Executing automation plan: ${plan.name}`);

		this.results = [];

		for (const task of plan.tasks) {
			try {
				const result = await this.executeTask(task, options);
				this.results.push(result);

				options?.onProgress?.(result);

				if (!result.success && !options?.continueOnError) {
					console.error("Task failed, stopping execution:", result.error);
					break;
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				const result: ExecutionResult = {
					taskId: task.id,
					success: false,
					error: errorMessage,
					timestamp: Date.now(),
				};

				this.results.push(result);

				options?.onError?.(
					error instanceof Error ? error : new Error(String(error)),
					task.id,
				);

				if (!options?.continueOnError) {
					break;
				}
			}
		}

		return this.results;
	}

	async executeTask(
		task: AutomationTask,
		options?: OrchestrationOptions,
	): Promise<ExecutionResult> {
		console.log(`⚡ Executing task: ${task.description}`);

		const startTime = Date.now();

		try {
			let data: unknown;

			switch (task.type) {
				case "click":
					data = await this.executeClick(task, options);
					break;
				case "type":
					data = await this.executeType(task);
					break;
				case "navigate":
					data = await this.executeNavigate(task);
					break;
				case "extract":
					data = await this.executeExtract(task);
					break;
				case "wait":
					data = await this.executeWait(task);
					break;
				case "scroll":
					data = await this.executeScroll(task);
					break;
				case "custom":
					data = await this.executeCustom(task);
					break;
				default:
					throw new Error(`Unknown task type: ${task.type}`);
			}

			return {
				taskId: task.id,
				success: true,
				data,
				timestamp: Date.now(),
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			let screenshot: string | undefined;
			if (options?.screenshotOnError) {
				try {
					screenshot = await VisionService.captureScreenshot();
				} catch (e) {
					console.error("Failed to capture error screenshot:", e);
				}
			}

			return {
				taskId: task.id,
				success: false,
				error: errorMessage,
				screenshot,
				timestamp: Date.now(),
			};
		}
	}

	private async executeClick(
		task: AutomationTask,
		options?: OrchestrationOptions,
	): Promise<void> {
		let element: Element | null = null;

		if (task.selector) {
			element = await DOMUtils.waitForElement(task.selector, 10000);
		} else if (options?.aiAssisted && task.description) {
			// Use AI to find the element
			element = await this.findElementWithAI(task.description);
		}

		if (!element) {
			throw new Error(
				`Element not found: ${task.selector || task.description}`,
			);
		}

		DOMUtils.highlightElement(element);
		await DOMUtils.clickElement(element, { scroll: true, delay: 500 });
	}

	private async executeType(task: AutomationTask): Promise<void> {
		if (!task.selector) {
			throw new Error("Selector required for type task");
		}

		if (!task.value) {
			throw new Error("Value required for type task");
		}

		const element = await DOMUtils.waitForElement(task.selector, 10000);

		if (!element) {
			throw new Error(`Element not found: ${task.selector}`);
		}

		DOMUtils.highlightElement(element);
		await DOMUtils.typeText(element, task.value, { clear: true, delay: 50 });
	}

	private async executeNavigate(task: AutomationTask): Promise<void> {
		if (!task.url) {
			throw new Error("URL required for navigate task");
		}

		window.location.href = task.url;
		await DOMUtils.wait(2000);
	}

	private async executeExtract(task: AutomationTask): Promise<unknown> {
		if (!task.selector) {
			throw new Error("Selector required for extract task");
		}

		const data = DOMUtils.extractData(task.selector);

		if (task.metadata?.attribute) {
			return DOMUtils.extractData(
				task.selector,
				task.metadata.attribute as string,
			);
		}

		return data;
	}

	private async executeWait(task: AutomationTask): Promise<void> {
		const condition = task.waitCondition;

		if (!condition) {
			// Default wait
			await DOMUtils.wait(1000);
			return;
		}

		switch (condition.type) {
			case "selector":
				await DOMUtils.waitForElement(
					condition.value as string,
					condition.timeout || 10000,
				);
				break;
			case "timeout":
				await DOMUtils.wait(condition.value as number);
				break;
			case "navigation":
				await DOMUtils.waitForNavigation(condition.timeout || 30000);
				break;
			default:
				await DOMUtils.wait(1000);
		}
	}

	private async executeScroll(task: AutomationTask): Promise<void> {
		if (task.selector) {
			const element = await DOMUtils.waitForElement(task.selector, 5000);
			if (element) {
				DOMUtils.scrollToElement(element);
			}
		} else if (task.value) {
			const scrollAmount = parseInt(task.value, 10);
			window.scrollBy(0, scrollAmount);
		}

		await DOMUtils.wait(500);
	}

	private async executeCustom(task: AutomationTask): Promise<unknown> {
		// Allow custom code execution via metadata
		if (task.metadata?.code) {
			const code = task.metadata.code as string;
			// biome-ignore lint/security/noGlobalEval: Custom task execution feature
			return eval(code);
		}

		throw new Error("Custom task requires code in metadata");
	}

	private async findElementWithAI(description: string): Promise<Element | null> {
		const config = await getStoredAIConfig();

		if (!config) {
			throw new Error("AI configuration required for AI-assisted automation");
		}

		const aiService = new AIService(config);
		const screenshot = await VisionService.captureScreenshot();

		const response = await aiService.analyzeVision({
			imageUrl: screenshot,
			prompt: `Find the element matching this description: "${description}"

Respond with ONLY a CSS selector that can be used to find this element. If you cannot find a suitable selector, respond with "NOT_FOUND".`,
		});

		const selector = response.description.trim();

		if (selector === "NOT_FOUND") {
			return null;
		}

		return document.querySelector(selector);
	}

	async getContext(): Promise<AutomationContext> {
		this.currentContext = {
			url: window.location.href,
			title: document.title,
			screenshot: await VisionService.captureScreenshot(),
			html: document.documentElement.outerHTML,
		};

		return this.currentContext;
	}

	getResults(): ExecutionResult[] {
		return this.results;
	}

	async generatePlanFromPrompt(prompt: string): Promise<AutomationPlan> {
		const config = await getStoredAIConfig();

		if (!config) {
			throw new Error("AI configuration required");
		}

		const aiService = new AIService(config);
		const context = await this.getContext();

		const systemPrompt = `You are an expert web automation assistant. Generate a detailed automation plan based on the user's request and the current page context.

Return your response as a JSON object with this structure:
{
  "name": "Plan name",
  "description": "Plan description",
  "tasks": [
    {
      "id": "unique-id",
      "type": "click|type|navigate|extract|wait|scroll",
      "description": "Task description",
      "selector": "CSS selector (if applicable)",
      "value": "Value (if applicable)",
      "url": "URL (for navigate tasks)"
    }
  ]
}

Available task types:
- click: Click an element
- type: Type text into an input
- navigate: Navigate to a URL
- extract: Extract data from elements
- wait: Wait for a condition
- scroll: Scroll to an element or position`;

		const response = await aiService.chat([
			{ role: "system", content: systemPrompt },
			{
				role: "user",
				content: `Current page: ${context.url}
Title: ${context.title}

User request: ${prompt}

Generate an automation plan.`,
			},
		]);

		// Parse the JSON response
		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to parse AI response");
		}

		const planData = JSON.parse(jsonMatch[0]);

		return {
			id: crypto.randomUUID(),
			name: planData.name,
			description: planData.description,
			tasks: planData.tasks,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
	}
}
