# civicshield/Dockerfile
FROM node:22-slim
WORKDIR /app
COPY server/package*.json server/
RUN cd server && npm install --omit=dev
COPY . .
ENV NODE_ENV=production PORT=3000 TRUST_PROXY=1 DB_PATH=/data/civicshield.db
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server/server.js"]