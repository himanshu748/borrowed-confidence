# Stateful prototype deployment

Prepared October 30, 2026. This is a deployment procedure, not evidence that this revision is deployed. Record the final commit, image digest and hosted checks in `FINALIZATION_STATUS.md` after execution.

## Selected environment and limits

Use a separate container on the owner's existing Lightsail Ubuntu 24.04 host. It already runs other projects behind Caddy. No new instance, disk, static IP, paid plan or provider credits are needed for this procedure. Existing hosting continues to have its existing bill and transfer limits; this is not a claim that AWS hosting is free. Do not resize or replace anything.

The release uses Node 24.22.2 in the digest-pinned Docker base image. The host architecture and actual image version were verified using `docker image inspect` and an isolated `node --version` container. Each image build runs `npm test` and `npm run build`, with no real provider calls. `tsx` and development dependencies remain installed because `npm start` uses the TypeScript server source. The process runs as UID/GID 1000 with a read-only root filesystem, a temporary `/tmp`, a 512 MiB memory limit, a half-CPU limit and dropped Linux capabilities.

One application process owns `/opt/borrowed-confidence/data`. That private directory is the only persistent application mount. SQLite and its WAL files stay outside the served `dist` directory. Do not run multiple replicas against it. Jobs interrupted by a restart fail explicitly; their input images are not persisted or automatically resubmitted.

The container has no published host port. Its only incoming application path is Caddy through the separate `borrowed-confidence-net` Docker network. Live rendering remains disabled, no provider credential is deployed and the configured daily cap is one accepted job if an operator later deliberately enables it. Public access uses the clearly labeled replay of the October 25 real provider evidence alongside the working planner.

At the read-only host inspection, approximately 21 GiB disk and 1120 MiB RAM were available; load was 0.03. These are point-in-time observations, not a capacity guarantee. Recheck before building. Existing services must retain their health and data.

## Prepare the exact release

1. Obtain the user's authorization for a commit before committing. Review the diff, ignore rules and secret scan. Run the required tests/browser journey and record their evidence.
2. Commit that tested source. The deploy script refuses an uncommitted or dirty checkout and packages only `git archive HEAD`. It cannot include an ignored local `.env`, SQLite database or private SSH key.
3. Set `DEPLOY_HOST`, `SSH_KEY` and `KNOWN_HOSTS` privately. Use an existing authorized SSH key or temporary Lightsail SSH access details. Never print or commit private key/certificate contents. The temporary certificates expire quickly. Verify/retain the host's SSH public key in the separate known-hosts file.
4. If SSH ingress needs temporary access, add only the operator's current `/32` to port 22 while preserving all existing rules; remove only that added rule when finished. Do not open SSH to the world.
5. From the clean checkout run:

```sh
bash deploy/deploy-release.sh --apply
```

The script installs source under `/opt/borrowed-confidence/releases/<full-commit-sha>`, preserves the dedicated data directory, builds/tests the image and starts `bc-api` privately. It does not edit or restart the shared proxy. It stops on a failed build/test. Do not run it while another build is underway on the small host.

## Add the isolated HTTPS route

The existing proxy container is `ew-proxy`; its read-only config mount is `/opt/embodiweave/source/deploy/Caddyfile`. Preserve all existing hosts, routes, networks and volumes. Back up that file before modifying it. The proposed hostname already resolved to the existing static IP during preparation:

```text
borrowed-confidence.52.202.25.181.sslip.io
```

The [DNS service documentation](https://nip.io/) supports IP-encoded names and individual TLS certificates through Caddy/HTTP-01. Successful issuance still must be verified. This hostname depends on that external DNS service; it is not a purchased domain.

Connect only the proxy to the new application network:

```sh
sudo docker network connect borrowed-confidence-net ew-proxy
```

If already connected, inspect its existing network configuration instead of repeatedly attempting to connect. Append this separate site block without replacing the existing config:

```caddyfile
borrowed-confidence.52.202.25.181.sslip.io {
    request_body {
        max_size 24MB
    }
    header {
        Referrer-Policy no-referrer
        X-Content-Type-Options nosniff
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
    }
    reverse_proxy bc-api:3001
}
```

The exact host match provides the external Host allowlist. Keep request-body logging disabled. Validate before reloading:

```sh
sudo docker exec ew-proxy caddy validate --config /etc/caddy/Caddyfile
sudo docker exec ew-proxy caddy reload --config /etc/caddy/Caddyfile
```

If validation fails, restore the backup and do not reload. Reload is graceful; do not restart the proxy or other application containers. After reload, verify all three existing HTTPS hosts as well as the new hostname. They all returned HTTP 200 immediately before this deployment work.

## Hosted acceptance checks

Use a fresh browser with no account or API key. Verify:

- HTTPS loads without a certificate warning; `/api/status` reports `liveEnabled: false` and the full tested `revision`.
- The planner covers the three sample events, then the selected garment enters the studio with its event context.
- Historical provider output is clearly labeled replay, with synthetic input provenance and its original date; it never appears as a new live request.
- Accept/reject changes the actual plan and shows before/after coverage, spending and unique borrowed items; navigation preserves the chosen event/item.
- A too-small budget yields an honest partial result. Mobile, keyboard and reduced-motion journeys work.
- API writes from an untrusted Origin fail. Live submissions remain HTTP 503 without provider traffic. Private source paths do not expose source, keys or data.
- The process is healthy, unprivileged, resource-limited and has only the dedicated persistent mount. No app port is exposed on the host.
- Restart the application container only, verify health/metadata behavior and confirm all other apps remain healthy. Do not treat interruption as a resumable render.

Record the actual results, date, commit, image ID/digest, public URL and evidence artifact paths. Keep free judge access available through the end of judging. The current dates API reports November 20, 2026 at 22:00 UTC (November 21 at 03:30 IST), which is later than the rules page's stated judging end; use the later bound for access.

## Rollback and cleanup

Keep the prior release image and compose file while testing. To roll back only this app, set `RELEASE_SHA` to the previous tested commit and run its compose file with `up -d --no-build`; do not delete the persistent directory. For an initial-release failure, stop/remove only `bc-api` and restore the prior Caddy file with a validated graceful reload. Preserve evidence and all other containers/volumes.

Remove only the temporary SSH ingress CIDR added for this task after the final checks. Securely remove the task's temporary SSH key/certificate files when no longer needed. Do not delete the owner's existing keys or firewall rules. No automatic cleanup removes releases, evidence or databases.

## Before enabling live try-on later

Confirm available YouCam units and obtain authorization for their use. Configure the server credential privately, enable `ALLOW_LIVE_TRYON=true` explicitly and retain the exact HTTPS `APP_ORIGIN`, secure cookies and strict quotas. Add a spending ceiling over the entire judging period, monitor credits, and verify ingress limits for anonymous clients. A daily quota alone is not a guarantee against exhaustion across multiple days. No automatic paid retries or background rendering are permitted. Clearing local sessions cannot delete provider-held copies of images.
