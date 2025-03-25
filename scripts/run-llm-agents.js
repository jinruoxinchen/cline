#!/usr/bin/env node

/**
 * OneUnlimited LLM多代理系统启动脚本
 *
 * 此脚本用于启动使用真实LLM API的多代理系统演示。
 * 使用方法: node scripts/run-llm-agents.js [claude-api-key] [deepseek-api-key]
 */

const path = require("path")
const fs = require("fs")
const os = require("os")
const { spawn } = require("child_process")

// 配置文件目录
const configDir = path.join(os.homedir(), ".oneunlimited")
const configPath = path.join(configDir, "config.json")

// 命令行参数
const claudeApiKey = process.argv[2] || ""
const deepseekApiKey = process.argv[3] || ""
const claudeBaseUrl = process.argv[4] || ""

// 如果提供了API密钥或baseUrl，保存到配置文件
if (claudeApiKey || deepseekApiKey || claudeBaseUrl) {
	try {
		// 创建配置目录（如果不存在）
		if (!fs.existsSync(configDir)) {
			fs.mkdirSync(configDir, { recursive: true })
		}

		// 读取现有配置或创建新配置
		let config = {
			claudeApiKey: claudeApiKey,
			deepseekApiKey: deepseekApiKey,
			claudeBaseUrl: claudeBaseUrl,
			claudeModel: "claude-3-7-sonnet-20240307", // 使用Claude 3.7
			deepseekModel: "deepseek-chat",
			preferredProvider: claudeApiKey ? "claude" : "deepseek",
		}

		if (fs.existsSync(configPath)) {
			try {
				const existingConfig = JSON.parse(fs.readFileSync(configPath, "utf8"))
				// 合并配置，仅更新提供的参数
				if (claudeApiKey) existingConfig.claudeApiKey = claudeApiKey
				if (deepseekApiKey) existingConfig.deepseekApiKey = deepseekApiKey
				if (claudeBaseUrl) existingConfig.claudeBaseUrl = claudeBaseUrl
				config = existingConfig
			} catch (e) {
				console.error("读取配置文件失败，将使用新配置:", e.message)
			}
		}

		// 保存配置
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
		console.log(`API密钥已保存到: ${configPath}`)
	} catch (error) {
		console.error("保存API密钥失败:", error)
	}
}

// 启动interactive-agents.js
console.log("正在启动 OneUnlimited LLM多代理系统...")

const agentsProcess = spawn("node", [path.join(__dirname, "..", "src", "core", "agents", "interactive-agents.js")], {
	stdio: "inherit",
	shell: process.platform === "win32",
})

agentsProcess.on("error", (error) => {
	console.error("启动多代理系统时出错:", error.message)
	process.exit(1)
})

agentsProcess.on("close", (code) => {
	console.log(`多代理系统已退出，代码: ${code}`)
	process.exit(code)
})

// 处理Ctrl+C中断
process.on("SIGINT", () => {
	console.log("接收到中断信号，正在关闭...")
	agentsProcess.kill()
})
