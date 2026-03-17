import os
import redis
import json
import asyncio
from crewai import Agent, Task, Crew, Process
from langchain_community.llms import Ollama
from telemetry import TelemetryCollector

class ClawCore:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        self.r = redis.Redis.from_url(self.redis_url, decode_responses=True)
        self.telemetry = TelemetryCollector(self.r)
        
        # Base LLM config
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        
    def get_llm(self, model_name):
        return Ollama(model=model_name, base_url=self.ollama_base_url)

    async def update_agent_status(self, agent_name, status, task_desc=""):
        status_data = {
            "status": status,
            "task": task_desc,
            "timestamp": datetime.now().timestamp() if 'datetime' in globals() else 0
        }
        self.r.set(f"agent_status:{agent_name.lower()}", json.dumps(status_data))

    async def clear_vram(self):
        """Resource Governor: Unload Ollama models for heavy tasks."""
        print("🟡 Resource Governor: Purging VRAM...")
        try:
            import requests
            # Sending keep_alive: 0 to unload a common model or the one currently active
            # This is a simplified version of the logic
            requests.post(f"{self.ollama_base_url}/api/generate", 
                         json={"model": "llama3", "keep_alive": 0}, timeout=2)
        except:
            pass

    def create_crew(self, task_desc, capability, models):
        # Define the Trinity + Manager
        manager = Agent(
            role='System Manager',
            goal='Orchestrate the AI fleet and maintain system stability.',
            backstory='Supreme coordinator of Claw-Omni-OS.',
            llm=self.get_llm(models.get('manager', 'llama3')),
            verbose=True
        )
        
        coder = Agent(
            role='Lead Coder',
            goal='Execute technical implementations and audits.',
            backstory='Elite developer with full system access.',
            llm=self.get_llm(models.get('coder', 'codellama')),
            verbose=True
        )

        researcher = Agent(
            role='Deep Researcher',
            goal='Analyze web data and extract complex information.',
            backstory='Expert analyst with advanced retrieval capabilities.',
            llm=self.get_llm(models.get('researcher', 'mistral')),
            verbose=True
        )

        artist = Agent(
            role='Visual Artisan',
            goal='Generate high-fidelity visual and multimodal content.',
            backstory='Master of creative neural workflows.',
            llm=self.get_llm(models.get('artist', 'llava')),
            verbose=True
        )

        # Build Task
        active_agent = manager
        if capability == 'graphics' or capability == 'video':
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
            process=Process.sequential
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
                    capability = task_data.get('capability', 'text')
                    prompt = task_data.get('prompt', '')
                    models = {
                        'manager': task_data.get('model_manager'),
                        'coder': task_data.get('model_coder'),
                        'researcher': task_data.get('model_researcher'),
                        'artist': task_data.get('model_artist')
                    }
                    
                    if task_data.get('direct_action') == 'clear_vram':
                        await self.clear_vram()
                        continue

                    # Execute Crew
                    crew = self.create_crew(prompt, capability, models)
                    result = crew.kickoff()
                    
                    # Publish result
                    res_payload = {
                        "chat_id": task_data.get("chat_id"),
                        "result": str(result),
                        "capability": capability
                    }
                    self.r.publish('task_results', json.dumps(res_payload))
                except Exception as e:
                    print(f"Task error: {e}")
            await asyncio.sleep(0.5)

    async def main(self):
        # Run Telemetry and Task Worker concurrently
        await asyncio.gather(
            self.telemetry.run_loop(),
            self.task_worker()
        )

if __name__ == "__main__":
    import from_datetime_import_datetime
    from datetime import datetime
    core = ClawCore()
    asyncio.run(core.main())
