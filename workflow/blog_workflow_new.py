"""Modern LangGraph workflow using LangGraph 0.3+ API"""
from langgraph.graph import StateGraph, END, START
from agents.state_new import AgentState
from agents.content_writer_new import ContentWriterAgent
from agents.technical_reviewer_new import TechnicalReviewerAgent
from agents.code_snippet_new import CodeSnippetAgent


class BlogPostWorkflow:
    """LangGraph workflow orchestrating the multi-agent system"""
    
    def __init__(self):
        self.writer = ContentWriterAgent()
        self.reviewer = TechnicalReviewerAgent()
        self.code_agent = CodeSnippetAgent()
        self.workflow = self._build_workflow()
    
    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow using modern API"""
        
        # Create workflow with Pydantic state
        workflow = StateGraph(AgentState)
        
        # Add nodes for each agent
        workflow.add_node("writer", self.writer.write_draft)
        workflow.add_node("reviewer", self.reviewer.review_content)
        workflow.add_node("code_generator", self.code_agent.generate_snippets)
        
        # Define the workflow edges using modern API
        workflow.add_edge(START, "writer")
        workflow.add_edge("writer", "reviewer")
        
        # Conditional edge: Reviewer -> Writer (if not approved) or Code Generator (if approved)
        workflow.add_conditional_edges(
            "reviewer",
            self._should_continue_review,
            {
                "continue": "writer",
                "approved": "code_generator"
            }
        )
        
        # Code Generator -> END
        workflow.add_edge("code_generator", END)
        
        return workflow.compile()
    
    def _should_continue_review(self, state: AgentState) -> str:
        """Determine if review loop should continue or proceed to code generation"""
        if state.review_approved or state.iteration_count >= state.max_iterations:
            return "approved"
        return "continue"
    
    def run(self, topic: str, audience: str, max_iterations: int = 2) -> dict:
        """Execute the workflow"""
        iterations_limit = max(1, min(3, int(max_iterations)))
        
        initial_state = AgentState(
            topic=topic,
            audience=audience,
            max_iterations=iterations_limit
        )
        
        final_state = self.workflow.invoke(initial_state)
        
        # Handle both dict and AgentState object
        if isinstance(final_state, dict):
            messages_list = final_state.get("messages", [])
            topic_val = final_state.get("topic", topic)
            audience_val = final_state.get("audience", audience)
            final_blog = final_state.get("final_blog_post", "")
            iterations = final_state.get("iteration_count", 0)
            feedback = final_state.get("review_feedback", "")
            snippets = final_state.get("code_snippets", [])
        else:
            messages_list = final_state.messages
            topic_val = final_state.topic
            audience_val = final_state.audience
            final_blog = final_state.final_blog_post
            iterations = final_state.iteration_count
            feedback = final_state.review_feedback
            snippets = final_state.code_snippets
        
        # Clean up duplicate messages
        seen = set()
        unique_messages = []
        for msg in messages_list:
            if msg not in seen:
                seen.add(msg)
                unique_messages.append(msg)
        
        return {
            "topic": topic_val,
            "audience": audience_val,
            "final_blog_post": final_blog,
            "iterations": iterations,
            "review_feedback": feedback,
            "messages": unique_messages,
            "code_snippets_count": len(snippets)
        }
