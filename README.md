# Gostinho do Paraense

Site responsivo do Gostinho do Paraense, com cardápio, carrinho e pedidos por WhatsApp.

## Arquitetura atual

O projeto não depende de banco de dados, ORM, migrações ou SQL.

- Next.js 16 + React 19 + TypeScript + Tailwind
- Conteúdo em `content/site.json`, guardado no repositório GitHub por meio da GitHub Contents API
- Imagens dos produtos em `content/images/`
- Painel administrativo protegido por sessão em cookie HTTP-only
- Carrinho no navegador e envio do pedido para o WhatsApp
- Preços armazenados em centavos, evitando erros de arredondamento

Em desenvolvimento local, sem as variáveis `GITHUB_*`, o sistema grava `content/site.json` e as imagens dentro do próprio projeto. Esses arquivos são ignorados pelo Git. Em produção, o armazenamento precisa estar conectado ao repositório GitHub.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse http://localhost:3000. Para testar o painel, defina `ADMIN_PASSWORD` em `.env.local` (veja `.env.example`).

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos (TypeScript) |
| `npm test` | Testes unitários e das ações do painel, com GitHub simulado |
| `npm run build` | Build de produção |

O workflow de CI (`.github/workflows/ci.yml`) executa lint, typecheck, testes e build. Use `npm ci` para instalar a partir do `package-lock.json`.

## Configuração de produção

1. Crie um repositório GitHub para este projeto.
2. Crie um Fine-grained Personal Access Token com acesso apenas a esse repositório e permissão de leitura/escrita em **Contents**.
3. Configure as variáveis de ambiente na hospedagem (Netlify ou outra):
   - `ADMIN_PASSWORD`: senha da área administrativa (obrigatória)
   - `ADMIN_SESSION_SECRET`: segredo separado para assinar a sessão (recomendado; veja abaixo)
   - `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` (normalmente `main`)
   - `GITHUB_CONTENT_TOKEN`: o token criado no passo 2
4. Publique o projeto.

O token nunca é enviado ao navegador. Ele é usado apenas no servidor.

### Sessão do administrador

- O cookie é HTTP-only, `SameSite=Lax` e `Secure` em produção, válido por 7 dias.
- Se `ADMIN_SESSION_SECRET` não estiver definida, a própria senha assina a sessão. Nesse caso, trocar a senha encerra as sessões ativas.
- Com `ADMIN_SESSION_SECRET` definida, trocar a senha não encerra as sessões. Para encerrá-las, troque o segredo.
- Tentativas com senha errada têm um atraso de 1 segundo.

## Ajustes pelo painel

Depois de entrar em **Área administrativa**, é possível:

- criar produtos;
- editar nome, preço, categoria, descrição e foto;
- marcar produto como indisponível;
- excluir produto;
- publicar e excluir avisos.

Cada alteração vira um commit no repositório GitHub, com histórico preservado. O sistema confere se o conteúdo não foi alterado por outra pessoa ao mesmo tempo. Se foi, a ação é repetida sobre a versão mais recente.

### Preços

Formatos aceitos: `25,00`, `25,5`, `1.250,50`, `12.50` e `R$ 12,90`.

- Vírgula é o separador de centavos, e ponto agrupa milhares (`1.250` significa R$ 1.250,00).
- Ponto seguido de um ou dois dígitos também é aceito como separador decimal (`12.50` = R$ 12,50).
- O limite é R$ 10.000,00.

## Imagens

- Formatos: JPG, PNG ou WEBP, com até **900 KB** (`MAX_IMAGE_BYTES` em `src/lib/media.ts`).
- O formato é conferido pelo conteúdo do arquivo, não apenas pela extensão.
- Cada foto enviada recebe um nome novo. A foto antiga só é removida depois que o produto é salvo.
- O site entrega as imagens por `/api/media/...`, o que funciona com repositório público ou privado.

## Estrutura de pastas

- `src/app/`: páginas, rotas de API e Server Actions (`actions.ts`)
- `src/components/`: interface (cardápio, carrinho e painel)
- `src/lib/`: armazenamento no GitHub, autenticação, preços, imagens e validação do conteúdo
- `src/data/`: categorias e cardápio padrão, usado até o primeiro salvamento
- `tests/`: testes automatizados

## Observação

O projeto não tem uma pasta `public/`. A logo ainda não foi adicionada: a interface usa um elemento com emoji como substituto. Veja `PROJECT_STATUS.md`.
