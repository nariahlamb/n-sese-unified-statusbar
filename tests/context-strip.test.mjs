import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

async function loadTs(path) {
  const result = await build({
    absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
    entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'esm',
    target: 'node22', logLevel: 'silent',
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

const { stripContextTags } = await loadTs('src/unified-statusbar/core/context-strip.ts');

const USER_STRIP_TAGS = [
  '世界状态更新', '角色', '事件池', '记忆', 'state', 'dream_think', 'branches', 'selections',
  'xuan', 'seed', 'choices', 'options', 'user_options', 'pose', 'sumup', 'choice', 'forum',
  'omake', 'bgm', 'ontological_anchor_protocol', 'flux', 'current_event', 'updatevariable',
  'story_driver', 'meow_fm', 'dream_summary', 'orange', 'director_log', 'dream_self_check',
  'progress', 'inner_flow', 'monster', 'think_nya~', 'konatan_planning~', 'think', 'thinking',
  'deep_thinking', 'ecot', 'tucao', 'novel_header', 'meta', 'liwe', 'theater',
];

test('stripContextTags 基本成对、大小写、属性与自闭合剥离', () => {
  assert.equal(stripContextTags('a<image>x</image>b<Image src="1">y</Image>c<image/>d', ['image']), 'abcd');
  assert.equal(stripContextTags('保留<image>孤儿不删', ['image']), '保留<image>孤儿不删');
  assert.equal(stripContextTags('<think><think>内</think>外</think>正文', ['think']), '正文');
  assert.equal(stripContextTags('<think_nya~>猫语思考</think_nya~>正文', ['think_nya~']), '正文');
  assert.equal(stripContextTags('<世界状态更新>旧</世界状态更新>正文', ['世界状态更新']), '正文');
  // 前缀边界：think 不误匹配 thinking，但两者都在清单时各自精准剥离
  assert.equal(stripContextTags('<thinking>思考</thinking>正文', ['think']), '<thinking>思考</thinking>正文');
});

test('stripContextTags 思维链内提及未闭合 <orange>/<UpdateVariable>/<options> 且列表在 thinking 之前时，绝不误吞 <content> 正文', () => {
  const raw = `<thinking>
【自言自语】
- 触发第1个 <orange> HTML模块：兽人公寓入住须知
- 检查 <orange> 场景美化模块
- 确认字数：<content> 内正文保持在 1000-2000 字，包含顶部 <novel_header>，正文结束后输出 <UpdateVariable> 和 <options>。
</thinking>
<content>
<novel_header>
[ChapterInfo|1|坠落的自由之云|新邻居与二楼的烟鬼前辈]
</novel_header>

走廊上的穿堂风裹着一股子廉价烟草味往屋里钻。桃井奈奈扶着门框探出半个身子。

<orange>
<style>.ui-note-01 { color: #3E2723; }</style>
<div class="ui-note-01">入住须知</div>
</orange>
<span style="display: none;">（入住须知便签）</span>

尼古喵喵把烫红的食指塞进嘴里嘬了一口。

<orange>
<style>.ui-receipt-02 { color: #1A1A1A; }</style>
<div class="ui-receipt-02">小票</div>
</orange>
<span style="display: none;">（便利店购物小票）</span>

尼古喵喵呛得眼泪狂飙。
</content>
<UpdateVariable>
<analysis>状态推进</analysis>
<JSONPatch>[]</JSONPatch>
</UpdateVariable>
<options>
1. 继续收拾纸箱
2. 递一瓶水过去
</options>
<StatusPlaceHolderImpl/>`;

  const stripped = stripContextTags(raw, USER_STRIP_TAGS);
  assert.equal(stripped.includes('<thinking>'), false, 'thinking 未剥离');
  assert.equal(stripped.includes('【自言自语】'), false, 'thinking 内容残留');
  assert.equal(stripped.includes('<novel_header>'), false, 'novel_header 未剥离');
  assert.equal(stripped.includes('<orange>'), false, 'orange 未剥离');
  assert.equal(stripped.includes('<UpdateVariable>'), false, 'UpdateVariable 未剥离');
  assert.equal(stripped.includes('<options>'), false, 'options 未剥离');
  assert.equal(stripped.includes('走廊上的穿堂风裹着一股子廉价烟草味往屋里钻'), true, '正文前段被误吞');
  assert.equal(stripped.includes('尼古喵喵把烫红的食指塞进嘴里嘬了一口'), true, '正文中段被误吞');
  assert.equal(stripped.includes('尼古喵喵呛得眼泪狂飙'), true, '正文尾段被误吞');
});
