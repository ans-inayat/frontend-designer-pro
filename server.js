// Enhanced server.js with Google Gemini and Netlify deployment
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const archiver = require('archiver');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// AI Service Configurations
const AI_CONFIGS = {
    claude: {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
            'Authorization': `Bearer ${process.env.CLAUDE_API_KEY}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        }
    },
    mistral: {
        url: 'https://api.mistral.ai/v1/chat/completions',
        headers: {
            'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
            'Content-Type': 'application/json'
        }
    },
gemini: {
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    headers: {
        'Content-Type': 'application/json'
    }
}
};

// System prompt for AI models
function generateSystemPrompt() {
    return `You are an expert frontend developer who creates modern, responsive web interfaces. 
    Generate complete HTML code with the following requirements:
    - Use Tailwind CSS (include CDN)
    - Create responsive designs that work on mobile, tablet, and desktop
    - Use semantic HTML5 elements
    - Add interactive elements with vanilla JavaScript when needed
    - Use modern design patterns and attractive color schemes
    - Ensure accessibility with proper ARIA labels and semantic structure
    - Generate complete, production-ready HTML that can be deployed immediately
    - Include meta tags for SEO and social sharing
    - Add smooth animations and transitions
    - Use modern CSS Grid and Flexbox for layouts
    - Return only clean HTML code without explanations or markdown formatting`;
}

// Enhanced AI API Calls

async function callClaudeAI(prompt, imageData = null) {
    try {
        const messages = [{
            role: 'user',
            content: []
        }];

        if (imageData) {
            const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
            messages[0].content.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Data
                }
            });
            messages[0].content.push({
                type: 'text',
                text: `Create a web interface based on this image and description: ${prompt}`
            });
        } else {
            messages[0].content.push({
                type: 'text',
                text: prompt
            });
        }

        const response = await axios.post(AI_CONFIGS.claude.url, {
            model: 'claude-3-sonnet-20240229',
            max_tokens: 4000,
            system: generateSystemPrompt(),
            messages: messages
        }, {
            headers: AI_CONFIGS.claude.headers,
            timeout: 30000
        });

        return response.data.content[0].text;
    } catch (error) {
        console.error('Claude AI Error:', error.response?.data || error.message);
        throw new Error('Failed to generate code with Claude AI');
    }
}

async function callMistralAI(prompt, imageData = null) {
    try {
        const messages = [{
            role: 'system',
            content: generateSystemPrompt()
        }, {
            role: 'user',
            content: imageData 
                ? `Create a web interface based on the provided image and this description: ${prompt}`
                : prompt
        }];

        const response = await axios.post(AI_CONFIGS.mistral.url, {
            model: 'mistral-large-latest',
            messages: messages,
            max_tokens: 4000,
            temperature: 0.7
        }, {
            headers: AI_CONFIGS.mistral.headers,
            timeout: 30000
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Mistral AI Error:', error.response?.data || error.message);
        throw new Error('Failed to generate code with Mistral AI');
    }
}

// NEW: Google Gemini AI Integration
async function callGeminiAI(prompt, imageData = null) {
    try {
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: `${generateSystemPrompt()}\n\nUser Request: ${prompt}`
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        // Add image if provided
        if (imageData) {
            const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
            const mimeType = imageData.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'jpeg';
            
            requestBody.contents[0].parts.push({
                inline_data: {
                    mime_type: `image/${mimeType}`,
                    data: base64Data
                }
            });
            
            requestBody.contents[0].parts[0].text = `${generateSystemPrompt()}\n\nCreate a web interface based on the provided image and this description: ${prompt}`;
        }

        const response = await axios.post(AI_CONFIGS.gemini.url, requestBody, {
            headers: AI_CONFIGS.gemini.headers,
            timeout: 30000
        });

        if (response.data.candidates && response.data.candidates.length > 0) {
            const candidate = response.data.candidates[0];
            if (candidate.content && candidate.content.parts) {
                return candidate.content.parts.map(part => part.text).join('\n');
            }
        }

        throw new Error('No valid response from Gemini API');
    } catch (error) {
        console.error('Gemini AI Error:', error.response?.data || error.message);
        throw new Error('Failed to generate code with Google Gemini: ' + (error.response?.data?.error?.message || error.message));
    }
}

// Enhanced prompt generation for Mistral AI with better error handling
async function enhancePromptWithMistral(originalPrompt, includeImage = false, retryCount = 0) {
    const maxRetries = 2;
    
    try {
        const enhancementInstruction = `You are an expert UI/UX designer and frontend developer. Enhance this prompt for better code generation:

Original: "${originalPrompt}"

Add specific details for:
- Design elements (colors, layout, typography)
- Interactive features and animations  
- Responsive design requirements
- Accessibility features
- Modern UI patterns

${includeImage ? 'Note: User provided an image reference.' : ''}

Return an enhanced, detailed prompt:`;

        const response = await axios.post(AI_CONFIGS.mistral.url, {
            model: 'mistral-large-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are a UI/UX expert. Create detailed prompts for better frontend code generation. Be concise but comprehensive.'
                },
                {
                    role: 'user',
                    content: enhancementInstruction
                }
            ],
            max_tokens: 800,
            temperature: 0.6
        }, {
            headers: AI_CONFIGS.mistral.headers,
            timeout: 45000 // Increased timeout to 45 seconds
        });

        const enhancedPrompt = response.data.choices[0].message.content.trim();
        
        // Clean up the response
        const cleanedPrompt = enhancedPrompt
            .replace(/^(Enhanced prompt:|Here's the enhanced prompt:|Here is an enhanced version:)\s*/i, '')
            .replace(/^Enhanced:\s*/i, '')
            .trim();

        // Validate response length
        if (cleanedPrompt.length < 50) {
            throw new Error('Enhanced prompt too short');
        }

        return cleanedPrompt;
        
    } catch (error) {
        console.error(`Mistral enhancement attempt ${retryCount + 1} failed:`, error.message);
        
        // Retry logic for timeouts and network errors
        if (retryCount < maxRetries && (
            error.code === 'ECONNABORTED' || 
            error.message.includes('timeout') ||
            error.response?.status >= 500
        )) {
            console.log(`Retrying prompt enhancement... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            return enhancePromptWithMistral(originalPrompt, includeImage, retryCount + 1);
        }
        
        // Return a manual enhancement if all retries fail
        if (retryCount >= maxRetries) {
            console.log('All retries failed, using fallback enhancement');
            return generateFallbackEnhancement(originalPrompt, includeImage);
        }
        
        throw new Error('Failed to enhance prompt with Mistral AI: ' + error.message);
    }
}

// Fallback enhancement when Mistral AI fails
function generateFallbackEnhancement(originalPrompt, includeImage = false) {
    const lowerPrompt = originalPrompt.toLowerCase();
    
    let enhancement = `Create a modern, responsive web interface for: ${originalPrompt}. `;
    
    // Add specific enhancements based on keywords
    if (lowerPrompt.includes('landing') || lowerPrompt.includes('homepage')) {
        enhancement += `Include a hero section with gradient background, navigation bar with smooth scrolling, feature cards grid with icons, testimonials section, call-to-action buttons with hover effects, and footer. Use modern typography (Inter font), proper spacing with consistent padding, responsive design for mobile/tablet/desktop, and smooth animations on scroll.`;
    } else if (lowerPrompt.includes('dashboard') || lowerPrompt.includes('admin')) {
        enhancement += `Include sidebar navigation with collapsible menu, main content area with stats cards, data visualization charts, tables with sorting/filtering, user profile dropdown, notification system, and responsive layout. Use professional color scheme with blues and grays, clean typography, proper spacing, and micro-interactions.`;
    } else if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('product') || lowerPrompt.includes('shop')) {
        enhancement += `Include product image gallery with zoom functionality, detailed product information section, customer reviews with ratings, add to cart button with quantity selector, related products grid, breadcrumb navigation, and responsive design. Use attractive product photography placeholders, modern card layouts, trust indicators, and smooth checkout flow.`;
    } else if (lowerPrompt.includes('form') || lowerPrompt.includes('contact')) {
        enhancement += `Include form fields with proper validation, clear labels, error messages, success states, submit button with loading state, and responsive layout. Use modern form styling with focus states, proper accessibility with ARIA labels, and user-friendly validation feedback.`;
    } else if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('profile')) {
        enhancement += `Include hero section with profile photo, about section with bio, projects/work gallery with filtering, skills showcase with progress bars, contact information, and social media links. Use creative layouts, modern typography, smooth animations, and portfolio-specific UI patterns.`;
    } else {
        enhancement += `Use modern design principles with clean typography, consistent spacing (8px grid system), attractive color palette, responsive layout for all devices, smooth animations and transitions, proper accessibility features with ARIA labels, semantic HTML structure, and interactive elements with hover states.`;
    }
    
    if (includeImage) {
        enhancement += ` Design should complement the provided image reference for visual consistency.`;
    }
    
    enhancement += ` Ensure production-ready code with proper semantic HTML5, modern CSS techniques, and vanilla JavaScript for interactions.`;
    
    return enhancement;
}
function generateFallbackCode(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('landing') || lowerPrompt.includes('homepage')) {
        return generateEnhancedLandingPage(prompt);
    } else if (lowerPrompt.includes('form') || lowerPrompt.includes('contact')) {
        return generateEnhancedContactForm(prompt);
    } else if (lowerPrompt.includes('card') || lowerPrompt.includes('profile')) {
        return generateEnhancedProfileCard(prompt);
    } else if (lowerPrompt.includes('dashboard') || lowerPrompt.includes('admin')) {
        return generateEnhancedDashboard(prompt);
    } else if (lowerPrompt.includes('button')) {
        return generateEnhancedButtons(prompt);
    } else if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('resume')) {
        return generatePortfolio(prompt);
    } else if (lowerPrompt.includes('blog') || lowerPrompt.includes('article')) {
        return generateBlogPage(prompt);
    } else if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shop')) {
        return generateEcommercePage(prompt);
    } else {
        return generateEnhancedLandingPage(prompt);
    }
}

function generateEnhancedLandingPage(prompt) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Landing Page</title>
    <meta name="description" content="Generated from: ${prompt}">
    <meta property="og:title" content="Modern Landing Page">
    <meta property="og:description" content="AI-generated landing page">
    <meta property="og:type" content="website">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .glass-effect { backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.1); }
        .hover-scale { transition: transform 0.3s ease; }
        .hover-scale:hover { transform: scale(1.05); }
        .fade-in { animation: fadeIn 1s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="bg-white overflow-x-hidden">
    <!-- Navigation -->
    <nav class="fixed w-full bg-white/90 backdrop-blur-md shadow-lg z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-4">
                <div class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    BrandName
                </div>
                <div class="hidden md:flex space-x-8">
                    <a href="#home" class="text-gray-600 hover:text-blue-600 transition-colors">Home</a>
                    <a href="#features" class="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
                    <a href="#about" class="text-gray-600 hover:text-blue-600 transition-colors">About</a>
                    <a href="#contact" class="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
                </div>
                <button class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all hover-scale">
                    Get Started
                </button>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section id="home" class="gradient-bg text-white min-h-screen flex items-center">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div class="text-center fade-in">
                <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                    Welcome to the
                    <span class="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-400">
                        Future
                    </span>
                </h1>
                <p class="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                    ${prompt}
                </p>
                <div class="space-x-4">
                    <button class="glass-effect text-white px-8 py-4 rounded-full font-semibold hover:bg-white/20 transition-all hover-scale">
                        Start Free Trial
                    </button>
                    <button class="border border-white/30 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-all hover-scale">
                        Watch Demo
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-24 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Powerful Features</h2>
                <p class="text-xl text-gray-600 max-w-2xl mx-auto">Everything you need to succeed in the modern world</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover-scale">
                    <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span class="text-3xl text-white">⚡</span>
                    </div>
                    <h3 class="text-2xl font-bold mb-4 text-center">Lightning Fast</h3>
                    <p class="text-gray-600 text-center">Experience blazing-fast performance with 99.9% uptime guarantee</p>
                </div>
                <div class="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover-scale">
                    <div class="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span class="text-3xl text-white">🔒</span>
                    </div>
                    <h3 class="text-2xl font-bold mb-4 text-center">Ultra Secure</h3>
                    <p class="text-gray-600 text-center">Bank-level security with end-to-end encryption for your data</p>
                </div>
                <div class="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover-scale">
                    <div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span class="text-3xl text-white">❤️</span>
                    </div>
                    <h3 class="text-2xl font-bold mb-4 text-center">User Friendly</h3>
                    <p class="text-gray-600 text-center">Intuitive design that anyone can master in minutes</p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div class="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Get Started?</h2>
            <p class="text-xl text-blue-100 mb-8">Join thousands of satisfied customers today</p>
            <button class="bg-white text-blue-600 px-12 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all hover-scale">
                Start Your Journey
            </button>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div class="text-2xl font-bold mb-4">BrandName</div>
            <p class="text-gray-400 mb-4">Creating amazing experiences since 2024</p>
            <div class="flex justify-center space-x-6">
                <a href="#" class="text-gray-400 hover:text-white transition-colors">Privacy</a>
                <a href="#" class="text-gray-400 hover:text-white transition-colors">Terms</a>
                <a href="#" class="text-gray-400 hover:text-white transition-colors">Support</a>
            </div>
        </div>
    </footer>

    <script>
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Fade in animation on scroll
        const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -100px 0px' };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('section').forEach(section => {
            observer.observe(section);
        });
    </script>
</body>
</html>`;
}

// Utility function to create project ZIP
async function createProjectZip(htmlContent, projectName = 'frontend-project') {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const chunks = [];

        archive.on('data', chunk => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);

        // Add main HTML file
        archive.append(htmlContent, { name: 'index.html' });

        // Add package.json for deployment
        const packageJson = {
            name: projectName,
            version: "1.0.0",
            description: "AI-generated frontend project",
            main: "index.html",
            scripts: {
                start: "serve -s .",
                build: "echo 'Build complete'"
            },
            dependencies: {},
            devDependencies: {
                serve: "^14.0.0"
            }
        };
        archive.append(JSON.stringify(packageJson, null, 2), { name: 'package.json' });

        // Add README
        const readme = `# ${projectName}

This project was generated using AI-powered Frontend Designer.

## Getting Started

1. Open \`index.html\` in your browser
2. Or serve with: \`npx serve .\`

## Deployment

This project is ready to deploy to:
- Netlify
- Vercel  
- GitHub Pages
- Any static hosting service

Generated on: ${new Date().toISOString()}
`;
        archive.append(readme, { name: 'README.md' });

        archive.finalize();
    });
}

// NEW: Netlify deployment function
async function deployToNetlify(htmlContent, siteName, accessToken) {
    try {
        // Create ZIP file
        const zipBuffer = await createProjectZip(htmlContent, siteName);

        // First, create a new site
        const createSiteResponse = await axios.post('https://api.netlify.com/api/v1/sites', {
            name: siteName,
            custom_domain: null
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        const siteId = createSiteResponse.data.id;
        console.log(`Created site with ID: ${siteId}`);

        // Then deploy the ZIP file to the site
        const deployResponse = await axios.post(
            `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
            zipBuffer,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/zip'
                },
                timeout: 60000
            }
        );

        console.log('Deploy response:', deployResponse.data);

        return {
            success: true,
            url: createSiteResponse.data.ssl_url || createSiteResponse.data.url,
            deployUrl: deployResponse.data.deploy_ssl_url || deployResponse.data.ssl_url,
            adminUrl: createSiteResponse.data.admin_url,
            siteId: siteId,
            siteName: createSiteResponse.data.name,
            deployId: deployResponse.data.id,
            state: deployResponse.data.state
        };
    } catch (error) {
        console.error('Netlify deployment error:', error.response?.data || error.message);
        
        // More specific error messages
        if (error.response?.status === 401) {
            throw new Error('Invalid Netlify access token. Please check your token.');
        } else if (error.response?.status === 422) {
            throw new Error('Site name already exists. Please choose a different name.');
        } else {
            throw new Error('Failed to deploy to Netlify: ' + (error.response?.data?.message || error.message));
        }
    }
}

// Routes

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        features: {
            claude: !!process.env.CLAUDE_API_KEY,
            mistral: !!process.env.MISTRAL_API_KEY,
            gemini: !!process.env.GEMINI_API_KEY,
            netlify: !!process.env.NETLIFY_ACCESS_TOKEN
        }
    });
});

// NEW: Enhance prompt endpoint with better error handling
app.post('/api/enhance-prompt', async (req, res) => {
    try {
        const { prompt, includeImage = false } = req.body;

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        console.log(`Enhancing prompt: "${prompt.substring(0, 100)}..."`);

        let enhancedPrompt;
        let method = 'mistral';

        // Try Mistral AI first if available
        if (process.env.GEMINI_API_KEY) {
            try {
                enhancedPrompt = await enhancePromptWithMistral(prompt, includeImage);
            } catch (mistralError) {
                console.log('Gemini enhancement failed, using fallback:', mistralError.message);
                enhancedPrompt = generateFallbackEnhancement(prompt, includeImage);
                method = 'fallback';
            }
        } else {
            // Use fallback if no Mistral API key
            enhancedPrompt = generateFallbackEnhancement(prompt, includeImage);
            method = 'fallback';
        }

        res.json({
            success: true,
            originalPrompt: prompt,
            enhancedPrompt: enhancedPrompt,
            method: method,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Prompt enhancement error:', error);
        
        // Always provide a fallback response instead of failing
        try {
            const fallbackPrompt = generateFallbackEnhancement(req.body.prompt, req.body.includeImage);
            res.json({
                success: true,
                originalPrompt: req.body.prompt,
                enhancedPrompt: fallbackPrompt,
                method: 'fallback',
                warning: 'AI enhancement failed, used fallback enhancement',
                timestamp: new Date().toISOString()
            });
        } catch (fallbackError) {
            res.status(500).json({
                success: false,
                error: 'Failed to enhance prompt',
                message: error.message
            });
        }
    }
});

// Enhanced code generation endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, model = 'claude', image, promptMode = 'raw', isEnhanced = false } = req.body;

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Prompt is required'
            });
        }

        console.log(`Generating code with ${model} for ${promptMode} prompt: "${prompt.substring(0, 100)}..."`);

        let generatedCode;
        let usedModel = model;

        try {
            if (model === 'claude' && process.env.CLAUDE_API_KEY) {
                generatedCode = await callClaudeAI(prompt, image);
            } else if (model === 'mistral' && process.env.MISTRAL_API_KEY) {
                generatedCode = await callMistralAI(prompt, image);
            } else if (model === 'gemini' && process.env.GEMINI_API_KEY) {
                generatedCode = await callGeminiAI(prompt, image);
            } else {
                console.log('Using fallback generation');
                generatedCode = generateFallbackCode(prompt);
                usedModel = 'fallback';
            }
        } catch (aiError) {
            console.log('AI API call failed, using fallback:', aiError.message);
            generatedCode = generateFallbackCode(prompt);
            usedModel = 'fallback';
        }

        // Clean up the generated code
        generatedCode = generatedCode
            .replace(/```html/g, '')
            .replace(/```/g, '')
            .trim();

        res.json({
            success: true,
            code: generatedCode,
            model: usedModel,
            promptMode: promptMode,
            isEnhanced: isEnhanced,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Code generation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate code',
            message: error.message
        });
    }
});

// NEW: Download project as ZIP
app.post('/api/download', async (req, res) => {
    try {
        const { code, projectName = 'frontend-project' } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'No code provided'
            });
        }

        const zipBuffer = await createProjectZip(code, projectName);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${projectName}.zip"`);
        res.send(zipBuffer);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create download',
            message: error.message
        });
    }
});

// NEW: Deploy to Netlify
app.post('/api/deploy-netlify', async (req, res) => {
    try {
        const { code, siteName = 'ai-generated-site', accessToken } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'No code provided'
            });
        }

        const token = accessToken || process.env.NETLIFY_ACCESS_TOKEN;
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Netlify access token required'
            });
        }

        const deployment = await deployToNetlify(code, siteName, token);

        res.json({
            success: true,
            deployment: deployment,
            message: 'Successfully deployed to Netlify!'
        });

    } catch (error) {
        console.error('Netlify deployment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to deploy to Netlify',
            message: error.message
        });
    }
});

// Enhanced image upload
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No image file provided'
            });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        
        res.json({
            success: true,
            imageUrl: imageUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype
        });

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to upload image',
            message: error.message
        });
    }
});

app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false,
                error: 'File too large',
                message: 'Image must be smaller than 10MB'
            });
        }
    }
    
    res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Not found',
        message: 'The requested resource was not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Frontend Designer v2.0 running on port ${PORT}`);
    console.log(`📱 Open: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
    console.log(`💡 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    console.log('\n🤖 AI Models Status:');
    if (process.env.CLAUDE_API_KEY) {
        console.log('✅ Claude AI enabled');
    } else {
        console.log('⚠️  Claude AI disabled - set CLAUDE_API_KEY');
    }
    
    if (process.env.MISTRAL_API_KEY) {
        console.log('✅ Mistral AI enabled');
    } else {
        console.log('⚠️  Mistral AI disabled - set MISTRAL_API_KEY');
    }

    if (process.env.GEMINI_API_KEY) {
        console.log('✅ Google Gemini enabled');
    } else {
        console.log('⚠️  Google Gemini disabled - set GEMINI_API_KEY');
    }

    console.log('\n🚀 Deployment Status:');
    if (process.env.NETLIFY_ACCESS_TOKEN) {
        console.log('✅ Netlify deployment enabled');
    } else {
        console.log('⚠️  Netlify deployment disabled - set NETLIFY_ACCESS_TOKEN');
    }
});

module.exports = app;
