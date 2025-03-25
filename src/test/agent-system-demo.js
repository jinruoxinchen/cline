/**
 * OneUnlimited 多代理系统演示脚本
 *
 * 使用方法:
 * 1. 确保VSCode已经启动并加载了OneUnlimited扩展
 * 2. 运行 `node src/test/agent-system-demo.js`
 */

const vscode = require("vscode")
const path = require("path")

async function runAgentSystemDemo() {
	console.log("启动 OneUnlimited 多代理系统演示...")

	try {
		// 等待 VSCode API 准备就绪
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// 尝试获取扩展
		const extension = vscode.extensions.getExtension("one-unlimited.oneunlimited")
		if (!extension) {
			console.error("找不到 OneUnlimited 扩展，请确保扩展已安装并启用")
			return
		}

		if (!extension.isActive) {
			console.log("激活 OneUnlimited 扩展...")
			await extension.activate()
		}

		// 打开代理系统视图
		console.log("打开代理系统视图...")
		await vscode.commands.executeCommand("oneunlimited.openAgentSystem")

		// 等待UI加载
		await new Promise((resolve) => setTimeout(resolve, 2000))

		// 提交一个演示任务
		console.log("提交演示任务...")
		await vscode.commands.executeCommand(
			"oneunlimited.submitAgentTask",
			"设计并实现一个响应式导航栏组件，需要支持移动端和桌面端",
		)

		console.log("演示任务已提交，请查看 VSCode 界面查看多代理系统执行过程")
	} catch (error) {
		console.error("演示过程中发生错误:", error.message)
	}
}

// 如果直接运行此脚本，则显示说明
if (require.main === module) {
	console.log(`
===================================================
  OneUnlimited 多代理系统演示
===================================================

此脚本需要在 VSCode 扩展主机环境中运行，不能直接从命令行执行。

请按照以下步骤在 VSCode 中运行演示:

1. 在 VSCode 中打开命令面板 (Ctrl+Shift+P 或 Cmd+Shift+P)
2. 输入并选择 "OneUnlimited: 启动多代理系统演示"
3. 观察多代理系统执行过程

或者可以直接点击状态栏上的多代理系统图标，然后在打开的界面中提交任务。
  `)
}

module.exports = { runAgentSystemDemo }
