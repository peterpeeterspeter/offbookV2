#!/bin/bash
set -e

# Configuration
APP_NAME="offbook"
DOCKER_REGISTRY="your-registry.com"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Log function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Error function
error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Health check function
check_health() {
    local url=$1
    local retries=$2
    local interval=$3
    local count=0

    while [ $count -lt $retries ]; do
        if curl -s -f "$url/api/health" > /dev/null; then
            return 0
        fi
        count=$((count + 1))
        sleep $interval
    done
    return 1
}

# Backup current version
backup_current() {
    log "Backing up current version..."
    docker tag $DOCKER_REGISTRY/$APP_NAME:latest $DOCKER_REGISTRY/$APP_NAME:rollback || true
}

# Build new version
build_new() {
    log "Building new version..."
    docker build -t $DOCKER_REGISTRY/$APP_NAME:latest .
}

# Deploy new version
deploy() {
    log "Deploying new version..."
    docker push $DOCKER_REGISTRY/$APP_NAME:latest

    # Update running container
    docker-compose pull
    docker-compose up -d
}

# Rollback function
rollback() {
    log "Rolling back to previous version..."
    docker tag $DOCKER_REGISTRY/$APP_NAME:rollback $DOCKER_REGISTRY/$APP_NAME:latest
    docker-compose up -d
}

# Main deployment process
main() {
    log "Starting deployment process..."

    # Backup current version
    backup_current

    # Build new version
    build_new

    # Deploy
    deploy

    # Health check
    log "Performing health check..."
    if ! check_health "http://localhost:3000" $HEALTH_CHECK_RETRIES $HEALTH_CHECK_INTERVAL; then
        error "Health check failed. Rolling back..."
        rollback
        exit 1
    fi

    log "Deployment successful!"
}

# Run main function
main
