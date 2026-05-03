# Template do output `docs/specs/ui/{nome}.md`

```markdown
# {nome da tela}

> **Contexto:** {ex: "Tela de login do app mobile, primeiro acesso"}
> **Estado documentado:** {vazio | full | loading | erro}
> **Gerado em:** YYYY-MM-DD via screenshot-spec-writer

---

## Inventario visual

### Header
- Logo (esquerda): "MeuApp"
- Nav links (centro): Home, Sobre, Contato
- Avatar dropdown (direita): foto + chevron-down

### Main
- ...

### Footer
- ...

---

## Hierarquia + layout

```
- Header (60px altura, sticky)
  - Logo (40px, esquerda)
  - Nav (centro)
  - Avatar (direita)
- Main (resto)
  - Sidebar (240px, esquerda)
  - Content (scrollable)
- Footer (40px, fixed bottom)
```

---

## Design tokens identificaveis

| Token | Valor estimado | Confidence |
|---|---|---|
| primary color | indigo-600 (`#4F46E5`) | 🟢 |
| surface bg | white | 🟢 |
| text primary | gray-900 | 🟢 |
| heading font | sans-serif (Inter?) | 🟡 |
| spacing scale | 4px base | 🟡 |

---

## Interacoes inferidas

- Botao "Login" provavelmente submit do form 🟡
- Link "Esqueci a senha" provavelmente leva pra `/recover` 🟡
- Avatar dropdown provavelmente abre menu Logout/Settings 🟡

---

## Acessibilidade

- 🟢 Contraste texto/fundo aparenta OK (WCAG AA)
- 🟡 Focus state nao visivel no screenshot estatico
- 🔴 Touch targets nao mensuraveis sem device frame

---

## Lacunas

Esses aspectos NAO estao visiveis no screenshot e precisam de validacao adicional:

- 🔴 Visao mobile / responsive breakpoints
- 🔴 Dark mode
- 🔴 Loading states (skeleton? spinner?)
- 🔴 Form validation (erros inline? toast?)
- 🔴 Empty states de listas
- 🔴 Animacoes / transicoes
```
