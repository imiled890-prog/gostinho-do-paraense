# Status do projeto

## Feito

- Projeto migrado para uma arquitetura sem PostgreSQL, Neon, Drizzle ou SQL manual.
- Cardápio e administração funcionam com conteúdo versionado no GitHub.
- Autenticação administrativa removida do cliente e protegida no servidor por cookie HTTP-only assinado.
- Categorias agora controlam corretamente onde cada produto aparece.
- Produtos usam IDs estáveis e preços em centavos.
- Upload de imagens separado do JSON, com limite de 3 MB e JPG/PNG/WEBP.
- Carrinho usa ID do produto e envia o pedido diretamente para o WhatsApp.
- Cache simples de conteúdo reduz leituras repetidas do GitHub.
- Fundos visuais não dependem de texturas externas.
- Repositório criado e código-base importado em `main`.

## Falta para colocar em produção

1. Configurar no Netlify:
   - `ADMIN_PASSWORD`
   - `GITHUB_OWNER=imiled890-prog`
   - `GITHUB_REPO=gostinho-do-paraense`
   - `GITHUB_BRANCH=main`
   - `GITHUB_CONTENT_TOKEN`
2. Criar um Fine-grained GitHub token restrito a este repositório, com acesso de leitura/escrita em Contents.
3. Fazer o deploy no Netlify.
4. Testar no ambiente publicado: login administrativo, criar, editar, excluir, disponibilidade, aviso e upload.
5. Conferir telefone e endereço antes de publicar.

## Observações

- SQL não é necessário para o funcionamento do projeto.
- A primeira versão em produção usa o próprio GitHub como armazenamento de conteúdo.
- O site pode continuar leve porque não há banco externo nem ORM.
- A logo original recortada ainda pode ser adicionada como asset do repositório; a interface atual usa um elemento CSS/emoji como fallback para não depender de arquivo binário ausente.
