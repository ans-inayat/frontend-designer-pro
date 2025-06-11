const axios = require('axios');

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
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        headers: {
            'Content-Type': 'application/json'
        }
    }
};

function generateSystemPrompt() {
    return `You are an expert frontend developer. Generate complete HTML with Tailwind CSS, responsive design, semantic HTML5, beautiful Unsplash images, and modern JavaScript. Return only clean HTML code without explanations.`;
}

function generateFallbackCode(prompt) {
    const heroImage = `https://source.unsplash.com/1200x600/?${encodeURIComponent(prompt.split(' ').slice(0, 3).join(' '))}`;
    const featureImage1 = `https://source.unsplash.com/400x300/?technology`;
    const featureImage2 = `https://source.unsplash.com/400x300/?design`;
    const featureImage3 = `https://source.unsplash.com/400x300/?innovation`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${prompt} - AI Generated</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .hero-bg { 
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(139, 92, 246, 0.8)), url('${heroImage}');
            background-size: cover;
            background-position: center;
        }
        .hover-scale { transition: transform 0.3s ease; }
        .hover-scale:hover { transform: scale(1.05); }
        .fade-in { animation: fadeIn 1s ease-in; }
        @keyframes fadeIn { 
            from { opacity: 0; transform: translateY(30px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
    </style>
</head>
<body class="bg-white">
    <!-- Navigation -->
    <nav class="fixed w-full bg-white/95 backdrop-blur-md shadow-lg z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-4">
                <div class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Your Brand
                </div>
                <div class="hidden md:flex space-x-8">
                    <a href="#home" class="text-gray-600 hover:text-blue-600 transition-colors">Home</a>
                    <a href="#features" class="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
                    <a href="#about" class="text-gray-600 hover:text-blue-600 transition-colors">About</a>
                    <a href="#contact" class="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
                </div>
                <button class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all">
                    Get Started
                </button>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section id="home" class="hero-bg text-white min-h-screen flex items-center">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div class="text-center fade-in">
                <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                    ${prompt}
                </h1>
                <p class="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                    Built with Frontend Designer Pro - Beautiful, AI-generated websites with free Unsplash images
                </p>
                <div class="space-x-4">
                    <button class="bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-full font-semibold hover:bg-white/30 transition-all hover-scale">
                        Start Free Trial
                    </button>
                    <button class="border border-white/30 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-all hover-scale">
                        Learn More
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-24 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Amazing Features</h2>
                <p class="text-xl text-gray-600 max-w-2xl mx-auto">Everything you need with beautiful, free imagery from Unsplash</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover-scale">
                    <img src="${featureImage1}" alt="Technology" class="w-full h-48 object-cover rounded-lg mb-6">
                    <h3 class="text-2xl font-bold mb-4 text-center">Modern Technology</h3>
                    <p class="text-gray-600 text-center">Built with the latest technologies and best practices</p>
                </div>
                <div class="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover-scale">
                    <img src="${featureImage2}" alt="Design" class="w-full h-48 object-cover rounded-lg mb-6">
                    <h3 class="text-2xl font-bold mb-4 text-center">Beautiful Design</h3>
                    <p class="text-gray-600 text-center">Stunning visual design that captures attention</p>
                </div>
                <div class="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover-scale">
                    <img src="${featureImage3}" alt="Innovation" class="w-full h-48 object-cover rounded-lg mb-6">
                    <h3 class="text-2xl font-bold mb-4 text-center">Innovation</h3>
                    <p class="text-gray-600 text-center">Cutting-edge solutions for modern challenges</p>
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
            <div class="text-2xl font-bold mb-4">Your Brand</div>
            <p class="text-gray-400 mb-4">Built with ❤️ using Frontend Designer Pro</p>
            <p class="text-xs text-gray-500 mb-4">Beautiful images provided by Unsplash</p>
            <div class="flex justify-center space-x-6">
                <a href="https://unsplash.com" target="_blank" class="text-gray-400 hover:text-white transition-colors">Unsplash</a>
                <a href="#" class="text-gray-400 hover:text-white transition-colors">Privacy</a>
                <a href="#" class="text-gray-400 hover:text-white transition-colors">Terms</a>
                <a href="#" class="text-gray-400 hover:text-white transition-colors">Support</a>
            </div>
        </div>
    </footer>

    <script>
        // Smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Lazy loading for images
        const images = document.querySelectorAll('img');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.classList.add('fade-in');
                    observer.unobserve(img);
                }
            });
        });
        images.forEach(img => imageObserver.observe(img));
    </script>
</body>
</html>`;
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { prompt, model = 'claude', image } = JSON.parse(event.body);

        if (!prompt || prompt.trim().length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Prompt is required' })
            };
        }

        console.log(`Generating code with ${model} for prompt: "${prompt.substring(0, 100)}..."`);

        let generatedCode;
        let usedModel = model;

        try {
            if (model === 'claude' && process.env.CLAUDE_API_KEY) {
                const messages = [{
                    role: 'user',
                    content: image 
                        ? `Create a web interface based on the image and this description: ${prompt}`
                        : prompt
                }];

                const response = await axios.post(AI_CONFIGS.claude.url, {
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 4000,
                    system: generateSystemPrompt(),
                    messages: messages
                }, {
                    headers: AI_CONFIGS.claude.headers,
                    timeout: 30000
                });

                generatedCode = response.data.content[0].text;
            } else if (model === 'gemini' && process.env.GEMINI_API_KEY) {
                const response = await axios.post(AI_CONFIGS.gemini.url, {
                    contents: [{
                        parts: [{ text: `${generateSystemPrompt()}\n\nUser Request: ${prompt}` }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 4096,
                    }
                }, {
                    headers: AI_CONFIGS.gemini.headers,
                    timeout: 30000
                });

                if (response.data.candidates && response.data.candidates.length > 0) {
                    generatedCode = response.data.candidates[0].content.parts.map(part => part.text).join('\n');
                }
            } else {
                throw new Error('No AI model available, using fallback');
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

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                code: generatedCode,
                model: usedModel,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Code generation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to generate code',
                message: error.message
            })
        };
    }
};