import type { AutomationTask } from "../types/ai.types";
import { DOMUtils } from "./dom-utils";

export interface RecordedAction {
	type: "click" | "input" | "navigation" | "scroll" | "select" | "keypress";
	timestamp: number;
	target?: {
		selector: string;
		tagName: string;
		text?: string;
	};
	value?: string;
	url?: string;
	key?: string;
	scrollPosition?: { x: number; y: number };
}

export interface Recording {
	id: string;
	name: string;
	actions: RecordedAction[];
	startUrl: string;
	createdAt: number;
}

export class ActionRecorder {
	private isRecording = false;
	private actions: RecordedAction[] = [];
	private startUrl = "";
	private startTime = 0;
	private listeners: Map<string, EventListener> = new Map();

	start() {
		if (this.isRecording) {
			console.warn("Already recording");
			return;
		}

		this.isRecording = true;
		this.actions = [];
		this.startUrl = window.location.href;
		this.startTime = Date.now();

		this.attachListeners();

		console.log("🎬 Recording started");
	}

	stop(): Recording {
		if (!this.isRecording) {
			console.warn("Not recording");
			return {
				id: "",
				name: "",
				actions: [],
				startUrl: "",
				createdAt: 0,
			};
		}

		this.isRecording = false;
		this.removeListeners();

		const recording: Recording = {
			id: crypto.randomUUID(),
			name: `Recording ${new Date().toLocaleString()}`,
			actions: [...this.actions],
			startUrl: this.startUrl,
			createdAt: Date.now(),
		};

		console.log("⏹️ Recording stopped", recording);

		return recording;
	}

	private attachListeners() {
		// Click events
		const clickListener = (e: Event) => {
			const target = e.target as Element;
			if (!target) return;

			this.recordAction({
				type: "click",
				timestamp: Date.now() - this.startTime,
				target: {
					selector: DOMUtils.getSelector(target),
					tagName: target.tagName.toLowerCase(),
					text: target.textContent?.trim().substring(0, 100),
				},
			});
		};

		// Input events
		const inputListener = (e: Event) => {
			const target = e.target as HTMLInputElement | HTMLTextAreaElement;
			if (!target) return;

			this.recordAction({
				type: "input",
				timestamp: Date.now() - this.startTime,
				target: {
					selector: DOMUtils.getSelector(target),
					tagName: target.tagName.toLowerCase(),
				},
				value: target.value,
			});
		};

		// Navigation events
		const navigationListener = () => {
			this.recordAction({
				type: "navigation",
				timestamp: Date.now() - this.startTime,
				url: window.location.href,
			});
		};

		// Scroll events (throttled)
		let scrollTimeout: ReturnType<typeof setTimeout>;
		const scrollListener = () => {
			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(() => {
				this.recordAction({
					type: "scroll",
					timestamp: Date.now() - this.startTime,
					scrollPosition: {
						x: window.scrollX,
						y: window.scrollY,
					},
				});
			}, 500);
		};

		// Select events
		const selectListener = (e: Event) => {
			const target = e.target as HTMLSelectElement;
			if (!target) return;

			this.recordAction({
				type: "select",
				timestamp: Date.now() - this.startTime,
				target: {
					selector: DOMUtils.getSelector(target),
					tagName: target.tagName.toLowerCase(),
				},
				value: target.value,
			});
		};

		// Keypress events (for special keys)
		const keypressListener = (e: KeyboardEvent) => {
			if (["Enter", "Tab", "Escape"].includes(e.key)) {
				const target = e.target as Element;
				this.recordAction({
					type: "keypress",
					timestamp: Date.now() - this.startTime,
					target: target
						? {
								selector: DOMUtils.getSelector(target),
								tagName: target.tagName.toLowerCase(),
							}
						: undefined,
					key: e.key,
				});
			}
		};

		// Attach all listeners
		document.addEventListener("click", clickListener, true);
		document.addEventListener("input", inputListener, true);
		document.addEventListener("change", selectListener, true);
		window.addEventListener("popstate", navigationListener);
		window.addEventListener("scroll", scrollListener);
		document.addEventListener("keydown", keypressListener, true);

		// Store listeners for cleanup
		this.listeners.set("click", clickListener);
		this.listeners.set("input", inputListener);
		this.listeners.set("select", selectListener);
		this.listeners.set("navigation", navigationListener);
		this.listeners.set("scroll", scrollListener);
		this.listeners.set("keypress", keypressListener);
	}

	private removeListeners() {
		const clickListener = this.listeners.get("click");
		const inputListener = this.listeners.get("input");
		const selectListener = this.listeners.get("select");
		const navigationListener = this.listeners.get("navigation");
		const scrollListener = this.listeners.get("scroll");
		const keypressListener = this.listeners.get("keypress");

		if (clickListener)
			document.removeEventListener("click", clickListener, true);
		if (inputListener)
			document.removeEventListener("input", inputListener, true);
		if (selectListener)
			document.removeEventListener("change", selectListener, true);
		if (navigationListener)
			window.removeEventListener("popstate", navigationListener);
		if (scrollListener) window.removeEventListener("scroll", scrollListener);
		if (keypressListener)
			document.removeEventListener("keydown", keypressListener, true);

		this.listeners.clear();
	}

	private recordAction(action: RecordedAction) {
		this.actions.push(action);
	}

	getStatus() {
		return {
			isRecording: this.isRecording,
			actionCount: this.actions.length,
			startUrl: this.startUrl,
		};
	}
}

export class ActionPlayer {
	private isPaused = false;
	private currentActionIndex = 0;

	async play(
		recording: Recording,
		options?: {
			speed?: number;
			startIndex?: number;
			onProgress?: (index: number, total: number) => void;
		},
	): Promise<void> {
		const speed = options?.speed || 1;
		const startIndex = options?.startIndex || 0;

		this.currentActionIndex = startIndex;
		this.isPaused = false;

		console.log("▶️ Playing recording:", recording.name);

		for (let i = startIndex; i < recording.actions.length; i++) {
			if (this.isPaused) {
				console.log("⏸️ Playback paused");
				break;
			}

			this.currentActionIndex = i;
			const action = recording.actions[i];

			try {
				await this.executeAction(action);

				// Wait based on original timing
				if (i < recording.actions.length - 1) {
					const nextAction = recording.actions[i + 1];
					const delay = (nextAction.timestamp - action.timestamp) / speed;
					await DOMUtils.wait(Math.max(delay, 100));
				}

				options?.onProgress?.(i + 1, recording.actions.length);
			} catch (error) {
				console.error("Error executing action:", action, error);
			}
		}

		console.log("✅ Playback complete");
	}

	private async executeAction(action: RecordedAction): Promise<void> {
		switch (action.type) {
			case "click":
				if (action.target?.selector) {
					const element = await DOMUtils.waitForElement(
						action.target.selector,
						5000,
					);
					if (element) {
						await DOMUtils.clickElement(element, { scroll: true });
					}
				}
				break;

			case "input":
				if (action.target?.selector && action.value !== undefined) {
					const element = await DOMUtils.waitForElement(
						action.target.selector,
						5000,
					);
					if (element) {
						await DOMUtils.typeText(element, action.value, { clear: true });
					}
				}
				break;

			case "navigation":
				if (action.url) {
					window.location.href = action.url;
					await DOMUtils.wait(2000); // Wait for page load
				}
				break;

			case "scroll":
				if (action.scrollPosition) {
					window.scrollTo(action.scrollPosition.x, action.scrollPosition.y);
				}
				break;

			case "select":
				if (action.target?.selector && action.value !== undefined) {
					const element = await DOMUtils.waitForElement(
						action.target.selector,
						5000,
					);
					if (element && element instanceof HTMLSelectElement) {
						element.value = action.value;
						element.dispatchEvent(new Event("change", { bubbles: true }));
					}
				}
				break;

			case "keypress":
				if (action.key && action.target?.selector) {
					const element = await DOMUtils.waitForElement(
						action.target.selector,
						5000,
					);
					if (element) {
						const event = new KeyboardEvent("keydown", {
							key: action.key,
							bubbles: true,
						});
						element.dispatchEvent(event);
					}
				}
				break;
		}
	}

	pause() {
		this.isPaused = true;
	}

	resume() {
		this.isPaused = false;
	}

	stop() {
		this.isPaused = true;
		this.currentActionIndex = 0;
	}

	getProgress() {
		return {
			currentIndex: this.currentActionIndex,
			isPaused: this.isPaused,
		};
	}
}

// Convert recording to automation plan
export function recordingToAutomationPlan(recording: Recording): AutomationTask[] {
	return recording.actions.map((action, index) => {
		const task: AutomationTask = {
			id: `task-${index}`,
			type: action.type === "input" ? "type" : action.type,
			description: generateActionDescription(action),
			selector: action.target?.selector,
			value: action.value,
			url: action.url,
		};

		return task;
	});
}

function generateActionDescription(action: RecordedAction): string {
	switch (action.type) {
		case "click":
			return `Click on ${action.target?.tagName || "element"}${action.target?.text ? `: ${action.target.text}` : ""}`;
		case "input":
			return `Type "${action.value}" into ${action.target?.tagName || "input"}`;
		case "navigation":
			return `Navigate to ${action.url}`;
		case "scroll":
			return `Scroll to position ${action.scrollPosition?.y}`;
		case "select":
			return `Select "${action.value}" in dropdown`;
		case "keypress":
			return `Press ${action.key} key`;
		default:
			return `Perform ${action.type}`;
	}
}
