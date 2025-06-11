@echo off
echo 🚀 Setting up Frontend Designer Pro for Netlify on Windows...

:: Create necessary directories
mkdir public 2>nul
mkdir netlify 2>nul
mkdir netlify\functions 2>nul

:: Create netlify.toml
echo [build] > netlify.toml
echo   command = "npm run build" >> netlify.toml
echo   publish = "public" >> netlify.toml
echo   functions = "netlify/functions" >> netlify.toml
echo. >> netlify.toml
echo [build.environment] >> netlify.toml
echo   NODE_VERSION = "18" >> netlify.toml
echo   NODE_ENV = "production" >> netlify.toml
echo. >> netlify.toml
echo [[redirects]] >> netlify.toml
echo   from = "/api/*" >> netlify.toml
echo   to = "/.netlify/functions/:splat" >> netlify.toml
echo   status = 200 >> netlify.toml
echo. >> netlify.toml
echo [[redirects]] >> netlify.toml
echo   from = "/*" >> netlify.toml
echo   to = "/index.html" >> netlify.toml
echo   status = 200 >> netlify.toml

:: Create health function
(
echo exports.handler = async ^(event, context^) =^> {
echo     const headers = {
echo         'Access-Control-Allow-Origin': '*',
echo         'Access-Control-Allow-Headers': 'Content-Type',
echo         'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
echo         'Content-Type': 'application/json'
echo     };
echo.
echo     if ^(event.httpMethod === 'OPTIONS'^) {
echo         return { statusCode: 200, headers, body: '' };
echo     }
echo.
echo     return {
echo         statusCode: 200,
echo         headers,
echo         body: JSON.stringify^({
echo             status: 'OK',
echo             timestamp: new Date^(^).toISOString^(^),
echo             version: '2.0.0',
echo             platform: 'netlify',
echo             features: {
echo                 claude: !!process.env.CLAUDE_API_KEY,
echo                 mistral: !!process.env.MISTRAL_API_KEY,
echo                 gemini: !!process.env.GEMINI_API_KEY,
echo                 netlify: true
echo             }
echo         }^)
echo     };
echo };
) > netlify\functions\health.js

:: Update package.json build script
npm pkg set scripts.build="echo Build complete - ready for Netlify!"

echo ✅ Netlify setup complete!
echo.
echo Next steps:
echo 1. netlify login
echo 2. netlify deploy --prod --dir public
echo.
echo Your app will be live in minutes! 🚀
pause