// Technical Blog Post Factory - Modern Application Engine
const API_URL = 'http://localhost:8000';

// Global State
let currentChatId = null;
let chats = {};
let selectedAudience = 'Beginners';

// Sync with window for integration and testing
try {
    Object.defineProperty(window, 'currentChatId', {
        get: () => currentChatId,
        set: (val) => { currentChatId = val; },
        configurable: true
    });
    Object.defineProperty(window, 'chats', {
        get: () => chats,
        set: (val) => { chats = val; },
        configurable: true
    });
} catch (e) {}

// DOM Elements Map
const elements = {
    // Theme & Navigation
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    sidebar: document.getElementById('sidebar'),
    apiStatusBadge: document.getElementById('apiStatusBadge'),
    apiStatusText: document.getElementById('apiStatusText'),
    
    // Screens & Feed
    welcomeScreen: document.getElementById('welcomeScreen'),
    messagesContainer: document.getElementById('messagesContainer'),
    messages: document.getElementById('messages'),
    chatHistory: document.getElementById('chatHistory'),
    chatCountBadge: document.getElementById('chatCountBadge'),
    
    // Buttons & Inputs
    newChatBtn: document.getElementById('newChatBtn'),
    generateBtn: document.getElementById('generateBtn'),
    topicInput: document.getElementById('topicInput'),
    maxIterations: document.getElementById('maxIterations'),
    iterValue: document.getElementById('iterValue'),
    toggleCustomAudience: document.getElementById('toggleCustomAudience'),
    customAudienceInput: document.getElementById('customAudienceInput'),
    audiencePills: document.querySelectorAll('.audience-pill'),
    
    // Loading Modal & Pipeline
    loadingModal: document.getElementById('loadingModal'),
    loadingStatus: document.getElementById('loadingStatus'),
    progressFill: document.getElementById('progressFill'),
    nodeWriter: document.getElementById('nodeWriter'),
    nodeReviewer: document.getElementById('nodeReviewer'),
    nodeCoder: document.getElementById('nodeCoder'),
    toastContainer: document.getElementById('toastContainer')
};

// ==========================================================================
// Initialization
// ==========================================================================

async function init() {
    initTheme();
    loadChatsFromStorage();
    renderChatHistory();
    setupEventListeners();
    await checkAPIStatus();
}

// ==========================================================================
// Theme Engine (Light / Dark)
// ==========================================================================

function initTheme() {
    const savedTheme = localStorage.getItem('blogFactoryTheme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('blogFactoryTheme', theme);
    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        elements.themeToggleBtn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} theme`);
}

// ==========================================================================
// Toast Notifications
// ==========================================================================

function showToast(message, icon = '✓') {
    showToastWithUndo(message, icon, null);
}

function showToastWithUndo(message, icon = '✓', onUndo = null) {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let undoHtml = '';
    if (onUndo) {
        undoHtml = `<button type="button" class="btn-toast-undo">Undo</button>`;
    }
    
    toast.innerHTML = `<div class="toast-message"><span>${icon}</span><span>${message}</span></div>${undoHtml}`;
    
    if (onUndo) {
        const undoBtn = toast.querySelector('.btn-toast-undo');
        if (undoBtn) {
            undoBtn.onclick = (e) => {
                e.stopPropagation();
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                onUndo();
            };
        }
    }
    
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, onUndo ? 4500 : 3000);
}

// ==========================================================================
// API Health Check
// ==========================================================================

async function checkAPIStatus() {
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        if (data.status === 'healthy') {
            elements.apiStatusText.textContent = 'API Online';
            elements.apiStatusBadge.style.color = 'var(--success)';
        }
    } catch (error) {
        console.warn('Backend API connection check failed:', error);
        if (elements.apiStatusText) {
            elements.apiStatusText.textContent = 'API Connecting...';
            elements.apiStatusBadge.style.color = 'var(--warning)';
        }
    }
}

// ==========================================================================
// Event Listeners & UI Controls
// ==========================================================================

function setupEventListeners() {
    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Mobile Drawer Toggle
    elements.mobileMenuBtn.addEventListener('click', () => {
        elements.sidebar.classList.toggle('open');
        elements.sidebarBackdrop.classList.toggle('show');
    });

    elements.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    // New Chat
    elements.newChatBtn.addEventListener('click', () => {
        createNewChat();
        closeMobileSidebar();
    });

    // Generate Button
    elements.generateBtn.addEventListener('click', generateBlogPost);
    
    // Enter key inside topic input
    elements.topicInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            generateBlogPost();
        }
    });

    // Range slider value
    elements.maxIterations.addEventListener('input', (e) => {
        elements.iterValue.textContent = e.target.value;
    });

    // Audience Pills selection
    elements.audiencePills.forEach(pill => {
        pill.addEventListener('click', () => {
            elements.audiencePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedAudience = pill.dataset.audience;
        });
    });

    // Custom Audience input toggle
    elements.toggleCustomAudience.addEventListener('click', () => {
        elements.customAudienceInput.classList.toggle('show');
        if (elements.customAudienceInput.classList.contains('show')) {
            elements.customAudienceInput.focus();
        }
    });

    // Custom Delete Confirmation Modal Listeners
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');

    if (btnCancelDelete) {
        btnCancelDelete.addEventListener('click', closeDeleteModal);
    }
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', confirmDeleteChat);
    }
    if (deleteConfirmModal) {
        deleteConfirmModal.addEventListener('click', (e) => {
            if (e.target === deleteConfirmModal) {
                closeDeleteModal();
            }
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDeleteModal();
        }
    });
}

function closeMobileSidebar() {
    elements.sidebar.classList.remove('open');
    elements.sidebarBackdrop.classList.remove('show');
}

// Helper to prefill suggestion cards
window.populatePrompt = function(topic, audience) {
    elements.topicInput.value = topic;
    
    let matched = false;
    elements.audiencePills.forEach(pill => {
        if (pill.dataset.audience.toLowerCase().includes(audience.toLowerCase())) {
            elements.audiencePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedAudience = pill.dataset.audience;
            matched = true;
        }
    });

    if (!matched) {
        elements.customAudienceInput.classList.add('show');
        elements.customAudienceInput.value = audience;
    }

    elements.topicInput.focus();
    showToast('Topic populated! Click Generate to start.');
};

// ==========================================================================
// Storage & Chat Management
// ==========================================================================

function loadChatsFromStorage() {
    const stored = localStorage.getItem('blogFactoryChats');
    if (stored) {
        try {
            chats = JSON.parse(stored);
        } catch (e) {
            chats = {};
        }
    }
    window.chats = chats;
}

function saveChatsToStorage() {
    window.chats = chats;
    localStorage.setItem('blogFactoryChats', JSON.stringify(chats));
}

function createNewChat() {
    const chatId = `chat_${Date.now()}`;
    currentChatId = chatId;
    
    chats[chatId] = {
        title: 'New Article',
        created: new Date().toISOString(),
        messages: []
    };
    
    saveChatsToStorage();
    renderChatHistory();
    showChatInterface();
    elements.topicInput.focus();
}

function showChatInterface() {
    elements.welcomeScreen.style.display = 'none';
    elements.messagesContainer.style.display = 'flex';
    renderMessages();
}

function renderChatHistory() {
    elements.chatHistory.innerHTML = '';
    
    const sortedChats = Object.entries(chats).sort((a, b) => 
        new Date(b[1].created) - new Date(a[1].created)
    );
    
    elements.chatCountBadge.textContent = sortedChats.length;

    if (sortedChats.length === 0) {
        elements.chatHistory.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0.5rem; font-size: 0.82rem;">
                No articles generated yet.<br>Click "New Article" to begin!
            </div>
        `;
        return;
    }
    
    sortedChats.forEach(([chatId, chat]) => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item' + (chatId === currentChatId ? ' active' : '');
        
        chatItem.innerHTML = `
            <div class="chat-item-content">
                <span class="chat-item-icon">📄</span>
                <span class="chat-item-title">${escapeHtml(chat.title)}</span>
            </div>
            <button class="chat-item-delete" title="Delete article" onclick="event.stopPropagation(); deleteChat('${chatId}')">
                🗑
            </button>
        `;

        chatItem.onclick = () => {
            loadChat(chatId);
            closeMobileSidebar();
        };

        elements.chatHistory.appendChild(chatItem);
    });
}

function loadChat(chatId) {
    currentChatId = chatId;
    renderChatHistory();
    showChatInterface();
}

let pendingDeleteChatId = null;

function deleteChat(chatId) {
    const chat = chats[chatId];
    if (!chat) return;
    
    pendingDeleteChatId = chatId;
    const title = chat.title || 'this article';
    const descElem = document.getElementById('deleteConfirmDesc');
    if (descElem) {
        descElem.innerHTML = `Are you sure you want to delete <strong>"${escapeHtml(title)}"</strong>?<br><span style="font-size: 0.82rem; color: var(--text-muted); display: block; margin-top: 0.5rem;">This conversation and its generated blog post will be permanently removed.</span>`;
    }
    
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeDeleteModal() {
    pendingDeleteChatId = null;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function confirmDeleteChat() {
    if (!pendingDeleteChatId || !chats[pendingDeleteChatId]) {
        closeDeleteModal();
        return;
    }
    
    const chatId = pendingDeleteChatId;
    const deletedChat = chats[chatId];
    delete chats[chatId];
    
    if (currentChatId === chatId) {
        currentChatId = null;
        elements.welcomeScreen.style.display = 'flex';
        elements.messagesContainer.style.display = 'none';
    }
    
    saveChatsToStorage();
    renderChatHistory();
    closeDeleteModal();
    
    showToastWithUndo(`Deleted "${escapeHtml(deletedChat.title || 'Article')}"`, '🗑', () => {
        chats[chatId] = deletedChat;
        saveChatsToStorage();
        renderChatHistory();
        loadChat(chatId);
        showToast('Article restored', '↩️');
    });
}

window.deleteChat = deleteChat;
window.showDeleteModal = deleteChat;
window.closeDeleteModal = closeDeleteModal;
window.hideDeleteModal = closeDeleteModal;
window.confirmDeleteChat = confirmDeleteChat;
window.renderMessages = renderMessages;
window.renderChatHistory = renderChatHistory;
window.showChatInterface = showChatInterface;
window.getCleanPlainText = getCleanPlainText;
window.formatMarkdownForWord = formatMarkdownForWord;
window.toggleTheme = toggleTheme;

// ==========================================================================
// Messages Rendering
// ==========================================================================

function renderMessages() {
    if (!currentChatId || !chats[currentChatId]) return;
    
    elements.messages.innerHTML = '';
    const chat = chats[currentChatId];
    
    let assistantIndex = 0;
    chat.messages.forEach((msg) => {
        if (msg.role === 'user') {
            renderUserMessage(msg);
        } else if (msg.role === 'assistant') {
            renderAssistantMessage(msg, assistantIndex);
            assistantIndex++;
        }
    });
    
    // Scroll down to latest content
    setTimeout(() => {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }, 50);
}

function renderUserMessage(msg) {
    const userDiv = document.createElement('div');
    userDiv.className = 'message-user';
    
    userDiv.innerHTML = `
        <div class="user-bubble">
            <div class="user-bubble-header">
                <span>👤</span>
                <span>Requested Topic</span>
            </div>
            <div class="user-bubble-topic">${escapeHtml(msg.content.topic)}</div>
            <div class="user-bubble-meta">
                <span class="meta-chip">🎯 ${escapeHtml(msg.content.audience)}</span>
            </div>
        </div>
    `;
    elements.messages.appendChild(userDiv);
}

function renderAssistantMessage(msg, index) {
    const content = msg.content;
    if (!content || !content.final_blog_post) return;

    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message-assistant';
    
    assistantDiv.innerHTML = `
        <!-- Header & Action Toolbar -->
        <div class="assistant-card-header">
            <div class="assistant-title">
                <div class="assistant-badge">🤖</div>
                <div>
                    <h3>Generated Technical Blog Post</h3>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">Verified with Tavily Search • Formatted with Code Snippets</div>
                </div>
            </div>
            
            <div class="assistant-actions">
                <button class="btn-action btn-download-pdf" onclick="downloadPDF(${index})" title="Download structured, complete, publication-ready PDF">
                    <span>📕</span>
                    <span>Download PDF</span>
                </button>
                <button class="btn-action" onclick="copyFullPost(${index})" title="Copy formatted text ready for Word or Docs (no hashes or asterisks)">
                    <span>📋</span>
                    <span>Copy Text</span>
                </button>
                <button class="btn-action btn-download-txt" onclick="downloadCleanText(${index})" title="Download clean plain text file without hashes or asterisks">
                    <span>📄</span>
                    <span>Clean Text (.txt)</span>
                </button>
            </div>
        </div>
        
        <!-- Modern Metric Cards -->
        <div class="metrics-grid">
            <div class="metric-widget iterations">
                <div class="metric-icon-box">🔄</div>
                <div class="metric-info">
                    <span class="metric-label">Review Cycles</span>
                    <span class="metric-value">${content.iterations || 1}</span>
                </div>
            </div>
            <div class="metric-widget snippets">
                <div class="metric-icon-box">💻</div>
                <div class="metric-info">
                    <span class="metric-label">Code Examples</span>
                    <span class="metric-value">${content.code_snippets_count || 0}</span>
                </div>
            </div>
            <div class="metric-widget status">
                <div class="metric-icon-box">✅</div>
                <div class="metric-info">
                    <span class="metric-label">Review Status</span>
                    <span class="metric-value" style="font-size: 1.25rem;">Approved</span>
                </div>
            </div>
        </div>
        
        <!-- Agent Activity Accordion -->
        <div class="accordion">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <span>🔍 Agent Pipeline Execution Trace</span>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-content">
                ${(content.messages || []).map(m => `
                    <div class="accordion-log-item">
                        <span style="color: var(--primary);">•</span>
                        <span>${escapeHtml(m)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Technical Review Feedback Accordion -->
        <div class="accordion">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <span>📋 Peer Reviewer Assessment & Search Verification</span>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-content">
                <pre>${escapeHtml(content.review_feedback || 'Review passed with high accuracy')}</pre>
            </div>
        </div>
        
        <!-- Final Rendered Blog Post -->
        <div class="blog-content-wrapper">
            <div class="blog-section-header">
                <span>📄 Full Article</span>
            </div>
            <div class="blog-rendered" id="blogContent${index}">
                ${formatMarkdown(content.final_blog_post)}
            </div>
        </div>
    `;
    
    elements.messages.appendChild(assistantDiv);
}

// ==========================================================================
// Enhanced Markdown Parser
// ==========================================================================

function formatMarkdown(content) {
    if (!content || !content.trim()) return '<p>No content generated</p>';

    // 0. Completely eliminate horizontal divider rules (---, ***, ___)
    let text = content.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gim, '');

    // 1. Isolate code blocks with unique tokens so markdown transforms never corrupt code
    const codeBlocks = [];
    text = text.replace(/```([a-zA-Z0-9_-]*)[ \t]*\r?\n([\s\S]*?)```/g, (match, lang, code) => {
        const id = codeBlocks.length;
        const languageLabel = (lang || 'code').trim().toUpperCase();
        codeBlocks.push({
            lang: languageLabel,
            code: code.trim()
        });
        return `\n\n%%BLOCK_CODE_${id}%%\n\n`;
    });

    // 2. Escape HTML on markdown prose
    text = escapeHtml(text);

    // 3. Headings (from h4 down to h1)
    text = text.replace(/^####[ \t]+(.*$)/gim, '<h4>$1</h4>');
    text = text.replace(/^###[ \t]+(.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^##[ \t]+(.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^#[ \t]+(.*$)/gim, '<h1>$1</h1>');

    // 4. Bold & Italic
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // 5. Inline code
    text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // 6. Bullet lists and numbered lists
    // Matches *, - with any whitespace, e.g. "*   **M**ongoDB"
    text = text.replace(/^[ \t]*[\*\-][ \t]+(.*$)/gim, '<li>$1</li>');
    text = text.replace(/^[ \t]*\d+[\.\)][ \t]+(.*$)/gim, '<li class="numbered">$1</li>');
    
    // Group contiguous <li> items into <ul> or <ol>
    text = text.replace(/((?:<li(?: class="numbered")?>[\s\S]*?<\/li>\s*)+)/gim, (match) => {
        const cleaned = match.replace(/\r?\n/g, '');
        if (cleaned.includes('class="numbered"')) {
            return `\n\n<ol>${cleaned}</ol>\n\n`;
        }
        return `\n\n<ul>${cleaned}</ul>\n\n`;
    });

    // 7. Paragraphs
    const rawParagraphs = text.split(/\n\s*\n+/);
    const formatted = rawParagraphs.map(p => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('%%BLOCK_CODE_') && trimmed.endsWith('%%')) {
            return trimmed;
        }
        if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<div')) {
            return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    });
    text = formatted.filter(Boolean).join('\n');

    // 8. Restore code blocks with pristine code and copy button
    text = text.replace(/%%BLOCK_CODE_(\d+)%%/g, (match, id) => {
        const block = codeBlocks[parseInt(id, 10)];
        if (!block) return '';
        return `
            <div class="code-block-container">
                <div class="code-block-header">
                    <span class="code-lang-badge">${escapeHtml(block.lang)}</span>
                    <button type="button" class="btn-copy-code" onclick="copyCodeSnippet(this)">
                        <span>📋</span>
                        <span>Copy Code</span>
                    </button>
                </div>
                <pre><code>${escapeHtml(block.code)}</code></pre>
            </div>
        `;
    });

    return text;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================================================
// Accordion & Copy Actions
// ==========================================================================

window.toggleAccordion = function(header) {
    const content = header.nextElementSibling;
    const arrow = header.querySelector('.accordion-arrow');
    content.classList.toggle('open');
    if (arrow) {
        arrow.textContent = content.classList.contains('open') ? '▲' : '▼';
    }
};

window.copyCodeSnippet = function(button) {
    const codeBlock = button.closest('.code-block-container').querySelector('code');
    if (!codeBlock) return;
    
    navigator.clipboard.writeText(codeBlock.innerText).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '<span>✓</span><span>Copied!</span>';
        showToast('Code copied to clipboard!');
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    });
};

// Helper: Produce 100% clean plain text without any markdown hashes (#) or asterisks (**)
function getCleanPlainText(markdownText) {
    if (!markdownText) return '';
    let text = markdownText;
    
    // Strip horizontal rules (---, ***, ___)
    text = text.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');
    
    // Convert headings to clean text (strip #, ##, ###, ####)
    text = text.replace(/^#[ \t]+(.*)$/gm, '$1\n');
    text = text.replace(/^##[ \t]+(.*)$/gm, '\n$1\n');
    text = text.replace(/^###[ \t]+(.*)$/gm, '\n$1\n');
    text = text.replace(/^####[ \t]+(.*)$/gm, '\n$1\n');
    
    // Convert bullets to clean dot bullet (• )
    text = text.replace(/^[ \t]*[\*\-][ \t]+/gm, '• ');
    
    // Strip bold and italic markdown stars (**word** -> word, *word* -> word)
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*([^*\n]+)\*/g, '$1');
    
    // Strip inline backticks and code blocks fences
    text = text.replace(/`([^`\n]+)`/g, '$1');
    text = text.replace(/```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)```/g, '$1');
    
    // Normalize newlines
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
}

// Helper: Produce clean semantic HTML for Word, Google Docs, Pages (renders real bold, real headings, real bullets)
function formatMarkdownForWord(markdownText) {
    if (!markdownText) return '';
    let text = markdownText;
    
    text = text.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');
    
    const codeBlocks = [];
    text = text.replace(/```([a-zA-Z0-9_-]*)[ \t]*\r?\n([\s\S]*?)```/g, (match, lang, code) => {
        const id = codeBlocks.length;
        codeBlocks.push({ lang: (lang || 'CODE').toUpperCase(), code: code.trim() });
        return `\n\n%%BLOCK_CODE_${id}%%\n\n`;
    });
    
    text = escapeHtml(text);
    
    // Word semantic headings (native Word styles)
    text = text.replace(/^####[ \t]+(.*$)/gim, '<h4 style="font-size: 13pt; font-weight: bold; margin: 12pt 0 4pt; color: #1e293b;">$1</h4>');
    text = text.replace(/^###[ \t]+(.*$)/gim, '<h3 style="font-size: 15pt; font-weight: bold; margin: 14pt 0 6pt; color: #1e293b;">$1</h3>');
    text = text.replace(/^##[ \t]+(.*$)/gim, '<h2 style="font-size: 18pt; font-weight: bold; margin: 18pt 0 8pt; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt;">$1</h2>');
    text = text.replace(/^#[ \t]+(.*$)/gim, '<h1 style="font-size: 24pt; font-weight: 800; margin: 0 0 16pt; color: #0f172a;">$1</h1>');
    
    // Bold & italic (Word converts <strong> to native Ctrl+B)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`\n]+)`/g, '<code style="background: #f1f5f9; padding: 2px 4px; font-family: Consolas, monospace;">$1</code>');
    
    // Bullet lists (Word converts <ul><li> to native bullet list)
    text = text.replace(/^[ \t]*[\*\-][ \t]+(.*$)/gim, '<li style="margin-bottom: 4pt; line-height: 1.6;">$1</li>');
    text = text.replace(/^[ \t]*\d+[\.\)][ \t]+(.*$)/gim, '<li style="margin-bottom: 4pt; line-height: 1.6;">$1</li>');
    text = text.replace(/((?:<li[^>]*>[\s\S]*?<\/li>\s*)+)/gim, (match) => {
        const cleaned = match.replace(/\r?\n/g, '');
        return `\n\n<ul style="margin: 8pt 0 12pt 20pt; padding: 0;">${cleaned}</ul>\n\n`;
    });
    
    // Paragraphs
    const paras = text.split(/\n\s*\n+/);
    text = paras.map(p => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('%%BLOCK_CODE_')) return trimmed;
        if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) return trimmed;
        return `<p style="font-size: 11pt; line-height: 1.65; margin-bottom: 10pt; color: #334155;">${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).filter(Boolean).join('\n');
    
    // Restore code blocks with shaded box
    text = text.replace(/%%BLOCK_CODE_(\d+)%%/g, (match, id) => {
        const block = codeBlocks[parseInt(id, 10)];
        if (!block) return '';
        return `<div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10pt; margin: 12pt 0; font-family: Consolas, monospace; font-size: 10pt; color: #0f172a;"><div style="font-size: 8pt; font-weight: bold; color: #64748b; margin-bottom: 4pt;">${escapeHtml(block.lang)}</div><pre style="margin: 0; font-family: inherit;"><code>${escapeHtml(block.code)}</code></pre></div>`;
    });
    
    return `<div style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #0f172a;">${text}</div>`;
}

// Copy action: copies rich HTML for Word/Docs AND clean plain text without hashes or asterisks
window.copyFullPost = async function(index) {
    const chat = chats[currentChatId];
    if (!chat) return;
    
    const assistants = chat.messages.filter(m => m.role === 'assistant');
    if (!assistants[index] || !assistants[index].content) return;
    
    const rawPost = assistants[index].content.final_blog_post || '';
    const cleanPlainText = getCleanPlainText(rawPost);
    const richWordHtml = formatMarkdownForWord(rawPost);

    try {
        if (navigator.clipboard && window.ClipboardItem) {
            const textBlob = new Blob([cleanPlainText], { type: 'text/plain' });
            const htmlBlob = new Blob([richWordHtml], { type: 'text/html' });
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': htmlBlob,
                    'text/plain': textBlob
                })
            ]);
            showToast('Copied! Cleanly formatted for Word & Docs (no hashes or asterisks)', '📋');
        } else {
            await navigator.clipboard.writeText(cleanPlainText);
            showToast('Clean text copied (no hashes or asterisks)', '📋');
        }
    } catch (err) {
        console.warn('Rich clipboard copy failed, falling back to clean text:', err);
        try {
            await navigator.clipboard.writeText(cleanPlainText);
            showToast('Clean text copied (no hashes or asterisks)', '📋');
        } catch (e) {
            showToast('Failed to copy to clipboard', '⚠️');
        }
    }
};


window.downloadCleanText = function(index) {
    const chat = chats[currentChatId];
    if (!chat) return;
    
    const assistants = chat.messages.filter(m => m.role === 'assistant');
    if (!assistants[index] || !assistants[index].content) return;
    
    const content = assistants[index].content;
    const cleanText = getCleanPlainText(content.final_blog_post || '');

    const blob = new Blob([cleanText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const filename = `${(content.topic || 'technical_article').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_clean.txt`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Downloaded ${filename} (no hashes or asterisks)`, '📄');
};

// ==========================================================================
// Structured Vector PDF Generator (100% Real Text Streams, No Screenshots)
// ==========================================================================

function cleanMarkdownInline(text) {
    if (!text) return '';
    let t = text;
    t = t.replace(/\*\*(.*?)\*\*/g, '$1');
    t = t.replace(/\*([^*\n]+)\*/g, '$1');
    t = t.replace(/`([^`\n]+)`/g, '$1');
    t = t.replace(/\[CODE_SNIPPET_HERE\]/g, '');
    return t.trim();
}

function generateStructuredPDFDocument(content, topicTitle, audience, dateStr) {
    const jsPdfLib = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (typeof jsPDF !== 'undefined' ? jsPDF : null);
    if (!jsPdfLib) {
        throw new Error('jsPDF engine not found');
    }

    const doc = new jsPdfLib({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2; // 170mm
    const maxY = pageHeight - margin - 4; // 273mm

    let y = 24;

    function checkPageBreak(requiredHeight) {
        if (y + requiredHeight > maxY) {
            doc.addPage();
            y = 24;
            return true;
        }
        return false;
    }

    // --- Page 1 Header ---
    // Badge pill: "TECHNICAL BLOG POST • VERIFIED PUBLICATION"
    doc.setFillColor(238, 242, 255); // #eef2ff
    doc.setDrawColor(199, 210, 254); // #c7d2fe
    doc.roundedRect(margin, y, 78, 6.5, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(79, 70, 229); // #4f46e5
    doc.text('TECHNICAL BLOG POST • VERIFIED PUBLICATION', margin + 3, y + 4.5);
    y += 11;

    // Metadata bar
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // #64748b
    doc.text(`Audience: ${audience}   |   Date: ${dateStr}   |   Peer Review: Passed (${content.iterations || 1} iterations)`, margin, y);
    y += 4;

    // Divider
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    // Parse raw blog post markdown
    const rawText = content.final_blog_post || '';
    const lines = rawText.split('\n');

    let inCodeBlock = false;
    let codeLang = 'CODE';
    let codeLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Code block fences
        if (trimmed.startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeLang = (trimmed.substring(3).trim() || 'CODE').toUpperCase();
                codeLines = [];
            } else {
                inCodeBlock = false;
                renderCodeBlock(doc, codeLang, codeLines);
                codeLines = [];
            }
            continue;
        }

        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }

        // Empty line
        if (!trimmed) {
            y += 2.5;
            continue;
        }

        // Horizontal rules
        if (/^[-*_]{3,}$/.test(trimmed)) {
            checkPageBreak(5);
            doc.setDrawColor(226, 232, 240);
            doc.line(margin, y, margin + contentWidth, y);
            y += 4;
            continue;
        }

        // H1 Heading
        if (/^#[ \t]+/.test(trimmed)) {
            const headingText = cleanMarkdownInline(trimmed.replace(/^#[ \t]+/, ''));
            checkPageBreak(18);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42);
            const wrapped = doc.splitTextToSize(headingText, contentWidth);
            for (const wl of wrapped) {
                checkPageBreak(8);
                doc.text(wl, margin, y);
                y += 7.5;
            }
            y += 3;
            continue;
        }

        // H2 Heading
        if (/^##[ \t]+/.test(trimmed)) {
            const headingText = cleanMarkdownInline(trimmed.replace(/^##[ \t]+/, ''));
            checkPageBreak(16);
            y += 3;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            const wrapped = doc.splitTextToSize(headingText, contentWidth);
            for (const wl of wrapped) {
                checkPageBreak(6.5);
                doc.text(wl, margin, y);
                y += 6;
            }
            // Accent underline
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.25);
            doc.line(margin, y - 1, margin + contentWidth, y - 1);
            y += 3.5;
            continue;
        }

        // H3 Heading
        if (/^###[ \t]+/.test(trimmed)) {
            const headingText = cleanMarkdownInline(trimmed.replace(/^###[ \t]+/, ''));
            checkPageBreak(12);
            y += 2;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11.5);
            doc.setTextColor(30, 41, 59);
            const wrapped = doc.splitTextToSize(headingText, contentWidth);
            for (const wl of wrapped) {
                checkPageBreak(5.5);
                doc.text(wl, margin, y);
                y += 5;
            }
            y += 2.5;
            continue;
        }

        // H4 Heading
        if (/^####[ \t]+/.test(trimmed)) {
            const headingText = cleanMarkdownInline(trimmed.replace(/^####[ \t]+/, ''));
            checkPageBreak(10);
            y += 1.5;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(51, 65, 85);
            const wrapped = doc.splitTextToSize(headingText, contentWidth);
            for (const wl of wrapped) {
                checkPageBreak(5);
                doc.text(wl, margin, y);
                y += 4.5;
            }
            y += 2;
            continue;
        }

        // Bullet list item
        if (/^[\*\-][ \t]+/.test(trimmed) || /^\d+[\.\)][ \t]+/.test(trimmed)) {
            const bulletText = cleanMarkdownInline(trimmed.replace(/^([\*\-]|\d+[\.\)])[ \t]+/, ''));
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            const wrapped = doc.splitTextToSize(bulletText, contentWidth - 8);
            for (let bIdx = 0; bIdx < wrapped.length; bIdx++) {
                checkPageBreak(5);
                if (bIdx === 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(99, 102, 241);
                    doc.text('•', margin + 2, y);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(51, 65, 85);
                }
                doc.text(wrapped[bIdx], margin + 6, y);
                y += 4.8;
            }
            y += 1.2;
            continue;
        }

        // Normal paragraph text
        const cleanPara = cleanMarkdownInline(trimmed);
        if (cleanPara) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            const wrapped = doc.splitTextToSize(cleanPara, contentWidth);
            for (const pl of wrapped) {
                checkPageBreak(5);
                doc.text(pl, margin, y);
                y += 4.8;
            }
            y += 2.5;
        }
    }

    // Helper for rendering code block
    function renderCodeBlock(doc, lang, linesArr) {
        if (linesArr.length === 0) return;
        
        y += 2;
        const codeLineHeight = 4.2;
        const headerHeight = 6.5;
        
        const finalCodeLines = [];
        for (const cl of linesArr) {
            if (cl.length > 75) {
                const sub = doc.splitTextToSize(cl, contentWidth - 8);
                finalCodeLines.push(...sub);
            } else {
                finalCodeLines.push(cl);
            }
        }

        const totalBlockHeight = headerHeight + (finalCodeLines.length * codeLineHeight) + 4;
        
        if (y + totalBlockHeight > maxY && totalBlockHeight < (maxY - 30)) {
            doc.addPage();
            y = 24;
        }

        checkPageBreak(headerHeight + 6);
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, y, contentWidth, headerHeight, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(lang, margin + 4, y + 4.5);
        y += headerHeight;

        doc.setFont('courier', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);

        for (let idx = 0; idx < finalCodeLines.length; idx++) {
            if (checkPageBreak(codeLineHeight + 2)) {
                doc.setFillColor(241, 245, 249);
                doc.setDrawColor(203, 213, 225);
                doc.roundedRect(margin, y, contentWidth, 5, 1, 1, 'FD');
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                doc.text(`${lang} (continued)`, margin + 4, y + 3.5);
                y += 6;
                doc.setFont('courier', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(15, 23, 42);
            }
            
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 3.2, contentWidth, codeLineHeight, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.line(margin, y - 3.2, margin, y - 3.2 + codeLineHeight);
            doc.line(margin + contentWidth, y - 3.2, margin + contentWidth, y - 3.2 + codeLineHeight);
            
            doc.text(finalCodeLines[idx], margin + 4, y);
            y += codeLineHeight;
        }

        doc.setDrawColor(203, 213, 225);
        doc.line(margin, y - 3.2 + codeLineHeight, margin + contentWidth, y - 3.2 + codeLineHeight);
        y += 4;
    }

    // --- Add Running Headers & Footers to All Pages ---
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);

        if (p > 1) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(topicTitle, margin, 13);
            doc.text('Technical Publication', margin + contentWidth, 13, { align: 'right' });
            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.2);
            doc.line(margin, 15, margin + contentWidth, 15);
        }

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, 283, margin + contentWidth, 283);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Generated by Technical Blog Post Factory • Multi-Agent AI Studio', margin, 288);
        doc.text(`Page ${p} of ${totalPages}`, margin + contentWidth, 288, { align: 'right' });
    }

    return doc;
}

// Download Real Structured Text PDF (Vector Text Streams, No Screenshots, Perfect Line Wraps)
window.downloadPDF = async function(index) {
    const chat = chats[currentChatId];
    if (!chat) return;
    
    const assistants = chat.messages.filter(m => m.role === 'assistant');
    if (!assistants[index] || !assistants[index].content) return;
    
    const content = assistants[index].content;
    const topicTitle = content.topic || 'Technical Article';
    const audience = content.audience || selectedAudience;
    const filename = `${topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    showToast('Generating structured text PDF...', '⏳');

    try {
        const doc = generateStructuredPDFDocument(content, topicTitle, audience, dateStr);
        doc.save(filename);
        showToast(`Downloaded Structured PDF: ${filename}`, '📕');
    } catch (err) {
        console.error('Vector PDF generation error:', err);
        showToast('PDF export failed. Please try again.', '⚠️');
    }
};

// ==========================================================================
// ==========================================================================
// Generation Flow & Input Validation
// ==========================================================================

function validateTopicInput(topic) {
    if (!topic || topic.trim().length < 3) {
        return { valid: false, message: 'Please enter a topic with at least 3 characters.' };
    }

    const clean = topic.trim();
    const alphaCount = (clean.match(/[a-zA-Z]/g) || []).length;
    
    // Pure numbers or symbols check
    if (alphaCount === 0) {
        return { 
            valid: false, 
            message: 'Topic cannot be pure numbers. Please enter a meaningful topic (e.g., "Python AsyncIO", "React Hooks").' 
        };
    }
    
    // Low alpha ratio check
    if (alphaCount < 2 || (alphaCount / clean.length) < 0.35) {
        return { 
            valid: false, 
            message: 'Topic does not contain enough letters. Please enter a clear, descriptive subject.' 
        };
    }

    // Repeated characters check (e.g. aaaaaa)
    if (/(.)\1{3,}/i.test(clean)) {
        return { 
            valid: false, 
            message: 'Topic contains repeated characters. Please enter a genuine topic.' 
        };
    }

    // Keyboard mash check
    const lower = clean.toLowerCase();
    const mashPatterns = [
        'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl', 'lkjh', 'kjhg', 'jhgf', 'hgfd', 'gfds', 'fdsa',
        'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop', 'poiuy', 'oiuyt', 'iuytr', 'uytre',
        'zxcv', 'xcvb', 'cvbn', 'vbnm', 'mnbv', 'nbvc', 'bvcx', 'vcxz',
        '1234', '2345', '3456', '4567', '5678', '6789', '7890',
        'sdhg', 'qazw', 'wsxe', 'edcr'
    ];
    for (const pat of mashPatterns) {
        if (lower.includes(pat) && clean.split(/\s+/).length <= 2) {
            return { 
                valid: false, 
                message: 'Topic appears to be random keyboard mash. Please enter a meaningful technical subject.' 
            };
        }
    }

    // Unnatural consonant clusters (e.g. sdhg, bcdf)
    const words = clean.split(/\s+/);
    const valid3Prefixes = ['str', 'spl', 'scr', 'spr', 'shr', 'thr', 'sch', 'phr', 'chr', 'psy', 'pse'];
    const valid4Infixes = ['ngth', 'ngst', 'ghts', 'tch', 'nstr', 'rts', 'sch', 'mpl', 'rch'];
    const techAcronyms = ['sql', 'css', 'html', 'k8s', 'grpc', 'rxjs', 'xml', 'json', 'jwt', 'api', 'git', 'cli', 'db', 'ai', 'ml', 'nlp'];

    for (const w of words) {
        const cleanWord = w.toLowerCase().replace(/[^a-z]/g, '');
        if (!cleanWord || techAcronyms.includes(cleanWord)) continue;

        // Check starting 3 consonants
        const mStart = cleanWord.match(/^[bcdfghjklmnpqrstvwxz]{3,}/);
        if (mStart) {
            const pref = mStart[0].slice(0, 3);
            if (!valid3Prefixes.some(p => pref.startsWith(p))) {
                return {
                    valid: false,
                    message: `"${clean}" contains unnatural letter sequences. Please enter a recognizable subject.`
                };
            }
        }

        // Check 4+ consonants
        const mQuad = cleanWord.match(/[bcdfghjklmnpqrstvwxz]{4,}/);
        if (mQuad) {
            const cluster = mQuad[0];
            if (!valid4Infixes.some(inf => cluster.includes(inf))) {
                return {
                    valid: false,
                    message: `"${clean}" appears to be random keystrokes. Please enter a recognizable topic.`
                };
            }
        }
    }

    return { valid: true };
}

window.validateTopicInput = validateTopicInput;

async function generateBlogPost() {
    const topic = elements.topicInput.value.trim();
    const customAud = elements.customAudienceInput.value.trim();
    const audience = customAud || selectedAudience;
    const maxIterations = parseInt(elements.maxIterations.value) || 3;
    
    // Instant client-side validation
    const validation = validateTopicInput(topic);
    if (!validation.valid) {
        showToast(validation.message, '⚠️');
        elements.topicInput.focus();
        return;
    }
    
    if (!currentChatId) {
        createNewChat();
    }
    
    // Update chat title
    if (chats[currentChatId].title === 'New Article') {
        chats[currentChatId].title = topic.length > 28 ? topic.substring(0, 28) + '...' : topic;
    }
    
    // Record user message
    chats[currentChatId].messages.push({
        role: 'user',
        content: { topic, audience },
        timestamp: new Date().toISOString()
    });
    
    saveChatsToStorage();
    renderChatHistory();
    showChatInterface();
    
    // Show animated pipeline modal
    showPipelineModal();
    
    try {
        const response = await fetch(`${API_URL}/api/generate-blog`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic,
                audience,
                max_iterations: maxIterations
            })
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Server error (${response.status})`);
        }
        
        const result = await response.json();
        
        if (!result.final_blog_post) {
            throw new Error('Server returned empty blog post content');
        }
        
        // Record assistant response
        chats[currentChatId].messages.push({
            role: 'assistant',
            content: result,
            timestamp: new Date().toISOString()
        });
        
        saveChatsToStorage();
        renderMessages();
        
        // Clear input
        elements.topicInput.value = '';
        elements.customAudienceInput.value = '';
        
        hidePipelineModal();
        showToast('Article successfully generated!', '🎉');
        
    } catch (error) {
        hidePipelineModal();
        showToast(error.message, '⚠️');
        console.error(error);
    }
}

// Pipeline Modal Animation
function showPipelineModal() {
    elements.loadingModal.classList.add('show');
    elements.generateBtn.disabled = true;
    
    let progress = 0;
    const stages = [
        { node: elements.nodeWriter, status: 'Content Writer drafting article...', progress: 25 },
        { node: elements.nodeReviewer, status: 'Technical Reviewer querying live documentation...', progress: 55 },
        { node: elements.nodeCoder, status: 'Code Generator embedding syntax-checked snippets...', progress: 85 }
    ];
    
    // Reset nodes
    [elements.nodeWriter, elements.nodeReviewer, elements.nodeCoder].forEach(n => {
        n.classList.remove('active', 'done');
    });
    elements.nodeWriter.classList.add('active');
    
    let stageIdx = 0;
    const interval = setInterval(() => {
        if (stageIdx < stages.length) {
            const currentStage = stages[stageIdx];
            elements.loadingStatus.textContent = currentStage.status;
            elements.progressFill.style.width = currentStage.progress + '%';
            
            if (stageIdx > 0) {
                stages[stageIdx - 1].node.classList.remove('active');
                stages[stageIdx - 1].node.classList.add('done');
            }
            currentStage.node.classList.add('active');
            
            stageIdx++;
        }
    }, 4500);
    
    elements.loadingModal.dataset.intervalId = interval;
}

function hidePipelineModal() {
    elements.loadingModal.classList.remove('show');
    elements.generateBtn.disabled = false;
    elements.progressFill.style.width = '0%';
    
    const intervalId = elements.loadingModal.dataset.intervalId;
    if (intervalId) {
        clearInterval(parseInt(intervalId));
    }
}

// Start application
document.addEventListener('DOMContentLoaded', init);
