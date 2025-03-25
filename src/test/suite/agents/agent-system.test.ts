import * as assert from "assert"
import { suite, test } from "mocha"
import * as vscode from "vscode"
import * as sinon from "sinon"
import { getAgentSystem } from "../../../core/agents/AgentSystem"
import { getAgentManager } from "../../../core/agents/management/AgentManager"
import { getMessageBus, MessageType } from "../../../core/agents/messaging/MessageBus"
import { TeamLeaderAgent } from "../../../core/agents/specialized/TeamLeaderAgent"

suite("Agent System Test Suite", () => {
	const context = {
		subscriptions: [],
		extensionUri: vscode.Uri.parse("file:///test"),
		extensionPath: "/test",
	} as unknown as vscode.ExtensionContext

	let sandbox: sinon.SinonSandbox
	let showInformationMessageStub: sinon.SinonStub

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		showInformationMessageStub = sandbox.stub(vscode.window, "showInformationMessage")
	})

	afterEach(() => {
		sandbox.restore()
	})

	test("AgentSystem can be initialized", async () => {
		const agentSystem = getAgentSystem(context)
		assert.ok(agentSystem, "Agent system should be created")
	})

	test("AgentManager can register agents", () => {
		const agentManager = getAgentManager()

		// 创建一个模拟的代理
		const mockAgent = new TeamLeaderAgent({
			id: "test-agent",
			name: "Test Agent",
			description: "Test agent for unit tests",
			capabilities: ["testing"],
		})

		// 注册代理
		agentManager.registerAgent(mockAgent)

		// 验证代理是否已注册
		const allAgents = agentManager.getAllAgents()
		assert.strictEqual(allAgents.length, 1, "Should have one registered agent")
		assert.strictEqual(allAgents[0].id, "test-agent", "Agent ID should match")
	})

	test("Agent collaboration through MessageBus", async () => {
		const agentManager = getAgentManager()
		const messageBus = getMessageBus()

		// 创建两个测试代理
		const agent1 = new TeamLeaderAgent({
			id: "agent-1",
			name: "Agent 1",
			description: "Test agent 1",
			capabilities: ["testing"],
		})

		const agent2 = new TeamLeaderAgent({
			id: "agent-2",
			name: "Agent 2",
			description: "Test agent 2",
			capabilities: ["testing"],
		})

		// 注册代理
		agentManager.registerAgent(agent1)
		agentManager.registerAgent(agent2)

		// 设置消息监听
		const receivedMessages: string[] = []
		messageBus.subscribe("collab-channel", (msg) => {
			receivedMessages.push(msg.content)
		})

		// 触发代理间通信
		await agent1.handleMessage({
			id: "test-msg-1",
			type: MessageType.COMMAND,
			senderId: "agent-1",
			channelId: "collab-channel",
			content: "Send to agent-2",
			recipientId: "agent-2",
			timestamp: Date.now(),
		})

		// 验证消息传递
		assert.strictEqual(receivedMessages.length, 1, "Should receive collaboration message")
		assert.match(receivedMessages[0], /ACK: test-msg-1/, "Should get acknowledgement")
	})

	test("MessageBus can publish and subscribe to messages", () => {
		const messageBus = getMessageBus()
		let receivedMessage: any = null

		// 订阅消息
		const unsubscribe = messageBus.subscribe("test-channel", (message) => {
			receivedMessage = message
		})

		// 发布消息
		messageBus.publish({
			id: "test-message",
			type: MessageType.NOTIFICATION,
			senderId: "test-sender",
			channelId: "test-channel",
			content: "Hello from test",
			timestamp: Date.now(),
		})

		// 验证消息是否被接收
		assert.ok(receivedMessage, "Message should be received")
		assert.strictEqual(receivedMessage.content, "Hello from test", "Message content should match")

		// 清理
		unsubscribe()
	})
})
