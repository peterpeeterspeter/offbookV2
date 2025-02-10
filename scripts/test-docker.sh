#!/bin/bash
set -e

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

# Clean up function
cleanup() {
    log "Cleaning up containers..."
    docker-compose -f docker-compose.test.yml down
}

# Trap cleanup function
trap cleanup EXIT

# Main function
main() {
    log "Starting test environment..."

    # Build containers
    log "Building containers..."
    docker-compose -f docker-compose.test.yml build || error "Failed to build containers"

    # Run tests
    log "Running tests..."
    docker-compose -f docker-compose.test.yml run test || error "Tests failed"

    # Run coverage
    log "Generating coverage report..."
    docker-compose -f docker-compose.test.yml run coverage || error "Coverage generation failed"

    # Check coverage thresholds
    log "Checking coverage thresholds..."
    if [ -f coverage/coverage-summary.json ]; then
        COVERAGE=$(cat coverage/coverage-summary.json | grep -o '"pct": [0-9]*\.[0-9]*' | cut -d' ' -f2)
        if (( $(echo "$COVERAGE < 90" | bc -l) )); then
            error "Coverage ($COVERAGE%) is below threshold (90%)"
        fi
        log "Coverage: $COVERAGE%"
    else
        error "Coverage report not found"
    fi

    log "All tests passed successfully!"
}

# Run main function
main
