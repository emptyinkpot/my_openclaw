use std::path::{Path, PathBuf};

/// Check if a project config exists for the given agent (data-driven via registry)
pub fn project_config_exists(
	agent_type: super::AgentType,
	project_root: &Path,
) -> bool {
	let descriptor = crate::registry::get(agent_type);
	(descriptor.project_path)(project_root).exists()
}

/// Find the project root by checking registry markers (data-driven)
pub fn find_project_root(start_dir: &Path) -> Option<PathBuf> {
	let mut current = Some(start_dir);

	while let Some(dir) = current {
		// Check all agent project markers from registry
		for descriptor in crate::registry::iter_all() {
			for marker in descriptor.project_markers {
				let marker_path = dir.join(marker);
				if marker_path.exists() {
					return Some(dir.to_path_buf());
				}
			}
		}

		current = dir.parent();
	}

	None
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::fs;
	use tempfile::TempDir;

	#[test]
	fn test_claude_global_path_format() {
		let descriptor = crate::registry::get(super::super::AgentType::Claude);
		let path = (descriptor.global_path)();
		let path_str = path.to_string_lossy();
		assert!(path_str.contains(".claude.json"));
		assert!(!path_str.contains("Library/Application Support"));
	}

	#[test]
	fn test_claude_project_path() {
		let project = PathBuf::from("/home/user/myproject");
		let descriptor = crate::registry::get(super::super::AgentType::Claude);
		let path = (descriptor.project_path)(&project);
		assert_eq!(path, PathBuf::from("/home/user/myproject/.mcp.json"));
	}

	#[test]
	fn test_find_project_root_with_claude() {
		let temp_dir = TempDir::new().unwrap();
		let project_root = temp_dir.path().join("myproject");
		fs::create_dir_all(&project_root).unwrap();
		fs::write(project_root.join(".mcp.json"), "{}").unwrap();
		let found = find_project_root(&project_root).unwrap();
		assert_eq!(found, project_root);
	}

	#[test]
	fn test_find_project_root_with_opencode() {
		let temp_dir = TempDir::new().unwrap();
		let project_root = temp_dir.path().join("myproject");
		let opencode_dir = project_root.join(".opencode");
		fs::create_dir_all(&opencode_dir).unwrap();
		let found = find_project_root(&project_root).unwrap();
		assert_eq!(found, project_root);
	}

	#[test]
	fn test_find_project_root_nested() {
		let temp_dir = TempDir::new().unwrap();
		let project_root = temp_dir.path().join("myproject");
		fs::create_dir_all(&project_root).unwrap();
		fs::write(project_root.join(".mcp.json"), "{}").unwrap();
		let nested_dir = project_root.join("src/components");
		fs::create_dir_all(&nested_dir).unwrap();
		let found = find_project_root(&nested_dir).unwrap();
		assert_eq!(found, project_root);
	}

	#[test]
	fn test_project_config_exists() {
		let temp_dir = TempDir::new().unwrap();
		fs::write(temp_dir.path().join(".mcp.json"), "{}").unwrap();
		assert!(project_config_exists(
			super::super::AgentType::Claude,
			temp_dir.path()
		));
	}

	#[test]
	fn test_external_agent_paths_are_correct() {
		let dir = Path::new("/test_project");
		let cursor = crate::registry::get(super::super::AgentType::Cursor);
		let windsurf = crate::registry::get(super::super::AgentType::Windsurf);
		let copilot = crate::registry::get(super::super::AgentType::Copilot);
		let roocode = crate::registry::get(super::super::AgentType::RooCode);
		let gemini = crate::registry::get(super::super::AgentType::Gemini);
		let codex = crate::registry::get(super::super::AgentType::Codex);
		let kimi = crate::registry::get(super::super::AgentType::Kimi);
		let antigravity =
			crate::registry::get(super::super::AgentType::Antigravity);
		let openclaw = crate::registry::get(super::super::AgentType::Openclaw);
		let cline = crate::registry::get(super::super::AgentType::Cline);

		assert_eq!((cursor.project_path)(dir), dir.join(".cursor/mcp.json"));
		assert_eq!(
			(windsurf.project_path)(dir),
			dir.join(".windsurf/mcp_config.json")
		);
		assert_eq!((copilot.project_path)(dir), dir.join(".vscode/mcp.json"));
		assert_eq!((roocode.project_path)(dir), dir.join(".roo/mcp.json"));
		assert_eq!(
			(gemini.project_path)(dir),
			dir.join(".gemini/settings.json")
		);
		assert_eq!((kimi.project_path)(dir), dir.join(".kimi/mcp.json"));
		assert_eq!((codex.project_path)(dir), dir.join(".codex/config.toml"));
		assert_eq!(
			(antigravity.project_path)(dir),
			dir.join(".gemini/antigravity/mcp_config.json")
		);
		assert_eq!(
			(openclaw.project_path)(dir),
			dir.join(".openclaw/openclaw.json")
		);
		assert_eq!((cline.project_path)(dir), dir.join(".cline/mcp.json"));
	}
}
