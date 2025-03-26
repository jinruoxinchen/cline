/**
 * OneUnlimitedAPI 接口定义了插件对外暴露的方法
 * 这些方法允许其他扩展或脚本与OneUnlimited进行交互
 */
export interface OneUnlimitedAPI {
	/**
	 * 设置自定义指令
	 * @param value 要设置的自定义指令文本
	 */
	setCustomInstructions(value: string): Promise<void>

	/**
	 * 获取当前的自定义指令
	 * @returns 当前的自定义指令，如果未设置则返回undefined
	 */
	getCustomInstructions(): Promise<string | undefined>

	/**
	 * 开始一个新任务
	 * @param task 可选的任务描述
	 * @param images 可选的与任务相关的图片
	 */
	startNewTask(task?: string, images?: string[]): Promise<void>

	/**
	 * 向当前会话发送消息
	 * @param message 要发送的消息
	 * @param images 可选的与消息相关的图片
	 */
	sendMessage(message?: string, images?: string[]): Promise<void>

	/**
	 * 模拟点击主要按钮（如确认、继续等）
	 */
	pressPrimaryButton(): Promise<void>

	/**
	 * 模拟点击次要按钮（如取消、拒绝等）
	 */
	pressSecondaryButton(): Promise<void>
}
