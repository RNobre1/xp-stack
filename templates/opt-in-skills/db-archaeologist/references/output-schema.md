# Schema do output `docs/specs/database/schema.json`

```json
{
  "schema_version": "1.0",
  "generated_at": "ISO timestamp",
  "source": {
    "migrations_dir": "supabase/migrations",
    "migrations_count": 47,
    "date_range": {
      "first": "2026-01-15",
      "last": "2026-04-25"
    }
  },
  "tables": [
    {
      "name": "users",
      "comment": "User accounts",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "default": "gen_random_uuid()",
          "is_primary_key": true,
          "fk_to": null,
          "confidence": "🟢"
        },
        {
          "name": "email",
          "type": "text",
          "nullable": false,
          "is_unique": true,
          "confidence": "🟢"
        }
      ],
      "rls_enabled": true,
      "indexes": [
        { "name": "users_email_idx", "columns": ["email"], "unique": true }
      ],
      "triggers": [
        { "name": "users_set_updated_at", "event": "BEFORE UPDATE", "function": "set_updated_at()" }
      ],
      "confidence": "🟢"
    }
  ]
}
```

# Schema do output `docs/specs/database/rls-matrix.json`

```json
{
  "schema_version": "1.0",
  "generated_at": "ISO timestamp",
  "matrix": [
    {
      "table": "users",
      "policies": [
        {
          "name": "users_select_own",
          "action": "SELECT",
          "roles": ["authenticated"],
          "using": "auth.uid() = id",
          "confidence": "🟢"
        }
      ],
      "gaps": []
    },
    {
      "table": "secrets",
      "policies": [],
      "gaps": [
        { "issue": "RLS habilitado mas sem CREATE POLICY", "confidence": "🔴" }
      ]
    }
  ]
}
```

# Schema do output `docs/specs/database/migrations-timeline.md`

Markdown livre com:
- Resumo (count, range, padrao)
- Tabela cronologica das migrations com risco classificado (low/med/high)
- Lista de migrations marcadas 🔴 (data loss, breaking constraints, etc)
- Recomendacoes
