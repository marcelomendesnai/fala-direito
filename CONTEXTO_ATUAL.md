# Fala Direito! — Contexto Atual

**Atualizado em:** 16/08/2026  
**Estado publicado de referência:** v0.39

## Propósito do projeto

O Fala Direito! é um treinador pessoal de comunicação. Ele grava ou recebe uma conversa, identifica a fala do Marcelo, analisa-a contra o manual de regras e transforma os achados em treino prático e evolução ao longo do tempo.

O projeto deve aumentar clareza, autoridade, capacidade de negociação e qualidade de relacionamento — sem transformar o Marcelo em um personagem artificial, seco ou agressivo.

## Decisões confirmadas antes da próxima etapa de código

### 1. Análise organizada do macro para o micro

O laudo deixará de ser apresentado como uma lista solta de acertos e erros. A ordem desejada é:

1. **Resultado da mensagem** — a mensagem, pedido, decisão ou posição foi compreendida? Sim ou não, com evidência disponível.
2. **Estrutura** — a fala foi organizada na ordem que mais ajudava aquele contexto? Ponto principal, contexto necessário, justificativa e fechamento/pedido quando aplicável.
3. **Entrega** — segurança, convicção, muletas, gaguejos, falhas de memória, vitimismo, excesso de justificativa e outros micro-hábitos.
4. **Evidências** — trechos exatos que sustentam cada observação.
5. **Padrões e treino** — distinguir ocorrência pontual de comportamento recorrente e indicar o próximo foco de treino.

Objetividade não deve ser confundida com fala curta, dura ou sem nuance. Uma crítica só deve existir quando houver regra aplicável, trecho literal e impacto claro em clareza, autoridade, negociação ou relacionamento.

### 2. Regras que permanecem firmes

- **A14 — “eu acho”**: Marcelo quer eliminar esse início de frase. A ocorrência deve ser apontada e receber alternativa mais firme e adequada ao contexto.
- **A12 — muletas**: toda ocorrência deve ser contabilizada, pois a meta é chegar a zero. Porém, o sistema deve diferenciar uma ocorrência isolada de repetição que realmente compromete a clareza.
- **A7 e A9**: não podem virar punição mecânica por frase longa ou por começar com contexto. A avaliação precisa considerar se houve ruído, redundância ou atraso desnecessário do ponto principal naquele contexto.

### 3. Evidência antes de leitura de padrão

O mentor não pode transformar um hábito pontual em explicação psicológica pesada.

Hierarquia de evidência desejada:

1. **Fato:** trecho literal + regra + efeito observado.
2. **Padrão da sessão:** mesma conduta aparece mais de uma vez na mesma conversa.
3. **Padrão recorrente:** a conduta reaparece em sessões diferentes.

Só no terceiro nível o mentor poderá sugerir uma hipótese de padrão de comunicação, sempre como hipótese e nunca como diagnóstico. Sem evidência suficiente, ele deve limitar-se ao comportamento observado.

O nome preferencial para essa área é **“Leitura de padrão de comunicação”**, não “leitura psicológica”.

### 4. Experiência de uso no computador

O aplicativo precisa ganhar uma leitura amigável para desktop. A análise atual foi desenhada quase toda como tela de celular.

Direção aprovada para o desktop:

- navegação clara entre Visão geral, Conversas, Regras e Biblioteca;
- área de leitura ampla para o laudo;
- evidências e plano de treino facilmente consultáveis;
- histórico que permita comparar evolução entre sessões.

### 5. Biblioteca de Comunicação

Será criado um espaço em que Marcelo poderá colar, por exemplo, a transcrição de um vídeo de comunicação que considera interessante.

O sistema deverá:

1. extrair as lições propostas pela fonte;
2. comparar cada lição com o manual e o modo de trabalho já adotado;
3. classificar cada uma como:
   - **Já temos** — regra já coberta;
   - **Melhorar regra existente** — traz exceção, exemplo ou formulação útil;
   - **Nova regra proposta** — contribuição realmente nova e aplicável;
   - **Rejeitar** — genérica, contraditória, teatral ou incompatível com o projeto;
4. mostrar o trecho de origem e a justificativa da decisão.

## Proteção do manual — regra de governança

O manual de comunicação é um ativo do projeto e não pode ser contaminado por ideias isoladas de vídeos ou por conclusões automáticas de IA.

**Nenhuma lição importada poderá criar, alterar ou apagar regra automaticamente.**

Toda sugestão deve ficar como proposta, com fonte, evidência, comparação com regras existentes e justificativa. A alteração do manual só ocorre após aprovação consciente do Marcelo.

Critério de aceitação: uma nova lição deve melhorar de forma concreta a clareza, a autoridade, a negociação ou o relacionamento, sem descaracterizar o estilo desejado.

## Próxima etapa

Antes de codar, definir e aprovar:

- o formato visual completo do novo laudo macro → micro;
- as condições objetivas para classificar A12 como ocorrência, alerta ou erro;
- a redação final do novo system prompt;
- o fluxo de revisão e aprovação da Biblioteca de Comunicação.
