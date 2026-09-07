"""Modern state management using Pydantic v2 and LangGraph 0.3+"""
from typing import Annotated
from pydantic import BaseModel, Field


def add_messages(left: list[str], right: list[str]) -> list[str]:
    """Combine message lists"""
    return left + right


class AgentState(BaseModel):
    """State shared across all agents in the workflow - Pydantic v2"""
    
    topic: str = Field(description="Blog post topic")
    audience: str = Field(description="Target audience")
    draft_content: str = Field(default="", description="Current draft content")
    review_feedback: str = Field(default="", description="Reviewer feedback")
    review_approved: bool = Field(default=False, description="Review approval status")
    code_snippets: list[str] = Field(default_factory=list, description="Generated code snippets")
    final_blog_post: str = Field(default="", description="Final blog post with code")
    iteration_count: int = Field(default=0, description="Current iteration number")
    messages: Annotated[list[str], add_messages] = Field(
        default_factory=list, 
        description="Agent activity messages"
    )
    max_iterations: int = Field(default=3, description="Maximum review iterations")
    
    class Config:
        arbitrary_types_allowed = True
