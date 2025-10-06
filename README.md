# CyberCheck - AI-Powered Cybersecurity Log Analysis Platform

A full-stack web application for analyzing cybersecurity logs with AI-powered anomaly detection and threat identification. Built with Next.js, Node.js, PostgreSQL, and OpenAI GPT models.

## 🚀 Features

- **Multi-Log Format Support**: Currently supports Cloudflare One logs with extensible architecture for future formats (Palo Alto Networks, Cisco Umbrella)
- **AI-Powered Anomaly Detection**: Uses OpenAI GPT-3.5-turbo models to identify suspicious patterns and security threats
- **Real-time Analysis**: Fast processing with confidence scoring and detailed explanations
- **Interactive Dashboard**: Modern React interface with charts, timelines, and detailed analysis views
- **User Authentication**: Secure JWT-based authentication with user management
- **Smart File Upload**: Drag-and-drop interface with mandatory file naming to prevent duplicates
- **Comprehensive Analysis Persistence**: Complete analysis results saved and retrievable
- **Advanced Timeline Visualization**: Activity charts with proper date handling and loading states
- **Detailed Anomaly Tracking**: Individual log entry marking with anomaly scores and reasons
- **Enhanced Recommendations**: Comprehensive AI-generated security recommendations
- **Threat Intelligence**: Identifies DDoS attacks, scanning attempts, data exfiltration, and more

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Authentication**: JWT-based user authentication with bcrypt password hashing
- **Log Parsing**: Extensible parser factory supporting multiple log formats
- **AI Analysis**: OpenAI GPT-3.5-turbo integration for anomaly detection
- **Database**: PostgreSQL with optimized indexes and anomaly details tracking
- **File Management**: Multer-based file upload with validation and unique naming
- **Rate Limiting**: Configurable API rate limiting (200 requests/minute)

### Frontend (Next.js/TypeScript)
- **Modern UI**: Tailwind CSS with responsive design
- **State Management**: React Context for authentication and data management
- **Charts & Visualization**: Recharts for timeline and statistical analysis
- **File Upload**: React Dropzone for drag-and-drop file uploads

### Database Schema
- **Users**: Authentication and profile management
- **Log Files**: Metadata for uploaded files with entry and anomaly counts
- **Log Entries**: Parsed log data with anomaly flags, scores, and reasons
- **Analysis Sessions**: AI analysis results, summaries, and confidence scores
- **Anomaly Details**: Detailed anomaly information with types, descriptions, and metadata

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, PostgreSQL
- **AI/ML**: OpenAI GPT-3.5-turbo API
- **Authentication**: JWT, bcryptjs
- **File Upload**: Multer, react-dropzone
- **Charts**: Recharts
- **Deployment**: Docker, Docker Compose

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Docker & Docker Compose (optional)
- OpenAI API key

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/joshuaconk14/CyberCheck.git
   cd CyberCheck
   ```

2. **Set up environment variables**
   ```bash
   # Create .env file in the root directory
   touch .env
   ```
   Edit `.env` and add your configuration:
   ```env
   # Database
   DATABASE_URL=postgresql://cybercheck_user:cybercheck_password@postgres:5432/cybercheck_db
   
   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-here
   
   # OpenAI API
   OPENAI_API_KEY=your-openai-api-key-here
   
   # Server Configuration
   PORT=3001
   NODE_ENV=production
   CLIENT_URL=http://localhost:3000
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5433 (mapped to container port 5432)

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm run setup
   ```

2. **Set up PostgreSQL database**
   ```bash
   createdb cybercheck_db
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file in the root directory
   touch .env
   ```
   Edit `.env` and configure your local settings:
   ```env
   # Database (update with your local PostgreSQL credentials)
   DATABASE_URL=postgresql://username:password@localhost:5432/logapp_db
   
   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-here
   
   # OpenAI API
   OPENAI_API_KEY=your-openai-api-key-here
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   ```

4. **Start the development servers**
   ```bash
   # Start backend
   cd server && npm start
   
   # In another terminal, start frontend
   cd client && npm run dev
   ```

### Option 3: Docker Development Mode

For development with hot reloading:

1. **Set up environment variables** (same as Docker Compose)
2. **Start PostgreSQL only**
   ```bash
   docker-compose up -d postgres
   ```
3. **Run backend in Docker**
   ```bash
   docker-compose up backend
   ```
4. **Run frontend locally with hot reloading**
   ```bash
   cd client && npm run dev
   ```

This setup allows for:
- Hot reloading of frontend changes
- Backend running in Docker with database access
- Easy debugging and development workflow

## 📊 AI Usage Documentation

### Anomaly Detection Process

The application uses a two-stage analysis approach:

1. **Statistical Analysis**: 
   - IP frequency analysis
   - Status code pattern detection
   - User agent analysis
   - Time-based pattern recognition
   - URL pattern analysis

2. **AI Analysis**:
   - OpenAI GPT-3.5-turbo processes suspicious entries
   - Provides confidence scores (0-1)
   - Generates detailed explanations
   - Offers comprehensive security recommendations
   - Saves complete analysis results to database

### AI Model Integration

**Location**: `server/services/AnomalyDetectionService.js`

**Key Functions**:
- `analyzeAnomalies()`: Main analysis orchestration
- `performAIAnalysis()`: OpenAI GPT-3.5-turbo integration
- `buildAnalysisPrompt()`: Structured prompt creation with enhanced recommendations
- `parseAIResponse()`: Response parsing and validation

**Prompt Engineering**:
- Structured JSON output format
- Cybersecurity context and expertise
- Confidence scoring requirements
- Detailed explanation requests

### Confidence Scoring

- **High (0.8-1.0)**: Clear security threats with strong indicators
- **Medium (0.5-0.8)**: Suspicious patterns requiring investigation
- **Low (0.3-0.5)**: Potential issues for monitoring

## 📁 Project Structure

```
CyberCheck/
├── client/                 # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/              # API client and utilities
│   └── public/           # Static assets
├── server/               # Node.js backend
│   ├── config/          # Database configuration
│   ├── parsers/         # Log format parsers
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── utils/           # Utilities and helpers
├── sample-logs/         # Example log files
├── docker-compose.yml   # Docker orchestration
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables

**Backend** (`.env` in root directory):
```env
   DATABASE_URL=postgresql://user:password@localhost:5432/cybercheck_db
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=your-openai-api-key
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

**Frontend** (`client/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification
- `GET /api/auth/profile` - User profile

### File Management
- `POST /api/upload` - Upload log file
- `GET /api/upload` - List user files
- `GET /api/upload/:id` - Get file details
- `DELETE /api/upload/:id` - Delete file

### Analysis
- `POST /api/analysis/analyze/:fileId` - Run AI analysis
- `GET /api/analysis/results/:fileId` - Get analysis results with timeline
- `GET /api/analysis/sessions` - List analysis sessions

## 🧪 Testing

Use the provided sample Cloudflare One log files:
```bash
# Upload the sample files through the web interface
# Located at: sample-logs/cloudflare-one-sample.jsonl
# Also available: test-logs.jsonl for comprehensive testing
```

The sample contains:
- Normal user traffic patterns
- Suspicious user agents (curl, sqlmap)
- Blocked requests from different countries
- High-frequency requests from single IPs
- Various HTTP status codes for testing anomaly detection

### Testing Features
1. **File Upload**: Test with different file formats (.jsonl, .json, .txt, .log, .csv)
2. **File Naming**: Verify mandatory naming step prevents duplicates
3. **Analysis**: Run analysis and verify anomaly detection
4. **Timeline**: Check activity timeline displays correctly
5. **Persistence**: Verify analysis results persist when viewing details
6. **Button Functionality**: Test "Analyze" vs "View Details" button behavior

## 🚀 Deployment

### Production Deployment

1. **Update environment variables** for production
2. **Set strong JWT secret** and database credentials
3. **Configure reverse proxy** (nginx) for SSL termination
4. **Set up monitoring** and logging
5. **Configure backup** for PostgreSQL database

### Cloud Deployment (GCP/AWS/Azure)

The application is containerized and ready for cloud deployment:
- Use managed PostgreSQL services
- Deploy containers to Kubernetes or container services
- Configure load balancing and auto-scaling
- Set up monitoring and alerting

## 🔒 Security Considerations

- JWT tokens with expiration
- Password hashing with bcrypt
- File upload validation and size limits
- SQL injection prevention with parameterized queries
- CORS configuration
- Rate limiting on API endpoints
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙋‍♂️ Support

For questions or issues:
- Create an issue in the repository
- Check the troubleshooting section below

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **OpenAI API Errors**
   - Verify OPENAI_API_KEY is set correctly
   - Check API key permissions and billing
   - Monitor rate limits

3. **File Upload Issues**
   - Check file size limits (10MB max)
   - Verify file format is supported (.txt, .log, .csv, .json, .jsonl)
   - Ensure uploads directory exists
   - Complete the mandatory file naming step

4. **Frontend Build Errors**
   - Clear Next.js cache: `rm -rf .next`
   - Reinstall dependencies: `npm install`
   - Check Node.js version compatibility

5. **Analysis Display Issues**
   - Timeline not showing dates: Hard refresh browser or restart frontend
   - Analysis results not persisting: Check database connection and anomaly_details table
   - "NaN" in entry counts: Verify log_entries table has data for the file

6. **Rate Limiting Issues**
   - 429 Too Many Requests: Wait for rate limit reset (200 requests/minute)
   - Restart backend container to reset in-memory rate limit counter
