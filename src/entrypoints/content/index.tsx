import "../global.css";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { DOMUtils } from "@/lib/automation/dom-utils";
import { ActionRecorder, ActionPlayer } from "@/lib/automation/recorder";
import { AutomationOrchestrator } from "@/lib/automation/orchestrator";
import { PageSummaryService } from "@/lib/extractors/page-summary";
import { ReactExtractor } from "@/lib/extractors/react-extractor";
import { TailwindExtractor } from "@/lib/extractors/tailwind-extractor";
import type { AutomationPlan } from "@/lib/types/ai.types";

// Initialize automation tools
const recorder = new ActionRecorder();
const player = new ActionPlayer();
const orchestrator = new AutomationOrchestrator();

// Expose automation API globally
(window as any).__automationAPI = {
	// Recorder
	startRecording: () => recorder.start(),
	stopRecording: () => recorder.stop(),
	getRecordingStatus: () => recorder.getStatus(),

	// Player
	playRecording: (recording: any, options?: any) => player.play(recording, options),
	pausePlayback: () => player.pause(),
	resumePlayback: () => player.resume(),
	stopPlayback: () => player.stop(),
	getPlaybackProgress: () => player.getProgress(),

	// Orchestrator
	executePlan: (plan: AutomationPlan, options?: any) =>
		orchestrator.executePlan(plan, options),
	executeTask: (task: any, options?: any) => orchestrator.executeTask(task, options),
	generatePlan: (prompt: string) => orchestrator.generatePlanFromPrompt(prompt),
	getContext: () => orchestrator.getContext(),
	getResults: () => orchestrator.getResults(),

	// DOM Utils
	findElement: (query: any) => DOMUtils.findElement(query),
	findByText: (text: string, exact?: boolean) => DOMUtils.findByText(text, exact),
	findInteractiveElements: () => DOMUtils.findInteractiveElements(),
	getPageContext: () => DOMUtils.getPageContext(),
	extractData: (selector: string, attribute?: string) =>
		DOMUtils.extractData(selector, attribute),
	clickElement: (element: Element, options?: any) =>
		DOMUtils.clickElement(element, options),
	typeText: (element: Element, text: string, options?: any) =>
		DOMUtils.typeText(element, text, options),
	waitForElement: (selector: string, timeout?: number) =>
		DOMUtils.waitForElement(selector, timeout),
	highlightElement: (element: Element, duration?: number) =>
		DOMUtils.highlightElement(element, duration),
};

// Expose extractor API globally
(window as any).__extractorAPI = {
	// Page Summary
	generateSummary: () => PageSummaryService.generateSummary(),
	generateQuickSummary: () => PageSummaryService.generateQuickSummary(),
	detectPageType: () => PageSummaryService.detectPageType(),
	extractMainTopics: () => PageSummaryService.extractMainTopics(),
	extractStructuredData: () => PageSummaryService.extractStructuredData(),

	// React Extraction
	detectReact: () => ReactExtractor.detectReact(),
	extractReact: () => ReactExtractor.extractAllComponents(),
	findReactRoots: () => ReactExtractor.findReactRoots(),
	extractReactComponent: (element: Element) =>
		ReactExtractor.extractComponent(element),
	generateJSX: (component: any) => ReactExtractor.generateJSX(component),

	// Tailwind Extraction
	detectTailwind: () => TailwindExtractor.detectTailwind(),
	extractTailwind: () => TailwindExtractor.extractComponents(),
	extractTailwindBySelector: (selector: string) =>
		TailwindExtractor.extractBySelector(selector),
	extractTailwindByCategory: (category: string) =>
		TailwindExtractor.extractByCategory(category),
	generateTailwindComponent: (component: any, framework: "react" | "vue") =>
		TailwindExtractor.generateComponent(component, framework),
};

export default defineContentScript({
	matches: ["*://*/*"],
	cssInjectionMode: "ui",

	async main(ctx) {
		console.log("🤖 AI Automation Content Script Loaded");

		const ui = await createShadowRootUi(ctx, {
			name: "ai-automation-extension",
			position: "inline",
			anchor: "body",
			append: "first",
			onMount: (container) => {
				// Don't mount react app directly on <body>
				const wrapper = document.createElement("div");
				container.append(wrapper);

				const root = ReactDOM.createRoot(wrapper);
				root.render(<App />);
				return { root, wrapper };
			},
			onRemove: (elements) => {
				elements?.root.unmount();
				elements?.wrapper.remove();
			},
		});

		ui.mount();
	},
});
