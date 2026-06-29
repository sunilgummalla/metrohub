# MetroHub VPS Deployment

GitHub Actions owns deployment to the MetroHub VPS.

Branch mapping:

- `develop` deploys to GitHub environment `mh-dev` and Swarm stack `mh-dev`.
- `main` deploys to GitHub environment `mh-prod` and Swarm stack `mh-prod`.

Both stacks run on the same VPS and stay isolated by stack-specific overlay networks, Traefik routers, services, and Cloudflare tunnel secrets.

## GitHub Environment Configuration

Create two GitHub environments:

- `mh-dev`
- `mh-prod`

Each environment needs these secrets:

- `VPS_HOST`: MetroHub VPS hostname or IP.
- `VPS_USER`: SSH user, usually `deploy`.
- `VPS_SSH_KEY`: private key for the deploy user.
- `CLOUDFLARED_TOKEN`: token for that environment's new Cloudflare Tunnel.

The workflow exposes exactly one public hostname per environment:

| Environment | Public domain |
| --- | --- |
| `mh-dev` | `dev.metrohub.io` |
| `mh-prod` | `www.metrohub.io` |

Only the shell service has public Traefik labels. API and experience containers are deployed on the Swarm overlay network for internal use only and have no public hostnames or public Traefik routers.

The Cloudflare public hostname routes for each tunnel should point to:

```text
http://traefik:80
```

## VPS Layout

The workflow copies deployment files to:

```text
/opt/money-money/<stack-name>
```

It creates one Swarm secret per stack:

```text
mh-dev_cloudflare_tunnel_token
mh-prod_cloudflare_tunnel_token
```

## Manual Workflow Dispatch

The deploy workflow can also be run manually from GitHub Actions. Choose `mh-dev` or `mh-prod`; the workflow will use the matching GitHub environment.
