"""Technical Reviewer Agent - Modern implementation with automatic fallback"""
from agents.llm_client import RobustLLM
from tavily import TavilyClient
from agents.state_new import AgentState
import os


class TechnicalReviewerAgent:
    """Agent responsible for reviewing content accuracy using web search"""
    
    def __init__(self):
        self.llm = RobustLLM(temperature=0.3)
        api_key = os.getenv("TAVILY_API_KEY")
        self.search_client = TavilyClient(api_key=api_key) if api_key else None
    
    def search_for_accuracy(self, topic: str) -> str:
        """Perform web search to verify technical accuracy"""
        if not self.search_client:
            return "Search unavailable: TAVILY_API_KEY not configured."
        try:
            search_results = self.search_client.search(
                query=f"{topic} technical best practices latest",
                max_results=3
            )
            
            context = ""
            for result in search_results.get("results", []):
                context += f"\nSource: {result['url']}\n{result['content']}\n"
            
            return context if context else "No search results available."
        except Exception as e:
            return f"Search unavailable: {str(e)}"
    
    def review_content(self, state: AgentState) -> dict:
        """Review the draft for technical accuracy and quality"""
        
        draft = state.draft_content
        topic = state.topic
        iteration = state.iteration_count
        max_iterations = state.max_iterations
        
        # Perform web search for verification
        search_context = self.search_for_accuracy(topic)
        
        prompt = f"""You are a senior technical reviewer. Review this blog post draft for accuracy, clarity, and quality.

Topic: {topic}
Current Iteration: {iteration}/{max_iterations}

Draft to Review:
{draft}

Latest Web Research Context:
{search_context}

Evaluate the draft based on:
1. Technical Accuracy - Are facts and concepts correct?
2. Clarity - Is it easy to understand?
3. Completeness - Does it cover the topic well?
4. Code Placeholder Usage - Are [CODE_SNIPPET_HERE] markers placed appropriately?
5. Structure - Is it well-organized?

Provide your review in this format:
APPROVAL: [YES/NO]
FEEDBACK: [Detailed feedback with specific improvements needed, or "Approved - excellent quality" if YES]

Be constructive but thorough. Approve only if the content is truly high quality."""

        review_text = self.llm.invoke(prompt)
        
        # Parse approval status
        approved = "APPROVAL: YES" in review_text.upper() or iteration >= max_iterations
        
        message = f"Technical Reviewer: Review {'approved' if approved else 'requires revision'} (iteration {iteration})"
        
        return {
            "review_feedback": review_text,
            "review_approved": approved,
            "messages": [message]
        }
