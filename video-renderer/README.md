# Serviço de renderização nativa

Este serviço mantém o processamento do lote fora da Vercel e usa FFmpeg nativo. O modo rápido copia os streams de vídeo; quando necessário, pode normalizar somente o áudio. Se os vídeos tiverem codecs incompatíveis, retorna um erro em vez de reencodar todos os frames.

## Publicação

Use um provedor que execute Docker e mantenha uma única instância ativa durante cada lote. O pool de arquivos fica em armazenamento temporário local; escalar para várias instâncias pode separar uploads e merges. O serviço remove sessões abandonadas após seis horas.

Para Render, crie manualmente um Web Service usando este repositório, com:

- Dockerfile: `video-renderer/Dockerfile`
- Contexto de build: `video-renderer`
- `ALLOWED_ORIGINS`: `https://videoooo-lime.vercel.app` (adicione outros domínios da aplicação separados por vírgula)
- `MAX_SESSION_BYTES`: opcional; padrão de 2 GiB por lote

Uma instância sempre ativa evita espera de inicialização e pode ter custo. Não crie o serviço antes de conferir o plano e o preço atuais do provedor.

Após a publicação, confirme `https://<host-do-servico>/healthz`. Na Vercel, configure `VITE_VIDEO_RENDER_API_URL` com a URL base do serviço (sem `/` no final) e faça um novo deploy do frontend.

O serviço limita uploads, tamanho por lote e frequência de merges. A URL é pública para o navegador da aplicação; CORS não substitui autenticação, portanto mantenha os limites ativos e permita somente os domínios usados pelo site.
