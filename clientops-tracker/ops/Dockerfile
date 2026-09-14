FROM postgres:16-alpine
RUN --mount=type=secret,id=build_ca \
    cp /etc/ssl/cert.pem /tmp/original-ca.pem && \
    if [ -f /run/secrets/build_ca ]; then cat /run/secrets/build_ca >> /etc/ssl/cert.pem; fi && \
    apk add --no-cache restic curl openssl && \
    cp /tmp/original-ca.pem /etc/ssl/cert.pem && rm /tmp/original-ca.pem
COPY ops/operate.sh /usr/local/bin/clientops-operate
RUN chmod 755 /usr/local/bin/clientops-operate
ENTRYPOINT ["/usr/local/bin/clientops-operate"]
