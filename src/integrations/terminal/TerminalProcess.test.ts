import { describe, it, beforeEach, afterEach } from "mocha"
import "should"
import * as sinon from "sinon"
import { TerminalProcess } from "./TerminalProcess"
import * as vscode from "vscode"
import { TerminalRegistry } from "./TerminalRegistry"

interface TestTerminal extends vscode.Terminal {
	readonly shellIntegration: vscode.TerminalShellIntegration & {
		executeCommand(command: string): vscode.TerminalShellExecution
	}
}

function createMockExecution(command: string): vscode.TerminalShellExecution {
	return {
		commandLine: command as unknown as vscode.TerminalShellExecutionCommandLine,
		cwd: vscode.Uri.file("/mock/cwd"),
		async *read() {
			yield "test-command\n"
			yield "line1\n"
			yield "line2\n"
			yield "line3\n"
		},
	}
}

describe("TerminalProcess Integration Tests", () => {
	let terminalProcess: TerminalProcess
	let sandbox: sinon.SinonSandbox
	const createdTerminals: TestTerminal[] = []

	beforeEach(() => {
		sandbox = sinon.createSandbox({ useFakeTimers: true })
		terminalProcess = new TerminalProcess()
	})

	afterEach(() => {
		sandbox.restore()
		terminalProcess.removeAllListeners()
		createdTerminals.forEach((t) => t.dispose())
		createdTerminals.length = 0
	})

	it("should execute commands with proper shell integration", async () => {
		const originalTerminal = TerminalRegistry.createTerminal().terminal
		const terminal = Object.create(originalTerminal, {
			shellIntegration: {
				value: {
					cwd: vscode.Uri.file("/mock/cwd"),
					executeCommand: (command: string) => createMockExecution(command),
				},
				configurable: true,
				enumerable: true,
			},
		}) as TestTerminal

		const emitSpy = sandbox.spy(terminalProcess, "emit")
		await terminalProcess.run(terminal, "echo test")

		sinon.assert.calledWith(emitSpy as unknown as sinon.SinonSpy<[string, ...any[]], boolean>, "continue")
		sinon.assert.calledWith(emitSpy as unknown as sinon.SinonSpy<[string, ...any[]], boolean>, "completed")
	})
})
