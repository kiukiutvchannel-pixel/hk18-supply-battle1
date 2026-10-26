FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json build.mjs server.mjs ./
COPY dist ./dist
RUN node build.mjs
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
