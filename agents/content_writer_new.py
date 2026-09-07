"""Content Writer Agent - Modern implementation with automatic fallback and strict formatting"""
import re
from agents.llm_client import RobustLLM
from agents.state_new import AgentState
from agents.topic_validator import validate_topic, is_coding_topic


class ContentWriterAgent:
    """Agent responsible for generating technical blog post drafts"""
    
    def __init__(self):
        self.llm = RobustLLM(temperature=0.7)
    
    def write_draft(self, state: AgentState) -> dict:
        """Generate initial blog post draft or revise based on feedback"""
        
        topic = state.topic
        audience = state.audience
        feedback = state.review_feedback
        iteration = state.iteration_count

        # Validate topic upfront
        is_valid, err_msg, requires_code = validate_topic(topic)
        if not is_valid:
            raise ValueError(f"Cannot write draft: {err_msg}")
        
        code_instruction = (
            "MANDATORY CODE SNIPPET REQUIREMENTS:\n"
            "This topic involves programming/software engineering. You MUST include 2 to 3 [CODE_SNIPPET_HERE] placeholders placed on their own lines right where a practical code example should demonstrate the concept.\n"
            "CRITICAL: Write each [CODE_SNIPPET_HERE] as plain text on its own line. NEVER wrap [CODE_SNIPPET_HERE] inside markdown code backticks."
            if requires_code else
            "CODE SNIPPET POLICY:\n"
            "This topic is conceptual or non-programming. Do NOT include ANY [CODE_SNIPPET_HERE] placeholders or code blocks. Write pure, high-quality, professional prose."
        )
        
        if iteration == 0:
            prompt = f"""You are an expert technical author and content writer. Create a comprehensive, publication-grade blog post about: {topic}

Target Audience: {audience}

Article Requirements:
- Write in a clear, engaging, authoritative style tailored for {audience}
- Include an enticing introduction, thorough content sections, and an actionable conclusion
- Structure cleanly: use '# Title' for the main title, '## Section Title' for major sections, and '### Subsection' for subsections
- Length: 900-1400 words
- Provide practical, real-world context and industry best practices

STRICT FORMATTING RULES:
1. NEVER use horizontal divider lines ('---', '***', or '___') anywhere in the article. Do NOT add '---' after paragraphs or between sections.
2. For bullet points or lists, ALWAYS use a single hyphen followed by a space (e.g., '- **Point**: Description'). NEVER use asterisks with irregular spaces (e.g. avoid '*   **Item**').
3. Keep paragraphs well-spaced and natural.

{code_instruction}

Generate the comprehensive blog post draft now."""
        else:
            prompt = f"""You are revising a technical blog post based on reviewer feedback.

Original Topic: {topic}
Target Audience: {audience}

Previous Draft:
{state.draft_content}

Reviewer Feedback:
{feedback}

Please revise the blog post addressing all feedback points while maintaining exceptional technical quality and structure.
STRICT RULES:
1. NEVER use horizontal divider lines ('---', '***', or '___') anywhere in the text.
2. Use single hyphen for bullet points ('- Item').
3. Preserve or refine [CODE_SNIPPET_HERE] placeholders where code demonstrations belong."""

        draft_text = self.llm.invoke(prompt)
        
        # Post-processing: eliminate horizontal rules and normalize lists
        draft_text = re.sub(r'^[ \t]*[-*_]{3,}[ \t]*$', '', draft_text, flags=re.MULTILINE)
        draft_text = re.sub(r'^[ \t]*[\*][ \t]+', '- ', draft_text, flags=re.MULTILINE)
        draft_text = re.sub(r'^[ \t]*[-][ \t]{2,}', '- ', draft_text, flags=re.MULTILINE)
        draft_text = re.sub(r'\n{3,}', '\n\n', draft_text).strip()
        
        # Return updates to state
        message = f"Content Writer: Draft {'created' if iteration == 0 else 'revised'} (iteration {iteration + 1})"
        
        return {
            "draft_content": draft_text,
            "iteration_count": iteration + 1,
            "messages": [message]
        }

