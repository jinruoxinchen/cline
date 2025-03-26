export interface ChatSettings {
  mode: "plan" | "act" | "unlimited"
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  mode: "act"
}
