// Simple test script to demonstrate the agent architecture in OneUnlimited
const { TeamLeaderAgent } = require("./specialized/TeamLeaderAgent.ts")
const { FullStackDeveloperAgent } = require("./specialized/FullStackDeveloperAgent.ts")

// Store the original postMessageToChannel function
const MessageBus = require("../comm/MessageBus")
const originalPostMessageToChannel = MessageBus.postMessageToChannel

async function testAgentArchitecture() {
	console.log("Starting agent architecture test...")

	// Initialize the team leader agent
	const teamLeader = new TeamLeaderAgent({
		id: "team-leader-1",
		name: "Team Lead",
		description: "Coordinates team members and delegates tasks",
		teamChannel: "project-alpha",
		capabilities: ["task_planning", "team_coordination"],
		defaultTools: ["task-analyzer"],
	})

	// Initialize a full stack developer agent
	const developer = new FullStackDeveloperAgent({
		id: "dev-1",
		name: "Full Stack Developer",
		teamChannel: "project-alpha",
		capabilities: ["code_writing", "debugging", "ui_implementation"],
	})

	// Store messages for testing
	const messages = []

	// Override the postMessageToChannel function
	MessageBus.postMessageToChannel = (params) => {
		messages.push(params)
		console.log(`Message to ${params.channelId}: ${params.message.content}`)

		// Simulate message delivery to appropriate agent
		if (params.message.agentId === "team-leader-1" && params.channelId === "project-alpha") {
			developer.handleMessage(params.message.content, teamLeader)
		}
	}

	try {
		// Start the workflow with a task
		const taskDescription = "Create a responsive navbar component with dropdown menus"
		console.log(`\nAssigning task: "${taskDescription}"`)

		// Step 1: Team leader analyzes the task
		const plan = await teamLeader.analyzeTask(taskDescription)
		console.log("\nTask plan created:")
		console.log(JSON.stringify(plan, null, 2))

		// Step 2: Team leader processes messages and delegates tasks
		await teamLeader.handleMessage(taskDescription)

		// Step 3: Display all messages exchanged during the process
		console.log("\nMessage exchange summary:")
		messages.forEach((msg, index) => {
			console.log(`[${index + 1}] ${msg.message.agentId} → ${msg.channelId}: ${msg.message.content}`)
		})

		// Step 4: Execute specific step with full stack developer
		console.log("\nExecuting task step directly with developer:")
		const stepResult = await developer.executeStep(plan.steps[0])
		console.log("Step execution result:", stepResult)
	} finally {
		// Restore original function
		MessageBus.postMessageToChannel = originalPostMessageToChannel
	}
}

// Run the test
testAgentArchitecture().catch(console.error)
