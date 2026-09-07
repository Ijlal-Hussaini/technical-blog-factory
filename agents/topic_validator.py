"""Topic Validator - Comprehensive Guardrails against Gibberish, Numbers, and Non-topics"""
import re
from typing import Tuple

# Whitelist of valid technical acronyms and short terms that may lack standard vowels
TECH_ACRONYMS = {
    "sql", "css", "html", "k8s", "grpc", "rxjs", "xml", "json", "yaml", "jwt",
    "csrf", "xss", "ddos", "ssh", "ssl", "tls", "tcp", "udp", "dns", "http",
    "https", "ftp", "smtp", "vpn", "cdn", "sdk", "api", "npm", "pip", "git",
    "svg", "wasm", "nosql", "rdbms", "crud", "orm", "mvc", "mvvm", "ui", "ux",
    "cli", "gui", "ide", "vm", "os", "io", "aio", "asyncio", "llm", "rag", "nlp",
    "c", "r", "go", "ai", "ml", "dl", "db", "oop", "oops"
}

# Generic placeholder terms that indicate testing/dummy input rather than a real topic
GENERIC_PLACEHOLDERS = {
    "abc", "cba", "xyz", "zyx", "def", "fed", "test", "testing", "tester", "sample",
    "dummy", "temp", "temporary", "foo", "bar", "baz", "foobar", "qwerty",
    "asdf", "hello", "world", "hello world", "blah", "random", "something",
    "anything", "nothing", "demo", "aaa", "bbb", "ccc", "xxx", "yyy", "zzz"
}

# Programming and software engineering keywords that genuinely warrant code snippets
CODING_KEYWORDS = {
    "python", "javascript", "typescript", "golang", "go lang", "rust", "java", "c++", "c#",
    "ruby", "php", "swift", "kotlin", "scala", "dart", "react", "node", "nodejs", "express",
    "fastapi", "django", "flask", "nextjs", "next.js", "vue", "angular", "svelte", "tailwind",
    "sql", "postgres", "postgresql", "mysql", "mongodb", "redis", "sqlite", "graphql", "rest api",
    "docker", "kubernetes", "k8s", "bash", "shell", "linux command", "terraform", "ansible",
    "ci/cd", "github actions", "microservices", "asyncio", "threading", "multiprocessing",
    "algorithm", "data structure", "recursion", "dynamic programming", "decorator", "generator",
    "object oriented", "oop", "oops", "functional programming", "unit test", "pytest", "jest",
    "web development", "mern", "mean stack", "full stack", "fullstack", "backend", "frontend",
    "endpoint", "middleware", "jwt authentication", "oauth", "websockets", "regex"
}

# Keyboard mash walks (forward & reverse key sequences across standard QWERTY rows)
KEYBOARD_MASH_PATTERNS = [
    "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", "jkl;", "lkjh", "kjhg", "jhgf", "hgfd", "gfds", "fdsa",
    "qwer", "wert", "erty", "rtyu", "tyui", "yuio", "uiop", "poiuy", "oiuyt", "iuytr", "uytre", "ytrew", "trewq",
    "zxcv", "xcvb", "cvbn", "vbnm", "mnbv", "nbvc", "bvcx", "vcxz",
    "1234", "2345", "3456", "4567", "5678", "6789", "7890", "0987", "9876", "8765", "7654", "6543", "5432", "4321",
    "qazw", "wsxe", "edcr", "rfvt", "tgby", "sdhg"
]

VALID_3CONSONANT_PREFIXES = (
    "str", "spl", "scr", "spr", "shr", "thr", "sch", "phr", "chr", "psy", "pse"
)

VALID_4CONSONANT_INFIXES = (
    "ngth", "ngst", "ghts", "tch", "nstr", "rts", "sch", "mpl", "rch"
)


def is_coding_topic(topic: str) -> bool:
    """Determine if a topic genuinely involves programming, frameworks, or code implementation."""
    t = topic.lower()
    return any(k in t for k in CODING_KEYWORDS)


def validate_topic(topic: str) -> Tuple[bool, str, bool]:
    """
    Validate a proposed blog post topic against numbers, keyboard mash, and gibberish.
    
    Returns:
        (is_valid, error_message, requires_code)
    """
    if not topic or not isinstance(topic, str):
        return False, "Topic cannot be empty. Please provide a meaningful subject.", False

    raw_topic = topic.strip()
    clean_topic = re.sub(r"\s+", " ", raw_topic)
    
    # 1. Minimum length check
    if len(clean_topic) < 3:
        return False, "Topic is too short. Please enter a meaningful topic with at least 3 characters (e.g., 'SQL', 'Git', 'OOPs').", False

    # 2. Check for generic placeholder test inputs (e.g. "abc", "xyz", "test", "temp")
    if clean_topic.lower() in GENERIC_PLACEHOLDERS:
        return (
            False,
            f"'{raw_topic}' is a generic test placeholder. Please provide a specific topic or technology (e.g., 'OOPs Concepts in Java', 'Python AsyncIO', 'Docker Microservices').",
            False
        )

    # 2. Pure number check (e.g. "12345", "4534896", "837537", "007", "12-34-56")
    alpha_chars = [c for c in clean_topic if c.isalpha()]
    digit_chars = [c for c in clean_topic if c.isdigit()]
    
    if len(alpha_chars) == 0:
        return (
            False,
            f"'{raw_topic}' is purely numbers or symbols. A blog post cannot be generated from random numbers. "
            "Please provide a real topic (e.g., 'Python AsyncIO Best Practices', 'Building Microservices with Docker').",
            False
        )

    # 3. Minimum alphabetic ratio (must be at least 35% letters to prevent "123456789a")
    if len(alpha_chars) < 2 or (len(alpha_chars) / len(clean_topic)) < 0.35:
        return (
            False,
            f"'{raw_topic}' does not contain enough letters to form a valid subject. "
            "Please enter a clear, descriptive topic.",
            False
        )

    # 4. Check for repeated characters (e.g. "aaaaaaa", "zzzzzz", "xxxxx")
    if re.search(r"(.)\1{3,}", clean_topic.lower()):
        return (
            False,
            f"'{raw_topic}' contains repeated characters and appears to be invalid input. "
            "Please enter a genuine topic.",
            False
        )

    # 5. Check for known keyboard mash substrings (e.g. "asdfghjkl", "qwertyuiop", "sdhgiughsi")
    lower_topic = clean_topic.lower()
    for pattern in KEYBOARD_MASH_PATTERNS:
        if pattern in lower_topic and len(clean_topic.split()) <= 2:
            return (
                False,
                f"'{raw_topic}' appears to be random keyboard mash. "
                "Please enter a meaningful technical subject or concept.",
                False
            )

    # 6. Word-level phonotactics and vowel analysis
    words = clean_topic.split()
    vowels = set("aeiouy")
    
    for word in words:
        word_lower = word.lower()
        word_clean = re.sub(r"[^a-z]", "", word_lower)
        
        if not word_clean:
            continue
            
        # Whitelisted acronyms (e.g. 'sql', 'css', 'k8s', 'grpc') are valid
        if word_clean in TECH_ACRONYMS:
            continue

        # Check for invalid 3-consonant initial clusters
        m_start = re.match(r"^[bcdfghjklmnpqrstvwxz]{3,}", word_clean)
        if m_start:
            prefix = m_start.group(0)[:3]
            if not prefix.startswith(VALID_3CONSONANT_PREFIXES):
                return (
                    False,
                    f"'{raw_topic}' contains unnatural consonant clustering ('{prefix}') and appears to be random keystrokes. "
                    "Please enter a recognizable technical subject.",
                    False
                )

        # Check for invalid 4+ consecutive consonants
        m_quad = re.search(r"[bcdfghjklmnpqrstvwxz]{4,}", word_clean)
        if m_quad:
            cluster = m_quad.group(0)
            if not any(valid_inf in cluster for valid_inf in VALID_4CONSONANT_INFIXES):
                return (
                    False,
                    f"'{raw_topic}' contains unnatural letter sequences ('{cluster}') and appears to be random gibberish. "
                    "Please enter a recognizable subject.",
                    False
                )

        # If length >= 5, check vowel ratio
        if len(word_clean) >= 5:
            num_vowels = sum(1 for c in word_clean if c in vowels)
            vowel_ratio = num_vowels / len(word_clean)
            if vowel_ratio < 0.15:
                return (
                    False,
                    f"'{raw_topic}' lacks normal vowel distribution and appears to be random gibberish. "
                    "Please provide a recognizable topic (e.g., 'React State Management', 'PostgreSQL Optimization').",
                    False
                )

    # Passed all checks!
    requires_code = is_coding_topic(clean_topic)
    return True, "", requires_code
