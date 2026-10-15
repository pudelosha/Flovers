Generated sketches verify HTTPS server certificates and require a synchronized clock. They do not send device credentials over HTTP or accept an untrusted TLS server.

The bundled `tls_roots.pem` contains the self-signed ISRG Root X1 and X2 certificates downloaded from the [Let's Encrypt certificate catalog](https://letsencrypt.org/certificates/). It supports the Let's Encrypt certificate chains commonly used by Caddy and Traefik. Check the actual issuer used by your VPS; a different issuer requires its trusted CA PEM through `IOT_TLS_CA_CERT` before generating firmware. Include the trusted root, not a short-lived site certificate.

SHA-256 fingerprints:

- X1: `96bcec06264976f37460779acf28c5a7cfe8a3c0aae11a8ffcee05c0bddf08c6`
- X2: `69729b8e15a86efc177a57afb7171dfc64add28c2fca8cf1507e34453ccb1470`

Certificate changes require regenerating and installing sketches. Existing firmware cannot gain certificate verification through a backend deployment. Keep the bundled roots under review for the lifetime of installed devices; certificate verification fails closed if the chain, hostname, or time is invalid.
