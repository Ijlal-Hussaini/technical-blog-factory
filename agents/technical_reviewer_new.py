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
        
        # Check if this is the final requested iteration
        is_final_round = (iteration >= max_iterations)

        round_instruction = (
            f"This is the FINAL review round ({iteration}/{max_iterations}). State 'APPROVAL: YES' and provide a thorough, publication-ready peer review assessment summarizing technical accuracy, verified facts, and strengths."
            if is_final_round else
            f"This is review round {iteration} of {max_iterations}. State 'APPROVAL: NO' and provide actionable, specific areas of improvement and technical enhancements for the Content Writer to implement in revision {iteration + 1}."
        )

        prompt = f"""You are a senior technical reviewer and editor. Review this blog post draft for accuracy, clarity, and quality.

Topic: {topic}
Review Round: {iteration}/{max_iterations}

Draft to Review:
{draft}

Latest Web Research Context:
{search_context}

Evaluate the draft based on:
1. Technical Accuracy - Are facts, concepts, and terminology correct?
2. Clarity - Is the explanation accessible and well-reasoned?
3. Completeness - Does it cover the core principles?
4. Code Placeholder Usage - Are [CODE_SNIPPET_HERE] markers placed appropriately?
5. Structure - Is it well-organized with clear headings?

FORMATTING RULES:
- Use clean formatting with standard bullet points ('- Point') and bold labels.
- Do NOT use raw horizontal rules ('---').

Provide your review in this exact format:
APPROVAL: {'YES' if is_final_round else 'NO'}
FEEDBACK:
[Your detailed, structured peer review evaluation]

{round_instruction}"""

        review_text = self.llm.invoke(prompt)
        
        # Normalize any raw markdown bullet asterisks into clean hyphens in feedback
        import re
        clean_feedback = re.sub(r'^[ \t]*[\*][ \t]+', '- ', review_text, flags=re.MULTILINE)
        
        # Determine approval strictly by iteration count
        approved = is_final_round or ("APPROVAL: YES" in clean_feedback.upper() and iteration >= max_iterations)
        
        message = f"Technical Reviewer: Round {iteration}/{max_iterations} {'approved' if approved else 'critiqued (sent for revision)'}"
        
        return {
            "review_feedback": clean_feedback,
            "review_approved": approved,
            "messages": [message]
        }
