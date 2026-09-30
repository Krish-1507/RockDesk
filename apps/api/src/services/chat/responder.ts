import type { TicketRecord } from "@chat-to-ticket/shared";

export type Lang = "en" | "hi" | "hinglish" | "es" | "ar" | "zh";

const T = <V>(record: Record<Lang, V>): Record<Lang, V> => record;

export const CANCELLED_MESSAGE = T({
  en: "Understood. I discarded the pending ticket.",
  hi: "समझ गया। मैंने अधूरा टिकट हटा दिया है।",
  hinglish: "Samajh gaya. Maine pending ticket discard kar diya hai.",
  es: "Entendido. Descarté el ticket pendiente.",
  ar: "فهمت. تجاهلت التذكرة المعلّقة.",
  zh: "明白了，我已放弃未完成的工单。",
});

export const GREETING_FALLBACK = T({
  en: "Hi. Tell me about an issue or task and I can turn it into a ticket.",
  hi: "नमस्ते। कोई समस्या या काम बताइए, मैं उसका टिकट बना दूंगा।",
  hinglish: "Hi! Koi issue ya task batao, main uska ticket bana dunga.",
  es: "Hola. Cuéntame un problema o tarea y lo convierto en un ticket.",
  ar: "مرحباً. أخبرني عن مشكلة أو مهمة وسأحوّلها إلى تذكرة.",
  zh: "你好，请告诉我问题或任务，我会把它变成工单。",
});

const ASK_ASSIGNEE = T({
  en: "Who should I assign this to?",
  hi: "इसे किसे सौंपा जाए?",
  hinglish: "Isko kisko assign karoon?",
  es: "¿A quién se lo asigno?",
  ar: "لمن يجب أن أُسند هذه المهمة؟",
  zh: "应该分配给谁？",
});

const ASK_DATE = T({
  en: "When should it be due?",
  hi: "इसकी समय-सीमा कब होनी चाहिए?",
  hinglish: "Iski deadline kab tak honi chahiye?",
  es: "¿Para cuándo debería estar listo?",
  ar: "متى يجب أن يكون موعد التسليم؟",
  zh: "截止日期是什么时候？",
});

const ASK_BOTH = T({
  en: "Got it. Who should I assign this to, and when should it be due?",
  hi: "समझ गया। इसे किसे सौंपा जाए, और समय-सीमा कब होनी चाहिए?",
  hinglish: "Got it. Isko kisko assign karoon, aur deadline kab tak hai?",
  es: "Entendido. ¿A quién se lo asigno y para cuándo debería estar listo?",
  ar: "فهمت. لمن أسندها، ومتى موعد التسليم؟",
  zh: "明白了。应该分配给谁，截止日期是什么时候？",
});

const ASK_TITLE = T({
  en: "Could you describe the issue or task in a line or two?",
  hi: "कृपया समस्या या काम के बारे में एक-दो पंक्तियों में बताइए?",
  hinglish: "Issue ya task ke baare mein ek-do line mein bataoge?",
  es: "¿Podrías describir el problema o la tarea en una o dos líneas?",
  ar: "هل يمكنك وصف المشكلة أو المهمة في سطر أو سطرين؟",
  zh: "能用一两句话描述一下这个问题或任务吗？",
});

function ambigAssignee(lang: Lang, name: string, options: Array<{ name: string; department: string | null }>): string {
  const list = options.map((o) => `${o.name}${o.department ? ` (${o.department})` : ""}`).join(" or ");
  switch (lang) {
    case "hi":
      return `मुझे ${name} नाम के ${options.length} लोग मिले। किसे सौंपा जाए: ${list}?`;
    case "hinglish":
      return `Mujhe ${name} naam ke ${options.length} log mile. Kisko assign karoon: ${list}?`;
    case "es":
      return `Encontré ${options.length} personas llamadas ${name}. ¿A quién se lo asigno: ${list}?`;
    case "ar":
      return `وجدت ${options.length} أشخاص باسم ${name}. لمن أسندها: ${list}؟`;
    case "zh":
      return `我找到${options.length}个叫${name}的人。应该分配给谁：${list}？`;
    default:
      return `I found ${options.length} people named ${name}. Which one should I assign: ${list}?`;
  }
}

function notFound(lang: Lang, candidate: string, teamNames: string[]): string {
  const list = teamNames.slice(0, 6).join(", ");
  switch (lang) {
    case "hi":
      return `मुझे टीम में ${candidate} नहीं मिला। किसे सौंपा जाए? उपलब्ध लोग: ${list}।`;
    case "hinglish":
      return `Mujhe team mein ${candidate} nahi mila. Kisko assign karoon? Available log: ${list}.`;
    case "es":
      return `No encontré a ${candidate} en el equipo. ¿A quién se lo asigno? Disponibles: ${list}.`;
    case "ar":
      return `لم أجد ${candidate} في الفريق. لمن أسندها؟ المتاحون: ${list}.`;
    case "zh":
      return `在团队中找不到${candidate}。应该分配给谁？可选：${list}。`;
    default:
      return `I couldn't find ${candidate} in the team. Who should I assign it to? Available: ${list}.`;
  }
}

export interface ClarificationContext {
  missingFields: Array<"title" | "assignee" | "due_date">;
  assigneeProblem: { kind: "ambiguous" | "not_found"; options?: Array<{ name: string; department: string | null }>; candidate?: string } | null;
  ambiguousDateQuestion: string | null;
  candidateName: string | null;
  teamNames: string[];
  title: string | null;
}

export function buildClarification(lang: Lang, ctx: ClarificationContext): string {
  const parts: string[] = [];
  if (ctx.missingFields.includes("title")) parts.push(ASK_TITLE[lang]);
  if (ctx.assigneeProblem?.kind === "ambiguous" && ctx.assigneeProblem.options?.length) {
    parts.push(ambigAssignee(lang, ctx.candidateName ?? "that name", ctx.assigneeProblem.options));
  } else if (ctx.assigneeProblem?.kind === "not_found" && ctx.assigneeProblem.candidate) {
    parts.push(notFound(lang, ctx.assigneeProblem.candidate, ctx.teamNames));
  } else if (ctx.missingFields.includes("assignee")) {
    if (ctx.missingFields.includes("due_date") && !ctx.ambiguousDateQuestion) {
      parts.push(ASK_BOTH[lang]);
      return parts.join(" ");
    }
    parts.push(ASK_ASSIGNEE[lang]);
  }
  if (ctx.missingFields.includes("due_date")) {
    const question = ctx.ambiguousDateQuestion;
    const date = question?.replace(/^Did you mean /, "").replace(/\?$/, "");
    const localized = date ? {
      en: question, hi: `क्या आपका मतलब ${date} है?`, hinglish: `Kya aapka matlab ${date} hai?`,
      es: `¿Te refieres a ${date}?`, ar: `هل تقصد ${date}؟`, zh: `你是指 ${date} 吗？`,
    }[lang] : null;
    parts.push(localized ?? ASK_DATE[lang]);
  }
  return parts.join(" ") || ASK_BOTH[lang];
}

function formatDue(iso: string | null): string {
  if (!iso) return "No deadline";
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const ASK_DUPLICATE = (ticketNumber: number, title: string) =>
  T({
    en: `This looks similar to #${ticketNumber} (${title}). Should I create it anyway?`,
    hi: `यह #${ticketNumber} (${title}) जैसा लग रहा है। क्या फिर भी नया टिकट बनाऊं?`,
    hinglish: `Ye #${ticketNumber} (${title}) jaisa lag raha hai. Phir bhi naya ticket bana doon?`,
    es: `Esto se parece al #${ticketNumber} (${title}). ¿Lo creo de todos modos?`,
    ar: `هذا يشبه التذكرة #${ticketNumber} (${title}). هل أنشئها على أي حال؟`,
    zh: `这看起来和工单 #${ticketNumber}（${title}）很像。要继续创建吗？`,
  });

export function buildDuplicateQuestion(lang: Lang, ticketNumber: number, title: string): string {
  return ASK_DUPLICATE(ticketNumber, title)[lang];
}

export function buildConfirmation(lang: Lang, ticket: TicketRecord): string {
  const assignee = ticket.assignee?.name ?? "Unassigned";
  const core = `#${ticket.ticketNumber} · ${ticket.title} | ${assignee} | ${formatDue(ticket.dueDate)} | ${ticket.priority}`;
  switch (lang) {
    case "hi":
      return `टिकट ${core} बनाया गया।`;
    case "hinglish":
      return `Ticket ${core} create ho gaya hai.`;
    case "es":
      return `Ticket ${core} creado.`;
    case "ar":
      return `تم إنشاء التذكرة ${core}.`;
    case "zh":
      return `工单${core}已创建。`;
    default:
      return `Ticket ${core} created.`;
  }
}
