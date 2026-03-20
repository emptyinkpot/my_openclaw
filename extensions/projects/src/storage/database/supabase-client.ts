import { createClient, SupabaseClient } from '@supabase/supabase-js';

let envLoaded = false;
let clientInstance: SupabaseClient | null = null;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

// 检查是否在服务器端
function isServer(): boolean {
  return typeof window === 'undefined';
}

// 仅在服务器端加载环境变量
async function loadEnvServer(): Promise<void> {
  if (envLoaded || (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY)) {
    return;
  }

  if (!isServer()) {
    return;
  }

  try {
    // 尝试使用 dotenv
    try {
      const dotenv = await import('dotenv');
      dotenv.config();
      if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
        envLoaded = true;
        return;
      }
    } catch {
      // dotenv not available
    }

    // 尝试使用 coze_workload_identity
    try {
      const { execSync } = await import('child_process');
      const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

      const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.startsWith('#')) continue;
        const eqIndex = line.indexOf('=');
        if (eqIndex > 0) {
          const key = line.substring(0, eqIndex);
          let value = line.substring(eqIndex + 1);
          if ((value.startsWith("'") && value.endsWith("'")) ||
              (value.startsWith('"') && value.endsWith('"'))) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }

      envLoaded = true;
    } catch {
      // Silently fail
    }
  } catch {
    // Silently fail
  }
}

function getSupabaseCredentials(): SupabaseCredentials {
  const url = process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('COZE_SUPABASE_URL is not set');
  }
  if (!anonKey) {
    throw new Error('COZE_SUPABASE_ANON_KEY is not set');
  }

  return { url, anonKey };
}

function getSupabaseClient(token?: string): SupabaseClient {
  // 如果已有实例且不需要 token，复用
  if (clientInstance && !token) {
    return clientInstance;
  }

  // 在浏览器端，需要确保环境变量已设置
  if (!isServer()) {
    // 浏览器端：使用运行时注入的环境变量
    const url = (window as unknown as { __COZE_SUPABASE_URL__?: string }).__COZE_SUPABASE_URL__;
    const anonKey = (window as unknown as { __COZE_SUPABASE_ANON_KEY__?: string }).__COZE_SUPABASE_ANON_KEY__;
    
    if (!url || !anonKey) {
      throw new Error('Supabase credentials not available in browser');
    }
    
    return createClient(url, anonKey, {
      db: { timeout: 60000 },
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // 服务器端
  const { url, anonKey } = getSupabaseCredentials();

  const client = createClient(url, anonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    db: { timeout: 60000 },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!token) {
    clientInstance = client;
  }

  return client;
}

// 异步初始化（服务器端）
async function initSupabase(): Promise<void> {
  if (isServer()) {
    await loadEnvServer();
  }
}

export { loadEnvServer, initSupabase, getSupabaseCredentials, getSupabaseClient };
