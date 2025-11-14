import { useState } from "react";
import "@/entrypoints/global.css";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Play,
	Square,
	Circle,
	Settings,
	Bot,
	FileText,
	Zap,
	Code2,
	Sparkles,
	Copy,
	Download,
} from "lucide-react";

function App() {
	const [activeTab, setActiveTab] = useState("quick");
	const [isRecording, setIsRecording] = useState(false);
	const [summary, setSummary] = useState<string>("");
	const [extractedCode, setExtractedCode] = useState<string>("");
	const [aiConfig, setAIConfig] = useState({
		provider: "openai",
		apiKey: "",
		model: "gpt-4o",
	});

	const executeInContentScript = async (code: string) => {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (tab.id) {
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: (codeToExecute: string) => {
					// biome-ignore lint/security/noGlobalEval: Dynamic automation execution
					return eval(codeToExecute);
				},
				args: [code],
			});
		}
	};

	const handleStartRecording = async () => {
		await executeInContentScript("window.__automationAPI.startRecording()");
		setIsRecording(true);
	};

	const handleStopRecording = async () => {
		const result = await executeInContentScript(
			"window.__automationAPI.stopRecording()",
		);
		setIsRecording(false);
		console.log("Recording saved:", result);
	};

	const handleAnalyzePage = async () => {
		await executeInContentScript(`
			(async () => {
				const context = window.__automationAPI.getPageContext();
				console.log("Page Context:", context);
				alert("Page analyzed! Check console for details.");
			})()
		`);
	};

	const handleSaveAIConfig = async () => {
		await chrome.storage.local.set({ aiConfig });
		alert("AI configuration saved!");
	};

	const handleGenerateSummary = async () => {
		setSummary("Generating summary...");
		try {
			const result = await executeInContentScript(`
				(async () => {
					const summary = await window.__extractorAPI.generateSummary();
					return summary;
				})()
			`);
			setSummary(JSON.stringify(result, null, 2));
		} catch (error) {
			setSummary(`Error: ${error}`);
		}
	};

	const handleExtractReact = async () => {
		setExtractedCode("Extracting React components...");
		try {
			const result = await executeInContentScript(`
				(async () => {
					const info = window.__extractorAPI.extractReact();
					return info;
				})()
			`);
			setExtractedCode(JSON.stringify(result, null, 2));
		} catch (error) {
			setExtractedCode(`Error: ${error}`);
		}
	};

	const handleExtractTailwind = async () => {
		setExtractedCode("Extracting Tailwind components...");
		try {
			const result = await executeInContentScript(`
				(async () => {
					const info = window.__extractorAPI.extractTailwind();
					return info;
				})()
			`);
			setExtractedCode(JSON.stringify(result, null, 2));
		} catch (error) {
			setExtractedCode(`Error: ${error}`);
		}
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		alert("Copied to clipboard!");
	};

	const downloadAsFile = (content: string, filename: string) => {
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="w-[600px] h-[500px] p-4">
			<div className="mb-4">
				<h1 className="text-2xl font-bold flex items-center gap-2">
					<Bot className="w-6 h-6" />
					AI Browser Automation
				</h1>
				<p className="text-sm text-muted-foreground">
					Build intelligent browser automations with AI
				</p>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-6">
					<TabsTrigger value="quick">
						<Zap className="w-4 h-4 mr-1" />
						Quick
					</TabsTrigger>
					<TabsTrigger value="summary">
						<Sparkles className="w-4 h-4 mr-1" />
						Summary
					</TabsTrigger>
					<TabsTrigger value="extract">
						<Code2 className="w-4 h-4 mr-1" />
						Extract
					</TabsTrigger>
					<TabsTrigger value="config">
						<Settings className="w-4 h-4 mr-1" />
						Config
					</TabsTrigger>
					<TabsTrigger value="plans">
						<FileText className="w-4 h-4 mr-1" />
						Plans
					</TabsTrigger>
					<TabsTrigger value="about">About</TabsTrigger>
				</TabsList>

				<TabsContent value="quick" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Recording</CardTitle>
							<CardDescription>
								Record your actions for later playback
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex gap-2">
								{!isRecording ? (
									<Button onClick={handleStartRecording} className="flex-1">
										<Circle className="w-4 h-4 mr-2 text-red-500" />
										Start Recording
									</Button>
								) : (
									<Button
										onClick={handleStopRecording}
										variant="destructive"
										className="flex-1"
									>
										<Square className="w-4 h-4 mr-2" />
										Stop Recording
									</Button>
								)}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Page Analysis</CardTitle>
							<CardDescription>
								Analyze the current page with AI
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button onClick={handleAnalyzePage} className="w-full">
								<Bot className="w-4 h-4 mr-2" />
								Analyze Current Page
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
							<CardDescription>Common automation tasks</CardDescription>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-2">
							<Button
								variant="outline"
								onClick={() =>
									executeInContentScript(
										"window.__automationAPI.findInteractiveElements()",
									)
								}
							>
								Find Elements
							</Button>
							<Button
								variant="outline"
								onClick={() =>
									executeInContentScript("window.__automationAPI.getContext()")
								}
							>
								Get Context
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="summary" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Page Summary</CardTitle>
							<CardDescription>
								Generate AI-powered summaries of the current page
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Button onClick={handleGenerateSummary} className="w-full">
								<Sparkles className="w-4 h-4 mr-2" />
								Generate Page Summary
							</Button>

							{summary && (
								<div className="space-y-2">
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => copyToClipboard(summary)}
										>
											<Copy className="w-4 h-4 mr-1" />
											Copy
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => downloadAsFile(summary, "page-summary.json")}
										>
											<Download className="w-4 h-4 mr-1" />
											Download
										</Button>
									</div>
									<pre className="p-3 bg-muted rounded text-xs overflow-auto max-h-[300px]">
										{summary}
									</pre>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="extract" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Component Extraction</CardTitle>
							<CardDescription>
								Extract React components and Tailwind styles from the page
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-2 gap-2">
								<Button onClick={handleExtractReact} variant="outline">
									<Code2 className="w-4 h-4 mr-2" />
									Extract React
								</Button>
								<Button onClick={handleExtractTailwind} variant="outline">
									<Code2 className="w-4 h-4 mr-2" />
									Extract Tailwind
								</Button>
							</div>

							{extractedCode && (
								<div className="space-y-2">
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => copyToClipboard(extractedCode)}
										>
											<Copy className="w-4 h-4 mr-1" />
											Copy
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												downloadAsFile(extractedCode, "extracted-components.json")
											}
										>
											<Download className="w-4 h-4 mr-1" />
											Download
										</Button>
									</div>
									<pre className="p-3 bg-muted rounded text-xs overflow-auto max-h-[300px]">
										{extractedCode}
									</pre>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="config" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>AI Configuration</CardTitle>
							<CardDescription>
								Configure your AI provider settings
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="provider">Provider</Label>
								<select
									id="provider"
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={aiConfig.provider}
									onChange={(e) =>
										setAIConfig({ ...aiConfig, provider: e.target.value })
									}
								>
									<option value="openai">OpenAI</option>
									<option value="anthropic">Anthropic</option>
									<option value="custom">Custom</option>
								</select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="apiKey">API Key</Label>
								<Input
									id="apiKey"
									type="password"
									placeholder="sk-..."
									value={aiConfig.apiKey}
									onChange={(e) =>
										setAIConfig({ ...aiConfig, apiKey: e.target.value })
									}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="model">Model</Label>
								<Input
									id="model"
									placeholder="gpt-4o"
									value={aiConfig.model}
									onChange={(e) =>
										setAIConfig({ ...aiConfig, model: e.target.value })
									}
								/>
							</div>

							<Button onClick={handleSaveAIConfig} className="w-full">
								Save Configuration
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="plans" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Automation Plans</CardTitle>
							<CardDescription>
								Create and manage automation workflows
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="text-center text-muted-foreground py-8">
								<FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
								<p>No automation plans yet</p>
								<p className="text-sm">
									Record actions or create plans with AI assistance
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="about" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>AI Browser Automation</CardTitle>
							<CardDescription>Version 1.0.0</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h3 className="font-semibold mb-2">Features</h3>
								<ul className="text-sm space-y-1 text-muted-foreground">
									<li>✓ Action recording and playback</li>
									<li>✓ AI-powered page analysis</li>
									<li>✓ Visual element detection</li>
									<li>✓ Smart DOM manipulation</li>
									<li>✓ Automation plan generation</li>
									<li>✓ Multi-provider AI support</li>
								</ul>
							</div>

							<div>
								<h3 className="font-semibold mb-2">Developer Tools</h3>
								<p className="text-sm text-muted-foreground">
									Access <code>window.__automationAPI</code> in the console for
									programmatic control
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default App;
