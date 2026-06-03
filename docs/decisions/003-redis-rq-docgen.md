# ADR-003: Redis + RQ pour la génération documentaire asynchrone

## Status

Accepted

## Date

2026-06-03

## Context

La génération d'un paquet (injection docx/xlsx, pipeline certificats 2 étapes, conversion PDF, ZIP) peut prendre jusqu'à 15 s pour ≤ 50 certificats (BNF-02). L'API ne doit pas bloquer l'interface. Le cahier des charges retient Redis + RQ. Le pipeline DocGen est RAM-first (BNF-05).

## Options Considered

### Option A: Redis + RQ
- Pros: Léger, Python natif, adapté au VPS, conforme cahier des charges
- Cons: Moins de fonctionnalités que Celery

### Option B: Celery + Redis/RabbitMQ
- Pros: Écosystème riche, retry avancé
- Cons: Configuration plus lourde pour 4 semaines de projet

### Option C: Génération synchrone dans l'API
- Pros: Simplicité
- Cons: Timeouts HTTP, UX dégradée, non conforme BF-12/BF-13

## Decision

Nous choisissons **Redis 7 + RQ** :
1. L'API enqueue un job `run_docgen_job(job_id)` après validation RG-CERT-01/02
2. Un conteneur `worker` consomme la file `docgen`
3. Le statut est persisté dans `generation_jobs` (queued → running → completed/failed)

## Consequences

- Service `redis` dans Docker Compose
- Worker séparé du processus Uvicorn
- Pas de fichiers temporaires disque inutiles : pipeline en mémoire, ZIP écrit une fois terminé
- Monitoring via statut DB + logs worker
