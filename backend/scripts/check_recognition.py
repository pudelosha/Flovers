"""Fail a build before release if the CPU wheels or real model are unusable."""

from __future__ import annotations

import importlib.metadata
import math
import sys
from pathlib import Path
from types import ModuleType


def check_cpu_build(
    torch: ModuleType, torchvision: ModuleType, package_names: list[str]
) -> None:
    # CUDA wheels can import on hosts without a GPU. cuda.is_available() alone
    # would let an oversized CUDA dependency set through this release gate.
    if torch.version.cuda is not None or torch.version.hip is not None:
        raise RuntimeError("Torch must be built for CPU, without CUDA or ROCm")
    if not all("+cpu" in module.__version__ for module in (torch, torchvision)):
        raise RuntimeError("Install the locked CPU builds of Torch and TorchVision")
    gpu_packages = sorted(
        name
        for name in package_names
        if name.lower().replace("_", "-").startswith(("nvidia-", "triton", "cuda-"))
    )
    if gpu_packages:
        raise RuntimeError(f"Unexpected GPU packages: {', '.join(gpu_packages)}")


def main() -> None:
    # The same entry point runs in CI and the production image build, without
    # Django settings, a database, secrets, or downloading model weights.
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    import torch
    import torchvision
    from PIL import Image

    check_cpu_build(
        torch,
        torchvision,
        [
            distribution.metadata["Name"]
            for distribution in importlib.metadata.distributions()
        ],
    )
    torch.set_num_threads(1)

    # Exercise the compiled CPU operators as well as Python imports.
    kept = torchvision.ops.nms(
        torch.tensor([[0.0, 0.0, 2.0, 2.0], [0.0, 0.0, 2.0, 2.0]]),
        torch.tensor([0.9, 0.8]),
        0.5,
    )
    if kept.tolist() != [0]:
        raise RuntimeError("TorchVision CPU operators returned an unexpected result")

    from plant_recognition import inference

    if inference.MODEL.training or any(
        parameter.device.type != "cpu" for parameter in inference.MODEL.parameters()
    ):
        raise RuntimeError("The recognition model must be in evaluation mode on CPU")
    if not inference.CLASS_NAMES or len(set(inference.CLASS_NAMES)) != len(
        inference.CLASS_NAMES
    ):
        raise RuntimeError("The recognition class mapping must be nonempty and unique")

    results = inference.predict_topk(
        Image.new("RGB", (320, 240), (60, 120, 60)), topk=3
    )
    if len(results) != 3:
        raise RuntimeError("The recognition model did not return three predictions")
    for rank, result in enumerate(results, start=1):
        score = result["score"]
        if (
            result["rank"] != rank
            or result["name"] not in inference.CLASS_NAMES
            or not math.isfinite(score)
            or not 0 <= score <= 1
        ):
            raise RuntimeError("The recognition model returned an invalid prediction")
    if [result["score"] for result in results] != sorted(
        (result["score"] for result in results), reverse=True
    ):
        raise RuntimeError("Recognition predictions are not ordered by score")

    print(
        f"CPU recognition passed: torch {torch.__version__}, "
        f"torchvision {torchvision.__version__}; model {inference.MODEL_NAME}, "
        f"{len(inference.CLASS_NAMES)} classes; preprocessing and prediction succeeded"
    )


if __name__ == "__main__":
    main()
