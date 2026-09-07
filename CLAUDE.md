# Auto Parts ERP — Claude Code Constitution

Read `erp-context/ORCHESTRATOR.md` for the full project-specific AI operating rules.

## Quick Reference

- Source of Truth: `erp-context/requirements/PRD.md` + `erp-context/architecture/proposal.md`
- All knowledge lives in: `erp-context/`
- No docs, markdown, or planning files in: `erp-backend/`, `erp-frontend/`, `erp-mobile/`
- No code in: `erp-context/`
- Before building anything: read PRD, grill the user if requirements are unclear, write an ADR
- Open questions blocking implementation: see `erp-context/ORCHESTRATOR.md` Section "OPEN QUESTIONS"

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel (PHP) |
| Frontend | Next.js + React + Tailwind CSS |
| Mobile | React Native (Android) |
| Database | MySQL |
| Cache / Queues | Redis |
| Auth | JWT + RBAC (7 roles) |
| Storage | S3 (UAE region) |
| Icons | Lucide / Heroicons only |

## Non-negotiable rules

- No emojis anywhere
- No docs inside code repositories
- No invented business logic — derive everything from PRD.md
- No implementation without a task in erp-context/tasks/
- No DB change without an ADR in erp-context/decisions/
- No API endpoint without a contract in erp-context/api-contracts/
