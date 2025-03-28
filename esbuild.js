const esbuild = require("esbuild")
const fs = require("fs")
const path = require("path")

const production = process.argv.includes("--production")
const watch = process.argv.includes("--watch")

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: "esbuild-problem-matcher",

	setup(build) {
		build.onStart(() => {
			console.log("[watch] build started")
		})
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`)
				console.error(`    ${location.file}:${location.line}:${location.column}:`)
			})
			console.log("[watch] build finished")
		})
	},
}

const copyWasmFiles = {
	name: "copy-wasm-files",
	setup(build) {
		build.onEnd(() => {
			// tree sitter
			const sourceDir = path.join(__dirname, "node_modules", "web-tree-sitter")
			const targetDir = path.join(__dirname, "dist")

			// Copy tree-sitter.wasm
			fs.copyFileSync(path.join(sourceDir, "tree-sitter.wasm"), path.join(targetDir, "tree-sitter.wasm"))

			// Copy language-specific WASM files
			const languageWasmDir = path.join(__dirname, "node_modules", "tree-sitter-wasms", "out")
			const languages = [
				"typescript",
				"tsx",
				"python",
				"rust",
				"javascript",
				"go",
				"cpp",
				"c",
				"c_sharp",
				"ruby",
				"java",
				"php",
				"swift",
				"kotlin",
			]

			languages.forEach((lang) => {
				const filename = `tree-sitter-${lang}.wasm`
				fs.copyFileSync(path.join(languageWasmDir, filename), path.join(targetDir, filename))
			})
		})
	},
}

const extensionConfig = {
	bundle: true,
	minify: production,
	sourcemap: !production,
	logLevel: "silent",
	plugins: [copyWasmFiles, esbuildProblemMatcherPlugin],
	entryPoints: ["src/extension.ts"],
	format: "cjs",
	sourcesContent: false,
	platform: "node",
	outfile: "dist/extension.js",
	external: ["vscode"],
}

const agentSystemConfig = {
	bundle: true,
	minify: production,
	sourcemap: !production,
	logLevel: "silent",
	entryPoints: ["src/core/agents/test-agents.mjs", "src/core/agents/AgentSystem.ts", "src/core/agents/TeamLeaderAgent.ts"],
	format: "esm",
	sourcesContent: false,
	platform: "node",
	outdir: "dist/agents",
	external: ["vscode", "@anthropic-ai/sdk", "openai"],
}

async function main() {
	const extensionCtx = await esbuild.context(extensionConfig)
	const agentCtx = await esbuild.context(agentSystemConfig)

	if (watch) {
		await extensionCtx.watch()
		await agentCtx.watch()
	} else {
		await extensionCtx.rebuild()
		await agentCtx.rebuild()
		await extensionCtx.dispose()
		await agentCtx.dispose()
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
