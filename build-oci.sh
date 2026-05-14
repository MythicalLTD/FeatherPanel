#!/bin/bash
# Build script for FeatherPanel OCI (Open Container Initiative)

set -e

echo "=========================================="
echo "  FeatherPanel OCI Builder"
echo "=========================================="
echo ""

# Default values
IMAGE_NAME="${IMAGE_NAME:-featherpanel-oci}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PUSH="${PUSH:-false}"
REGISTRY="${REGISTRY:-}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --push              Push to registry after build"
    echo "  --registry REGISTRY Set registry (e.g., ghcr.io/mythicalltd)"
    echo "  --tag TAG           Set image tag (default: latest)"
    echo "  --name NAME         Set image name (default: featherpanel-coi)"
    echo "  --help, -h          Show this help"
    echo ""
    echo "Environment variables:"
    echo "  IMAGE_NAME          Image name"
    echo "  IMAGE_TAG           Image tag"
    echo "  REGISTRY            Registry prefix"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Local build"
    echo "  $0 --push --registry ghcr.io/user     # Build and push"
    echo "  IMAGE_TAG=v1.0.0 $0                   # Build with custom tag"
    exit 0
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --push)
            PUSH=true
            shift
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Full image name
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE="$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
else
    FULL_IMAGE="$IMAGE_NAME:$IMAGE_TAG"
fi

echo -e "${YELLOW}Building: $FULL_IMAGE${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed!${NC}"
    exit 1
fi

# Check if Dockerfile exists
if [ ! -f "Dockerfile.oci" ]; then
    echo -e "${RED}Dockerfile.oci not found!${NC}"
    echo "Make sure you're running this from the project root."
    exit 1
fi

# Enable Docker BuildKit
export DOCKER_BUILDKIT=1

# Build
echo "Building image..."
if docker build \
    -f Dockerfile.oci \
    -t "$FULL_IMAGE" \
    --progress=plain \
    . 2>&1 | tee build.log; then

    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  Build successful!${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo "Image: $FULL_IMAGE"
    echo ""
    echo "To run locally:"
    echo "  docker run -d -p 80:80 -v featherpanel_data:/data --name featherpanel $FULL_IMAGE"
    echo ""

    # Push if requested
    if [ "$PUSH" == "true" ]; then
        echo "Pushing to registry..."
        docker push "$FULL_IMAGE"
        echo -e "${GREEN}Pushed: $FULL_IMAGE${NC}"
    fi

    # Show image size
    echo ""
    docker images "$FULL_IMAGE" --format "Size: {{.Size}}"

else
    echo ""
    echo -e "${RED}==========================================${NC}"
    echo -e "${RED}  Build failed!${NC}"
    echo -e "${RED}==========================================${NC}"
    echo ""
    echo "Check build.log for details"
    exit 1
fi
