import path from "path"
import { fileExistsAtPath } from "../../utils/fs"
import fs from "fs/promises"
import ignore, { Ignore } from "ignore"
import * as vscode from "vscode"

export const LOCK_TEXT_SYMBOL = "\u{1F512}"

/**
 * Controls LLM access to files by enforcing ignore patterns.
 * Designed to be instantiated once in OneUnlimited.ts and passed to file manipulation services.
 * Uses the 'ignore' library to support standard .gitignore syntax in .oneunlimitedignore files.
 */
export class OneUnlimitedIgnoreController {
	private cwd: string
	private ignoreInstance: Ignore
	private disposables: vscode.Disposable[] = []
	oneunlimitedIgnoreContent: string | undefined

	constructor(cwd: string) {
		this.cwd = cwd
		this.ignoreInstance = ignore()
		this.oneunlimitedIgnoreContent = undefined
		// Set up file watcher for .oneunlimitedignore
		this.setupFileWatcher()
	}

	/**
	 * Initialize the controller by loading custom patterns
	 * Must be called after construction and before using the controller
	 */
	async initialize(): Promise<void> {
		await this.loadOneUnlimitedIgnore()
	}

	/**
	 * Set up the file watcher for .oneunlimitedignore changes
	 */
	private setupFileWatcher(): void {
		const oneunlimitedignorePattern = new vscode.RelativePattern(this.cwd, ".oneunlimitedignore")
		const fileWatcher = vscode.workspace.createFileSystemWatcher(oneunlimitedignorePattern)

		// Watch for changes and updates
		this.disposables.push(
			fileWatcher.onDidChange(() => {
				this.loadOneUnlimitedIgnore()
			}),
			fileWatcher.onDidCreate(() => {
				this.loadOneUnlimitedIgnore()
			}),
			fileWatcher.onDidDelete(() => {
				this.loadOneUnlimitedIgnore()
			}),
		)

		// Add fileWatcher itself to disposables
		this.disposables.push(fileWatcher)
	}

	/**
	 * Load custom patterns from .oneunlimitedignore if it exists
	 */
	private async loadOneUnlimitedIgnore(): Promise<void> {
		try {
			// Reset ignore instance to prevent duplicate patterns
			this.ignoreInstance = ignore()
			const ignorePath = path.join(this.cwd, ".oneunlimitedignore")
			if (await fileExistsAtPath(ignorePath)) {
				const content = await fs.readFile(ignorePath, "utf8")
				this.oneunlimitedIgnoreContent = content
				this.ignoreInstance.add(content)
				this.ignoreInstance.add(".oneunlimitedignore")
			} else {
				this.oneunlimitedIgnoreContent = undefined
			}
		} catch (error) {
			// Should never happen: reading file failed even though it exists
			console.error("Unexpected error loading .oneunlimitedignore:", error)
		}
	}

	/**
	 * Check if a file should be accessible to the LLM
	 * @param filePath - Path to check (relative to cwd)
	 * @returns true if file is accessible, false if ignored
	 */
	validateAccess(filePath: string): boolean {
		// Always allow access if .oneunlimitedignore does not exist
		if (!this.oneunlimitedIgnoreContent) {
			return true
		}
		try {
			// Normalize path to be relative to cwd and use forward slashes
			const absolutePath = path.resolve(this.cwd, filePath)
			const relativePath = path.relative(this.cwd, absolutePath).replace(/\\/g, "/")

			// Ignore expects paths to be path.relative()'d
			return !this.ignoreInstance.ignores(relativePath)
		} catch (error) {
			// Ignore is designed to work with relative file paths, so will throw error for paths outside cwd. We are allowing access to all files outside cwd.
			return true
		}
	}

	/**
	 * Check if a terminal command or configuration is allowed
	 * Placeholder method for future implementation of command filtering
	 * @returns boolean indicating if the command or configuration is permitted
	 */
	validateCommand(): boolean {
		// TODO: Implement command validation logic
		return true
	}

	/**
	 * Dispose of all resources and watchers
	 */
	dispose(): void {
		this.disposables.forEach((disposable) => disposable.dispose())
		this.disposables = []
	}
}
