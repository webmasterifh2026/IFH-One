# IFH One Deployment Guide

This guide provides step-by-step instructions for deploying the IFH One Procurement Management System to a modern cloud stack.

## Architecture

The system is deployed across three services:
1. **Frontend**: Vercel (Next.js Application)
2. **Backend**: Railway (NestJS Application)
3. **Database**: Neon (Serverless PostgreSQL)

---

## 1. Neon PostgreSQL Setup

1. Create a new project in [Neon](https://neon.tech/).
2. Create a new database (e.g., `ifh_one_prod`).
3. Copy the Connection String. It should look like this:
   `postgresql://[user]:[password]@[endpoint].neon.tech/ifh_one_prod?sslmode=require`
4. Keep this URL handy for both Railway and Vercel.

---

## 2. GitHub Repository Setup

1. Ensure the `main` or `production` branch contains the latest stable code.
2. The root directory contains `.env.example`, `vercel.json`, and `railway.json`.
3. Vercel and Railway will link directly to this repository for continuous deployment.

---

## 3. Railway Backend Deployment

1. Create a new project on [Railway](https://railway.app/).
2. Select **Deploy from GitHub repo** and choose the `ifh-one` repository.
3. Railway will automatically detect the `railway.json` configuration file, which instructs it to build the NestJS app in `apps/api` using Nixpacks.
4. **Environment Variables**: Go to the Variables tab and add the following:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `[Your Neon Connection String]`
   - `PORT`: `3001`
   - `JWT_SECRET`: A secure random string
   - `SESSION_SECRET`: A secure random string
   - `APP_URL`: The URL provided by Railway (e.g., `https://api.yourdomain.com`)
   - `FRONTEND_URL`: The URL provided by Vercel (e.g., `https://app.yourdomain.com`)
5. The `railway.json` file ensures that `prisma generate` and `prisma migrate deploy` run before starting the Node server.
6. Trigger a redeploy if the variables were added after the initial build.

---

## 4. Vercel Frontend Deployment

1. Log into [Vercel](https://vercel.com/) and click **Add New... -> Project**.
2. Import the `ifh-one` repository.
3. **Important Configuration**:
   - Vercel should automatically detect the `vercel.json` file.
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
4. **Environment Variables**: Add the following before clicking Deploy:
   - `NEXT_PUBLIC_APP_NAME`: `IFH One`
   - `NEXT_PUBLIC_API_URL`: `[Your Railway Backend URL]` (e.g., `https://ifh-api.up.railway.app`)
   - `NEXT_PUBLIC_ENVIRONMENT`: `production`
5. Click **Deploy**.

---

## 5. File Upload Considerations

In the current setup, file uploads are stored locally in the `./uploads` folder on the backend server. Since Railway uses ephemeral storage by default:
- **Important**: Add a **Volume** to your Railway service to persist the `./uploads` directory.
- Mount the volume at `/app/apps/api/uploads`.
- Ensure `FILE_UPLOAD_PATH` is set appropriately in your Railway environment variables if you deviate from the default.

---

## Rollback & Troubleshooting

- **Database Errors**: Verify the Neon connection string in Railway. Check if IP restrictions are enabled in Neon.
- **CORS Issues**: Ensure that the `FRONTEND_URL` environment variable on Railway exactly matches the deployed Vercel domain (without trailing slashes).
- **Rollback**: To rollback a deployment, use the respective dashboards on Vercel and Railway to deploy a previous commit.

---

## Final Checklist

- [ ] Database migrated successfully (`npx prisma migrate deploy` executed on Railway startup).
- [ ] Backend health check passes at `https://[railway-url]/health`.
- [ ] Frontend can make API requests without CORS errors.
- [ ] Auth tokens (JWT) are being generated and verified successfully.
