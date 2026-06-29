# Use lightweight Python image
FROM python:3.10-slim

# Set working directory in container
WORKDIR /app

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files into container
COPY . .

# Expose port (Hugging Face Spaces runs on 7860 by default)
EXPOSE 7860

# Start server using Gunicorn on port 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "server:app"]
