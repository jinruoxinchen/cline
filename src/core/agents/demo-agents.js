/**
 * Agent Architecture Demo
 *
 * This is a simplified demo that mocks the agent behavior
 * to demonstrate the multi-agent architecture concept.
 */

// MockBaseAgent - simulates the BaseAgent class
class MockBaseAgent {
	constructor(config) {
		this.id = config.id || "mock-agent"
		this.name = config.name || "Mock Agent"
		this.description = config.description || "A mock agent for testing"
		this.teamChannel = config.teamChannel || "general"
		this.capabilities = config.capabilities || []
		this.messageBuffer = []
	}

	async handleMessage(message, sender) {
		console.log(`[${this.id}] Received message: ${message}`)
		this.messageBuffer.push(message)

		// Process message immediately for demo purposes
		await this.processMessageBuffer()
		return Promise.resolve()
	}

	async processMessageBuffer() {
		const context = this.messageBuffer.join("\n")
		this.messageBuffer = []

		const response = await this.generateResponse(context)
		console.log(`[${this.id}] Responding with: ${response}`)

		// Broadcast response to channel
		this.broadcastResponse(response)
	}

	async executeTool(tool) {
		console.log(`[${this.id}] Executing tool: ${tool.name}`)
		return Promise.resolve(`Tool ${tool.name} executed successfully`)
	}

	broadcastResponse(response) {
		console.log(`[CHANNEL:${this.teamChannel}] ${this.id}: ${response}`)
	}

	generateResponse(context) {
		return Promise.resolve(`Default response from ${this.id} to: ${context}`)
	}
}

// MockTeamLeaderAgent - simulates the TeamLeaderAgent class
class MockTeamLeaderAgent extends MockBaseAgent {
	constructor(config) {
		super(config)
		this.pendingTasks = new Map()
	}

	async analyzeTask(taskDescription) {
		console.log(`[${this.id}] Analyzing task: ${taskDescription}`)

		// Create a simple plan
		return {
			id: `plan-${Date.now()}`,
			objective: taskDescription,
			steps: [
				{
					id: `step-1-${Date.now()}`,
					description: "Initial task analysis",
					assignedTo: "TechnicalArchitecture",
					status: "pending",
					requiredTools: ["task-analyzer"],
				},
			],
		}
	}

	async generateResponse(context) {
		console.log(`[${this.id}] Generating plan for: ${context}`)

		// Create a plan based on the context
		const plan = {
			objective: context,
			steps: [
				{
					id: `step-1-${Date.now()}`,
					description: "Analyze requirements",
					assignedTo: "TechnicalArchitecture",
				},
				{
					id: `step-2-${Date.now()}`,
					description: "Implement solution",
					assignedTo: "FullStackDeveloper",
				},
			],
		}

		// Simulate delegating tasks to other agents
		setTimeout(() => {
			this.delegateTasks(plan)
		}, 100)

		return Promise.resolve(`Task planning complete: ${context}`)
	}

	async delegateTasks(plan) {
		if (this.developer) {
			const task = {
				id: `task-${Date.now()}`,
				description: "Implement a component",
				taskDetails: "Create a responsive UI component",
			}

			console.log(`[${this.id}] Delegating task to ${this.developer.id}: ${task.description}`)
			await this.developer.handleMessage(`Task assigned: ${task.description}`, this)
		}
	}

	setDeveloper(developer) {
		this.developer = developer
	}
}

// MockFullStackDeveloperAgent - simulates the FullStackDeveloperAgent class
class MockFullStackDeveloperAgent extends MockBaseAgent {
	async generateResponse(context) {
		console.log(`[${this.id}] Working on: ${context}`)
		return Promise.resolve(`Implemented feature for task: ${context}`)
	}
}

// Main demo function
async function runAgentDemo() {
	console.log("Starting agent architecture demo...")

	// Create team leader agent
	const teamLeader = new MockTeamLeaderAgent({
		id: "team-leader",
		name: "Team Leader",
		description: "Coordinates the development team",
		teamChannel: "project-channel",
		capabilities: ["planning", "coordination"],
	})

	// Create developer agent
	const developer = new MockFullStackDeveloperAgent({
		id: "full-stack-dev",
		name: "Full-Stack Developer",
		description: "Implements frontend and backend features",
		teamChannel: "project-channel",
		capabilities: ["frontend", "backend", "design"],
	})

	// Connect the agents
	teamLeader.setDeveloper(developer)

	// Start the workflow with a task
	console.log("\n----- Starting Task Workflow -----\n")
	const task = "Build a responsive navbar with dropdown menus"

	// Step 1: Team leader analyzes the task
	console.log(`Assigning task to team leader: "${task}"`)
	const plan = await teamLeader.analyzeTask(task)
	console.log("Task plan created:")
	console.log(JSON.stringify(plan, null, 2))

	// Step 2: Team leader processes the task and delegates work
	console.log("\nTeam leader processing task...")
	await teamLeader.handleMessage(task)

	// Wait for the completion of all async operations
	console.log("\nWaiting for all tasks to complete...")
	await new Promise((resolve) => setTimeout(resolve, 500))

	console.log("\n----- Workflow Complete -----\n")
}

// Run the demo
runAgentDemo().catch(console.error)
