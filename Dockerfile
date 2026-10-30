FROM node:24.15.0-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig*.json ./
COPY src/ src/
RUN npm run build

FROM nginx:1.30.2-alpine@sha256:5f979dcfed4ce6461873f087e8c980d6e29b084b9e8776d9704a7e989b5f4898
COPY --from=build /build/dist/ /usr/share/nginx/html/
COPY deployment/nginx.conf.template /etc/nginx/servibox.conf.template
COPY deployment/start.sh /opt/servibox/start.sh
RUN sed -i 's/\r$//' /opt/servibox/start.sh && chmod 555 /opt/servibox/start.sh
USER 101:101
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/opt/servibox/start.sh"]
