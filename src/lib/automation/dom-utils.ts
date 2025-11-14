export interface ElementInfo {
	selector: string;
	tagName: string;
	id?: string;
	className?: string;
	text?: string;
	value?: string;
	href?: string;
	src?: string;
	attributes: Record<string, string>;
	boundingBox?: DOMRect;
	isVisible: boolean;
	isInteractive: boolean;
}

export class DOMUtils {
	/**
	 * Generate a robust CSS selector for an element
	 */
	static getSelector(element: Element): string {
		if (element.id) {
			return `#${element.id}`;
		}

		const path: string[] = [];
		let current: Element | null = element;

		while (current && current !== document.body) {
			let selector = current.tagName.toLowerCase();

			if (current.className && typeof current.className === "string") {
				const classes = current.className
					.split(" ")
					.filter((c) => c && !c.startsWith("_"))
					.join(".");
				if (classes) {
					selector += `.${classes}`;
				}
			}

			// Add nth-child if needed for uniqueness
			if (current.parentElement) {
				const siblings = Array.from(current.parentElement.children);
				const sameTagSiblings = siblings.filter(
					(s) => s.tagName === current!.tagName,
				);

				if (sameTagSiblings.length > 1) {
					const index = sameTagSiblings.indexOf(current) + 1;
					selector += `:nth-of-type(${index})`;
				}
			}

			path.unshift(selector);
			current = current.parentElement;
		}

		return path.join(" > ");
	}

	/**
	 * Get detailed information about an element
	 */
	static getElementInfo(element: Element): ElementInfo {
		const rect = element.getBoundingClientRect();
		const htmlElement = element as HTMLElement;

		return {
			selector: this.getSelector(element),
			tagName: element.tagName.toLowerCase(),
			id: element.id || undefined,
			className: element.className.toString() || undefined,
			text: element.textContent?.trim().substring(0, 200),
			value: (element as HTMLInputElement).value,
			href: (element as HTMLAnchorElement).href,
			src: (element as HTMLImageElement).src,
			attributes: this.getAttributes(element),
			boundingBox: rect,
			isVisible: this.isVisible(element),
			isInteractive: this.isInteractive(element),
		};
	}

	/**
	 * Get all attributes of an element
	 */
	static getAttributes(element: Element): Record<string, string> {
		const attrs: Record<string, string> = {};
		for (const attr of element.attributes) {
			attrs[attr.name] = attr.value;
		}
		return attrs;
	}

	/**
	 * Check if element is visible
	 */
	static isVisible(element: Element): boolean {
		const htmlElement = element as HTMLElement;
		if (!htmlElement.offsetParent && htmlElement.tagName !== "BODY") {
			return false;
		}

		const style = window.getComputedStyle(htmlElement);
		if (
			style.display === "none" ||
			style.visibility === "hidden" ||
			style.opacity === "0"
		) {
			return false;
		}

		const rect = htmlElement.getBoundingClientRect();
		return rect.width > 0 && rect.height > 0;
	}

	/**
	 * Check if element is interactive
	 */
	static isInteractive(element: Element): boolean {
		const interactiveTags = [
			"a",
			"button",
			"input",
			"select",
			"textarea",
			"details",
		];
		const tagName = element.tagName.toLowerCase();

		if (interactiveTags.includes(tagName)) {
			return true;
		}

		const htmlElement = element as HTMLElement;
		if (htmlElement.onclick || htmlElement.hasAttribute("onclick")) {
			return true;
		}

		const role = element.getAttribute("role");
		return (
			role === "button" ||
			role === "link" ||
			role === "checkbox" ||
			role === "radio"
		);
	}

	/**
	 * Find all interactive elements on the page
	 */
	static findInteractiveElements(): ElementInfo[] {
		const elements = document.querySelectorAll("*");
		const interactive: ElementInfo[] = [];

		for (const element of elements) {
			if (this.isInteractive(element) && this.isVisible(element)) {
				interactive.push(this.getElementInfo(element));
			}
		}

		return interactive;
	}

	/**
	 * Find elements by text content
	 */
	static findByText(text: string, exact = false): Element[] {
		const xpath = exact
			? `//*[text()='${text}']`
			: `//*[contains(text(), '${text}')]`;

		const result = document.evaluate(
			xpath,
			document,
			null,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null,
		);

		const elements: Element[] = [];
		for (let i = 0; i < result.snapshotLength; i++) {
			const node = result.snapshotItem(i);
			if (node && node instanceof Element) {
				elements.push(node);
			}
		}

		return elements;
	}

	/**
	 * Smart element finder with multiple strategies
	 */
	static async findElement(query: {
		selector?: string;
		text?: string;
		role?: string;
		placeholder?: string;
	}): Promise<Element | null> {
		// Try CSS selector first
		if (query.selector) {
			const element = document.querySelector(query.selector);
			if (element) return element;
		}

		// Try by text
		if (query.text) {
			const elements = this.findByText(query.text);
			if (elements.length > 0) return elements[0];
		}

		// Try by role
		if (query.role) {
			const element = document.querySelector(`[role="${query.role}"]`);
			if (element) return element;
		}

		// Try by placeholder
		if (query.placeholder) {
			const element = document.querySelector(
				`[placeholder="${query.placeholder}"]`,
			);
			if (element) return element;
		}

		return null;
	}

	/**
	 * Click an element with retry logic
	 */
	static async clickElement(
		element: Element,
		options?: { scroll?: boolean; delay?: number },
	): Promise<void> {
		const htmlElement = element as HTMLElement;

		if (options?.scroll) {
			htmlElement.scrollIntoView({ behavior: "smooth", block: "center" });
			await this.wait(500);
		}

		htmlElement.click();

		if (options?.delay) {
			await this.wait(options.delay);
		}
	}

	/**
	 * Type text into an input element
	 */
	static async typeText(
		element: Element,
		text: string,
		options?: { delay?: number; clear?: boolean },
	): Promise<void> {
		const input = element as HTMLInputElement | HTMLTextAreaElement;

		if (options?.clear) {
			input.value = "";
		}

		const delay = options?.delay || 50;

		for (const char of text) {
			input.value += char;
			input.dispatchEvent(new Event("input", { bubbles: true }));
			await this.wait(delay);
		}

		input.dispatchEvent(new Event("change", { bubbles: true }));
	}

	/**
	 * Extract data from the page
	 */
	static extractData(
		selector: string,
		attribute?: string,
	): Array<string | null> {
		const elements = document.querySelectorAll(selector);
		const data: Array<string | null> = [];

		for (const element of elements) {
			if (attribute) {
				data.push(element.getAttribute(attribute));
			} else {
				data.push(element.textContent?.trim() || null);
			}
		}

		return data;
	}

	/**
	 * Wait for an element to appear
	 */
	static async waitForElement(
		selector: string,
		timeout = 10000,
	): Promise<Element | null> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const element = document.querySelector(selector);
			if (element && this.isVisible(element)) {
				return element;
			}
			await this.wait(100);
		}

		return null;
	}

	/**
	 * Wait for navigation
	 */
	static async waitForNavigation(timeout = 30000): Promise<void> {
		return new Promise((resolve) => {
			const timeoutId = setTimeout(resolve, timeout);

			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					if (entry.entryType === "navigation") {
						clearTimeout(timeoutId);
						observer.disconnect();
						resolve();
					}
				}
			});

			observer.observe({ entryTypes: ["navigation"] });
		});
	}

	/**
	 * Scroll to element
	 */
	static scrollToElement(element: Element, behavior: ScrollBehavior = "smooth") {
		const htmlElement = element as HTMLElement;
		htmlElement.scrollIntoView({ behavior, block: "center" });
	}

	/**
	 * Get page context
	 */
	static getPageContext() {
		return {
			url: window.location.href,
			title: document.title,
			html: document.documentElement.outerHTML,
			text: document.body.innerText.substring(0, 10000),
			interactiveElements: this.findInteractiveElements().slice(0, 50),
		};
	}

	/**
	 * Utility wait function
	 */
	static wait(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Highlight element for visual feedback
	 */
	static highlightElement(element: Element, duration = 2000) {
		const htmlElement = element as HTMLElement;
		const originalOutline = htmlElement.style.outline;

		htmlElement.style.outline = "3px solid #3b82f6";
		htmlElement.style.outlineOffset = "2px";

		setTimeout(() => {
			htmlElement.style.outline = originalOutline;
		}, duration);
	}
}
