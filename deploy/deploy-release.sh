#!/usr/bin/env bash
# Run locally after the tested source has been committed with user authorization.
# Deploys the isolated app only. Review/reload the shared proxy separately.
set -euo pipefail
if [[ "${1:-}" != "--apply" ]]; then
  printf '%s\n' 'Usage: DEPLOY_HOST=... SSH_KEY=... KNOWN_HOSTS=... deploy/deploy-release.sh --apply'
  exit 2
fi
: "${DEPLOY_HOST:?Set the existing host IP or DNS name}"
: "${SSH_KEY:?Set the private SSH key file path}"
: "${KNOWN_HOSTS:?Set the verified known_hosts file path}"
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || { printf '%s\n' 'Invalid host.' >&2; exit 2; }
[[ -r "$SSH_KEY" && -r "$KNOWN_HOSTS" ]] || { printf '%s\n' 'SSH files are unavailable.' >&2; exit 2; }
cd "$(git rev-parse --show-toplevel)"
[[ -z "$(git status --porcelain)" ]] || { printf '%s\n' 'Refusing a dirty working tree. Commit only after authorized review.' >&2; exit 2; }
revision="$(git rev-parse HEAD)"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 2
archive="$(mktemp -t borrowed-confidence-release.XXXXXX)"
trap 'rm -f "$archive"' EXIT
git archive --format=tar "$revision" > "$archive"
ssh_options=(-o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KNOWN_HOSTS" -i "$SSH_KEY")
scp "${ssh_options[@]}" "$archive" "ubuntu@$DEPLOY_HOST:/tmp/borrowed-confidence-$revision.tar"
ssh "${ssh_options[@]}" "ubuntu@$DEPLOY_HOST" bash -s -- "$revision" <<'REMOTE'
set -euo pipefail
revision="$1"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 2
release="/opt/borrowed-confidence/releases/$revision"
sudo install -d -m 0755 "$release"
sudo install -d -o 1000 -g 1000 -m 0700 /opt/borrowed-confidence/data
sudo tar -xf "/tmp/borrowed-confidence-$revision.tar" -C "$release" --no-same-owner
rm -f "/tmp/borrowed-confidence-$revision.tar"
cd "$release"
# The build executes the real Node 24 unit/HTTP suite and the production build.
sudo docker build --build-arg "RELEASE_SHA=$revision" --label "org.opencontainers.image.revision=$revision" -t "borrowed-confidence:$revision" .
sudo env RELEASE_SHA="$revision" docker compose -p borrowed-confidence -f deploy/docker-compose.yml up -d --no-build
sudo docker inspect bc-api --format '{{.State.Status}} {{.Config.Image}} {{.HostConfig.ReadonlyRootfs}}'
printf '%s\n' 'App installed privately. Complete the documented proxy validation/reload and public smoke test.'
REMOTE
