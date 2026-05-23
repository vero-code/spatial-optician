Write-Host "Starting FastAPI development server using uv run..." -ForegroundColor Green
uv run uvicorn main:app --reload --port 8000
