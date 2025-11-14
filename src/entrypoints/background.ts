import { initTRPC } from "@trpc/server";
import { createChromeHandler } from "trpc-chrome/adapter";
import { z } from "zod";
import type { TRPCError } from "@trpc/server";

const t = initTRPC.create({
	isServer: false,
	allowOutsideOfServer: true,
});

// Schema definitions
const aiConfigSchema = z.object({
	provider: z.enum(["openai", "anthropic", "custom"]),
	apiKey: z.string(),
	model: z.string().optional(),
	baseUrl: z.string().optional(),
	temperature: z.number().optional(),
	maxTokens: z.number().optional(),
});

const automationTaskSchema = z.object({
	id: z.string(),
	type: z.enum([
		"click",
		"type",
		"navigate",
		"extract",
		"wait",
		"scroll",
		"custom",
	]),
	description: z.string(),
	selector: z.string().optional(),
	value: z.string().optional(),
	url: z.string().optional(),
	waitCondition: z
		.object({
			type: z.enum(["selector", "navigation", "timeout", "custom"]),
			value: z.union([z.string(), z.number()]),
			timeout: z.number().optional(),
		})
		.optional(),
	metadata: z.record(z.unknown()).optional(),
});

const automationPlanSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	tasks: z.array(automationTaskSchema),
	createdAt: z.number(),
	updatedAt: z.number(),
});

const appRouter = t.router({
	// AI Configuration
	getAIConfig: t.procedure.query(async () => {
		const result = await chrome.storage.local.get("aiConfig");
		return result.aiConfig || null;
	}),

	setAIConfig: t.procedure.input(aiConfigSchema).mutation(async ({ input }) => {
		await chrome.storage.local.set({ aiConfig: input });
		return { success: true };
	}),

	// Automation Plans
	getPlans: t.procedure.query(async () => {
		const result = await chrome.storage.local.get("automationPlans");
		return result.automationPlans || [];
	}),

	savePlan: t.procedure
		.input(automationPlanSchema)
		.mutation(async ({ input }) => {
			const result = await chrome.storage.local.get("automationPlans");
			const plans = result.automationPlans || [];
			const existingIndex = plans.findIndex((p: typeof input) => p.id === input.id);

			if (existingIndex >= 0) {
				plans[existingIndex] = input;
			} else {
				plans.push(input);
			}

			await chrome.storage.local.set({ automationPlans: plans });
			return { success: true };
		}),

	deletePlan: t.procedure.input(z.string()).mutation(async ({ input }) => {
		const result = await chrome.storage.local.get("automationPlans");
		const plans = result.automationPlans || [];
		const filtered = plans.filter((p: { id: string }) => p.id !== input);

		await chrome.storage.local.set({ automationPlans: filtered });
		return { success: true };
	}),

	// Recordings
	getRecordings: t.procedure.query(async () => {
		const result = await chrome.storage.local.get("recordings");
		return result.recordings || [];
	}),

	saveRecording: t.procedure
		.input(
			z.object({
				id: z.string(),
				name: z.string(),
				actions: z.array(z.any()),
				startUrl: z.string(),
				createdAt: z.number(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await chrome.storage.local.get("recordings");
			const recordings = result.recordings || [];
			recordings.push(input);

			await chrome.storage.local.set({ recordings });
			return { success: true };
		}),

	deleteRecording: t.procedure.input(z.string()).mutation(async ({ input }) => {
		const result = await chrome.storage.local.get("recordings");
		const recordings = result.recordings || [];
		const filtered = recordings.filter((r: { id: string }) => r.id !== input);

		await chrome.storage.local.set({ recordings: filtered });
		return { success: true };
	}),

	// Screenshot capture
	captureScreenshot: t.procedure.query(async () => {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});

		if (!tab.id) {
			throw new Error("No active tab");
		}

		const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId!, {
			format: "png",
		});

		return dataUrl;
	}),

	// Execute script in content script context
	executeInContent: t.procedure
		.input(z.object({ code: z.string() }))
		.mutation(async ({ input }) => {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});

			if (!tab.id) {
				throw new Error("No active tab");
			}

			const result = await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: (code: string) => {
					// biome-ignore lint/security/noGlobalEval: Dynamic automation execution feature
					return eval(code);
				},
				args: [input.code],
			});

			return result[0].result;
		}),
});

export type AppRouter = typeof appRouter;

export default defineBackground(() => {
	console.log("🤖 AI Automation Extension - Background Service Worker Started");

	createChromeHandler({
		router: appRouter,
		createContext: () => ({}),
		onError: (opts: { error: TRPCError }) => {
			console.error("tRPC Error:", opts.error);
		},
	});

	// Listen for extension installation
	chrome.runtime.onInstalled.addListener((details) => {
		if (details.reason === "install") {
			console.log("🎉 Extension installed!");
			// Open options page or welcome page
			chrome.tabs.create({
				url: chrome.runtime.getURL("/popup.html"),
			});
		}
	});
});
