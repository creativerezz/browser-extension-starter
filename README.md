# AI Browser Automation Extension

A modern Chrome Manifest V3 extension with AI-powered tools and utilities for building intelligent browser automations. Built with WXT, React, TailwindCSS, and tRPC.

## Features

### Core Capabilities
- **Action Recording & Playback** - Record user interactions and replay them automatically
- **AI-Powered Page Analysis** - Analyze pages with OpenAI or Anthropic vision models
- **Smart DOM Manipulation** - Advanced utilities for element selection and interaction
- **Automation Orchestration** - Execute complex multi-step automation plans
- **Vision Capabilities** - Screenshot capture and AI-based visual analysis
- **Multi-Provider AI Support** - OpenAI, Anthropic, or custom AI providers

### Developer Extraction Tools
- **Page Summaries** - Generate AI-powered summaries of any webpage with key topics and insights
- **React Component Extraction** - Detect and extract React components with props, state, and JSX generation
- **Tailwind Component Extraction** - Extract Tailwind CSS components with automatic code generation for React/Vue

### Developer Features
- **Type-Safe API** - Full TypeScript support with tRPC
- **Modern UI** - shadcn/ui components with TailwindCSS
- **Hot Module Reload** - Fast development with WXT
- **Programmatic Control** - Access automation API via `window.__automationAPI`
- **Extractor API** - Access page analysis and component extraction via `window.__extractorAPI`

## Tech Stack

- [WXT](https://wxt.dev/) - Modern browser extension framework
- [React 19](https://react.dev/) - UI framework
- [TailwindCSS v4](https://tailwindcss.com/) - Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [tRPC](https://trpc.io/) - End-to-end type safety with [trpc-chrome](https://github.com/jlalmes/trpc-chrome)
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Getting Started

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Then load the extension from `./output/chrome-mv3-dev` in Chrome:
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `./output/chrome-mv3-dev` directory

### Production Build

```bash
pnpm build
```

The production build will be in `./output/chrome-mv3-prod`.

### Create Distribution Package

```bash
pnpm zip
```

## Configuration

### AI Setup

1. Click the extension icon
2. Go to the "Config" tab
3. Select your AI provider (OpenAI or Anthropic)
4. Enter your API key
5. Optionally configure model and other settings
6. Click "Save Configuration"

## Usage

### Using the Popup UI

#### Quick Actions Tab
- **Start/Stop Recording** - Record your browser interactions
- **Analyze Page** - Use AI to analyze the current page
- **Find Elements** - Discover interactive elements
- **Get Context** - Extract page context and metadata

#### Summary Tab
- **Generate Page Summary** - AI-powered summary with main topics and key points
- **Export Summaries** - Copy to clipboard or download as JSON
- **Page Type Detection** - Automatically categorize pages (blog, documentation, product, etc.)

#### Extract Tab
- **Extract React Components** - Detect React elements and generate JSX code
- **Extract Tailwind Components** - Find components with Tailwind classes
- **Generate Component Code** - Create reusable React or Vue components
- **Export Components** - Download extracted components

#### Plans Tab
- View and manage saved automation plans
- Execute automation workflows
- Import/export plans

### Programmatic API

Access the automation API via the browser console:

```javascript
// Automation API
const api = window.__automationAPI;

// Record actions
api.startRecording();
// ... perform actions ...
const recording = api.stopRecording();

// Play recording
await api.playRecording(recording);

// Find elements
const elements = api.findInteractiveElements();
const loginButton = api.findByText("Login", true);

// DOM manipulation
const element = await api.findElement({
  text: "Submit"
});
await api.clickElement(element);
await api.typeText(inputElement, "Hello World");

// Get page context
const context = api.getPageContext();

// Generate automation plan with AI
const plan = await api.generatePlan(
  "Fill out the contact form with test data and submit it"
);

// Execute automation plan
await api.executePlan(plan, {
  onProgress: (result) => console.log(result),
  continueOnError: false,
  screenshotOnError: true,
});

// Extractor API
const extractor = window.__extractorAPI;

// Generate page summary
const summary = await extractor.generateSummary();
console.log(summary.title, summary.summary, summary.mainTopics);

// Detect and extract React components
const reactInfo = extractor.extractReact();
if (reactInfo.hasReact) {
  console.log(`Found ${reactInfo.componentCount} React components`);
  reactInfo.components.forEach(comp => {
    console.log(`Component: ${comp.name} (${comp.type})`);
    console.log(extractor.generateJSX(comp));
  });
}

// Extract Tailwind components
const tailwindInfo = extractor.extractTailwind();
if (tailwindInfo.hasTailwind) {
  console.log(`Found ${tailwindInfo.components.length} Tailwind components`);
  tailwindInfo.components.forEach(comp => {
    console.log(`${comp.name}: ${comp.classCount} classes`);
    console.log(extractor.generateTailwindComponent(comp, 'react'));
  });
}
```

## Examples

### Page Summary
```javascript
// Generate comprehensive summary
const summary = await window.__extractorAPI.generateSummary();
console.log(summary);
// {
//   title: "AI Browser Automation",
//   summary: "A comprehensive browser extension...",
//   mainTopics: ["Automation", "AI", "React"],
//   keyPoints: ["Easy to use", "Powerful features"],
//   pageType: "documentation",
//   technicalDetails: {
//     framework: "React",
//     libraries: ["TailwindCSS", "tRPC"],
//     features: ["Recording", "AI Analysis"]
//   }
// }

// Quick summary
const quick = await window.__extractorAPI.generateQuickSummary();
console.log(quick); // "AI Browser Automation extension with React and Tailwind"
```

### React Component Extraction
```javascript
// Detect React
const detection = window.__extractorAPI.detectReact();
if (detection.hasReact) {
  console.log(`React ${detection.version} detected!`);
}

// Extract all components
const info = window.__extractorAPI.extractReact();
console.log(`Found ${info.componentCount} components`);

// Generate JSX for a component
const component = info.components[0];
const jsx = window.__extractorAPI.generateJSX(component);
console.log(jsx);
// function Button({ onClick, children }) {
//   return (
//     <button onClick={onClick} className="btn-primary">
//       {children}
//     </button>
//   );
// }
```

### Tailwind Component Extraction
```javascript
// Detect Tailwind
const detection = window.__extractorAPI.detectTailwind();
if (detection.hasTailwind) {
  console.log("Tailwind CSS detected!");
}

// Extract components
const info = window.__extractorAPI.extractTailwind();
console.log(`Found ${info.components.length} Tailwind components`);
console.log(`Common patterns:`, info.commonPatterns);

// Generate React component from Tailwind
const component = info.components[0];
const reactCode = window.__extractorAPI.generateTailwindComponent(component, 'react');
console.log(reactCode);
// export function Card({ children, className, ...props }: CardProps) {
//   return (
//     <div className={`rounded-lg border bg-card shadow-sm ${className || ""}`} {...props}>
//       {children}
//     </div>
//   );
// }

// Extract by category
const buttons = window.__extractorAPI.extractTailwindByCategory('button');
console.log(`Found ${buttons.length} button components`);
```

## Automation Examples

See [`examples/automation-examples.ts`](examples/automation-examples.ts) for complete examples including:

### Form Filling
```typescript
const plan: AutomationPlan = {
  tasks: [
    { type: "type", selector: 'input[name="email"]', value: "user@example.com" },
    { type: "type", selector: 'input[name="password"]', value: "password123" },
    { type: "click", selector: 'button[type="submit"]' }
  ]
};
await window.__automationAPI.executePlan(plan);
```

### Data Extraction
```typescript
// Extract all product names
const products = window.__automationAPI.extractData(".product-name");

// Extract with attributes
const links = window.__automationAPI.extractData("a.product-link", "href");
```

### AI-Assisted Automation
```typescript
// Generate plan from natural language
const plan = await window.__automationAPI.generatePlan(
  "Search for 'laptop', apply price filter under $1000, and extract all product titles"
);

// Execute the generated plan
await window.__automationAPI.executePlan(plan);
```

## Project Structure

```
src/
├── entrypoints/
│   ├── background.ts          # Service worker with tRPC router
│   ├── content/
│   │   ├── index.tsx          # Content script entry point
│   │   └── App.tsx            # Content script UI
│   └── popup/
│       ├── index.html         # Popup HTML
│       ├── main.tsx           # Popup entry point
│       └── App.tsx            # Popup UI with tabs
├── lib/
│   ├── automation/
│   │   ├── dom-utils.ts       # DOM manipulation utilities
│   │   ├── recorder.ts        # Action recording/playback
│   │   ├── orchestrator.ts    # Automation engine
│   │   └── vision.ts          # Screenshot & vision analysis
│   ├── extractors/
│   │   ├── page-summary.ts    # AI-powered page summaries
│   │   ├── react-extractor.ts # React component detection
│   │   └── tailwind-extractor.ts # Tailwind component extraction
│   ├── services/
│   │   └── ai.service.ts      # AI provider integration
│   ├── types/
│   │   └── ai.types.ts        # TypeScript definitions
│   └── utils.ts               # Utility functions
├── components/
│   └── ui/                    # shadcn/ui components
└── global.css                 # Global styles

examples/
└── automation-examples.ts     # Example automation workflows
```

## API Reference

### Extractor API

The `window.__extractorAPI` object provides the following methods:

#### Page Summary
- `generateSummary()` - Generate comprehensive AI-powered page summary
- `generateQuickSummary()` - Generate quick 1-2 sentence summary
- `detectPageType()` - Detect page type (blog, docs, product, etc.)
- `extractMainTopics()` - Extract main topics from page headers
- `extractStructuredData()` - Extract JSON-LD structured data

#### React Extraction
- `detectReact()` - Detect if page uses React and get version
- `extractReact()` - Extract all React components from page
- `findReactRoots()` - Find React root elements
- `extractReactComponent(element)` - Extract component info from element
- `generateJSX(component)` - Generate JSX code from component

#### Tailwind Extraction
- `detectTailwind()` - Detect if page uses Tailwind CSS
- `extractTailwind()` - Extract all Tailwind components
- `extractTailwindBySelector(selector)` - Extract specific component
- `extractTailwindByCategory(category)` - Extract by category (button, form, card, etc.)
- `generateTailwindComponent(component, framework)` - Generate React or Vue component code

### Automation API

The `window.__automationAPI` object provides the following methods:

#### Recording
- `startRecording()` - Start recording user actions
- `stopRecording()` - Stop recording and return Recording object
- `getRecordingStatus()` - Get current recording status
- `playRecording(recording, options?)` - Replay recorded actions
- `pausePlayback()` - Pause playback
- `resumePlayback()` - Resume playback
- `stopPlayback()` - Stop playback

#### Orchestration
- `executePlan(plan, options?)` - Execute automation plan
- `executeTask(task, options?)` - Execute single task
- `generatePlan(prompt)` - Generate plan with AI
- `getContext()` - Get current page context
- `getResults()` - Get execution results

#### DOM Utilities
- `findElement(query)` - Smart element finder
- `findByText(text, exact?)` - Find elements by text
- `findInteractiveElements()` - Find all interactive elements
- `getPageContext()` - Extract page information
- `extractData(selector, attribute?)` - Extract data from elements
- `clickElement(element, options?)` - Click with options
- `typeText(element, text, options?)` - Type text with options
- `waitForElement(selector, timeout?)` - Wait for element
- `highlightElement(element, duration?)` - Visual feedback

## Permissions

The extension requires the following permissions:
- `storage` - Store configuration and plans
- `activeTab` - Access current tab
- `tabs` - Tab management
- `scripting` - Execute automation scripts
- `webNavigation` - Navigation tracking
- `downloads` - Export functionality
- `clipboardWrite` - Clipboard access
- `unlimitedStorage` - Store recordings
- `<all_urls>` - Access all websites

## Development

### Adding shadcn Components

```bash
pnpm dlx shadcn@latest add [component-name]
```

### Type Checking

```bash
pnpm compile
```

### Build for Firefox

```bash
pnpm dev:firefox
pnpm build:firefox
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Resources

- [WXT Documentation](https://wxt.dev/)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [Anthropic Claude](https://www.anthropic.com/claude)
- [tRPC Chrome](https://github.com/jlalmes/trpc-chrome)
