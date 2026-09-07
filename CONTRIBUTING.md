# Contributing to Technical Blog Post Factory

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## 🌟 Ways to Contribute

- Report bugs and issues
- Suggest new features or improvements
- Improve documentation
- Submit code changes via pull requests
- Help answer questions in discussions

## 🐛 Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Windows 11]
- Python Version: [e.g., 3.14]
- Browser: [e.g., Chrome 120]
```

## 💡 Suggesting Features

Feature suggestions are welcome! Please provide:

1. Clear description of the feature
2. Use case and benefits
3. Possible implementation approach
4. Any relevant examples or mockups

## 🔧 Development Setup

1. **Fork and clone**
   ```bash
   git clone https://github.com/yourusername/technical-blog-factory.git
   cd technical-blog-factory
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment**
   ```bash
   cp .env.example .env
   # Add your API keys to .env
   ```

5. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Code Style Guidelines

### Python Code

- Follow PEP 8 style guide
- Use type hints where appropriate
- Add docstrings to functions and classes
- Keep functions focused and under 50 lines
- Use meaningful variable names

**Example:**
```python
def generate_blog_post(topic: str, audience: str) -> dict:
    """
    Generate a blog post using the multi-agent system.
    
    Args:
        topic: The blog post topic
        audience: Target audience for the content
        
    Returns:
        Dictionary containing the generated blog post and metadata
    """
    # Implementation
    pass
```

### JavaScript Code

- Use ES6+ features
- Use const/let instead of var
- Add JSDoc comments for functions
- Use meaningful variable names
- Keep functions small and focused

**Example:**
```javascript
/**
 * Format blog content from markdown to HTML
 * @param {string} content - Raw markdown content
 * @returns {string} Formatted HTML content
 */
function formatBlogContent(content) {
    // Implementation
}
```

### CSS Code

- Use meaningful class names
- Group related styles together
- Add comments for complex sections
- Use CSS variables for colors and spacing

## 🧪 Testing

Before submitting a pull request:

1. Test your changes thoroughly
2. Ensure existing functionality still works
3. Test on different browsers (if UI changes)
4. Verify API endpoints work correctly

## 📤 Submitting Pull Requests

1. **Update your fork**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: Brief description of changes"
   ```

   **Commit message format:**
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for updates to existing features
   - `Docs:` for documentation changes
   - `Refactor:` for code refactoring

3. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Submit for review

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

## 🔍 Code Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Your contribution will be credited

## 📚 Documentation

When adding new features:

1. Update README.md if needed
2. Add inline code comments
3. Update API documentation
4. Add usage examples

## ❓ Questions?

- Open a discussion on GitHub
- Check existing issues and discussions
- Reach out to maintainers

## 🎉 Recognition

Contributors will be:
- Listed in the project contributors
- Credited in release notes
- Mentioned in the README (for significant contributions)

Thank you for contributing to Technical Blog Post Factory! 🚀
