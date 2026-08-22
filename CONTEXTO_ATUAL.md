# Fala Direito! — Contexto Atual

**Atualizado em:** 22/08/2026
**Estado no repositório:** v0.44 — sincronização incremental + Preparar e Treinar

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

## Implementado nesta etapa (v0.40)

- Novo system prompt: análise do macro para o micro, com resultado da mensagem, estrutura, entrega, evidências, padrão e próximo treino.
- Leitura de padrão condicionada a evidências; não há mais obrigação de psicologizar uma sessão isolada.
- A14 passa a registrar “eu acho”/“acho que” em posição, pedido ou recomendação própria; A12 passa a contar as muletas para a meta de zero sem transformar automaticamente uma ocorrência isolada em erro grave.
- Laudo reorganizado e preparado para leitura em computador, com navegação lateral, cartões de visão macro e colunas de evidências/padrão/plano.
- Biblioteca de Comunicação criada: recebe transcrição, compara com o manual e classifica cada lição como Já temos, Melhorar existente, Nova proposta ou Rejeitar.
- A Biblioteca mantém uma fila local de revisão. Ela **não** altera o manual automaticamente.

## Implementado nesta etapa (v0.41)

- Banco central Cloudflare D1 para guardar transcrição, métricas, contexto e laudo completo de cada conversa.
- Migração automática do histórico já existente no navegador, preservando a cópia local como segurança.
- Reavaliação automática das transcrições antigas pelo modelo macro → micro atual.
- Novas conversas passam a ser salvas no banco logo após a análise.
- Renomear, conversar com o mentor e apagar uma conversa também atualizam o registro central.
- Banco esperado no Cloudflare: `fala-direito-db`, vinculado ao Pages pela variável `DB`.
- Criação inicial do D1 corrigida: tabela e índice são enviados como comandos completos e separados, evitando `incomplete input`.

## Implementado nesta etapa (v0.42)

- Cada conversa recebe automaticamente um título curto baseado no assunto, sem nomes de pessoas.
- Data e título aparecem juntos no histórico.
- O título continua editável pelo botão de renomear.
- Conversas antigas com transcrição são reavaliadas automaticamente para receber o título.

## Implementado nesta etapa (v0.43)

- Ao abrir o app, o histórico remoto é consultado antes de qualquer envio.
- Conversas que já existem no D1 não são reenviadas.
- Apenas registros realmente ausentes são enviados.
- A mensagem final informa quantos já estavam salvos e quantos foram enviados agora.
- A versão do modelo de análise permanece v0.42, evitando uma nova reavaliação desnecessária.

## Implementado nesta etapa (v0.44)

- A sincronização consulta um manifesto leve do D1, compara os identificadores e envia somente conversas novas marcadas como pendentes.
- Se uma conversa pendente já existir no banco, ela é reconhecida como sincronizada e não é reenviada.
- Alterações remotas são baixadas individualmente; o app não precisa recarregar todo o conteúdo das transcrições em cada abertura.
- Exclusões viraram marcações permanentes no D1, impedindo que uma cópia antiga em outro aparelho recrie uma conversa apagada.
- Nova área unificada **Preparar e Treinar**: Marcelo descreve a reunião, recebe uma proposta de abertura, mensagem central, argumentos, pedido, objeções, cuidados e checklist.
- O plano gerado é editável. Marcelo pode corrigir diretamente o que a IA não sabe, acrescentar informações e pedir uma nova versão sem perder as decisões já aprovadas.
- Informações ausentes aparecem como pendências; a IA não deve inventar fatos para completar o plano.
- Cada preparação e cada tentativa de ensaio são salvas no D1 em tabelas próprias.
- O ensaio usa as regras e as evidências do histórico real para personalizar o treino, mas é avaliado em rota separada e **nunca entra no histórico oficial, nas médias nem na confirmação de padrões recorrentes**.
- O resultado do ensaio compara a fala com o plano aprovado e mostra aderência por etapa e foco para a próxima tentativa.
- A versão do modelo de análise oficial continua v0.42. A v0.44 é uma versão do aplicativo e não provoca reavaliação desnecessária das conversas.

## Próxima etapa

- Abrir ou atualizar a v0.44 e confirmar que conversas já salvas aparecem como `0 enviada(s) agora`.
- Criar uma preparação real, corrigir pelo menos uma informação no plano e executar um ensaio completo.
- Confirmar no uso publicado que o ensaio aparece apenas na preparação e não altera os gráficos ou contagens da Evolução.
- Validar o novo laudo com conversas reais e calibrar a diferenciação entre ocorrência, atenção e erro em A12.
- Validar a leitura desktop na publicação e ajustar o que ficar menos confortável de ler.
- Usar a primeira fonte real na Biblioteca e revisar manualmente as propostas antes de qualquer mudança no manual.
