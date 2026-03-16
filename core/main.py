import os
import redis
import json
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

    def setup_agents(self):
        self.manager = Agent(
            role='System Manager',
            goal='Orchestrate all system tasks and manage hardware resources.',
            backstory='You are the primary intelligence of Claw-Omni-OS. You ensure efficient execution.',
            llm=self.llm,
            verbose=True
        )
        
        self.coder = Agent(
            role='Lead Developer',
            goal='Write and debug code using OpenHands integration.',
            backstory='Expert in Python and TypeScript, capable of terminal operations.',
            llm=self.llm,
            verbose=True
        )

    async def process_task(self, task_data):
        try:
            task_dict = json.loads(task_data.decode('utf-8').replace("'", "\""))
            prompt = task_dict.get("prompt")
            source = task_dict.get("source")
            chat_id = task_dict.get("chat_id")
            manager_model = task_dict.get("model_manager", task_dict.get("model", "llama3"))
            coder_model = task_dict.get("model_coder", manager_model)
            history = task_dict.get("history", [])
            capability = task_dict.get("capability", "text")
            
            print(f"🚀 Processing {capability} task | Manager: {manager_model} | Coder: {coder_model}")
            
            # Dynamic Agent adjustments
            # ... (previous logic for goal/backstory remained)

            # Update LLMs dynamically
            manager_llm = Ollama(
                model=manager_model,
                base_url=os.getenv("OLLAMA_BASE_URL"),
                num_gpu=self.governor.get_llm_config()["options"]["num_gpu"]
            )
            coder_llm = Ollama(
                model=coder_model,
                base_url=os.getenv("OLLAMA_BASE_URL"),
                num_gpu=self.governor.get_llm_config()["options"]["num_gpu"]
            )
            
            self.manager.llm = manager_llm
            self.coder.llm = coder_llm

            # Format history for context
            context_prompt = f"Selected Modal: {capability}\nHistory:\n" + "\n".join([f"{m['role']}: {m['content']}" for m in history[-5:]])
            full_prompt = f"{context_prompt}\nUser: {prompt}"
            
            # CrewAI execution
            crew_task = Task(description=full_prompt, agent=self.manager, expected_output=f"Result for {capability} task.")
            crew = Crew(agents=[self.manager, self.coder], tasks=[crew_task], process=Process.sequential)
            result = crew.kickoff()
            
            # Publish result back
            response = {
                "source": source,
                "chat_id": chat_id,
                "result": str(result)
            }
            self.redis_client.publish("task_results", json.dumps(response))
            
        except Exception as e:
            print(f"❌ Error processing task: {e}")

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
