# Reproducible backend dependencies

`requirements.in` lists direct application and test dependencies.
`requirements.txt` is the generated lock: it pins their complete dependency
tree and records SHA-256 hashes. CI and the production image install this same
file, including the test tools, with:

```sh
python -m pip install --require-hashes --only-binary=:all: -r requirements.txt
python -m pip check
python scripts/check_recognition.py
```

Use Python **3.12.16**, recorded in `.python-version` and the Docker base image.
The image is also pinned by digest. The release target is Linux AMD64, matching
the VPS and GitHub runner; the lock also includes Windows-specific dependencies
for development with Python 3.12. macOS/ARM deployments require a separately
validated lock and image.

The initial lock preserves all 82 package versions from the successful backend
deployment of commit `4aa974e`, including `torch==2.15.0+cpu` and
`torchvision==0.29.2+cpu`. It is a reproducibility change, not a framework upgrade.

The two `--find-links` locations expose only the official CPU Torch and
TorchVision wheels. Other dependencies resolve from PyPI. There is no general
secondary package index or separate unpinned Torch installation. Hash checking
rejects unexpected artifacts; wheel-only installation avoids resolving hidden
source-build dependencies. See [pip's secure-install guidance](https://pip.pypa.io/en/stable/topics/secure-installs/).

## Updating the lock

Use **uv 0.13.8** in a separate tooling environment (`python -m pip install
uv==0.13.8`). It is needed only to update the lock, not to build or run Flovers.
From `backend/`, edit `requirements.in`, then run:

```sh
uv pip compile requirements.in --python-version 3.12.16 --universal \
  --generate-hashes --emit-index-url --emit-find-links --no-build \
  --output-file requirements.txt
```

This retains compatible versions already in the output file. To deliberately
update one package, append `--upgrade-package PACKAGE`; use `--upgrade` only for
an intentional full dependency update. Update the Torch/TorchVision pair together
in `requirements.in`. Review the lock diff, install it in a fresh environment,
then run the recognition check and full tests. Commit both dependency files.
The resolver's [compile documentation](https://docs.astral.sh/uv/pip/compile/)
describes these options.

When changing Python, update `.python-version`, the Docker tag/digest, and the
compile command's Python version together, regenerate the lock, and validate the
Linux image. Do not regenerate the lock during a deployment or install extra
floating dependencies afterward.

## Required release checks

The backend quality workflow installs the lock, checks dependency compatibility,
then runs `scripts/check_recognition.py`. The script rejects GPU builds and
NVIDIA/CUDA/Triton packages, executes a compiled TorchVision CPU operator, loads
Flovers' actual configured weights and class mapping, and preprocesses an image
through `predict_topk`. It checks that predictions have valid classes, ranks and
finite probabilities. It needs no database, credentials or model download.

Model/migration checks, deployment safeguards, and the full backend suite on
PostgreSQL 16 must also pass before the production image build can start. The
Docker build repeats the same recognition check inside the final image, after
the application and model artifacts have been copied. A failure blocks image
publication and therefore VPS deployment.

To exercise application behavior locally without production services:

```sh
DJANGO_SETTINGS_MODULE=app.ci_settings python -m pytest
```

The local SQLite fallback skips PostgreSQL-only lock/concurrency tests. Those
run in CI. Set `CI_DATABASE_URL` to a disposable loopback `flovers_ci` database
to exercise them locally; see [quality checks](../.github/QUALITY_CHECKS.md).

No database migration, mobile rebuild, or new VPS environment variable is needed
for this dependency change. These checks run on build runners, avoiding extra
recognition-model processes alongside the live app on the 20 GB VPS.
