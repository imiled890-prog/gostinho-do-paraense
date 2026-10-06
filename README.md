# Gostinho do Paraense

Site responsivo do Gostinho do Paraense, com cardápio, carrinho e pedidos por WhatsApp.

## Arquitetura atual

O projeto foi simplificado para não depender de PostgreSQL, Drizzle, migrações ou SQL.

- Next.js + React + TypeScript + Tailwind
- Conteúdo em `content/site.json`
- GitHub Contents API como armazenamento persistente em produção
- Imagens dos produtos em `content/images/`
- Painel administrativo protegido por sessão HTTP-only
- Carrinho no navegador + envio do pedido para WhatsApp
- Dados de preço armazenados como centavos, evitando erros de arredondamento

Em desenvolvimento local, quando as variáveis `GITHUB_*` não estiverem configuradas, o sistema grava no próprio projeto para facilitar testes. Em produção, o armazenamento precisa estar conectado ao repositório GitHub.

## Configuração

1. Crie um repositório GitHub para este projeto.
2. Crie um Fine-grained Personal Access Token com acesso apenas ao repositório e permissão de leitura/escrita em **Contents**.
3. Configure no Netlify:
   - `ADMIN_PASSWORD`
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `GITHUB_BRANCH` (normalmente `main`)
   - `GITHUB_CONTENT_TOKEN`
4. Faça o deploy normalmente no Netlify.

O token nunca é enviado ao navegador.

## Ajustes pelo painel

Depois de entrar em **Área administrativa**, é possível:

- criar produtos;
- editar nome, preço, categoria, descrição e foto;
- marcar produto como indisponível;
- excluir produto;
- publicar e excluir avisos.

As alterações persistem no repositório GitHub e ficam registradas no histórico de commits.

## Imagens

As imagens de produtos podem ter até 3 MB e devem ser JPG, PNG ou WEBP. O site serve as imagens por uma rota própria para funcionar tanto com repositório público quanto privado.

## Observação importante

O projeto recebido originalmente não continha a pasta `public/` nem os arquivos de textura/banner usados pelo código. Para deixar o projeto autocontido, os fundos foram convertidos para CSS e a logo transparente foi adicionada em `public/`.
