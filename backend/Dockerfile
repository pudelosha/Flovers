FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
# Recognition runs on the CPU. The default Linux PyPI wheels also pull in
# several gigabytes of CUDA libraries, which can exhaust the VPS during pulls.
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt \
    && python -c "import importlib.metadata as m; import torch, torchvision; assert torch.version.cuda is None, 'CPU-only PyTorch required'; assert not any(d.metadata['Name'].lower().startswith('nvidia-') for d in m.distributions()), 'Unexpected NVIDIA packages'; model = torchvision.models.resnet18(weights=None).eval(); output = model(torch.zeros(1, 3, 224, 224)); assert output.shape == (1, 1000)"

COPY . /app

RUN mkdir -p /app/staticfiles /app/media
