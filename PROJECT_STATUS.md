# Status do projeto

## Feito

- Projeto sem PostgreSQL, Neon, Drizzle ou SQL manual.
- Cardápio e administração funcionam com conteúdo guardado no GitHub (`content/site.json`).
- Autenticação administrativa checada no servidor, com cookie HTTP-only assinado.
- Categorias controlam onde cada produto aparece.
- Produtos usam IDs estáveis e preços em centavos.
- Upload de imagens separado do JSON, com limite de 900 KB e JPG/PNG/WEBP (conferidos pelo conteúdo do arquivo).
- Carrinho usa o ID do produto e envia o pedido para o WhatsApp.
- Fundos visuais não dependem de texturas externas.
- Pipeline de CI com `npm ci`, lint, typecheck, testes e build.

### Revisão de erros (outubro/2026)

- **Perda de dados corrigida:** cada alteração lê a versão mais recente antes de gravar e detecta conflitos. Um `site.json` malformado gera erro em vez de ser substituído pelo cardápio padrão.
- **Preços:** `12.50` agora vale R$ 12,50 (antes virava R$ 1.250,00). Regras e exemplos estão no README.
- **Fotos antigas:** cada upload recebe um nome novo, então quem já visitou o site vê a foto nova.
- **Ordem das gravações:** o produto é salvo antes de a foto antiga ser removida. Se o salvamento falhar, a foto recém-enviada é descartada.
- **Mensagens de erro:** validações voltam como resultado da ação. Antes, o Next.js as ocultava em produção e o administrador via só um erro genérico.
- **Painel:** ações de disponibilidade, exclusão e avisos mostram erros, e o formulário de produto não exibe mais falso erro após salvar.
- **GitHub:** caminhos de arquivo são codificados, pastas não são tratadas como imagens e imagens são lidas no formato `raw`.
- **Segurança:** sessão com chave opcional separada da senha, comparação de senha sem vazar o tamanho e atraso após tentativas erradas.
- **Build e CI:** `package-lock.json` versionado (o CI não encontrava o lockfile). Erro de lint corrigido. `postcss` atualizado para remover avisos de alta severidade.

## Falta para colocar em produção

1. Configurar no Netlify (ou outra hospedagem):
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET` (recomendado: um valor aleatório longo)
   - `GITHUB_OWNER=imiled890-prog`
   - `GITHUB_REPO=gostinho-do-paraense`
   - `GITHUB_BRANCH=main`
   - `GITHUB_CONTENT_TOKEN`
2. Criar um Fine-grained GitHub token restrito a este repositório, com acesso de leitura/escrita em Contents.
3. Fazer o deploy.
4. Testar no ambiente publicado: login, criar, editar, excluir, disponibilidade, aviso e upload de foto.
5. Conferir telefone e endereço antes de publicar.

## Pendências recomendadas

- **Deploy a cada alteração:** cada salvamento no painel gera commit no `main`. Se a hospedagem publica a cada commit, cada alteração dispara um deploy. Configure a hospedagem para ignorar commits de conteúdo (`content/`).
- **Conteúdo:** confirmar se "Guaraná da Amazônia" pertence à categoria Açaí. A descrição indica bebida (400ml).
- **Fotos grandes:** o administrador precisa enviar fotos de até 900 KB. Compressão automática no navegador tornaria o painel mais fácil de usar.
- **Carrinho:** o pedido não persiste ao recarregar a página, e os preços são copiados quando o item é adicionado.
- **Login:** há atraso de 1 segundo após senha errada, mas não há bloqueio por tentativas.
- **Dependências:** `npm audit` aponta 5 avisos de severidade alta, todos na cadeia de lint (`eslint-config-next` → `braces`). Não há versão corrigida publicada. A correção sugerida pelo npm faria downgrade do `eslint-config-next` para a versão 14, então não foi aplicada.

## Observações

- SQL não é necessário para o funcionamento do projeto.
- A primeira versão em produção usa o próprio GitHub como armazenamento de conteúdo.
- Não há banco externo nem ORM.
- A logo original ainda pode ser adicionada como asset do repositório. A interface atual usa um elemento com emoji como substituto, para não depender de arquivo binário ausente.
