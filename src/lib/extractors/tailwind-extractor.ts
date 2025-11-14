export interface TailwindComponent {
	name: string;
	element: Element;
	classes: string[];
	classCount: number;
	html: string;
	category: string;
	responsive: boolean;
	interactive: boolean;
	animated: boolean;
	darkMode: boolean;
}

export interface TailwindInfo {
	hasTailwind: boolean;
	version?: string;
	components: TailwindComponent[];
	totalClasses: number;
	commonPatterns: string[];
}

export class TailwindExtractor {
	// Common Tailwind class prefixes
	private static readonly TAILWIND_PREFIXES = [
		"flex",
		"grid",
		"space",
		"gap",
		"p-",
		"m-",
		"w-",
		"h-",
		"text-",
		"bg-",
		"border",
		"rounded",
		"shadow",
		"hover:",
		"focus:",
		"active:",
		"dark:",
		"sm:",
		"md:",
		"lg:",
		"xl:",
		"2xl:",
	];

	/**
	 * Detect if the page uses Tailwind CSS
	 */
	static detectTailwind(): { hasTailwind: boolean; version?: string } {
		// Check for Tailwind config in window
		const win = window as any;
		if (win.tailwind) {
			return {
				hasTailwind: true,
				version: win.tailwind.version,
			};
		}

		// Check stylesheets for Tailwind
		const stylesheets = Array.from(document.styleSheets);
		for (const sheet of stylesheets) {
			try {
				const href = (sheet as CSSStyleSheet).href;
				if (href && href.includes("tailwind")) {
					return { hasTailwind: true };
				}

				// Check CSS rules for Tailwind-specific patterns
				const rules = (sheet as CSSStyleSheet).cssRules;
				if (rules) {
					for (let i = 0; i < Math.min(rules.length, 50); i++) {
						const rule = rules[i];
						if (
							rule.cssText.includes("--tw-") ||
							rule.cssText.includes("tailwindcss")
						) {
							return { hasTailwind: true };
						}
					}
				}
			} catch (e) {
				// CORS or other access errors
				continue;
			}
		}

		// Check for Tailwind classes in use
		const allElements = Array.from(document.querySelectorAll("*")).slice(0, 100);
		let tailwindClassCount = 0;

		for (const element of allElements) {
			const classes = element.className.toString().split(" ");
			for (const cls of classes) {
				if (this.isTailwindClass(cls)) {
					tailwindClassCount++;
					if (tailwindClassCount > 10) {
						return { hasTailwind: true };
					}
				}
			}
		}

		return { hasTailwind: tailwindClassCount > 5 };
	}

	/**
	 * Check if a class name looks like a Tailwind class
	 */
	private static isTailwindClass(className: string): boolean {
		return this.TAILWIND_PREFIXES.some((prefix) => className.startsWith(prefix));
	}

	/**
	 * Extract all Tailwind components from the page
	 */
	static extractComponents(): TailwindInfo {
		const detection = this.detectTailwind();

		if (!detection.hasTailwind) {
			return {
				hasTailwind: false,
				components: [],
				totalClasses: 0,
				commonPatterns: [],
			};
		}

		const components: TailwindComponent[] = [];
		const allClasses = new Set<string>();

		// Find elements with significant Tailwind usage
		const elements = Array.from(document.querySelectorAll("*"));

		for (const element of elements) {
			const classes = element.className.toString().split(" ").filter(Boolean);
			const tailwindClasses = classes.filter((cls) => this.isTailwindClass(cls));

			// Collect all classes
			for (const cls of tailwindClasses) {
				allClasses.add(cls);
			}

			// Consider it a component if it has 5+ Tailwind classes
			if (tailwindClasses.length >= 5) {
				const component = this.analyzeComponent(element, tailwindClasses);
				components.push(component);
			}
		}

		// Find common patterns
		const commonPatterns = this.findCommonPatterns(components);

		return {
			hasTailwind: true,
			version: detection.version,
			components: components.slice(0, 50), // Limit to 50 components
			totalClasses: allClasses.size,
			commonPatterns,
		};
	}

	/**
	 * Analyze a component to extract metadata
	 */
	private static analyzeComponent(
		element: Element,
		classes: string[],
	): TailwindComponent {
		return {
			name: this.guessComponentName(element),
			element,
			classes,
			classCount: classes.length,
			html: this.cleanHTML(element.outerHTML),
			category: this.categorizeComponent(element, classes),
			responsive: this.hasResponsiveClasses(classes),
			interactive: this.hasInteractiveClasses(classes),
			animated: this.hasAnimationClasses(classes),
			darkMode: this.hasDarkModeClasses(classes),
		};
	}

	/**
	 * Guess component name from structure
	 */
	private static guessComponentName(element: Element): string {
		// Check for semantic names
		const dataName = element.getAttribute("data-component") ||
			element.getAttribute("data-name");
		if (dataName) return dataName;

		// Check aria-label
		const ariaLabel = element.getAttribute("aria-label");
		if (ariaLabel) return ariaLabel;

		// Check role
		const role = element.getAttribute("role");
		if (role) return role;

		// Use tag name
		const tag = element.tagName.toLowerCase();
		if (tag === "button") return "Button";
		if (tag === "input") return "Input";
		if (tag === "form") return "Form";

		// Check structure
		if (element.querySelector("img")) return "Card";
		if (element.querySelector("input")) return "FormGroup";
		if (element.children.length > 5) return "Container";

		return tag.charAt(0).toUpperCase() + tag.slice(1);
	}

	/**
	 * Categorize component based on classes and structure
	 */
	private static categorizeComponent(element: Element, classes: string[]): string {
		const classString = classes.join(" ");

		// Layout
		if (
			classString.includes("flex") ||
			classString.includes("grid") ||
			classString.includes("container")
		) {
			return "layout";
		}

		// Form
		if (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
			return "form";
		}

		// Button
		if (element.tagName === "BUTTON" || classString.includes("btn")) {
			return "button";
		}

		// Card
		if (
			classString.includes("card") ||
			(classString.includes("rounded") && classString.includes("shadow"))
		) {
			return "card";
		}

		// Navigation
		if (element.tagName === "NAV" || classString.includes("nav")) {
			return "navigation";
		}

		// Typography
		if (classString.includes("text-") && element.children.length === 0) {
			return "typography";
		}

		return "component";
	}

	/**
	 * Check for responsive classes
	 */
	private static hasResponsiveClasses(classes: string[]): boolean {
		const responsivePrefixes = ["sm:", "md:", "lg:", "xl:", "2xl:"];
		return classes.some((cls) =>
			responsivePrefixes.some((prefix) => cls.startsWith(prefix)),
		);
	}

	/**
	 * Check for interactive classes
	 */
	private static hasInteractiveClasses(classes: string[]): boolean {
		const interactivePrefixes = [
			"hover:",
			"focus:",
			"active:",
			"disabled:",
			"group-hover:",
		];
		return classes.some((cls) =>
			interactivePrefixes.some((prefix) => cls.startsWith(prefix)),
		);
	}

	/**
	 * Check for animation classes
	 */
	private static hasAnimationClasses(classes: string[]): boolean {
		const animationKeywords = [
			"animate-",
			"transition",
			"duration-",
			"ease-",
			"delay-",
		];
		return classes.some((cls) =>
			animationKeywords.some((keyword) => cls.includes(keyword)),
		);
	}

	/**
	 * Check for dark mode classes
	 */
	private static hasDarkModeClasses(classes: string[]): boolean {
		return classes.some((cls) => cls.startsWith("dark:"));
	}

	/**
	 * Find common class patterns across components
	 */
	private static findCommonPatterns(components: TailwindComponent[]): string[] {
		const patternCounts = new Map<string, number>();

		for (const component of components) {
			// Look for common combinations
			const classStr = component.classes.sort().join(" ");

			// Extract layout patterns
			const layoutPattern = component.classes
				.filter((cls) => cls.includes("flex") || cls.includes("grid"))
				.join(" ");
			if (layoutPattern) {
				patternCounts.set(layoutPattern, (patternCounts.get(layoutPattern) || 0) + 1);
			}

			// Extract spacing patterns
			const spacingPattern = component.classes
				.filter((cls) => cls.match(/^[mp][xy]?-/))
				.join(" ");
			if (spacingPattern) {
				patternCounts.set(spacingPattern, (patternCounts.get(spacingPattern) || 0) + 1);
			}

			// Extract color patterns
			const colorPattern = component.classes
				.filter((cls) => cls.includes("bg-") || cls.includes("text-"))
				.join(" ");
			if (colorPattern) {
				patternCounts.set(colorPattern, (patternCounts.get(colorPattern) || 0) + 1);
			}
		}

		// Return top 10 patterns
		return Array.from(patternCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([pattern]) => pattern);
	}

	/**
	 * Clean HTML by removing children and limiting length
	 */
	private static cleanHTML(html: string): string {
		// Remove children to show just the element
		const tempDiv = document.createElement("div");
		tempDiv.innerHTML = html;
		const element = tempDiv.firstElementChild;

		if (!element) return html.substring(0, 200);

		// Clone and remove children
		const clone = element.cloneNode(false) as Element;
		let result = clone.outerHTML;

		// If self-closing, return as-is
		if (result.endsWith("/>")) {
			return result;
		}

		// Add closing tag
		const tagName = element.tagName.toLowerCase();
		result = result.replace(">", ">\n  {/* children */}\n</" + tagName + ">");

		return result;
	}

	/**
	 * Generate a reusable component from Tailwind classes
	 */
	static generateComponent(component: TailwindComponent, framework: "react" | "vue" = "react"): string {
		const { name, classes, category } = component;

		if (framework === "react") {
			return this.generateReactComponent(name, classes, category);
		} else {
			return this.generateVueComponent(name, classes, category);
		}
	}

	/**
	 * Generate React component code
	 */
	private static generateReactComponent(
		name: string,
		classes: string[],
		category: string,
	): string {
		const classString = classes.join(" ");

		let code = `interface ${name}Props {\n`;
		code += `  children?: React.ReactNode;\n`;
		code += `  className?: string;\n`;

		// Add category-specific props
		if (category === "button") {
			code += `  onClick?: () => void;\n`;
			code += `  disabled?: boolean;\n`;
		} else if (category === "form") {
			code += `  value?: string;\n`;
			code += `  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;\n`;
		}

		code += `}\n\n`;

		code += `export function ${name}({ children, className, ...props }: ${name}Props) {\n`;
		code += `  return (\n`;

		// Determine tag based on category
		const tag = category === "button" ? "button" : "div";

		code += `    <${tag}\n`;
		code += `      className={\`${classString} \${className || ""}\`}\n`;
		code += `      {...props}\n`;
		code += `    >\n`;
		code += `      {children}\n`;
		code += `    </${tag}>\n`;
		code += `  );\n`;
		code += `}\n`;

		return code;
	}

	/**
	 * Generate Vue component code
	 */
	private static generateVueComponent(
		name: string,
		classes: string[],
		category: string,
	): string {
		const classString = classes.join(" ");
		const tag = category === "button" ? "button" : "div";

		let code = `<template>\n`;
		code += `  <${tag} :class="computedClasses" v-bind="$attrs">\n`;
		code += `    <slot />\n`;
		code += `  </${tag}>\n`;
		code += `</template>\n\n`;

		code += `<script setup lang="ts">\n`;
		code += `import { computed } from 'vue';\n\n`;

		code += `interface Props {\n`;
		code += `  class?: string;\n`;
		code += `}\n\n`;

		code += `const props = defineProps<Props>();\n\n`;

		code += `const computedClasses = computed(() => {\n`;
		code += `  return \`${classString} \${props.class || ''}\`;\n`;
		code += `});\n`;
		code += `</script>\n`;

		return code;
	}

	/**
	 * Extract component by selector
	 */
	static extractBySelector(selector: string): TailwindComponent | null {
		const element = document.querySelector(selector);
		if (!element) return null;

		const classes = element.className
			.toString()
			.split(" ")
			.filter((cls) => this.isTailwindClass(cls));

		if (classes.length === 0) return null;

		return this.analyzeComponent(element, classes);
	}

	/**
	 * Extract components by category
	 */
	static extractByCategory(category: string): TailwindComponent[] {
		const allComponents = this.extractComponents().components;
		return allComponents.filter((comp) => comp.category === category);
	}
}
