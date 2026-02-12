# NewsFlash API (apps/api)

Kotlin + Spring Boot backend.

## Common commands (run from repo root)

Test:

```zsh
./gradlew :apps:api:test
```

Run (default port 8080):

```zsh
./gradlew :apps:api:bootRun
```

Run on a different port (useful if 8080 is busy):

```zsh
./gradlew :apps:api:bootRun --args='--server.port=8081'
```

Health check:

```zsh
curl -i http://localhost:8081/actuator/health
```
