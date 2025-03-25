interface ChannelMessage {
	content: string
	agentId: string
	timestamp: number
}

export function postMessageToChannel(params: { channelId: string; message: ChannelMessage }): void {
	// Implementation would integrate with VSCode's webview messaging system
	console.log(`[${params.channelId}] ${params.message.agentId}: ${params.message.content}`)
}
