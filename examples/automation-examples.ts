/**
 * Example automation workflows for the AI Browser Automation Extension
 *
 * These examples demonstrate various automation capabilities including:
 * - Form filling
 * - Data extraction
 * - Navigation automation
 * - AI-assisted automation
 */

import type { AutomationPlan } from "../src/lib/types/ai.types";

/**
 * Example 1: Form Filling Automation
 * Automatically fill out a contact form
 */
export const contactFormExample: AutomationPlan = {
	id: "contact-form-example",
	name: "Fill Contact Form",
	description: "Automatically fill out a contact form with user information",
	tasks: [
		{
			id: "task-1",
			type: "type",
			description: "Enter name",
			selector: 'input[name="name"]',
			value: "John Doe",
		},
		{
			id: "task-2",
			type: "type",
			description: "Enter email",
			selector: 'input[name="email"]',
			value: "john@example.com",
		},
		{
			id: "task-3",
			type: "type",
			description: "Enter message",
			selector: 'textarea[name="message"]',
			value: "Hello, this is an automated message!",
		},
		{
			id: "task-4",
			type: "wait",
			description: "Wait for form validation",
			waitCondition: {
				type: "timeout",
				value: 500,
			},
		},
		{
			id: "task-5",
			type: "click",
			description: "Submit form",
			selector: 'button[type="submit"]',
		},
	],
	createdAt: Date.now(),
	updatedAt: Date.now(),
};

/**
 * Example 2: Data Extraction
 * Extract product information from an e-commerce page
 */
export const dataExtractionExample: AutomationPlan = {
	id: "data-extraction-example",
	name: "Extract Product Data",
	description: "Extract product names and prices from a listing page",
	tasks: [
		{
			id: "task-1",
			type: "scroll",
			description: "Scroll to load all products",
			value: "1000",
		},
		{
			id: "task-2",
			type: "wait",
			description: "Wait for products to load",
			waitCondition: {
				type: "timeout",
				value: 1000,
			},
		},
		{
			id: "task-3",
			type: "extract",
			description: "Extract product names",
			selector: ".product-name",
		},
		{
			id: "task-4",
			type: "extract",
			description: "Extract product prices",
			selector: ".product-price",
		},
	],
	createdAt: Date.now(),
	updatedAt: Date.now(),
};

/**
 * Example 3: Multi-page Navigation
 * Navigate through multiple pages and collect data
 */
export const multiPageNavigationExample: AutomationPlan = {
	id: "multi-page-navigation-example",
	name: "Multi-page Data Collection",
	description: "Navigate through pagination and collect data from each page",
	tasks: [
		{
			id: "task-1",
			type: "extract",
			description: "Extract data from current page",
			selector: ".data-item",
		},
		{
			id: "task-2",
			type: "click",
			description: "Click next page button",
			selector: 'a[rel="next"]',
		},
		{
			id: "task-3",
			type: "wait",
			description: "Wait for page load",
			waitCondition: {
				type: "navigation",
				value: "",
				timeout: 10000,
			},
		},
		{
			id: "task-4",
			type: "extract",
			description: "Extract data from second page",
			selector: ".data-item",
		},
	],
	createdAt: Date.now(),
	updatedAt: Date.now(),
};

/**
 * Example 4: Search and Filter
 * Perform a search and apply filters
 */
export const searchAndFilterExample: AutomationPlan = {
	id: "search-filter-example",
	name: "Search and Filter Products",
	description: "Search for products and apply filters",
	tasks: [
		{
			id: "task-1",
			type: "type",
			description: "Enter search query",
			selector: 'input[type="search"]',
			value: "laptop",
		},
		{
			id: "task-2",
			type: "click",
			description: "Click search button",
			selector: 'button[type="submit"]',
		},
		{
			id: "task-3",
			type: "wait",
			description: "Wait for results",
			waitCondition: {
				type: "selector",
				value: ".search-results",
				timeout: 5000,
			},
		},
		{
			id: "task-4",
			type: "click",
			description: "Apply price filter",
			selector: 'input[name="price-range-low"]',
		},
		{
			id: "task-5",
			type: "scroll",
			description: "Scroll to view results",
			selector: ".search-results",
		},
	],
	createdAt: Date.now(),
	updatedAt: Date.now(),
};

/**
 * Example usage in content script console:
 *
 * // Execute a plan
 * const plan = contactFormExample;
 * await window.__automationAPI.executePlan(plan);
 *
 * // Generate a plan with AI
 * const aiPlan = await window.__automationAPI.generatePlan(
 *   "Find all blog posts and extract their titles and dates"
 * );
 *
 * // Record your own actions
 * window.__automationAPI.startRecording();
 * // ... perform actions ...
 * const recording = window.__automationAPI.stopRecording();
 *
 * // Play back a recording
 * await window.__automationAPI.playRecording(recording);
 *
 * // Find elements by text
 * const loginButton = window.__automationAPI.findByText("Login", true);
 * await window.__automationAPI.clickElement(loginButton[0]);
 *
 * // Get page context
 * const context = window.__automationAPI.getPageContext();
 * console.log(context);
 */
