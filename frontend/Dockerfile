FROM node:20.14.0-alpine@sha256:082567d367e7816c7c9ddea38b0258ffbd812e3b6cc2eb84fcab748a13a76f4d AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM base AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api
ARG VITE_CLERK_PUBLISHABLE_KEY=
ARG VITE_CLERK_PROXY_URL=/__clerk
ARG VITE_CLERK_FRONTEND_API_URL=
ARG VITE_CLERK_DOMAIN=
ARG VITE_GUIDES_URL=
ARG VITE_GUIDES_API_URL=
ARG VITE_GUIDES_HANDOFF_URL=
ARG VITE_GUIDES_COMPANY_SLUG=traumatec-cm
ARG VITE_ONLYOFFICE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY \
    VITE_CLERK_PROXY_URL=$VITE_CLERK_PROXY_URL \
    VITE_CLERK_FRONTEND_API_URL=$VITE_CLERK_FRONTEND_API_URL \
    VITE_CLERK_DOMAIN=$VITE_CLERK_DOMAIN \
    VITE_GUIDES_URL=$VITE_GUIDES_URL \
    VITE_GUIDES_API_URL=$VITE_GUIDES_API_URL \
    VITE_GUIDES_HANDOFF_URL=$VITE_GUIDES_HANDOFF_URL \
    VITE_GUIDES_COMPANY_SLUG=$VITE_GUIDES_COMPANY_SLUG \
    VITE_ONLYOFFICE_URL=$VITE_ONLYOFFICE_URL
RUN npx vite build

FROM nginx:1.27.4-alpine@sha256:a71e0884a7f1192ecf5decf062b67d46b54ad63f0cc1b8aa7e705f739a97c2fc AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
