import os
os.environ["CREWAI_DISABLE_TELEMETRY"] = "true"
os.environ["OTEL_SDK_DISABLED"] = "true"
# Force dummy key to bypass CrewAI native provider validation when using Ollama
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "sk-placeholder-for-ollama")

import redis
import json
import asyncio
import requests
import psycopg2
from datetime import datetime
from fastapi import FastAPI
from crewai import Agent, Task, Crew, Process
from langchain_community.llms import Ollama
from telemetry import TelemetryCollector
from governor import HardenedGovernor
from tools import get_coder_tools, get_researcher_tools, get_manager_tools

app = FastAPI()

class ClawCore:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://claw-redis:6379/0")
        self.r = redis.Redis.from_url(self.redis_url, decode_responses=True)
        self.governor = HardenedGovernor(self.redis_url)
        self.telemetry = TelemetryCollector(self.r, self.governor)
        
        # Base LLM config
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        
        # Postgres Config
        self.db_url = os.getenv("POSTGRES_URL")
        self.init_db()

    def init_db(self):
        """Initialize Postgres table if not exists."""
        if not self.db_url:
            return
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS agent_logs (
                    id SERIAL PRIMARY KEY,
                    source TEXT,
                    chat_id TEXT,
                    capability TEXT,
                    prompt TEXT,
                    result TEXT,
                    status TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"🔴 DB Init Failed: {e}")

    def log_to_db(self, task_data, result, status="completed"):
        if not self.db_url:
            return
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO agent_logs (source, chat_id, capability, prompt, result, status)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                task_data.get('source', 'unknown'),
                str(task_data.get('chat_id')),
                task_data.get('capability'),
                task_data.get('prompt'),
                str(result),
                status
            ))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"🔴 DB Logging Failed: {e}")

    def get_llm(self, model_name):
        config = self.governor.get_llm_config()
        final_model = config['model'] if model_name in ['llama3', 'llama3:3b', 'codellama'] else model_name
        
        # Look up provider configuration from Redis mapping
        provider_raw = self.r.get(f"model_provider_map:{final_model}")
        if provider_raw:
            import json
            try:
                 provider = json.loads(provider_raw)
                 base_url = provider['url']
                 provider_type = provider['type']
                 api_key = provider.get('apiKey', '')
            except Exception:
                 base_url = self.ollama_base_url
                 provider_type = "ollama"
                 api_key = ""
        else:
            override_url = self.r.get('ollama_base_url_override')
            base_url = override_url if override_url else self.ollama_base_url
            provider_type = "ollama"
            api_key = ""

        from crewai import LLM
        if provider_type == "openai":
            return LLM(
                model=f"openai/{final_model}", 
                base_url=f"{base_url}/v1",
                api_key=api_key if api_key else os.environ.get("OPENAI_API_KEY", "sk-placeholder-since-we-use-ollama")
            )
        else:
            return LLM(
                model=f"ollama/{final_model}", 
                base_url=base_url
            )

    async def update_agent_status(self, agent_name, status, task_desc=""):
        status_data = {
            "status": status,
            "task": task_desc,
            "timestamp": datetime.now().timestamp()
        }
        self.r.set(f"agent_status:{agent_name.lower()}", json.dumps(status_data))

    async def clear_vram(self, model_name="llama3"):
        """Resource Governor: Unload Ollama models for heavy tasks."""
        print(f"🟡 Resource Governor: Purging VRAM for model {model_name}...")
        try:
            # The governor handles the state, we just trigger the unload
            res = requests.post(f"{self.ollama_base_url}/api/generate", 
                         json={"model": model_name, "keep_alive": 0}, timeout=5)
            # Notify governor if needed or just let it detect next cycle
            return res.status_code == 200
        except Exception as e:
            print(f"🔴 VRAM Purge Failed: {e}")
            return False

    def create_crew(self, task_desc, capability, models, stream_id=None):
        def stream_callback(step):
            if stream_id:
                try:
                    # step is a CrewStep or similar
                    agent_name = "Agent"
                    thought = str(step)
                    if hasattr(step, 'agent'): agent_name = step.agent.role
                    
                    payload = {
                        "status": "working",
                        "agent": agent_name,
                        "thought": thought,
                        "stream_id": stream_id,
                        "timestamp": datetime.now().timestamp()
                    }
                    self.r.publish(f"chat_status:{stream_id}", json.dumps(payload))
                except Exception as e:
                    print(f"Stream callback error: {e}")

        # Define the Trinity + Manager (with real tools)
        manager = Agent(
            role='System Manager',
            goal='Orchestrate the AI fleet and maintain system stability.',
            backstory='Supreme coordinator of Claw-Omni-OS.',
            llm=self.get_llm(models.get('manager') or 'llama3'),
            tools=get_manager_tools(),
            verbose=True
        )
        
        coder = Agent(
            role='Lead Coder',
            goal='Execute technical implementations, code audits, and system diagnostics.',
            backstory='Elite developer with full system access and SSH diagnostic capabilities.',
            llm=self.get_llm(models.get('coder') or 'codellama'),
            tools=get_coder_tools(),
            verbose=True
        )

        researcher = Agent(
            role='Deep Researcher',
            goal='Analyze web data, search for information, and extract complex intelligence.',
            backstory='Expert analyst with live web search access and retrieval capabilities.',
            llm=self.get_llm(models.get('researcher') or 'mistral'),
            tools=get_researcher_tools(),
            verbose=True
        )

        artist = Agent(
            role='Visual Artisan',
            goal='Generate high-fidelity visual and multimodal content.',
            backstory='Master of creative neural workflows.',
            llm=self.get_llm(models.get('artist') or 'llava'),
            verbose=True
        )

        # Build Task
        active_agent = manager
        if capability in ['graphics', 'video']:
            active_agent = artist
        elif capability == 'code_audit':
            active_agent = coder
        elif capability == 'web_search':
            active_agent = researcher

        main_task = Task(
            description=task_desc,
            agent=active_agent,
            expected_output=f"Comprehensive result for {capability} request."
        )

        return Crew(
            agents=[manager, coder, researcher, artist],
            tasks=[main_task],
            process=Process.sequential,
            step_callback=stream_callback
        )

    async def task_worker(self):
        print("🤖 Task Worker Started")
        while True:
            # Check P1 then P2
            task_raw = self.r.brpop(['tasks:p1', 'tasks:p2'], timeout=2)
            if task_raw:
                _, data = task_raw
                try:
                    task_data = json.loads(data)
                    source = task_data.get('source', 'web') # Default to web
                    capability = task_data.get('capability', 'text')
                    prompt = task_data.get('prompt', '')
                    stream_id = task_data.get('stream_id')
                    models = {
                        'manager': task_data.get('model_manager'),
                        'coder': task_data.get('model_coder'),
                        'researcher': task_data.get('model_researcher'),
                        'artist': task_data.get('model_artist')
                    }
                    
                    if task_data.get('direct_action') == 'clear_vram':
                        model_to_purge = models.get('manager', 'llama3')
                        success = await self.clear_vram(model_to_purge)
                        if stream_id:
                            self.r.publish(f"chat_status:{stream_id}", json.dumps({
                                "status": "completed",
                                "result": f"✅ VRAM Purge complete for {model_to_purge}." if success else "⚠️ VRAM Purge failed — model may not be loaded.",
                                "agent": "System Manager"
                            }))
                        continue

                    if task_data.get('direct_action') == 'sys_check':
                        # Quick system health check via coder tool
                        from tools import SSHAuditTool
                        tool = SSHAuditTool()
                        health_out = tool._run("df -h && free -h && uptime")
                        if stream_id:
                            self.r.publish(f"chat_status:{stream_id}", json.dumps({
                                "status": "completed",
                                "result": f"**System Health Report**\n\n{health_out}",
                                "agent": "Lead Coder"
                            }))
                        # Store as Audit Log artifact
                        self.r.lpush("audit_logs", json.dumps({
                            "type": "sys_check",
                            "output": health_out,
                            "timestamp": datetime.now().isoformat()
                        }))
                        self.r.ltrim("audit_logs", 0, 99)
                        continue

                    # VRAM Reservation for heavy tasks (FIXED: moved before stream_id init)
                    if capability in ['graphics', 'video', 'audio']:
                        await self.clear_vram(models.get('manager', 'llama3'))

                    # ─── Execute Crew ───────────────────────────────────────
                    if stream_id:
                        self.r.publish(f"chat_status:{stream_id}", json.dumps({"status": "starting", "message": "Neural synchronization sequence initiated."}))
                    
                    crew = self.create_crew(prompt, capability, models, stream_id=stream_id)
                    result = crew.kickoff()
                    
                    # Log to DB
                    self.log_to_db(task_data, result)

                    # Publish final result to stream
                    if stream_id:
                        self.r.publish(f"chat_status:{stream_id}", json.dumps({
                            "status": "completed", 
                            "result": str(result),
                            "agent": "System Manager"
                        }))

                    # Publish result to general channel
                    res_payload = {
                        "source": source,
                        "chat_id": task_data.get("chat_id"),
                        "result": str(result),
                        "capability": capability,
                        "stream_id": stream_id
                    }
                    self.r.publish('task_results', json.dumps(res_payload))
                    
                    if source == "web":
                        self.r.lpush("web_results:web_user", json.dumps(res_payload))
                        self.r.ltrim("web_results:web_user", 0, 49) # Keep last 50
                except Exception as e:
                    print(f"Task error: {e}")
                    try:
                        if 'task_data' in locals() and task_data.get('stream_id'):
                            err_msg = {
                                "status": "completed", 
                                "result": f"❌ Core Exception: {str(e)}",
                                "agent": "System Error"
                            }
                            self.r.publish(f"chat_status:{task_data.get('stream_id')}", json.dumps(err_msg))
                    except Exception as inner_e:
                        print(f"Failed to publish error: {inner_e}")
            await asyncio.sleep(0.5)

core = ClawCore()

@app.get("/api/health-check")
async def health_check():
    """Literal recovery with dynamic fallback: check Redis setting first, then env, then default"""
    results = {}
    
    # 1. Check Dynamic Setting from Redis dashboard
    dynamic_url = core.r.get("ollama_base_url_override")
    test_urls = []
    if dynamic_url:
        test_urls.append(dynamic_url.strip())
        
    # 2. Add defaults
    test_urls.extend([
        core.ollama_base_url.strip(),
        "http://host.docker.internal:11434",
        "http://localhost:11434"
    ])
    
    # 3. Test iterate
    # Remove duplicates preserving order
    unique_urls = []
    for u in test_urls:
        if u not in unique_urls:
            unique_urls.append(u)
            
    for url in unique_urls:
        try:
            # Strip trailing slash just in case
            target = url.rstrip("/")
            res = requests.get(f"{target}/api/tags", timeout=2)
            if res.status_code == 200:
                return {"status": "online", "found_at": target}
        except:
            continue
            
    return {"status": "offline"}, 503

@app.post("/api/vram-purge")
async def vram_purge(data: dict):
    model = data.get("model", "llama3")
    success = await core.clear_vram(model)
    return {"status": "success" if success else "failed"}

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(core.telemetry.run_loop())
    asyncio.create_task(core.task_worker())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
