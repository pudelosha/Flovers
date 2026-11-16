"""GPU wheels must fail even on machines where no GPU is available."""

from types import SimpleNamespace

import pytest

from scripts.check_recognition import check_cpu_build


def cpu_torch(**version_fields):
    return SimpleNamespace(
        __version__="2.15.0+cpu",
        version=SimpleNamespace(**{"cuda": None, "hip": None, **version_fields}),
    )


def test_cpu_wheels_pass():
    check_cpu_build(
        cpu_torch(), SimpleNamespace(__version__="0.29.2+cpu"), ["torch", "numpy"]
    )


@pytest.mark.parametrize("backend", [{"cuda": "12.8"}, {"hip": "6.4"}])
def test_gpu_build_fails_without_relying_on_gpu_hardware(backend):
    with pytest.raises(RuntimeError, match="without CUDA or ROCm"):
        check_cpu_build(
            cpu_torch(**backend), SimpleNamespace(__version__="0.29.2+cpu"), []
        )


@pytest.mark.parametrize("package", ["nvidia-cudnn-cu12", "triton", "cuda_bindings"])
def test_gpu_dependencies_are_rejected_even_with_cpu_wheels(package):
    with pytest.raises(RuntimeError, match="Unexpected GPU packages"):
        check_cpu_build(
            cpu_torch(), SimpleNamespace(__version__="0.29.2+cpu"), [package]
        )


def test_non_cpu_torchvision_is_rejected():
    with pytest.raises(RuntimeError, match="locked CPU builds"):
        check_cpu_build(cpu_torch(), SimpleNamespace(__version__="0.29.2"), [])
