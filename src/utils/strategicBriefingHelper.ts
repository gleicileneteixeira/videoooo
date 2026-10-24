/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategicBriefing } from '../types';

/**
 * Gerador Heurístico Local de Briefing Estratégico em 5 Pilares
 * Fornece garantia de funcionamento 100% offline ou em caso de indisponibilidade de backend.
 */
export function generateClientStrategicBriefing(
  idea: string,
  niche?: string,
  productOrOffer?: string,
  extraDetails?: string
): StrategicBriefing {
  const cleanIdea = (idea || '').trim();
  const lower = cleanIdea.toLowerCase();

  const isDrivingTest =
    (lower.includes('detran') || lower.includes('cnh') || lower.includes('autoescola') || lower.includes('habilitação')) &&
    (lower.includes('prova') || lower.includes('simulado') || lower.includes('reprov'));

  if (isDrivingTest) {
    return {
      videoTheme: cleanIdea || 'Resposta a um comentário de reprovação na prova teórica de habilitação',
      strategicObjective: 'Alertar sobre o perigo de estudar por simulados genéricos e apresentar o simulado calibrado como a solução ideal e realista.',
      pointsOfAttentionAndArgumentation: {
        flawedTraditionalMethod: {
          title: 'O problema dos simulados tradicionais (ex: apps genéricos e desatualizados)',
          dangerConcept: "Estudar só por opções genéricas é 'dar um tiro no pé' e iludir o candidato.",
          stateContextOrStatistic: 'Muitos alunos tiram 29 ou 30 pontos nesses simulados fáceis e acham que estão prontos.',
          hardReality: 'Na prova real, pegadinhas de trânsito e alta exigência causam reprovação de quem treinou fácil.',
        },
        idealSolution: {
          title: 'A Solução (Simulado Calibrado e Atualizado)',
          coreDifferentiator: 'Criado e atualizado com base no nível real das provas recentes, com questões oficiais comentadas.',
        },
        socialProofOrRealCase: {
          transitionHook: 'Veja o relato real de quem já tinha reprovado e apostou no método calibrado.',
          storySummary: 'Aluna que tirava nota alta no genérico e reprovava, testou o simulado calibrado na véspera e passou com folga.',
          caseConclusion: 'Isso comprova o alinhamento perfeito com a dificuldade da prova real.',
          suggestedAudioClip: 'Inserir trecho de áudio comemorando a aprovação ou print de mensagem de agradecimento.',
        },
        dualCta: {
          callToActionContext: 'Se você quer saber se está realmente preparado para passar de primeira:',
          action1Bio: 'Clicar no link da bio para acessar o simulado agora.',
          action2CommentWord: "Comentar 'QUERO' no vídeo para receber o link direto no privado.",
          keywordTrigger: 'QUERO',
        },
      },
    };
  }

  // Fallback heurístico inteligente e dinâmico para qualquer nicho / produto
  return {
    videoTheme: cleanIdea || `Estratégia de alto impacto para ${niche || 'destravar resultados'}`,
    strategicObjective: `Alertar sobre o erro clássico de seguir métodos superficiais e posicionar ${productOrOffer || 'a solução prática recomendada'} como a alternativa com resultados comprovados.`,
    pointsOfAttentionAndArgumentation: {
      flawedTraditionalMethod: {
        title: `O erro comum e os métodos genéricos sobre ${cleanIdea.slice(0, 40) || niche || 'este tema'}`,
        dangerConcept: 'Seguir apenas fórmulas prontas ou conselhos rasos traz frustração e estagnação.',
        stateContextOrStatistic: 'A maioria atinge uma falsa sensação de segurança inicial, mas não vê resultado prático sustentável.',
        hardReality: 'Quando chega a hora de executar na vida real, os detalhes ignorados impedem o progresso.',
      },
      idealSolution: {
        title: `A Solução Prática (${productOrOffer || 'Método Estruturado'})`,
        coreDifferentiator: extraDetails
          ? `Alinhado ao diferencial: ${extraDetails.slice(0, 100)}`
          : 'Desenvolvido com foco no que realmente funciona no dia a dia, testado e validado.',
      },
      socialProofOrRealCase: {
        transitionHook: 'Veja o que acontece quando você troca a tentativa e erro por um passo a passo estruturado.',
        storySummary: 'Quem aplicava o método convencional demorava semanas sem sair do lugar; ao aplicar a virada prática, o resultado apareceu de forma imediata.',
        caseConclusion: 'Isso comprova que um direcionamento claro faz toda a diferença.',
        suggestedAudioClip: 'Inserir demonstração visual ou depoimento rápido comprovando a eficácia.',
      },
      dualCta: {
        callToActionContext: 'Se você quer destravar de vez e aplicar essa estratégia com segurança:',
        action1Bio: 'Clica agora no link da bio para conferir o material completo.',
        action2CommentWord: `Comente "QUERO" aqui embaixo para receber as orientações direto no seu privado.`,
        keywordTrigger: 'QUERO',
      },
    },
  };
}
