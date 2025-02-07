# OFFbook Project Specification

## Project Overview
OFFbook is an AI-powered platform for practicing acting and dialogue delivery, providing real-time feedback and performance analysis.

## Core Components

### 1. Database Schema
- Users (Authentication and profiles)
- Scripts (Play/scene scripts)
- Characters (Character information and traits)
- Sessions (Practice sessions)
- Performances (User performance data)
- Recordings (Audio recordings)
- Feedback (AI-generated feedback)
- TTSCache (Text-to-speech cache)

### 2. API Endpoints

#### Authentication
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

#### Scripts
- GET /scripts
- POST /scripts
- GET /scripts/{id}
- PUT /scripts/{id}
- DELETE /scripts/{id}

#### Sessions
- GET /sessions
- POST /sessions
- GET /sessions/{id}
- PUT /sessions/{id}
- DELETE /sessions/{id}

#### Performance
- POST /performance/analyze
- GET /performance/{id}/feedback
- POST /performance/record

### 3. Dependencies
```toml
[dependencies]
fastapi = "^0.100.0"
sqlalchemy = "^2.0.0"
asyncpg = "^0.28.0"
python-jose = "^3.3.0"
passlib = "^1.7.4"
python-multipart = "^0.0.6"
python-dotenv = "^1.0.0"
uvicorn = "^0.23.0"
```

### 4. Environment Variables
```env
ASYNC_DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/offbook
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## Expected Behavior

### 1. User Authentication
- Secure registration and login
- JWT token-based authentication
- Token refresh mechanism
- Password hashing and validation

### 2. Script Management
- Upload and parse scripts
- Character identification
- Scene segmentation
- Metadata extraction

### 3. Practice Sessions
- Real-time audio recording
- Performance analysis
- Emotion detection
- Pronunciation scoring
- Timing analysis

### 4. Feedback System
- Real-time feedback
- Performance metrics
- Improvement suggestions
- Historical analysis

## UI Components

### 1. Authentication Pages
- Login form
- Registration form
- Password reset

### 2. Script Management
- Script upload interface
- Script editor
- Character assignment
- Scene breakdown

### 3. Practice Interface
- Audio recording controls
- Real-time feedback display
- Performance metrics
- Character selection

### 4. Dashboard
- Performance history
- Recent scripts
- Practice statistics
- Improvement tracking

## Technical Requirements

### 1. Performance
- Response time < 100ms for API endpoints
- Audio processing latency < 500ms
- Support for concurrent users
- Efficient database queries

### 2. Security
- HTTPS encryption
- JWT token validation
- SQL injection prevention
- XSS protection
- CORS configuration

### 3. Scalability
- Horizontal scaling capability
- Caching mechanisms
- Connection pooling
- Load balancing ready

### 4. Monitoring
- Error logging
- Performance metrics
- User analytics
- System health checks

## Development Workflow

### 1. Version Control
- Git-based workflow
- Feature branches
- Pull request reviews
- Semantic versioning

### 2. Testing
- Unit tests
- Integration tests
- End-to-end tests
- Performance testing

### 3. Deployment
- CI/CD pipeline
- Docker containerization
- Environment configuration
- Backup strategy

### 4. Documentation
- API documentation
- Code documentation
- User guides
- Deployment guides

## Backup Strategy

### 1. Automated Backups
- Daily database backups
- Code repository backups
- Configuration backups
- User data backups

### 2. Backup Rotation
- Keep last 7 daily backups
- Keep last 4 weekly backups
- Keep last 3 monthly backups
- Automated cleanup

### 3. Restore Procedures
- Database restore
- Code restore
- Configuration restore
- Verification process 