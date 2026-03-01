# Production Deployment Guide for AlumniTrust AI

This guide covers deploying AlumniTrust AI to a production environment with proper scaling, security, and monitoring.

---

## 📋 Production Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet / HTTPS                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │   AWS CloudFront    │ (CDN)
                │   (caching layer)   │
                └──────────┬──────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────▼─────────┐              ┌───────────▼────────┐
│  React Frontend │              │  FastAPI Backend   │
│  (S3 + CDN)     │              │  (EC2/ECS + ALB)   │
│  (SPA)          │              │ (Multi-AZ)         │
└─────────────────┘              └───────────┬────────┘
                                             │
        ┌────────────────────────────────────┼────────────────────┐
        │                                    │                    │
┌───────▼───────────┐         ┌─────────────▼─────────┐   ┌──────▼────────┐
│  PostgreSQL RDS   │         │   ChromaDB Instance   │   │ OpenAI API    │
│  (Managed DB)     │         │   (Persistent vDB)    │   │ (Third-party) │
│  (Multi-AZ)       │         │ (EC2/managed service) │   └───────────────┘
│  (Encrypted)      │         └───────────────────────┘
└───────────────────┘
        │
        │ (Automated Backups)
        │
┌───────▼────────────────┐
│  S3 Backup Bucket      │
│  (Cross-region)        │
└────────────────────────┘
```

---

## 🏗️ Infrastructure as Code (Example: Terraform)

### 1. VPC & Security Groups

```hcl
# vpc.tf
resource "aws_vpc" "alumnistrust" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "alumnistrust-vpc"
  }
}

resource "aws_security_group" "alb" {
  name        = "alumnistrust-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.alumnistrust.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "backend" {
  name        = "alumnistrust-backend-sg"
  description = "Security group for backend"
  vpc_id      = aws_vpc.alumnistrust.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### 2. RDS PostgreSQL

```hcl
# rds.tf
resource "aws_db_instance" "alumnistrust" {
  identifier              = "alumnistrust-db"
  engine                  = "postgres"
  engine_version          = "15.3"
  instance_class          = "db.t3.medium"
  allocated_storage       = 100
  storage_encrypted       = true
  storage_type            = "gp3"
  
  db_name  = "alumnistrust"
  username = "postgres"
  password = random_password.db_password.result
  
  # HA Configuration
  multi_az               = true
  publicly_accessible    = false
  skip_final_snapshot    = false
  final_snapshot_identifier = "alumnistrust-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  # Backup
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  
  # Performance Insights
  performance_insights_enabled = true
  
  # Monitoring
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.alumnistrust.name

  tags = {
    Name = "alumnistrust-database"
  }
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "alumnistrust/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id      = aws_secretsmanager_secret.db_password.id
  secret_string  = random_password.db_password.result
}
```

### 3. ECS Task Definition (FastAPI Backend)

```hcl
# ecs.tf
resource "aws_ecs_task_definition" "backend" {
  family                   = "alumnistrust-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"
    
    portMappings = [{
      containerPort = 8000
      hostPort      = 8000
      protocol      = "tcp"
    }]

    environment = [
      {
        name  = "DATABASE_URL"
        value = "postgresql://${aws_db_instance.alumnistrust.username}:$(DB_PASSWORD)@${aws_db_instance.alumnistrust.endpoint}:5432/${aws_db_instance.alumnistrust.db_name}"
      },
      {
        name  = "ENVIRONMENT"
        value = "production"
      }
    ]

    secrets = [
      {
        name      = "OPENAI_API_KEY"
        valueFrom = "${aws_secretsmanager_secret.openai_key.arn}"
      },
      {
        name      = "SECRET_KEY"
        valueFrom = "${aws_secretsmanager_secret.jwt_secret.arn}"
      },
      {
        name      = "DB_PASSWORD"
        valueFrom = "${aws_secretsmanager_secret.db_password.arn}"
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/alumnistrust-backend"
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8000/api/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 2
      startPeriod = 60
    }
  }])

  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn
}
```

---

## 🔐 Security Hardening

### Environment Variables Management

```bash
# Do NOT commit these
export OPENAI_API_KEY="sk-..."
export SECRET_KEY="$(openssl rand -hex 32)"
export DATABASE_URL="postgresql://user:password@host/db"

# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name alumnistrust/openai-api-key \
  --secret-string "$OPENAI_API_KEY"

aws secretsmanager create-secret \
  --name alumnistrust/jwt-secret \
  --secret-string "$SECRET_KEY"
```

### HTTPS/TLS Configuration

```python
# main.py (production)
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# Add HTTPS redirect
app.add_middleware(HTTPSRedirectMiddleware)

# Add HSTS header
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["alumnistrust.almabase.com"]
)

# Add security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response
```

### Database Security

```python
# models.py (production)
# Use environment-based connection string
from sqlalchemy import create_engine
import os

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    # Production settings
    echo=False,
    pool_size=20,
    max_overflow=40,
    pool_recycle=3600,
    ssl={"ssl": True}  # Enforce SSL
)
```

---

## 📊 Monitoring & Observability

### CloudWatch Dashboard

```python
# monitoring.py
import boto3

cloudwatch = boto3.client('cloudwatch')

CUSTOM_METRICS = {
    "QuestionsProcessed": {
        "namespace": "AlumniTrust",
        "unit": "Count"
    },
    "AverageConfidenceScore": {
        "namespace": "AlumniTrust",
        "unit": "Percent"
    },
    "NotFoundRate": {
        "namespace": "AlumniTrust",
        "unit": "Percent"
    },
    "ProcessingTimeSeconds": {
        "namespace": "AlumniTrust",
        "unit": "Seconds"
    }
}

def log_metric(metric_name: str, value: float):
    cloudwatch.put_metric_data(
        Namespace="AlumniTrust",
        MetricData=[{
            "MetricName": metric_name,
            "Value": value,
            "Unit": CUSTOM_METRICS[metric_name]["unit"]
        }]
    )
```

### Example: Instrument FastAPI with OpenTelemetry

```python
# main.py
from opentelemetry import trace, metrics
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Setup tracing
otlp_exporter = OTLPSpanExporter(otlp_endpoint="http://jaeger:4317")
trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(otlp_exporter)
)

# Instrument FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument()
```

### Alerting Rules

```yaml
# alert-rules.yaml (Prometheus)
groups:
  - name: alumnistrust
    rules:
      # Alert if error rate > 5%
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      # Alert if processing time > 5 seconds
      - alert: SlowProcessing
        expr: histogram_quantile(0.95, rate(processing_time_seconds[5m])) > 5
        for: 10m
        annotations:
          summary: "Slow questionnaire processing detected"

      # Alert if "Not found" rate > 20%
      - alert: HighNotFoundRate
        expr: |
          (
            increase(questions_not_found[1h]) /
            increase(questions_processed_total[1h])
          ) > 0.2
        for: 5m
        annotations:
          summary: "High proportion of unanswerable questions"

      # Alert if database connection pool exhausted
      - alert: DBConnectionPoolExhausted
        expr: >
          db_pool_checkedout_connections /
          db_pool_size > 0.9
        for: 5m
        annotations:
          summary: "Database connection pool nearly full"
```

---

## 🚀 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.10"
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: pytest tests/ --cov=. --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: alumnistrust-backend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG backend/
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster alumnistrust \
            --service alumnistrust-backend \
            --force-new-deployment

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
      
      - name: Install dependencies and build
        working-directory: frontend
        run: |
          npm install
          npm run build
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to S3
        run: aws s3 sync frontend/dist/ s3://alumnistrust-frontend --delete
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/*"
```

---

## 📈 Scaling Strategy

### Load Testing with Locust

```python
# load_test.py
from locust import HttpUser, task, between

class AlumniTrustUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Register/login
        self.client.post("/api/auth/register", json={
            "username": f"user_{self.client.session_id}",
            "email": f"user_{self.client.session_id}@test.com",
            "password": "TestPassword123!"
        })
    
    @task
    def upload_questionnaire(self):
        with open("SAMPLE_QUESTIONNAIRE.csv") as f:
            self.client.post(
                "/api/questionnaire/upload",
                files={"file": f},
                data={"task_name": "load_test", "token": self.token}
            )
    
    @task
    def get_task_results(self):
        self.client.get("/api/tasks/1")  # Assume task ID 1
    
    @task(3)
    def export_task(self):
        self.client.get("/api/tasks/1/export")

# Run with:
# locust -f load_test.py -u 100 -r 10 -t 5m http://localhost:8000
```

---

## 🔄 Disaster Recovery

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily automated backup

DB_NAME="alumnistrust"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="s3://alumnistrust-backups"

# PostgreSQL backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | \
  gzip | \
  aws s3 cp - "$S3_BUCKET/pg-backup-$BACKUP_DATE.sql.gz"

# ChromaDB backup (if using local storage)
tar -czf chroma-backup-$BACKUP_DATE.tar.gz ./chroma_db
aws s3 cp chroma-backup-$BACKUP_DATE.tar.gz "$S3_BUCKET/"

# Document storage backup
aws s3 sync s3://alumnistrust-documents "$S3_BUCKET/docs-backup-$BACKUP_DATE/"

# Cleanup old backups (keep 30 days)
aws s3 rm "$S3_BUCKET" --recursive --exclude "*" \
  --include "pg-backup-*" \
  --older-than 30
```

### Recovery Procedure

```bash
#!/bin/bash
# recover.sh - Restore from backup

BACKUP_DATE=$1
S3_BUCKET="s3://alumnistrust-backups"

# Download backup
aws s3 cp "$S3_BUCKET/pg-backup-$BACKUP_DATE.sql.gz" - | \
  gunzip | \
  psql -h $DB_HOST -U $DB_USER $DB_NAME

# Restore ChromaDB
aws s3 cp "$S3_BUCKET/chroma-backup-$BACKUP_DATE.tar.gz" - | \
  tar -xz -C ./

echo "Recovery complete"
```

---

## ✅ Pre-Production Checklist

- [ ] Network security groups configured
- [ ] RDS multi-AZ enabled with automated backups
- [ ] TLS certificates configured (ACM)
- [ ] CloudWatch monitoring and alarms set up
- [ ] Application logging to CloudWatch
- [ ] Rate limiting enabled on API endpoints
- [ ] CORS configured for production domain
- [ ] Database connection pooling optimized
- [ ] OpenAI API cost limits set in console
- [ ] Secrets Manager configured for all credentials
- [ ] S3 bucket versioning and encryption enabled
- [ ] CDN caching policies defined
- [ ] Health checks configured for ECS
- [ ] Database backups tested and verified
- [ ] Disaster recovery playbook documented
- [ ] Load testing completed, scaling configured

---

**Ready for production deployment! 🚀**
