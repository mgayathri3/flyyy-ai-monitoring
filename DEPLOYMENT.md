# FLYYY.AI Deployment Guide

## Quick Start (Local Development)

### Option 1: Using Docker Compose (Recommended)

```bash
# Start all services (PostgreSQL + Backend)
docker-compose up --build

# In a new terminal, start frontend
cd frontend/project
npm install
npm run dev
```

Then access:
- **Frontend**: http://localhost:5173
- **Backend API**: http://127.0.0.1:8000
- **API Docs**: http://127.0.0.1:8000/docs
- **Database**: localhost:5432 (postgres:postgres)

### Option 2: Manual Setup

#### Prerequisites
- PostgreSQL 13+
- Python 3.10+
- Node.js 18+

#### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
python init_db.py

# Start backend
uvicorn app.main:app --reload --port 8000
```

#### Frontend Setup

```bash
# Navigate to frontend
cd frontend/project

# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## Production Deployment

### Environment

Ensure you have:
- PostgreSQL 13+ (managed service recommended)
- Python 3.10+ runtime
- Node.js 18+ (for building frontend)

### Backend Deployment

#### Option A: Cloud Platform (Recommended)

**Heroku**:
```bash
# Install Heroku CLI
# Create app
heroku create flyyy-ai-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:standard-0 -a flyyy-ai-backend

# Set environment variables
heroku config:set PROMPT_MONITORING_ENABLED=true -a flyyy-ai-backend
heroku config:set RETENTION_DAYS=90 -a flyyy-ai-backend
heroku config:set AI_PROVIDER=openai -a flyyy-ai-backend
heroku config:set AI_API_KEY=sk-... -a flyyy-ai-backend

# Deploy
git push heroku main
```

**Railway**:
```bash
# Connect GitHub repository at railway.app
# Set environment variables in Railway dashboard
# Deploy automatically on git push
```

**AWS (ECS/Fargate)**:
```bash
# Build Docker image
docker build -t flyyy-ai-backend:latest .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag flyyy-ai-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/flyyy-ai-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/flyyy-ai-backend:latest

# Deploy using Fargate or ECS
```

#### Option B: Docker on VPS

```bash
# Build image
docker build -t flyyy-ai-backend:prod .

# Run container
docker run -d \
  --name flyyy-backend \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e PROMPT_MONITORING_ENABLED=true \
  -e AI_PROVIDER=openai \
  -e AI_API_KEY=sk-... \
  flyyy-ai-backend:prod
```

### Frontend Deployment

#### Vercel (Recommended for React/Vite)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend/project
vercel

# Set environment variable
vercel env add VITE_API_URL https://your-backend-domain.com
```

**Vercel Settings**:
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

#### Netlify

```bash
# Connect GitHub repository at netlify.com
# Build settings:
# - Build command: npm run build
# - Publish directory: dist
# Set environment: VITE_API_URL=https://your-backend-domain.com
```

#### AWS S3 + CloudFront

```bash
# Build frontend
cd frontend/project
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name/

# Create CloudFront distribution pointing to S3 bucket
```

---

## Database Setup

### Using Managed PostgreSQL

**AWS RDS**:
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier flyyy-ai \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --allocated-storage 20
```

**Supabase**:
```bash
# Create project at supabase.com
# Get connection string from project settings
# Use in DATABASE_URL environment variable
```

### Initialize Schema

```bash
# Connect to production database
psql postgresql://user:password@host:5432/flyyy_ai

# Run schema
\i schema.sql

# Seed demo data (optional)
\i seed.sql
```

---

## Environment Configuration

### Backend Environment Variables

**Minimum (Demo Mode)**:
```env
DATABASE_URL=postgresql://user:pass@host:5432/flyyy_ai
PROMPT_MONITORING_ENABLED=true
RETENTION_DAYS=30
AI_PROVIDER=demo
AI_MODEL=demo-support-v1
```

**Production (Real AI)**:
```env
DATABASE_URL=postgresql://user:pass@host:5432/flyyy_ai
PROMPT_MONITORING_ENABLED=true
RETENTION_DAYS=90
AI_PROVIDER=openai
AI_MODEL=gpt-4
AI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com/v1
```

### Frontend Environment Variables

**Build-time**:
```env
VITE_API_URL=https://your-api-domain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## HTTPS/SSL Certificate

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Auto-renew
sudo systemctl enable certbot.timer
```

### Using Cloudflare

```bash
# Add domain to Cloudflare
# Set SSL to Full (strict) mode
# Use Cloudflare DNS nameservers
```

---

## Monitoring & Observability

### Application Monitoring

**Production Recommendations**:
- Use application monitoring (New Relic, Datadog, Sentry)
- Setup error tracking (Sentry)
- Monitor database performance

**Example: Sentry Integration**
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1
)
```

### Logging

**Production Setup**:
```bash
# Use structured logging
# Forward to CloudWatch, Datadog, or Loggly
# Monitor application and database logs
```

---

## Security Checklist

- [ ] Database password is strong (20+ chars, symbols)
- [ ] API key stored securely (secrets manager, not in code)
- [ ] HTTPS enforced on all endpoints
- [ ] CORS configured for your domain only
- [ ] Database backups enabled and tested
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Secrets never committed to git
- [ ] `.env` added to `.gitignore`
- [ ] Regular security updates applied

---

## Scaling Considerations

### Horizontal Scaling
```bash
# Multiple backend instances behind load balancer
# Use AWS ELB, Nginx, or Kubernetes
docker run -d --name backend-1 -p 8001:8000 flyyy-ai-backend
docker run -d --name backend-2 -p 8002:8000 flyyy-ai-backend
docker run -d --name backend-3 -p 8003:8000 flyyy-ai-backend
```

### Database Scaling
- Use PostgreSQL read replicas for high query volume
- Consider connection pooling (PgBouncer)
- Implement caching (Redis) for frequent queries

### Frontend Optimization
- Use CDN (CloudFront, Cloudflare, etc.)
- Enable gzip compression
- Implement code splitting
- Optimize images

---

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql postgresql://user:pass@host:5432/db

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log
```

### Backend Won't Start
```bash
# Check logs
docker logs flyyy-backend

# Verify environment variables
docker inspect flyyy-backend | grep Env

# Verify database is running
docker logs flyyy-postgres
```

### CORS Errors
- Update `CORS_ORIGINS` in backend configuration
- Ensure frontend and backend are on same protocol (https)
- Check browser console for specific CORS error

---

## Maintenance

### Regular Tasks

**Weekly**:
- Monitor error rates
- Review logs

**Monthly**:
- Review retention and delete old records
- Backup database
- Check for security updates

**Quarterly**:
- Load testing
- Performance optimization
- Security audit

---

## Support

For issues or questions:
1. Check logs: `docker logs <container-name>`
2. Review troubleshooting section above
3. Check GitHub issues
4. Contact FLYYY.AI support

---

## Additional Resources

- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [React Production Build](https://create-react-app.dev/docs/production-build/)
- [PostgreSQL Backup/Restore](https://www.postgresql.org/docs/current/backup.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [OWASP Security Guidelines](https://owasp.org/)
