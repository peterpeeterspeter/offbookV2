#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up test environment...${NC}"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install test requirements if not already installed
pip install -r tests/requirements-test.txt

# Setup test database
echo -e "${GREEN}Setting up test database...${NC}"
python -c "import asyncio; from tests.setup_test_db import setup_test_database; asyncio.run(setup_test_database())"

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to setup test database!${NC}"
    exit 1
fi

echo -e "${GREEN}Running tests with coverage...${NC}"

# Run pytest with coverage and generate reports
pytest tests/ \
    --cov=src \
    --cov-report=term-missing \
    --cov-report=html:coverage_report \
    -v \
    --log-cli-level=INFO

# Store test result
TEST_RESULT=$?

# Clean up test database
echo -e "${GREEN}Cleaning up test database...${NC}"
python -c "import asyncio; from tests.setup_test_db import cleanup_test_database; asyncio.run(cleanup_test_database())"

# Check if tests passed
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}Tests passed successfully!${NC}"
    echo -e "${GREEN}Coverage report generated in coverage_report/index.html${NC}"
    exit 0
else
    echo -e "${RED}Tests failed!${NC}"
    exit 1
fi 
