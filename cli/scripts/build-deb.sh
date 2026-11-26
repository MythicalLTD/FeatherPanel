#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

OUT_DIR="${OUT_DIR:-dist}"
ARCHES="${ARCHES:-amd64 arm64}"
PACKAGE_CHANNEL="${PACKAGE_CHANNEL:-prod}"
BASE_VERSION="${BASE_VERSION:-}"
DOTNET_CONFIG="${DOTNET_CONFIG:-Release}"

if [[ -z "${BASE_VERSION}" ]]; then
  if git -C "${ROOT}/.." describe --tags --abbrev=0 >/dev/null 2>&1; then
    BASE_VERSION="$(git -C "${ROOT}/.." describe --tags --abbrev=0 | sed 's/^v//')"
  else
    BASE_VERSION="0.0.0"
  fi
fi

if [[ -z "${VERSION:-}" ]]; then
  if [[ "${PACKAGE_CHANNEL}" == "dev" ]]; then
    short_sha="$(git -C "${ROOT}/.." rev-parse --short HEAD 2>/dev/null || echo local)"
    stamp="$(date -u +%Y%m%d%H%M%S)"
    VERSION="${BASE_VERSION}~dev+${stamp}.${short_sha}"
  elif git -C "${ROOT}/.." describe --tags --exact-match >/dev/null 2>&1; then
    VERSION="$(git -C "${ROOT}/.." describe --tags --exact-match | sed 's/^v//')"
  else
    VERSION="${BASE_VERSION}"
  fi
fi

VERSION="${VERSION#v}"

case "${PACKAGE_CHANNEL}" in
  dev)
    NFPM_NAME="feathercli-dev"
    NFPM_CONFLICT="feathercli"
    ;;
  prod|*)
    NFPM_NAME="feathercli"
    NFPM_CONFLICT="feathercli-dev"
    ;;
esac

rid_for_arch() {
  case "$1" in
    amd64) echo "linux-x64" ;;
    arm64) echo "linux-arm64" ;;
    armhf|arm) echo "linux-arm" ;;
    *)
      echo "Unsupported arch: $1" >&2
      exit 1
      ;;
  esac
}

ensure_nfpm() {
  if command -v nfpm >/dev/null 2>&1; then
    return 0
  fi

  echo "nfpm not found; installing from Goreleaser apt repo..."
  if ! command -v sudo >/dev/null 2>&1; then
    echo "nfpm is required. Install it from https://nfpm.goreleaser.com/install/" >&2
    exit 1
  fi

  echo 'deb [trusted=yes] https://repo.goreleaser.com/apt/ /' | sudo tee /etc/apt/sources.list.d/goreleaser.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y nfpm
}

if ! command -v dotnet >/dev/null 2>&1; then
  echo ".NET SDK is required to build FeatherCli." >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
ensure_nfpm

echo "Building FeatherCli ${VERSION} (${NFPM_NAME}) for: ${ARCHES}"

: > "${OUT_DIR}/.deb-manifest"

for arch in ${ARCHES}; do
  echo ""
  echo "==> ${arch}"
  rid="$(rid_for_arch "${arch}")"

  dotnet publish FeatherCli.csproj \
    -c "${DOTNET_CONFIG}" \
    -r "${rid}" \
    --self-contained true \
    /p:PublishSingleFile=true \
    /p:PublishTrimmed=false \
    /p:EnableCompressionInSingleFile=true \
    /p:IncludeNativeLibrariesForSelfExtract=true \
    /p:Version="${VERSION}" \
    -o "${OUT_DIR}/publish-${rid}"

  published="${OUT_DIR}/publish-${rid}/FeatherCli"
  if [[ ! -f "${published}" ]]; then
    echo "Published binary not found: ${published}" >&2
    exit 1
  fi

  cp "${published}" "${OUT_DIR}/feathercli"
  chmod 755 "${OUT_DIR}/feathercli"
  cp "${OUT_DIR}/feathercli" "${OUT_DIR}/feathercli-linux-${arch}"
  # Installer / GH release naming uses x64 not amd64
  case "${arch}" in
    amd64) cp "${OUT_DIR}/feathercli" "${OUT_DIR}/feathercli-linux-x64" ;;
    arm64) cp "${OUT_DIR}/feathercli" "${OUT_DIR}/feathercli-linux-arm64" ;;
    armhf|arm) cp "${OUT_DIR}/feathercli" "${OUT_DIR}/feathercli-linux-arm" ;;
  esac

  NFPM_NAME="${NFPM_NAME}" \
  NFPM_CONFLICT="${NFPM_CONFLICT}" \
  NFPM_ARCH="${arch}" \
  NFPM_VERSION="${VERSION}" \
  nfpm pkg \
    --packager deb \
    --config nfpm.yaml \
    --target "${OUT_DIR}/"

  echo "${OUT_DIR}/${NFPM_NAME}_${VERSION}_${arch}.deb" >> "${OUT_DIR}/.deb-manifest"
done

echo "${VERSION}" > "${OUT_DIR}/.deb-version"
echo "${NFPM_NAME}" > "${OUT_DIR}/.deb-package"

echo ""
echo "Built packages:"
ls -lh "${OUT_DIR}"/*.deb "${OUT_DIR}"/feathercli-linux-* 2>/dev/null || true

if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "${OUT_DIR}"
    sha256sum feathercli-linux-* *.deb > checksums.txt 2>/dev/null || true
  )
fi
