import type { AgentInfo } from "./api";

export function supportsMcp(agent: Pick<AgentInfo, "capabilities">): boolean {
	return agent.capabilities.mcp_stdio || agent.capabilities.mcp_remote;
}
