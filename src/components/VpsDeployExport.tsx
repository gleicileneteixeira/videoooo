import React, { useState, useEffect } from 'react';
import {
  Download,
  Server,
  Terminal,
  Copy,
  Check,
  Globe,
  Sparkles,
  ShieldCheck,
  Layers,
  FileCode,
  CheckCircle2,
  FolderArchive,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Cpu,
  RefreshCw,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProjectInfo {
  totalFiles: number;
  appName: string;
  version: string;
  recommendedNode: string;
}

export const VpsDeployExport: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // User customizable VPS parameters to dynamic render commands
  const [vpsIp, setVpsIp] = useState('185.199.108.153');
  const [vpsDomain, setVpsDomain] = useState('app.seudominio.com.br');
  const [vpsPort, setVpsPort] = useState('3000');
  const [vpsDir, setVpsDir] = useState('/var/www/viralscript');
  const [vpsUser, setVpsUser] = useState('root');

  useEffect(() => {
    fetch('/api/project-export-info')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setProjectInfo(data);
        }
      })
      .catch((err) => {
        console.warn('Não foi possível carregar estatísticas do projeto:', err);
      });
  }, []);

  const handleDownloadZip = () => {
    setIsDownloading(true);
    setDownloadSuccess(false);

    // Create an invisible link and trigger native browser download
    const link = document.createElement('a');
    link.href = '/api/export-project-zip';
    link.setAttribute('download', 'viralscript-full-source.zip');
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      setIsDownloading(false);
      setDownloadSuccess(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      setTimeout(() => setDownloadSuccess(false), 5000);
    }, 1500);
  };

  const handleCopyCommand = (command: string, index: number) => {
    navigator.clipboard.writeText(command);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  // The 11 Detailed Steps tailored dynamically with user variables
  const steps = [
    {
      step: 1,
      title: 'Acessar sua VPS via Terminal SSH',
      description: 'Conecte-se remotamente ao servidor VPS utilizando o terminal do Windows (PowerShell/CMD), Mac ou Linux.',
      command: `ssh ${vpsUser}@${vpsIp}`,
      hint: 'Se você usa chave SSH privada ao invés de senha: ssh -i ~/.ssh/sua_chave.pem ' + `${vpsUser}@${vpsIp}`,
    },
    {
      step: 2,
      title: 'Atualizar os Pacotes do Sistema Linux',
      description: 'Atualize o repositório de segurança e os pacotes do Ubuntu ou Debian para garantir compatibilidade e proteção.',
      command: `sudo apt update && sudo apt upgrade -y`,
      hint: 'Recomendado sempre que iniciar uma VPS nova para evitar conflitos de bibliotecas antigas.',
    },
    {
      step: 3,
      title: 'Instalar Ferramentas Essenciais do Servidor',
      description: 'Instale utilitários de rede, descompactador unzip, editor de texto nano, firewall ufw e compiladores C/C++.',
      command: `sudo apt install -y curl git unzip wget build-essential nano ufw`,
      hint: 'O pacote unzip é essencial para descompactar o arquivo .zip que você baixou.',
    },
    {
      step: 4,
      title: 'Instalar o Node.js v20+ LTS e NPM',
      description: 'Instale o Node.js 20 LTS oficial da NodeSource para rodar o backend Express e o build do Vite com estabilidade.',
      command: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs && node -v && npm -v`,
      hint: 'Ao final do comando, o terminal exibirá as versões instaladas (ex: v20.x.x e npm 10.x.x).',
    },
    {
      step: 5,
      title: 'Instalar o PM2 (Gerenciador de Processos 24/7)',
      description: 'O PM2 mantém a aplicação rodando em segundo plano sem parar, com reinício automático caso ocorra qualquer falha.',
      command: `sudo npm install -g pm2`,
      hint: 'Com o PM2 você pode fechar o terminal e desligar seu computador que o sistema continuará ativo.',
    },
    {
      step: 6,
      title: 'Enviar o Arquivo ZIP Baixado para a VPS',
      description: 'Envie o arquivo .zip que você baixou do ViralScript para o diretório temporário do servidor.',
      command: `scp viralscript-full-source-*.zip ${vpsUser}@${vpsIp}:/root/`,
      hint: 'Dica amigável: você também pode usar programas visuais como FileZilla ou WinSCP conectando via SFTP na porta 22 e arrastando o ZIP.',
    },
    {
      step: 7,
      title: 'Criar o Diretório da Aplicação e Extrair o ZIP',
      description: 'Crie a pasta de produção recomendada no Linux e descompacte todos os arquivos fonte e de configuração.',
      command: `sudo mkdir -p ${vpsDir} && sudo unzip -o /root/viralscript-full-source-*.zip -d ${vpsDir} && cd ${vpsDir} && ls -la`,
      hint: 'Você verá pastas como src, public, e arquivos como package.json, server.ts, ecosystem.config.cjs e deploy.sh.',
    },
    {
      step: 8,
      title: 'Configurar o Arquivo de Variáveis (.env)',
      description: 'Copie o modelo .env.example para .env e insira suas chaves de API (Groq, OpenRouter, Gemini, etc.).',
      command: `cp .env.example .env && nano .env`,
      hint: 'Dentro do nano: edite suas chaves, aperte Ctrl + O para salvar, dê Enter e aperte Ctrl + X para sair.',
    },
    {
      step: 9,
      title: 'Instalar Dependências e Compilar para Produção',
      description: 'Instale as bibliotecas npm e execute o build para gerar a versão ultra-rápida (Vite + esbuild bundle).',
      command: `npm install --production=false && npm run build`,
      hint: 'Esse comando gera a pasta dist/ com todo o frontend estático e o arquivo otimizado dist/server.cjs.',
    },
    {
      step: 10,
      title: 'Iniciar no PM2 e Habilitar Reinício no Boot da VPS',
      description: 'Coloque o ViralScript no ar via PM2 e configure o serviço do sistema para subir automaticamente se a VPS reiniciar.',
      command: `pm2 start ecosystem.config.cjs && pm2 save && pm2 startup`,
      hint: 'Execute o comando que o "pm2 startup" imprimir na tela (se solicitado) para fixar a inicialização no boot do Linux.',
    },
    {
      step: 11,
      title: 'Configurar Nginx (Proxy Reverso), Domínio e SSL HTTPS Gratuito',
      description: 'Instale o Nginx com Certbot para apontar seu domínio com certificado SSL gratuito (Let\'s Encrypt) e firewall ativo.',
      command: `sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp nginx-viralscript.conf /etc/nginx/sites-available/viralscript
sudo sed -i 's/SEU_DOMINIO_OU_IP/${vpsDomain}/g' /etc/nginx/sites-available/viralscript
sudo ln -sf /etc/nginx/sites-available/viralscript /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d ${vpsDomain}
sudo ufw allow 'Nginx Full' && sudo ufw allow OpenSSH && sudo ufw --force enable`,
      hint: 'Certifique-se de que a entrada DNS tipo "A" do seu domínio já esteja apontando para o IP da sua VPS antes de rodar o certbot.',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-64 w-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/20">
              <Server className="h-3.5 w-3.5" />
              <span>Deploy Próprio em VPS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Exportar Código Fonte & Guia VPS (11 Passos)
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Exporte todo o ecossistema do <strong>ViralScript AI</strong> em um arquivo <code>.zip</code> completo e independente.
              Hospede em qualquer VPS (Hostinger, Contabo, DigitalOcean, Hetzner, AWS) com domínio próprio, SSL gratuito e disponibilidade 24/7.
            </p>
          </div>

          {/* Download Button Card */}
          <div className="flex flex-col items-center sm:items-end gap-3 shrink-0">
            <button
              id="btn-download-project-zip"
              type="button"
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className={`w-full sm:w-auto flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-black text-white shadow-xl transition-all duration-200 active:scale-95 ${
                downloadSuccess
                  ? 'bg-emerald-600 shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 shadow-rose-600/25 hover:shadow-rose-600/40 hover:scale-[1.02]'
              }`}
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Gerando Arquivo ZIP...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-white" />
                  <span>Download Concluído!</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Baixar Código Completo (.ZIP)</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <FolderArchive className="h-3.5 w-3.5 text-rose-400" />
              <span>
                {projectInfo ? `${projectInfo.totalFiles} arquivos` : 'Código 100% Completo'} • Sem node_modules (Download Leve)
              </span>
            </div>
          </div>
        </div>

        {/* Included Files Specs Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-rose-400 border border-slate-700">
              <FileCode className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Full Stack</div>
              <div className="text-[11px] text-slate-400">React 19 + Express</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">PM2 Config</div>
              <div className="text-[11px] text-slate-400">ecosystem.config.cjs</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-purple-400 border border-slate-700">
              <Terminal className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Auto Deploy</div>
              <div className="text-[11px] text-slate-400">Script deploy.sh</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-blue-400 border border-slate-700">
              <Globe className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Nginx Proxy</div>
              <div className="text-[11px] text-slate-400">nginx-viralscript.conf</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive VPS Command Personalizer */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Personalizador Dinâmico dos Comandos</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Preencha os dados da sua VPS abaixo. Os comandos dos 11 passos serão <strong>atualizados automaticamente</strong> com seus dados para você apenas clicar e copiar!
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 self-start sm:self-auto">
            11 Passos Prontos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              IP da VPS
            </label>
            <input
              type="text"
              value={vpsIp}
              onChange={(e) => setVpsIp(e.target.value)}
              placeholder="Ex: 185.199.108.153"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Seu Domínio ou Subdomínio
            </label>
            <input
              type="text"
              value={vpsDomain}
              onChange={(e) => setVpsDomain(e.target.value)}
              placeholder="Ex: app.meusite.com.br"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Pasta de Instalação na VPS
            </label>
            <input
              type="text"
              value={vpsDir}
              onChange={(e) => setVpsDir(e.target.value)}
              placeholder="Ex: /var/www/viralscript"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Usuário SSH
            </label>
            <input
              type="text"
              value={vpsUser}
              onChange={(e) => setVpsUser(e.target.value)}
              placeholder="root"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* The 11 Detailed Steps Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600/20 text-rose-400 font-black text-xs border border-rose-500/30">
              11
            </span>
            <h3 className="text-lg font-black text-white">
              Passo a Passo Completo para Subir na VPS (11 Etapas)
            </h3>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Clique no botão <strong>Copiar</strong> de cada etapa para executar no terminal
          </span>
        </div>

        <div className="space-y-4">
          {steps.map((item, idx) => (
            <div
              key={item.step}
              id={`step-${item.step}`}
              className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 text-white text-xs font-black shrink-0 shadow-md shadow-rose-600/20">
                    {String(item.step).padStart(2, '0')}
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCommand(item.command, idx)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                    copiedIndex === idx
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title="Copiar comando desta etapa"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-white" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Box */}
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {item.command}
              </div>

              {/* Helpful Hint */}
              <div className="flex items-center gap-2 text-[11px] text-amber-300/90 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                <span className="font-bold">💡 Dica:</span>
                <span>{item.hint}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bonus Card: One-Click deploy.sh explanation */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
              <Zap className="h-3.5 w-3.5" />
            </span>
            <h4 className="text-sm font-bold text-white">
              Bônus: Script de Deploy Automático Incluso (deploy.sh)
            </h4>
          </div>
          <p className="text-xs text-indigo-200/80 leading-relaxed">
            Dentro do arquivo ZIP baixado, você também recebe o script <code>deploy.sh</code>.
            Depois de extrair o ZIP na pasta da sua VPS, você pode simplesmente rodar:
          </p>
          <div className="inline-block font-mono text-xs bg-black/50 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/30 mt-1">
            chmod +x deploy.sh && ./deploy.sh
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadZip}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>Baixar ZIP com Tudo Pronto</span>
        </button>
      </div>
    </div>
  );
};
