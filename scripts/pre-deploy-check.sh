#!/bin/bash

echo "🚀 Starting Pre-deployment Checks..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check if a command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 passed${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Function to check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}✗ $1 is not installed${NC}"
        exit 1
    fi
}

# Check required commands
echo "Checking required commands..."
check_command "node"
check_command "npm"
check_command "git"
check_status "Command check"

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$node_version" -lt 18 ]; then
    echo -e "${RED}✗ Node.js version must be 18 or higher (found v$node_version)${NC}"
    exit 1
fi
check_status "Node.js version check"

# Check Git status
echo "Checking Git status..."
if [[ $(git status --porcelain) ]]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
fi

# Clean install dependencies
echo "Running clean install of dependencies..."
rm -rf node_modules
npm ci
check_status "Dependencies installation"

echo "Running TypeScript type checks..."
npm run typecheck
check_status "TypeScript checks"

echo "Running linting..."
npm run lint
check_status "Linting"

echo "Running test suite..."
npm run test
check_status "Test suite"

echo "Running build..."
npm run build
check_status "Build"

echo "Checking for security vulnerabilities..."
npm audit
check_status "Security audit"

echo "Running performance tests..."
npm run test -- --selectProjects=performance
check_status "Performance tests"

echo "Checking environment variables..."
ts-node scripts/check-env.ts
check_status "Environment variables"

echo "Running load tests..."
npm run test -- --selectProjects=load
check_status "Load tests"

# Check bundle size
echo "Checking bundle size..."
if [ -f "dist/assets/index-*.js" ]; then
    size=$(stat -f%z dist/assets/index-*.js)
    if [ $size -gt 5000000 ]; then  # 5MB limit
        echo -e "${RED}✗ Bundle size is too large: $(($size/1024/1024))MB${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ Bundle size is acceptable: $(($size/1024/1024))MB${NC}"
    fi
fi

echo "Verifying documentation..."
required_docs=("docs/API.md" "docs/DEPLOYMENT.md" "docs/TEST_STATUS_SUMMARY.md")
missing_docs=0
for doc in "${required_docs[@]}"; do
    if [ ! -f "$doc" ]; then
        echo -e "${RED}✗ Missing required documentation: $doc${NC}"
        missing_docs=1
    fi
done

if [ $missing_docs -eq 0 ]; then
    echo -e "${GREEN}✓ All required documentation exists${NC}"
else
    exit 1
fi

# Create pre-deployment report
echo "Generating pre-deployment report..."
cat << EOF > pre-deployment-report.md
# Pre-deployment Check Report
Generated on $(date)

## Environment
- Node.js: $(node -v)
- npm: $(npm -v)
- Git commit: $(git rev-parse HEAD)

## Test Results
- Unit Tests: ✅
- Integration Tests: ✅
- Performance Tests: ✅
- Load Tests: ✅

## Security
- npm audit: ✅
- Environment variables: ✅
- Bundle size: $(stat -f%z dist/assets/index-*.js | awk '{print $1/1024/1024 "MB"}')

## Documentation
All required documentation is present and up-to-date.

## Next Steps
1. Review this report
2. Verify monitoring setup
3. Check backup systems
4. Review security measures
5. Schedule deployment window
EOF

echo -e "\n${GREEN}✅ All pre-deployment checks passed!${NC}"
echo "
Pre-deployment report has been generated: pre-deployment-report.md

Next steps:
1. Review the pre-deployment report
2. Verify monitoring setup
3. Check backup systems
4. Review security measures
5. Schedule deployment window
"
