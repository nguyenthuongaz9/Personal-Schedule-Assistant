@echo off
echo Waiting for Ollama to start...
timeout /t 10 /nobreak >nul

echo Pulling Mistral model...
docker exec -it ollama ollama pull mistral

echo Mistral model pulled successfully!
echo Ollama is ready to use on port 11434
echo Press Ctrl+C to exit...

:: Giữ cửa sổ mở
pause