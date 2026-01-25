# Database Setup Guide

## Prerequisites
- PostgreSQL installed locally OR
- DigitalOcean PostgreSQL database (managed)

## Local Development Setup

### 1. Install PostgreSQL locally (if not using managed database)
- Windows: Download from https://www.postgresql.org/download/windows/
- Mac: `brew install postgresql`
- Linux: `sudo apt-get install postgresql`

### 2. Create Database
```sql
CREATE DATABASE rush_id_db;
CREATE USER rush_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rush_id_db TO rush_user;
```

### 3. Update Environment Variables
Edit `.env.local`:
```env
DATABASE_URL=postgresql://rush_user:your_password@localhost:5432/rush_id_db?schema=public
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
```

### 4. Run Database Migrations
```bash
npm run db:generate  # Generate Prisma Client
npm run db:push       # Push schema to database (or use db:migrate for versioned migrations)
npm run db:seed       # Seed initial user (CJNET)
```

### 5. Verify Setup
```bash
npm run db:studio     # Open Prisma Studio to view database
```

## DigitalOcean Deployment

### 1. Create Managed Database
- Go to DigitalOcean → Databases → Create Database
- Choose PostgreSQL
- Select region and plan
- Note the connection string

### 2. Update Environment Variables
In your DigitalOcean App Platform or Droplet:
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret-key
```

### 3. Run Migrations in Production
```bash
npm run db:push
npm run db:seed
```

## Database Models

### User
- Stores user accounts and authentication
- Fields: id, username, password (hashed), email, name

### Image
- Stores generated images
- Fields: id, userId, originalUrl, processedUrl, size, status, metadata

### History
- Tracks user actions
- Fields: id, userId, imageId, action, details, createdAt

### Log
- System logs and analytics
- Fields: id, userId, action, endpoint, statusCode, message, metadata

## Next Steps

1. **Password Hashing**: Update seed script and login to use bcrypt
2. **File Storage**: Set up S3 or DigitalOcean Spaces for image storage
3. **Session Management**: Implement proper session handling with NextAuth
4. **API Routes**: Update all API routes to use database
