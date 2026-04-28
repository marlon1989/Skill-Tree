## Estilo de Código (Code Style)
* Funções pequenas: 4-20 linhas. Divida-as se forem maiores.
* Arquivos curtos: mantenha com menos de 500 linhas. Divida por responsabilidade.
* SRP: faça apenas uma coisa por função e mantenha uma responsabilidade por módulo.
* Nomenclatura agressivamente única: evite termos genéricos como data, handler ou Manager. Prefira nomes que retornem menos de 5 resultados no grep.
* Tipos explícitos: obrigatórios em todo lugar. Sem dependência de any, Dict dinâmicos ou funções sem tipagem.
* DRY rigoroso: extraia lógica compartilhada para uma função ou módulo reutilizável.
* Menos carga cognitiva: prefira early returns a IFs aninhados. Máximo de 2 níveis de indentação.
* Exceções ricas: mensagens de erro devem incluir o valor problemático recebido e o formato esperado.

## Comentários (Comments)
* Preserve os comentários no refactor: não apague os comentários que explicam as decisões, pois eles contêm contexto e proveniência vitais.
* Escreva o PORQUÊ, não o O QUÊ: pule descrições de sintaxe básica (ex: incremento de variável).
* Docstrings: em funções públicas, documente a intenção e forneça um exemplo prático de uso.
* Rastreabilidade: faça referência a números de issues ou commits para justificar lógicas específicas ou workarounds.

## Testes (Tests)
* Testes devem rodar com um único comando previsível do projeto.
* Cobertura (TDD): toda função nova exige um teste. Correções de bugs ganham testes de regressão.
* Mocks focados: simule I/O externo (API, DB, filesystem) com classes "Fake" nomeadas, em vez de stubs inline soltos.
* Princípio F.I.R.S.T: testes devem ser rápidos, independentes, repetíveis, autovalidáveis e oportunos.

## Dependências (Dependencies)
* Injeção de dependência: injete dependências pelo construtor ou parâmetro, não use implementações globais.
* Encapsulamento: isole bibliotecas de terceiros atrás de uma interface fina própria do projeto.

## Estrutura (Structure)
* Siga as convenções: obedeça estritamente à estrutura do framework utilizado (Rails, Django, Next.js, etc.).
* Modularidade: prefira módulos pequenos e focados a arquivos gigantes.
* Caminhos previsíveis: utilize diretórios padrão como controller/model/view.

## Formatação (Formatting)
* Delegação de estilo: use o formatador padrão da linguagem (cargo fmt, prettier, black, rubocop -A, etc.). Não discuta estilo além disso.

## Logs e Resiliência (Logging & Defensive Code)
* Logging estruturado: use JSON para debugging e observabilidade. Texto puro apenas para output de CLI voltado ao usuário.
* Programação defensiva proativa: implemente ativamente rate limits, retries com backoff, circuit breakers e fallbacks nas integrações.
Vale ressaltar que a inclusão das regras de testes (TDD) e programação defensiva é essencial, pois o agente tende a implementar apenas o "caminho feliz" e não cria essas proteções a menos que receba uma instrução explícita para isso