use crate::{
	errors::Result,
	models::{AgentConfig, ResourceScope},
};
use std::path::{Path, PathBuf};
use std::process::Command;

/// Trait for adapting different agent configuration formats
pub trait AgentAdapter: Send + Sync {
	fn name(&self) -> &'static str;
	fn global_config_path(&self) -> PathBuf;
	fn project_config_path(&self, project_root: &Path) -> PathBuf;

	/// Load complete configuration: MCPs from file + Skills from directories
	/// Adapter handles all I/O internally, including missing config files
	fn load_config(
		&self,
		config_path: &Path,
		project_root: Option<&Path>,
		scope: ResourceScope,
	) -> Result<AgentConfig>;

	/// Parse config from content string (legacy, kept for backward compatibility)
	/// New code should use load_config instead
	fn parse_config(&self, content: &str) -> Result<AgentConfig>;

	/// Get all valid skill paths for the given scope (used for loading)
	fn get_skills_paths(
		&self,
		project_root: Option<&Path>,
		scope: ResourceScope,
	) -> Vec<PathBuf>;

	/// Get the target directory for writing new skills based on scope
	fn target_skills_dir(
		&self,
		project_root: Option<&Path>,
		scope: ResourceScope,
	) -> Option<PathBuf>;

	fn serialize_config(
		&self,
		config: &AgentConfig,
		original_content: Option<&str>,
	) -> Result<String>;
	fn supports_mcp_operations(&self) -> bool {
		true
	}
	fn validate_command(&self, config_path: &Path) -> Command;
	fn supports_mcp_enable_disable(&self) -> bool {
		true
	}
}

pub fn create_adapter(agent_type: crate::AgentType) -> Box<dyn AgentAdapter> {
	Box::new(crate::registry::get(agent_type))
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::AgentType;

	#[test]
	fn test_create_adapter_claude() {
		let adapter = create_adapter(AgentType::Claude);
		assert_eq!(adapter.name(), "claude");
	}

	#[test]
	fn test_create_adapter_opencode() {
		let adapter = create_adapter(AgentType::OpenCode);
		assert_eq!(adapter.name(), "opencode");
	}

	#[test]
	fn test_create_adapter_kiro() {
		let adapter = create_adapter(AgentType::Kiro);
		assert_eq!(adapter.name(), "kiro");
	}
}
