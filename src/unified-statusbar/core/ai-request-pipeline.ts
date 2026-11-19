// core/ai-request-pipeline.ts
// U13：三段式 AI 请求的标准装配序列（零 DOM 依赖常量 + 纯函数；generateRaw 各站共用）。
// 收编口径：只收「各站逐字节一致」的部分——九元素中段；各站首尾（破限头 / 尾部破限 / 任务 system
// 段）、custom_api、一次性注入块差异保留在站内。
// 破限头与尾部破限统一走 core/jailbreak-config 的段数组解析器（...getJailbreakHeadPrompts() /
// ...getJailbreakTailPrompts()），本模块不再提供字符串版整串装配（旧装配函数已删，只留中段与上下文常量）。

/** 精简中段：world_info_before → user_input（全部 1A generateRaw 站共用）。
 *  已移除 'chat_history'：max_chat_history=0 时保留 'chat_history' 仍会被酒馆/TT 自动塞入
 *  at_depth 深度条目（如 <场景美化>）与 in_chat 扩展注入；
 *  资料块不再走 injectPrompts(after_system)（无 chat_history 时兼容层会跳过 in_chat/after_system 注入），
 *  统一经 buildStandardPromptMiddle() 内联在 dialogue_examples 与 user_input 之间。 */
export const STANDARD_PROMPT_MIDDLE = [
  'world_info_before',
  'persona_description',
  'char_description',
  'char_personality',
  'scenario',
  'world_info_after',
  'dialogue_examples',
  'user_input',
] as const;

export type StandardPromptMiddleEntry =
  | (typeof STANDARD_PROMPT_MIDDLE)[number]
  | { role: 'system'; content: string };

/**
 * 组装含内联资料块的标准中段槽位：将非空资料块作为 { role: 'system', content }
 * 插入 dialogue_examples 与 user_input 之间（无有效资料块时直接返回 STANDARD_PROMPT_MIDDLE）。
 */
export function buildStandardPromptMiddle(
  dossiers?: string | readonly (string | undefined | null)[],
): readonly StandardPromptMiddleEntry[] {
  const list = (Array.isArray(dossiers) ? dossiers : [dossiers])
    .map(d => (typeof d === 'string' ? d.trim() : ''))
    .filter(Boolean);
  if (list.length === 0) return STANDARD_PROMPT_MIDDLE;
  return [
    ...STANDARD_PROMPT_MIDDLE.slice(0, -1),
    ...list.map(content => ({ role: 'system' as const, content })),
    STANDARD_PROMPT_MIDDLE[STANDARD_PROMPT_MIDDLE.length - 1],
  ];
}

/** 标准请求的 max_chat_history：0 上下文（原生 chat_history 不带楼层，剧情上下文走资料块内联）。 */
export const STANDARD_MAX_CHAT_HISTORY = 0;

/**
 * 一次性「触发注入」并返回待内联的剧情上下文资料块（calendar / shop-story 孪生站共用）：
 * triggerId/position:none/should_scan:true 喂激活素材（必须在每次重试尝试内执行）；
 * 返回的上下文资料块文本由调用方传给 buildStandardPromptMiddle() 内联进 ordered_prompts。
 */
export function injectTriggerAndContext(
  th: { injectPrompts?: (prompts: unknown[], opts?: { once?: boolean }) => unknown },
  opts: { triggerId: string; contextId?: string; storyContext: string; extraPrompt?: string; charNames: string[] },
): string {
  const { triggerId, storyContext, extraPrompt, charNames } = opts;
  if (typeof th?.injectPrompts === 'function' && (charNames.length > 0 || storyContext)) {
    th.injectPrompts([{
      id: triggerId,
      position: 'none',
      depth: 0,
      role: 'system',
      content: [charNames.join(' '), extraPrompt?.trim() || '', storyContext].filter(Boolean).join('\n\n'),
      should_scan: true,
    }], { once: true });
  }
  return storyContext
    ? '【剧情上下文（最近剧情的 AI 回复节选，供与既有剧情保持一致）】\n' + storyContext
    : '';
}
