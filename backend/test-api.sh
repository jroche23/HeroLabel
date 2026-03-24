#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL
BASE_URL=${BACKEND_URL:-"http://localhost:3000"}

echo "Testing Label Studio Backend API"
echo "================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
RESPONSE=$(curl -s -X GET "$BASE_URL/health")
if echo "$RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "Response: $RESPONSE"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 2: Get Preset Templates (no auth required)
echo "2. Testing GET /api/projects/templates/presets..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/projects/templates/presets")
if echo "$RESPONSE" | grep -q "data"; then
    echo -e "${GREEN}✓ Preset templates endpoint passed${NC}"
    echo "Response (truncated): $(echo "$RESPONSE" | cut -c1-200)..."
else
    echo -e "${RED}✗ Preset templates endpoint failed${NC}"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 3: Create a test user and session via Better Auth
echo "3. Setting up test authentication..."

# First, let's try to sign in with email OTP (simulate)
# For testing purposes, we'll use the database directly to create a valid session

# Check if test user exists
USER_EXISTS=$(cd /home/user/workspace/backend && sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User WHERE email = 'test@example.com';" 2>/dev/null || echo "0")

if [ "$USER_EXISTS" == "0" ]; then
    echo "Creating test user..."
    USER_ID=$(uuidgen 2>/dev/null || echo "test-user-$(date +%s)")
    cd /home/user/workspace/backend && sqlite3 prisma/dev.db "INSERT INTO User (id, name, email, emailVerified, createdAt, updatedAt) VALUES ('$USER_ID', 'Test User', 'test@example.com', 1, datetime('now'), datetime('now'));"
else
    USER_ID=$(cd /home/user/workspace/backend && sqlite3 prisma/dev.db "SELECT id FROM User WHERE email = 'test@example.com' LIMIT 1;")
    echo "Test user already exists: $USER_ID"
fi

# Create a session token
SESSION_ID=$(uuidgen 2>/dev/null || echo "session-$(date +%s)")
SESSION_TOKEN=$(openssl rand -hex 32 2>/dev/null || echo "test-token-$(date +%s)")

cd /home/user/workspace/backend && sqlite3 prisma/dev.db "DELETE FROM Session WHERE userId = '$USER_ID';"
cd /home/user/workspace/backend && sqlite3 prisma/dev.db "INSERT INTO Session (id, token, userId, expiresAt, createdAt, updatedAt) VALUES ('$SESSION_ID', '$SESSION_TOKEN', '$USER_ID', datetime('now', '+7 days'), datetime('now'), datetime('now'));"

echo "Session token created: $SESSION_TOKEN"
echo ""

# Test 4: Create Project (with auth)
echo "4. Testing POST /api/projects (create project)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=$SESSION_TOKEN" \
  -d '{"title":"Test Project","description":"A test project for Label Studio","workspace":"Default"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "201" ]; then
    echo -e "${GREEN}✓ Create project passed${NC}"
    echo "Response: $BODY"
    PROJECT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "Created project ID: $PROJECT_ID"
else
    echo -e "${RED}✗ Create project failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 5: List Projects
echo "5. Testing GET /api/projects (list projects)..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/projects" \
  -H "Cookie: better-auth.session_token=$SESSION_TOKEN")

if echo "$RESPONSE" | grep -q "data"; then
    echo -e "${GREEN}✓ List projects passed${NC}"
    echo "Response: $RESPONSE"
else
    echo -e "${RED}✗ List projects failed${NC}"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 6: Get Single Project (if we have a project ID)
if [ ! -z "$PROJECT_ID" ]; then
    echo "6. Testing GET /api/projects/:id (get project)..."
    RESPONSE=$(curl -s -X GET "$BASE_URL/api/projects/$PROJECT_ID" \
      -H "Cookie: better-auth.session_token=$SESSION_TOKEN")

    if echo "$RESPONSE" | grep -q "data"; then
        echo -e "${GREEN}✓ Get project passed${NC}"
        echo "Response (truncated): $(echo "$RESPONSE" | cut -c1-200)..."
    else
        echo -e "${RED}✗ Get project failed${NC}"
        echo "Response: $RESPONSE"
    fi
    echo ""

    # Test 7: Update Project
    echo "7. Testing PUT /api/projects/:id (update project)..."
    RESPONSE=$(curl -s -X PUT "$BASE_URL/api/projects/$PROJECT_ID" \
      -H "Content-Type: application/json" \
      -H "Cookie: better-auth.session_token=$SESSION_TOKEN" \
      -d '{"title":"Updated Test Project","description":"Updated description"}')

    if echo "$RESPONSE" | grep -q "Updated"; then
        echo -e "${GREEN}✓ Update project passed${NC}"
        echo "Response: $RESPONSE"
    else
        echo -e "${RED}✗ Update project failed${NC}"
        echo "Response: $RESPONSE"
    fi
    echo ""

    # Test 8: Add Data Import
    echo "8. Testing POST /api/projects/:id/import (add data import)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/projects/$PROJECT_ID/import" \
      -H "Content-Type: application/json" \
      -H "Cookie: better-auth.session_token=$SESSION_TOKEN" \
      -d '{"sourceType":"url","sourceUrl":"https://example.com/data.json","fileType":"json"}')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" == "201" ]; then
        echo -e "${GREEN}✓ Add data import passed${NC}"
        echo "Response: $BODY"
    else
        echo -e "${RED}✗ Add data import failed (HTTP $HTTP_CODE)${NC}"
        echo "Response: $BODY"
    fi
    echo ""

    # Test 9: Add Labeling Template
    echo "9. Testing POST /api/projects/:id/template (add labeling template)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/projects/$PROJECT_ID/template" \
      -H "Content-Type: application/json" \
      -H "Cookie: better-auth.session_token=$SESSION_TOKEN" \
      -d '{"name":"Image Classification","type":"image_classification","config":{"interfaceType":"classification","labels":["Cat","Dog","Bird"],"multiSelect":false}}')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" == "201" ]; then
        echo -e "${GREEN}✓ Add labeling template passed${NC}"
        echo "Response: $BODY"
    else
        echo -e "${RED}✗ Add labeling template failed (HTTP $HTTP_CODE)${NC}"
        echo "Response: $BODY"
    fi
    echo ""

    # Test 10: Get Project with Templates and Imports
    echo "10. Testing GET /api/projects/:id (with templates and imports)..."
    RESPONSE=$(curl -s -X GET "$BASE_URL/api/projects/$PROJECT_ID" \
      -H "Cookie: better-auth.session_token=$SESSION_TOKEN")

    if echo "$RESPONSE" | grep -q "labelingTemplates"; then
        echo -e "${GREEN}✓ Get project with nested data passed${NC}"
        echo "Response (truncated): $(echo "$RESPONSE" | cut -c1-300)..."
    else
        echo -e "${RED}✗ Get project with nested data failed${NC}"
        echo "Response: $RESPONSE"
    fi
    echo ""

    # Test 11: Delete Project
    echo "11. Testing DELETE /api/projects/:id (delete project)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/projects/$PROJECT_ID" \
      -H "Cookie: better-auth.session_token=$SESSION_TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" == "204" ]; then
        echo -e "${GREEN}✓ Delete project passed${NC}"
    else
        echo -e "${RED}✗ Delete project failed (HTTP $HTTP_CODE)${NC}"
        echo "Response: $(echo "$RESPONSE" | head -n-1)"
    fi
    echo ""
fi

echo "================================="
echo "API Testing Complete"
