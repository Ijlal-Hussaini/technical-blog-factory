"""Modern FastAPI implementation with Pydantic v2"""
import sys
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from workflow.blog_workflow_new import BlogPostWorkflow
from agents.topic_validator import validate_topic
from dotenv import load_dotenv
import uvicorn
import os

load_dotenv()

app = FastAPI(
    title="Technical Blog Post Factory API",
    description="Multi-agent system for generating technical blog posts with peer review",
    version="2.0.0"
)

# Custom validation error handler returning clean text strings (prevents [object Object])
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = err.get("loc", ["topic"])[-1]
        msg = err.get("msg", "Invalid value")
        if field == "topic" and "at least" in msg:
            errors.append("Topic is too short. Please provide a meaningful topic with at least 3 characters (e.g., 'SQL', 'Git', 'OOPs').")
        else:
            errors.append(f"{field}: {msg}")
    return JSONResponse(
        status_code=400,
        content={"detail": " ".join(errors)}
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for web interface
web_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "web")
if os.path.exists(web_dir):
    app.mount("/static", StaticFiles(directory=web_dir), name="static")


class BlogRequest(BaseModel):
    """Blog generation request model - Pydantic v2"""
    topic: str = Field(..., min_length=2, max_length=300, description="Blog post topic")
    audience: str = Field(..., min_length=1, description="Target audience")
    max_iterations: int = Field(default=3, ge=1, le=5, description="Maximum review iterations")


class BlogResponse(BaseModel):
    """Blog generation response model - Pydantic v2"""
    topic: str
    audience: str
    final_blog_post: str
    iterations: int
    review_feedback: str
    messages: list[str]
    code_snippets_count: int
    status: str


@app.get("/")
async def root():
    """Serve the web interface"""
    web_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "web")
    index_path = os.path.join(web_dir, "index.html")
    
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {
        "message": "Technical Blog Post Factory API v2.0",
        "version": "2.0.0",
        "stack": {
            "framework": "FastAPI 0.115+",
            "ai": "LangGraph 0.3+ & Gemini 2.0",
            "python": "3.14 compatible"
        },
        "endpoints": {
            "generate": "/api/generate-blog",
            "health": "/health"
        }
    }


@app.get("/favicon.ico")
@app.get("/favicon.svg")
async def favicon():
    """Serve favicon for browser tabs"""
    favicon_path = os.path.join(web_dir, "favicon.svg")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type="image/svg+xml")
    raise HTTPException(status_code=404, detail="Favicon not found")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "gemini_api": "configured" if os.getenv("GOOGLE_API_KEY") else "missing",
        "tavily_api": "configured" if os.getenv("TAVILY_API_KEY") else "missing",
        "python_version": sys.version
    }


@app.post("/api/generate-blog", response_model=BlogResponse)
async def generate_blog(request: BlogRequest):
    """Generate a technical blog post using the multi-agent system"""
    
    try:
        # 1. Validate topic upfront against numbers, keyboard mash, and gibberish
        is_valid, err_msg, _ = validate_topic(request.topic)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

        # 2. Validate API keys
        if not os.getenv("GOOGLE_API_KEY") and not os.getenv("GROQ_API_KEY"):
            raise HTTPException(status_code=500, detail="Neither GOOGLE_API_KEY nor GROQ_API_KEY is configured")
        
        # 3. Initialize workflow
        workflow = BlogPostWorkflow()
        
        # Run the multi-agent system in a worker thread so event loop remains non-blocking
        result = await run_in_threadpool(
            workflow.run,
            topic=request.topic,
            audience=request.audience,
            max_iterations=request.max_iterations
        )
        
        return BlogResponse(
            **result,
            status="success"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating blog post: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", os.getenv("API_PORT", 8000))),
        reload=False
    )
