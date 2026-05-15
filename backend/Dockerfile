FROM python:3.9-slim

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y ffmpeg libsm6 libxext6 && rm -rf /var/lib/apt/lists/*

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

# Install dependencies globally as root to prevent any permission issues
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Set up a new user named "user" with user ID 1000
RUN useradd -m -u 1000 user
USER user

# Set home to the user's home directory
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy the application code and set ownership to the user
COPY --chown=user . $HOME/app

ENV PORT=7860
EXPOSE 7860

CMD ["python", "server.py"]
