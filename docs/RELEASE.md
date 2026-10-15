# Como lançar uma nova versão

> **Ativação pendente:** os workflows estão em `docs/workflows/`. Para ativar, mova os dois arquivos para `.github/workflows/` pelo site do GitHub (abra o arquivo → ✏️ Editar → troque o caminho do nome para `.github/workflows/ci.yml` → *Commit changes*). Depois apague este aviso.

O repositório tem dois workflows do GitHub Actions (em `.github/workflows/`):

| Workflow | Quando roda | O que faz |
|----------|-------------|-----------|
| `ci.yml` | Todo PR e todo push na `main` | Lint, testes, build do site, gera os dois zips e valida o do Firefox com `web-ext lint`. Os zips ficam em *Actions → (execução) → Artifacts*. |
| `release.yml` | Quando você cria uma tag `vX.Y.Z` | Confere a versão, roda lint e testes, gera os zips, cria a **Release no GitHub** e envia para a **Chrome Web Store** e o **Firefox Add-ons**. |

Cada loja só recebe o envio se os segredos dela estiverem configurados. Sem eles, o workflow pula a loja e avisa no resumo da execução.

---

## Lançar uma versão (depois de configurado)

```bash
npm run version:set -- 1.3.4     # atualiza manifest.json e package.json
git commit -am "chore: versão 1.3.4"
git push
git tag v1.3.4
git push origin v1.3.4           # dispara o release.yml
```

A tag precisa ter a mesma versão do `manifest.json`, senão o workflow para com erro.

As duas lojas ainda fazem a análise delas. A extensão atualiza para os usuários depois da aprovação.

---

## Configurar os segredos (uma vez só)

Configure **depois que a primeira versão for aprovada em cada loja**. As APIs só atualizam uma extensão que já existe.

No GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

### Firefox (addons.mozilla.org)

1. Entre em https://addons.mozilla.org/developers/addon/api/key/
2. Clique em **Generate new credentials**.
3. Crie os segredos:

| Segredo | Valor |
|---------|-------|
| `AMO_API_KEY` | JWT issuer (começa com `user:`) |
| `AMO_API_SECRET` | JWT secret |

### Chrome Web Store

1. **ID da extensão e do editor**
   - `CWS_EXTENSION_ID`: aparece no painel da Chrome Web Store, embaixo do nome da extensão (32 letras).
   - `CWS_PUBLISHER_ID`: em *Conta* no painel da Chrome Web Store.
2. **Credenciais OAuth** (Google Cloud):
   1. Em https://console.cloud.google.com/ crie um projeto (ex.: `floatmini-publish`).
   2. Em *APIs e serviços → Biblioteca*, ative a **Chrome Web Store API**.
   3. Em *Tela de permissão OAuth*, configure como **Externo** e adicione seu e-mail como usuário de teste.
   4. Em *Credenciais → Criar credenciais → ID do cliente OAuth*, escolha **App para computador**.
   5. Gere o refresh token seguindo o guia do `chrome-webstore-upload`: https://github.com/fregante/chrome-webstore-upload-keys
3. Crie os segredos:

| Segredo | Valor |
|---------|-------|
| `CWS_EXTENSION_ID` | ID da extensão |
| `CWS_PUBLISHER_ID` | ID do editor |
| `CWS_CLIENT_ID` | Client ID do OAuth |
| `CWS_CLIENT_SECRET` | Client secret do OAuth |
| `CWS_REFRESH_TOKEN` | Refresh token gerado no passo 2.5 |

Os segredos ficam guardados pelo GitHub e não aparecem nos logs nem para quem vê o repositório.
