# Two stages: compile the Go binary, then copy it into a slim runtime image
# that also has Chromium — the CS comp scores submissions by rendering them
# in headless Chrome (internal/cscomp/render.go), so the runtime image
# needs a browser, not just the binary.

# ---- build ---------------------------------------------------------------
FROM golang:1.26 AS build
WORKDIR /src

# Download modules first so this layer is cached until go.mod/go.sum change.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# CGO off => a static binary that needs no C libraries in the runtime image.
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api

# ---- runtime -------------------------------------------------------------
FROM debian:bookworm-slim

# Chromium for the renderer; ca-certificates so the Atlas TLS handshake
# verifies. No recommends keeps the image well under a gigabyte.
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /out/api ./api
# Target PNGs the scorer diffs submissions against (CSCOMP_SOLUTIONS_DIR).
COPY images ./images

# Chrome refuses to run as root without --no-sandbox anyway, and a
# dedicated user keeps the blast radius small either way.
RUN useradd --system --create-home --uid 10001 app
USER app

# CHROME_NO_SANDBOX: Chrome's sandbox needs kernel privileges hosted
# containers don't grant. The rendered pages run with scripting off and
# every network request blocked (render.go), so dropping it is acceptable.
ENV CHROME_PATH=/usr/bin/chromium \
    CHROME_NO_SANDBOX=1

# Documentation only: the server listens on $PORT, which the host injects
# (Railway does); config.go falls back to 8082 when it is unset.
EXPOSE 8082

CMD ["./api"]
