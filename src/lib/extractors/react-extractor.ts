import { DOMUtils } from "../automation/dom-utils";

export interface ReactComponent {
	name: string;
	type: "function" | "class" | "unknown";
	props: string[];
	hasState: boolean;
	hasEffects: boolean;
	element: Element;
	html: string;
	structure: string;
	children?: ReactComponent[];
}

export interface ReactElementInfo {
	hasReact: boolean;
	version?: string;
	rootElements: Element[];
	components: ReactComponent[];
	componentCount: number;
}

export class ReactExtractor {
	/**
	 * Detect if the page uses React
	 */
	static detectReact(): { hasReact: boolean; version?: string } {
		// Check for React in window
		const win = window as any;

		if (win.React) {
			return {
				hasReact: true,
				version: win.React.version,
			};
		}

		// Check for React DevTools
		if (
			win.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
			win._reactRootContainer ||
			win._reactRoot
		) {
			return { hasReact: true };
		}

		// Check for React attributes in DOM
		const reactElements = document.querySelectorAll(
			'[data-reactroot], [data-reactid], [data-react-checksum]',
		);

		if (reactElements.length > 0) {
			return { hasReact: true };
		}

		// Check for React fiber properties
		const allElements = document.querySelectorAll("*");
		for (const element of Array.from(allElements).slice(0, 100)) {
			const keys = Object.keys(element);
			if (
				keys.some(
					(key) =>
						key.startsWith("__react") ||
						key.startsWith("_react") ||
						key.includes("Fiber"),
				)
			) {
				return { hasReact: true };
			}
		}

		return { hasReact: false };
	}

	/**
	 * Find all React root elements
	 */
	static findReactRoots(): Element[] {
		const roots: Element[] = [];

		// Look for common React root IDs
		const commonRootIds = ["root", "app", "react-root", "__next"];
		for (const id of commonRootIds) {
			const element = document.getElementById(id);
			if (element) {
				roots.push(element);
			}
		}

		// Look for data attributes
		const dataRoots = document.querySelectorAll(
			'[data-reactroot], [data-reactid]',
		);
		for (const root of dataRoots) {
			if (!roots.includes(root)) {
				roots.push(root);
			}
		}

		// Look for React fiber nodes
		const allElements = document.querySelectorAll("*");
		for (const element of Array.from(allElements).slice(0, 50)) {
			const keys = Object.keys(element);
			if (keys.some((key) => key.startsWith("__reactContainer"))) {
				if (!roots.includes(element)) {
					roots.push(element);
				}
			}
		}

		return roots;
	}

	/**
	 * Extract React component structure from an element
	 */
	static extractComponent(element: Element): ReactComponent | null {
		const win = window as any;
		const keys = Object.keys(element);

		// Try to get React fiber
		const fiberKey = keys.find(
			(key) => key.startsWith("__reactFiber") || key.startsWith("__reactInternalInstance"),
		);

		let componentInfo: Partial<ReactComponent> = {
			element,
			html: element.outerHTML.substring(0, 500),
			structure: this.generateStructure(element),
		};

		if (fiberKey) {
			const fiber = (element as any)[fiberKey];
			if (fiber) {
				componentInfo = {
					...componentInfo,
					...this.parseFiberNode(fiber),
				};
			}
		}

		// Fallback: analyze based on class names and structure
		if (!componentInfo.name) {
			componentInfo.name = this.guessComponentName(element);
			componentInfo.type = "unknown";
			componentInfo.props = this.extractPropsFromAttributes(element);
			componentInfo.hasState = false;
			componentInfo.hasEffects = false;
		}

		return componentInfo as ReactComponent;
	}

	/**
	 * Parse React fiber node to extract component info
	 */
	private static parseFiberNode(fiber: any): Partial<ReactComponent> {
		const info: Partial<ReactComponent> = {
			props: [],
			hasState: false,
			hasEffects: false,
		};

		// Get component name
		if (fiber.type) {
			if (typeof fiber.type === "function") {
				info.name = fiber.type.name || fiber.type.displayName || "Anonymous";
				info.type = fiber.type.prototype?.isReactComponent
					? "class"
					: "function";
			} else if (typeof fiber.type === "string") {
				info.name = fiber.type;
				info.type = "function";
			}
		}

		// Get props
		if (fiber.memoizedProps) {
			info.props = Object.keys(fiber.memoizedProps).filter(
				(key) => key !== "children",
			);
		}

		// Check for state
		info.hasState = !!(
			fiber.memoizedState ||
			fiber.stateNode?.state
		);

		// Check for effects
		info.hasEffects = !!(fiber.effectTag || fiber.flags);

		return info;
	}

	/**
	 * Guess component name from class names and structure
	 */
	private static guessComponentName(element: Element): string {
		// Try data attributes
		const dataComponent = element.getAttribute("data-component");
		if (dataComponent) return dataComponent;

		// Try class name (convert kebab/snake to PascalCase)
		const className = element.className.toString().split(" ")[0];
		if (className) {
			return className
				.split(/[-_]/)
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join("");
		}

		// Use tag name
		return element.tagName.charAt(0).toUpperCase() + element.tagName.slice(1).toLowerCase();
	}

	/**
	 * Extract props from element attributes
	 */
	private static extractPropsFromAttributes(element: Element): string[] {
		const props: string[] = [];

		for (const attr of element.attributes) {
			if (!attr.name.startsWith("data-react")) {
				props.push(attr.name);
			}
		}

		return props;
	}

	/**
	 * Generate a structural representation of the component
	 */
	private static generateStructure(element: Element, depth = 0): string {
		if (depth > 3) return "...";

		const tag = element.tagName.toLowerCase();
		const classes = element.className
			? `.${element.className.toString().split(" ").join(".")}`
			: "";
		const id = element.id ? `#${element.id}` : "";

		let structure = `${"  ".repeat(depth)}<${tag}${id}${classes}>`;

		// Add significant children
		const children = Array.from(element.children).slice(0, 3);
		if (children.length > 0) {
			structure += "\n";
			for (const child of children) {
				structure += this.generateStructure(child, depth + 1) + "\n";
			}
			structure += `${"  ".repeat(depth)}</${tag}>`;
		} else {
			const text = element.textContent?.trim().substring(0, 30);
			if (text) {
				structure += `${text}...`;
			}
			structure += `</${tag}>`;
		}

		return structure;
	}

	/**
	 * Extract all React components from the page
	 */
	static extractAllComponents(): ReactElementInfo {
		const detection = this.detectReact();

		if (!detection.hasReact) {
			return {
				hasReact: false,
				rootElements: [],
				components: [],
				componentCount: 0,
			};
		}

		const roots = this.findReactRoots();
		const components: ReactComponent[] = [];
		const visited = new Set<Element>();

		// Extract components from each root
		for (const root of roots) {
			this.traverseAndExtract(root, components, visited);
		}

		return {
			hasReact: true,
			version: detection.version,
			rootElements: roots,
			components,
			componentCount: components.length,
		};
	}

	/**
	 * Recursively traverse and extract components
	 */
	private static traverseAndExtract(
		element: Element,
		components: ReactComponent[],
		visited: Set<Element>,
		depth = 0,
	): void {
		if (depth > 10 || visited.has(element)) return;

		visited.add(element);

		// Check if this is a React component
		const keys = Object.keys(element);
		const hasReactKey = keys.some(
			(key) => key.startsWith("__reactFiber") || key.startsWith("__reactInternalInstance"),
		);

		if (hasReactKey || this.looksLikeComponent(element)) {
			const component = this.extractComponent(element);
			if (component && component.name !== "Div" && component.name !== "Span") {
				components.push(component);
			}
		}

		// Traverse children (but not too many to avoid performance issues)
		const children = Array.from(element.children).slice(0, 20);
		for (const child of children) {
			this.traverseAndExtract(child, components, visited, depth + 1);
		}
	}

	/**
	 * Heuristic to determine if an element looks like a component
	 */
	private static looksLikeComponent(element: Element): boolean {
		// Check for component-like class names (PascalCase)
		const classes = element.className.toString().split(" ");
		for (const cls of classes) {
			if (/^[A-Z]/.test(cls) && cls.length > 2) {
				return true;
			}
		}

		// Check for data-component attribute
		if (element.hasAttribute("data-component")) {
			return true;
		}

		// Check if it has significant structure
		const childCount = element.children.length;
		if (childCount > 2 && childCount < 50) {
			return true;
		}

		return false;
	}

	/**
	 * Generate JSX code for a component
	 */
	static generateJSX(component: ReactComponent): string {
		const { name, props, element } = component;

		let jsx = `function ${name}({\n`;

		// Add props
		if (props.length > 0) {
			jsx += `  ${props.join(",\n  ")}\n`;
		}

		jsx += `}) {\n`;
		jsx += `  return (\n`;

		// Generate JSX structure
		jsx += this.elementToJSX(element, 2);

		jsx += `\n  );\n`;
		jsx += `}\n`;

		return jsx;
	}

	/**
	 * Convert element to JSX string
	 */
	private static elementToJSX(element: Element, indent = 0): string {
		const indentStr = "  ".repeat(indent);
		const tag = element.tagName.toLowerCase();

		// Get attributes
		const attrs: string[] = [];
		for (const attr of element.attributes) {
			let value = attr.value;
			let attrName = attr.name;

			// Convert to JSX attribute names
			if (attrName === "class") attrName = "className";
			if (attrName.startsWith("data-")) continue; // Skip data attributes

			attrs.push(`${attrName}="${value}"`);
		}

		const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";

		// Check if self-closing
		const selfClosing = ["img", "input", "br", "hr", "meta", "link"];
		if (selfClosing.includes(tag)) {
			return `${indentStr}<${tag}${attrStr} />`;
		}

		// Has children
		const children = Array.from(element.children);
		if (children.length === 0) {
			const text = element.textContent?.trim();
			if (text && text.length < 50) {
				return `${indentStr}<${tag}${attrStr}>${text}</${tag}>`;
			}
			return `${indentStr}<${tag}${attrStr}></${tag}>`;
		}

		// Render with children (limit to 5 for readability)
		let jsx = `${indentStr}<${tag}${attrStr}>\n`;
		for (const child of children.slice(0, 5)) {
			jsx += this.elementToJSX(child, indent + 1) + "\n";
		}
		if (children.length > 5) {
			jsx += `${indentStr}  {/* ... ${children.length - 5} more children */}\n`;
		}
		jsx += `${indentStr}</${tag}>`;

		return jsx;
	}
}
