FROM python:3.11-slim

WORKDIR /app

# Install dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the port Uvicorn will listen on
EXPOSE 8000

# Run with hot-reload disabled in production; use --reload for dev
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
