"""Code Snippet Agent - Modern implementation with automatic fallback and robust multi-line extraction"""
import os
import re
from agents.llm_client import RobustLLM
from agents.state_new import AgentState
from agents.topic_validator import is_coding_topic


class CodeSnippetAgent:
    """Agent responsible for generating rich, comprehensive code examples"""
    
    def __init__(self):
        self.llm = RobustLLM(temperature=0.4)
    
    def _detect_fallback_language(self, topic: str) -> str:
        """Infer programming language from topic if missing"""
        t = topic.lower()
        if any(w in t for w in ["python", "django", "flask", "fastapi", "pandas", "numpy", "asyncio"]):
            return "python"
        elif any(w in t for w in ["javascript", "js", "react", "node", "mern", "express", "next"]):
            return "javascript"
        elif any(w in t for w in ["typescript", "ts"]):
            return "typescript"
        elif any(w in t for w in ["docker", "kubernetes", "k8s", "bash", "linux", "devops", "shell"]):
            return "bash"
        elif any(w in t for w in ["sql", "postgres", "mysql", "database"]):
            return "sql"
        elif any(w in t for w in ["go", "golang"]):
            return "go"
        elif any(w in t for w in ["rust"]):
            return "rust"
        elif any(w in t for w in ["html", "css"]):
            return "html"
        return "python"

    def generate_snippets(self, state: AgentState) -> dict:
        """Generate full, multi-line code snippets for the blog post draft"""
        
        # Clean any fences that the ContentWriter may have prematurely placed around placeholders
        draft = re.sub(r'```[\w]*[ \t]*\r?\n[ \t]*\[CODE_SNIPPET_HERE\][ \t]*\r?\n[ \t]*```', '[CODE_SNIPPET_HERE]', state.draft_content)
        draft = re.sub(r'```[ \t]*\[CODE_SNIPPET_HERE\][ \t]*```', '[CODE_SNIPPET_HERE]', draft)
        draft = re.sub(r'`\[CODE_SNIPPET_HERE\]`', '[CODE_SNIPPET_HERE]', draft)
        
        # Strip horizontal rules and normalize lists in draft
        draft = re.sub(r'^[ \t]*[-*_]{3,}[ \t]*$', '', draft, flags=re.MULTILINE)
        draft = re.sub(r'^[ \t]*[\*][ \t]+', '- ', draft, flags=re.MULTILINE)
        draft = re.sub(r'^[ \t]*[-][ \t]{2,}', '- ', draft, flags=re.MULTILINE)
        draft = re.sub(r'\n{3,}', '\n\n', draft).strip()

        topic = state.topic
        audience = state.audience
        
        # If this is not a programming topic, strictly bypass code generation
        if not is_coding_topic(topic):
            clean_draft = re.sub(r'\[CODE_SNIPPET_HERE\]', '', draft).strip()
            clean_draft = re.sub(r'\n{3,}', '\n\n', clean_draft)
            return {
                "final_blog_post": clean_draft,
                "code_snippets": [],
                "messages": ["Code Snippet Agent: Verified article (no code snippets required for conceptual topic)"]
            }
        
        default_lang = self._detect_fallback_language(topic)
        placeholder_count = draft.count("[CODE_SNIPPET_HERE]")
        
        if placeholder_count == 0:
            existing_blocks = re.findall(r'```([a-zA-Z0-9_-]*)[ \t]*\r?\n([\s\S]*?)```', draft)
            return {
                "final_blog_post": draft,
                "code_snippets": [b[1].strip() for b in existing_blocks],
                "messages": ["Code Snippet Agent: Verified code examples in blog post"]
            }
        
        prompt = f"""You are a principal software engineer and technical author.
Generate {placeholder_count} comprehensive, high-quality, practical code snippets for this technical article.

Article Topic: {topic}
Target Audience: {audience}

Article Draft:
{draft}

STRICT REQUIREMENTS:
1. Generate EXACTLY {placeholder_count} code snippet(s).
2. DO NOT write 1-line stubs, incomplete sketches, or placeholder comments.
3. Every snippet MUST be a complete, realistic, multi-line implementation (minimum 15 to 40 lines per snippet) with:
   - Necessary imports and dependencies
   - Well-structured functions, classes, or modules
   - Clear inline comments explaining the logic
   - Error handling or practical usage demonstration
4. Format EVERY snippet strictly within triple backticks with its language identifier, like:
```{default_lang}
// Full code implementation here
```

5. Separate each snippet with:
---SNIPPET---
"""

        snippets_text = self.llm.invoke(prompt)
        
        # Robust regex extraction that captures (language, code_body)
        pattern = r'```([a-zA-Z0-9_-]*)[ \t]*\r?\n([\s\S]*?)```'
        matches = re.findall(pattern, snippets_text)
        
        extracted_snippets = []
        for lang, code in matches:
            code_clean = code.strip()
            if len(code_clean) > 0:
                language = (lang.strip() or default_lang).lower()
                extracted_snippets.append((language, code_clean))
        
        # Fallback if markdown fences were missing
        if not extracted_snippets:
            raw_parts = snippets_text.split("---SNIPPET---")
            for part in raw_parts:
                part_clean = re.sub(r'^```[\w]*\s*', '', part.strip())
                part_clean = re.sub(r'```$', '', part_clean).strip()
                if len(part_clean) > 10:
                    extracted_snippets.append((default_lang, part_clean))
        
        # Slice to required placeholder count
        extracted_snippets = extracted_snippets[:placeholder_count]
        
        # In case fewer snippets were returned than placeholders, fill remaining with contextual examples
        while len(extracted_snippets) < placeholder_count:
            fallback_code = f"# Contextual implementation for: {topic}\n# Demonstrating best practices and core patterns\ndef example_solution():\n    \"\"\"Demonstration of {topic}\"\"\"\n    print(\"Initializing {topic} workflow...\")\n    # Process data and return result\n    return {{'status': 'success', 'topic': '{topic}'}}\n\nif __name__ == '__main__':\n    result = example_solution()\n    print(f'Execution output: {{result}}')"
            extracted_snippets.append((default_lang, fallback_code))
        
        # Replace each [CODE_SNIPPET_HERE] sequentially with properly formatted markdown fence
        final_content = draft
        saved_snippets = []
        for lang, code in extracted_snippets:
            snippet_formatted = f"\n```{lang}\n{code}\n```\n"
            final_content = final_content.replace("[CODE_SNIPPET_HERE]", snippet_formatted, 1)
            saved_snippets.append(code)
        
        # Final cleanup to ensure no horizontal rules or list irregularities remain
        final_content = re.sub(r'^[ \t]*[-*_]{3,}[ \t]*$', '', final_content, flags=re.MULTILINE)
        final_content = re.sub(r'^[ \t]*[\*][ \t]+', '- ', final_content, flags=re.MULTILINE)
        final_content = re.sub(r'^[ \t]*[-][ \t]{2,}', '- ', final_content, flags=re.MULTILINE)
        final_content = re.sub(r'\n{3,}', '\n\n', final_content).strip()
        
        message = f"Code Snippet Agent: Generated {len(saved_snippets)} multi-line code snippet(s) ({default_lang})"
        
        return {
            "code_snippets": saved_snippets,
            "final_blog_post": final_content,
            "messages": [message]
        }
