import os
import redis
import json
import asyncio
from crewai import Agent, Task, Crew, Process
from langchain_community.llms import Ollama

class ResourceGovernor:
    """Manages GPU and CPU resources for heavy tasks."""
    def __init__(self, redis_client):
        self.r = redis_client
        self.heavy_task_key = "heavy_task_running"

    def can_start_heavy_task(self):
        return not self.r.get(self.heavy_task_key)

    def start_heavy_task(self):
        self.r.set(self.heavy_task_key, 1)
        # VRAM Coordination: Pause Ollama models
        self.clear_vram_for_multimodal()

    def end_heavy_task(self):
        self.r.delete(self.heavy_task_key)
        self.restore_vram_after_multimodal()

    def clear_vram_for_multimodal(self):
        """Signals Ollama to unload models to free VRAM."""
        print("🟡 Clearing VRAM for multimodal task...")
        # Implementation depends on Ollama's keep_alive policy
        # Usually sending a request with keep_alive: 0
        try:
            import requests
            url = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
            # This is a placeholder for the actual Ollama unload call if needed
            # requests.post(f"{url}/api/generate", json={"model": "llama3", "keep_alive": 0})
        except Exception as e:
            print(f"Error clearing VRAM: {e}")

    def restore_vram_after_multimodal(self):
        print("🟢 VRAM task finished. Resources released.")

from governor import HardenedGovernor

class ClawCore:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        self.redis_client = redis.Redis.from_url(self.redis_url)
        self.governor = HardenedGovernor(self.redis_url)
        
        # Initialize LLM with governor config
        llm_config = self.governor.get_llm_config()
        self.llm = Ollama(
            model=llm_config["model"],
            base_url=os.getenv("OLLAMA_BASE_URL"),
            num_gpu=llm_config["options"]["num_gpu"]
        )

        # Initialize Agents here to avoid uninitialized attribute errors
        self.manager = Agent(
            role='System Manager',
            goal='Orchestrate all system tasks and manage hardware resources.',
            backstory='You are the primary intelligence of Claw-Omni-OS.',
            llm=self.llm,
            verbose=True
        )
        self.coder = Agent(
            role='Lead Developer',
            goal='Write and debug code.',
            backstory='Expert in Python and TypeScript.',
            llm=self.llm,
            verbose=True
        )
        self.researcher = Agent(
            role='Insight Researcher',
            goal='Extract knowledge and perform deep analysis.',
            backstory='High-level intelligence specialized in information retrieval.',
            llm=self.llm,
            verbose=True
        )
        self.artist = Agent(
            role='Visual Designer',
            goal='Create high-quality visual assets and graphics.',
            backstory='Creative engine of the system.',
            llm=self.llm,
            verbose=True
        )

    def setup_agents(self):
        # Already initialized in __init__
        pass

    async def update_agent_status(self, agent_name, status, task_desc=""):
        status_data = {
            "status": status,
            "task": task_desc,
            "timestamp": asyncio.get_event_loop().time()
        }
        self.redis_client.set(f"agent_status:{agent_name.lower()}", json.dumps(status_data))

    async def process_task(self, task_data):
        try:
            task_dict = json.loads(task_data.decode('utf-8').replace("'", "\""))
            prompt = task_dict.get("prompt")
            source = task_dict.get("source")
            chat_id = task_dict.get("chat_id")
            direct_action = task_dict.get("direct_action")
            
            # Fetch granular model overrides
            manager_model = task_dict.get("model_manager", "llama3")
            coder_model = task_dict.get("model_coder", "codellama")
            researcher_model = task_dict.get("model_researcher", "mistral")
            artist_model = task_dict.get("model_artist", "llava")
            
            history = task_dict.get("history", [])
            capability = task_dict.get("capability", "text")
            
            await self.update_agent_status("Manager", "Analyzing", prompt[:50])

            # Direct Action overrides
            if direct_action == "sys_check":
                prompt = "Perform a full system diagnostic: Redis connectivity, VRAM, and Docker health."
                capability = "text"
            elif direct_action == "code_audit":
                prompt = "Analyze the project structure and suggest improvements for security and performance."
                capability = "text"

            # Dynamic Agent adjustments based on capability
            if capability == "graphics":
                self.artist.goal = "Create high-quality visual assets and graphics."
                self.artist.backstory = "Expert digital artist and designer."
                active_agent = self.artist
            elif capability == "video":
                self.artist.goal = "Generate and edit motion graphics or video content."
                active_agent = self.artist
            elif capability == "audio":
                self.researcher.goal = "Synthesize audio, voiceovers, or musical elements."
                active_agent = self.researcher
            else:
                active_agent = self.manager

            # Update LLMs for all agents
            self.manager.llm = Ollama(model=manager_model, base_url=os.getenv("OLLAMA_BASE_URL"))
            self.coder.llm = Ollama(model=coder_model, base_url=os.getenv("OLLAMA_BASE_URL"))
            self.researcher.llm = Ollama(model=researcher_model, base_url=os.getenv("OLLAMA_BASE_URL"))
            self.artist.llm = Ollama(model=artist_model, base_url=os.getenv("OLLAMA_BASE_URL"))

            await self.update_agent_status(active_agent.role.split()[-1], "Executing", prompt[:50])

            # Execution
            context_prompt = f"Selected Modal: {capability}\nHistory:\n" + "\n".join([f"{m['role']}: {m['content']}" for m in history[-3:]])
            full_prompt = f"{context_prompt}\nUser: {prompt}"
            
            crew_task = Task(description=full_prompt, agent=active_agent, expected_output=f"Concise result for {capability} task.")
            crew = Crew(agents=[self.manager, self.coder, self.researcher, self.artist], tasks=[crew_task], process=Process.sequential)
            result = crew.kickoff()
            
            # Reset all
            for a in ["manager", "coder", "researcher", "artist"]:
                await self.update_agent_status(a, "Idle")

            # Publish result
            response = {"source": source, "chat_id": chat_id, "result": str(result), "capability": capability}
            self.redis_client.publish("task_results", json.dumps(response))
            
        except Exception as e:
            await self.update_agent_status("Manager", "Error", str(e))
            print(f"❌ Error in process_task: {e}")

    def run(self):
        self.setup_agents()
        print("Claw-Omni-OS Core is running and listening for tasks...")
        
        while True:
            # Check P1 (Critical) then P2 (Interactive)
            task = self.redis_client.brpop(["tasks:p1", "tasks:p2"], timeout=5)
            if task:
                queue, data = task
                import asyncio
                # For simplicity in this microservice, we process sequentially, 
                # but could use asyncio.create_task for concurrent processing
                asyncio.run(self.process_task(data))

if __name__ == "__main__":
    core = ClawCore()
    core.run()
