"""
Claw-Omni-OS Agent Tools
Real tools available to CrewAI agents for SSH diagnostics, web search, and VRAM management.
"""
import os
import subprocess
import json
import requests
from datetime import datetime
from crewai.tools import BaseTool
from typing import Optional, Type
from pydantic import BaseModel, Field


# ─── SSH / System Diagnostic Tool ───────────────────────────────────────────

class SSHAuditInput(BaseModel):
    command: str = Field(description="Shell command to execute for system audit. Use only safe read-only commands.")

class SSHAuditTool(BaseTool):
    name: str = "SystemAuditTool"
    description: str = (
        "Execute a system diagnostic command on the host system. "
        "Use this for code audits, log inspection, disk usage, process checks, and network analysis. "
        "Examples: 'df -h', 'ps aux | head -20', 'ss -tulpn', 'cat /var/log/syslog | tail -50'. "
        "Only read-only commands are permitted."
    )
    args_schema: Type[BaseModel] = SSHAuditInput

    def _run(self, command: str) -> str:
        """Execute a safe, read-only system command."""
        # Security: Whitelist of safe command prefixes
        SAFE_PREFIXES = ['df ', 'du ', 'ps ', 'ss ', 'cat ', 'ls ', 'head ', 'tail ',
                         'grep ', 'find ', 'netstat ', 'free ', 'uptime', 'uname ', 'id',
                         'env | grep', 'nvidia-smi', 'docker ps', 'docker logs', 'systemctl status']
        
        is_safe = any(command.strip().startswith(p) for p in SAFE_PREFIXES)
        if not is_safe:
            return f"❌ Security Guard: Command '{command}' is not on the approved list. Only read-only diagnostic commands are permitted."

        try:
            result = subprocess.run(
                command, shell=True, capture_output=True, text=True, timeout=15
            )
            output = result.stdout or result.stderr or "No output."
            return f"✅ Output:\n```\n{output[:3000]}\n```"  # Cap at 3000 chars
        except subprocess.TimeoutExpired:
            return "⏱️ Command timed out after 15s."
        except Exception as e:
            return f"❌ Error: {str(e)}"


# ─── Web Search Tool ─────────────────────────────────────────────────────────

class WebSearchInput(BaseModel):
    query: str = Field(description="The search query to look up information from the web.")

class WebSearchTool(BaseTool):
    name: str = "WebSearchTool"
    description: str = (
        "Search the web for current information, company data, technical documentation, or market research. "
        "Returns a list of relevant results with titles and snippets. "
        "Use this for deep research, finding NIP/email data, or technology lookups."
    )
    args_schema: Type[BaseModel] = WebSearchInput

    def _run(self, query: str) -> str:
        """Search the web using Brave Search API or fallback to DuckDuckGo."""
        brave_key = os.getenv("BRAVE_SEARCH_API_KEY", "")
        serper_key = os.getenv("SERPER_API_KEY", "")

        # Try Brave Search first
        if brave_key:
            try:
                res = requests.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    headers={"Accept": "application/json", "X-Subscription-Token": brave_key},
                    params={"q": query, "count": 5},
                    timeout=10
                )
                if res.status_code == 200:
                    data = res.json()
                    results = data.get("web", {}).get("results", [])
                    formatted = [f"**{r['title']}**\n{r['url']}\n{r.get('description', '')}" for r in results[:5]]
                    return "🔍 Web Results:\n\n" + "\n\n---\n\n".join(formatted)
            except Exception as e:
                pass  # Fall through

        # Try Serper.dev
        if serper_key:
            try:
                res = requests.post(
                    "https://google.serper.dev/search",
                    json={"q": query},
                    headers={"X-API-KEY": serper_key, "Content-Type": "application/json"},
                    timeout=10
                )
                if res.status_code == 200:
                    data = res.json()
                    results = data.get("organic", [])
                    formatted = [f"**{r['title']}**\n{r['link']}\n{r.get('snippet', '')}" for r in results[:5]]
                    return "🔍 Web Results:\n\n" + "\n\n---\n\n".join(formatted)
            except Exception as e:
                pass  # Fall through

        # DuckDuckGo Fallback (no key required)
        try:
            res = requests.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_redirect": "1"},
                timeout=10
            )
            if res.status_code == 200:
                data = res.json()
                abstract = data.get("AbstractText", "")
                related = [t["Text"] for t in data.get("RelatedTopics", [])[:5] if "Text" in t]
                if abstract:
                    return f"🔍 DuckDuckGo Result:\n\n{abstract}\n\nRelated:\n" + "\n".join(f"• {r}" for r in related)
                elif related:
                    return "🔍 DuckDuckGo Related Topics:\n" + "\n".join(f"• {r}" for r in related)
        except Exception as e:
            pass

        return f"❌ No web search API configured. Add BRAVE_SEARCH_API_KEY or SERPER_API_KEY to .env to enable live search. Query was: '{query}'"


# ─── VRAM Flush Tool ─────────────────────────────────────────────────────────

class VRAMFlushInput(BaseModel):
    model_name: str = Field(default="all", description="Model name to unload, or 'all' to flush all loaded models.")

class VRAMFlushTool(BaseTool):
    name: str = "VRAMFlushTool"
    description: str = (
        "Flush GPU VRAM by sending keep_alive=0 to Ollama models. "
        "Use this before starting heavy multimodal tasks to ensure maximum VRAM is available. "
        "Pass 'all' to flush all models or a specific model name."
    )
    args_schema: Type[BaseModel] = VRAMFlushInput

    def _run(self, model_name: str = "all") -> str:
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434").rstrip("/")
        flushed = []
        errors = []

        if model_name == "all":
            try:
                res = requests.get(f"{ollama_url}/api/tags", timeout=5)
                if res.status_code == 200:
                    models = [m["name"] for m in res.json().get("models", [])]
                else:
                    models = ["llama3", "codellama", "mistral", "llava"]
            except:
                models = ["llama3", "codellama", "mistral", "llava"]
        else:
            models = [model_name]

        for m in models:
            try:
                r = requests.post(f"{ollama_url}/api/generate", json={"model": m, "keep_alive": 0}, timeout=5)
                if r.status_code == 200:
                    flushed.append(m)
                else:
                    errors.append(m)
            except Exception as e:
                errors.append(f"{m} ({str(e)[:50]})")

        result_parts = []
        if flushed:
            result_parts.append(f"✅ VRAM flushed for: {', '.join(flushed)}")
        if errors:
            result_parts.append(f"⚠️ Could not flush: {', '.join(errors)}")
        return "\n".join(result_parts) if result_parts else "No models found to flush."


# ─── Export ──────────────────────────────────────────────────────────────────

def get_coder_tools():
    """Tools available to Claw-Coder."""
    return [SSHAuditTool(), VRAMFlushTool()]

def get_researcher_tools():
    """Tools available to Claw-Researcher."""
    return [WebSearchTool()]

def get_manager_tools():
    """Tools available to Claw-Manager."""
    return [VRAMFlushTool()]
