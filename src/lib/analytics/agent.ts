import OpenAI from "openai";
import {
  getSpending,
  getTopCategories,
  getReceipts,
  getItemHistory,
  comparePeriods,
  getSummary,
} from "./queries";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_spending",
      description:
        "Busca gastos filtrados por categoria, loja e período. Use para perguntas como 'quanto gastei com pão?' ou 'quanto gastei no mercado X?'",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "Nome da categoria (ex: Pão, Carne Bovina, Leite, Cerveja)",
          },
          store: { type: "string", description: "Nome da loja/mercado" },
          start_date: {
            type: "string",
            description: "Data início no formato YYYY-MM-DD",
          },
          end_date: {
            type: "string",
            description: "Data fim no formato YYYY-MM-DD",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_categories",
      description:
        "Retorna as categorias com maior gasto num período. Use para 'onde gasto mais?' ou 'quais categorias mais caras?'",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          limit: {
            type: "number",
            description: "Quantidade de categorias (padrão: 10)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_receipts",
      description:
        "Lista notas fiscais registradas. Use para 'quais notas tenho?' ou 'compras no mercado X'",
      parameters: {
        type: "object",
        properties: {
          store: { type: "string", description: "Nome da loja" },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          limit: { type: "number", description: "Máximo de resultados" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_item_history",
      description:
        "Histórico de compras de um item específico. Use para 'quando comprei manteiga?' ou 'histórico de cerveja'",
      parameters: {
        type: "object",
        properties: {
          item_name: {
            type: "string",
            description: "Nome do item (busca parcial)",
          },
          category: { type: "string", description: "Categoria do item" },
          limit: { type: "number", description: "Máximo de resultados" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_periods",
      description:
        "Compara gastos entre dois períodos. Use para 'gastei mais esse mês que o passado?' ou 'comparar março com fevereiro'",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Categoria para comparar" },
          period1_start: {
            type: "string",
            description: "Início do período 1 (YYYY-MM-DD)",
          },
          period1_end: {
            type: "string",
            description: "Fim do período 1 (YYYY-MM-DD)",
          },
          period2_start: {
            type: "string",
            description: "Início do período 2 (YYYY-MM-DD)",
          },
          period2_end: {
            type: "string",
            description: "Fim do período 2 (YYYY-MM-DD)",
          },
        },
        required: [
          "period1_start",
          "period1_end",
          "period2_start",
          "period2_end",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_summary",
      description:
        "Resumo geral de gastos num período. Use para 'resumo do mês' ou 'quanto gastei no total?'",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
        },
      },
    },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const functionMap: Record<string, (params: any) => Promise<unknown>> = {
  get_spending: getSpending,
  get_top_categories: getTopCategories,
  get_receipts: getReceipts,
  get_item_history: getItemHistory,
  compare_periods: comparePeriods,
  get_summary: getSummary,
};

const TODAY = () => new Date().toISOString().split("T")[0];

const SYSTEM_PROMPT = `Você é a Moni, uma assistente financeira pessoal que ajuda a analisar gastos a partir de notas fiscais.

Regras:
- Responda sempre em português brasileiro, de forma concisa e direta.
- Use as funções disponíveis para buscar dados antes de responder.
- Quando o usuário perguntar sobre "esse mês", use o mês atual. Hoje é ${TODAY()}.
- Formate valores monetários como R$ X,XX (vírgula para decimais, padrão brasileiro).
- Se não encontrar dados, diga que não há registros para o período/categoria.
- Não invente dados. Só responda com base no resultado das funções.
- Seja breve mas informativo. Use listas quando fizer sentido.`;

export async function answerQuestion(question: string): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: question },
  ];

  // First call — may request tool use
  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools,
  });

  let message = response.choices[0].message;

  // Handle tool calls (up to 3 rounds)
  let rounds = 0;
  while (message.tool_calls && message.tool_calls.length > 0 && rounds < 3) {
    messages.push(message);

    // Execute all tool calls in parallel
    const results = await Promise.all(
      message.tool_calls.map(async (toolCall) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tc = toolCall as any;
        const fnName = tc.function?.name ?? tc.name;
        const fnArgs = tc.function?.arguments ?? tc.arguments;
        const fn = functionMap[fnName];
        if (!fn) {
          return {
            tool_call_id: tc.id,
            role: "tool" as const,
            content: JSON.stringify({ error: "Unknown function" }),
          };
        }

        try {
          const params = JSON.parse(fnArgs);
          const result = await fn(params);
          return {
            tool_call_id: tc.id,
            role: "tool" as const,
            content: JSON.stringify(result),
          };
        } catch (err) {
          return {
            tool_call_id: tc.id,
            role: "tool" as const,
            content: JSON.stringify({
              error: err instanceof Error ? err.message : "Query failed",
            }),
          };
        }
      }),
    );

    messages.push(...results);

    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
    });

    message = response.choices[0].message;
    rounds++;
  }

  return message.content ?? "Não consegui processar sua pergunta.";
}
