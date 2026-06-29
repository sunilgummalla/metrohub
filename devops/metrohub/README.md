# MetroHub VPS Deployment

GitHub Actions owns deployment to the MetroHub VPS.

Branch mapping:

- `develop` deploys to GitHub environment `dev` and Swarm stack `mh-dev`.
- `main` deploys to GitHub environment `prod` and Swarm stack `mh-prod`.

Both stacks run on the same VPS and stay isolated by stack-specific overlay networks, Traefik routers, services, and Cloudflare tunnel secrets.

## GitHub Environment Configuration

Create two GitHub environments:

- `dev`
- `prod`

Each environment needs these secrets:

- `VPS_HOST`: MetroHub VPS hostname or IP.
- `VPS_USER`: SSH user, usually `deploy`.
- `VPS_SSH_KEY`: private key for the deploy user.
- `CLOUDFLARED_TOKEN`: token for that environment's new Cloudflare Tunnel.

The workflow exposes exactly one public hostname per environment:

| Environment | Public domain |
| --- | --- |
| `dev` | `dev.metrohub.io` |
| `prod` | `www.metrohub.io` |

Only the shell service has public Traefik labels. API and experience containers are deployed on the Swarm overlay network for internal use only and have no public hostnames or public Traefik routers.

The Cloudflare public hostname routes for each tunnel should point to:

```text
http://traefik:80
```

## Docker Logs

Each stack runs Dozzle for Docker log review. Dozzle is not exposed through Cloudflare or Traefik.

| Environment | Stack | Dozzle port |
| --- | --- | --- |
| `dev` | `mh-dev` | `9002` |
| `prod` | `mh-prod` | `9001` |

Open it through SSH port forwarding, for example:

```sh
ssh -L 9002:127.0.0.1:9002 metrohub
```

Then open `http://127.0.0.1:9002` locally for dev logs. Use port `9001` for prod.

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

The deploy workflow can also be run manually from GitHub Actions. Choose `dev` or `prod`; the workflow will use the matching GitHub environment.
