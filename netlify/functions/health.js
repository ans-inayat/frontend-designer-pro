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

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            platform: 'netlify',
            features: {
                claude: !!process.env.CLAUDE_API_KEY,
                mistral: !!process.env.MISTRAL_API_KEY,
                gemini: !!process.env.GEMINI_API_KEY,
                netlify: true
            }
        })
    };
};
