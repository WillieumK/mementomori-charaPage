/* 生成 data/pvp_excl.json（专武技能 + 3 条属性加成）
   数据源：MasterData/EquipmentMB.json（专武装备，Category 3）、
           MasterData/EquipmentExclusiveEffectMB.json（属性加成）、
           MasterData/EquipmentExclusiveSkillDescriptionMB.json（3 条强化描述）、
           MasterData/TextResourceZhCnMB.json（简中翻译）
   用法：node tools/build_excl.mjs "E:/clear_software/Microsoft VS Code/MasterData" "…/mementomori-charaPage-main/data" */
import fs from "node:fs";
import path from "node:path";

const MASTER = process.argv[2];
const OUTDIR = process.argv[3];
if (!MASTER || !OUTDIR) { console.error("用法: node build_excl.mjs <MasterData目录> <data目录>"); process.exit(1); }

const rd = f => JSON.parse(fs.readFileSync(path.join(MASTER, f), "utf8").replace(/^\uFEFF/, ""));

/* 与官方枚举一致（见 PROJECT_交接文档 / 检技新池专秘v2权重.py） */
const BASE_PARAM_MAP = { 1: "力量", 2: "战技", 3: "魔力", 4: "耐力" };
const BATTLE_PARAM_MAP = {
  1: "生命", 2: "攻击力", 3: "物理防御力", 4: "魔法防御力", 5: "命中", 6: "闪避", 7: "暴击", 8: "暴击抗性",
  9: "暴击伤害强化", 10: "物理暴击伤害降低", 11: "魔法暴击伤害降低", 12: "防御穿透", 13: "防御力",
  14: "物魔防御穿透", 15: "弱化效果命中", 16: "弱化效果抗性", 17: "伤害反弹", 18: "吸血", 19: "速度"
};

const text = rd("TextResourceZhCnMB.json");
const T = {};
text.forEach(x => { if (x.StringKey) T[x.StringKey] = x.Text; });

const equip = rd("EquipmentMB.json");
const effects = rd("EquipmentExclusiveEffectMB.json");
const skillDesc = rd("EquipmentExclusiveSkillDescriptionMB.json");

const effectById = {};
effects.forEach(x => { effectById[x.Id] = x; });
const descById = {};
skillDesc.forEach(x => { descById[x.Id] = x; });

function fmtChange(map, pt, ct, val){
  const name = map[pt] || ("属性" + pt);
  if (ct === 1) return name + " +" + Math.round(val);
  if (ct === 2) return name + " +" + (val / 100).toFixed(2).replace(/\.?0+$/, "") + "%";
  return name + " +" + Math.round(val) + "×角色等级";
}
function attrLines(fx){
  const out = [];
  (fx.BaseParameterChangeInfoList || []).forEach(i => out.push(fmtChange(BASE_PARAM_MAP, i.BaseParameterType, i.ChangeParameterType, i.Value)));
  (fx.BattleParameterChangeInfoList || []).forEach(i => out.push(fmtChange(BATTLE_PARAM_MAP, i.BattleParameterType, i.ChangeParameterType, i.Value)));
  return out;
}

/* 找每个角色最高档的专武（Cat 3 = 角色专属武器），取 LR 优先、其次等级最高 */
const byChar = {};
equip.filter(e => e.Category === 3 && e.ExclusiveEffectId > 0).forEach(e => {
  const fx = effectById[e.ExclusiveEffectId];
  if (!fx || !fx.CharacterId) return;
  const cur = byChar[fx.CharacterId];
  const isLR = (e.Memo || "").includes("LR");
  const score = (isLR ? 100000 : 0) + (e.EquipmentLv || 0);
  if (!cur || score > cur.score) byChar[fx.CharacterId] = { score, e, fx };
});

const out = {};
Object.keys(byChar).sort((a, b) => Number(a) - Number(b)).forEach(cid => {
  const { e, fx } = byChar[cid];
  const d = descById[e.EquipmentExclusiveSkillDescriptionId];
  const descs = [];
  if (d) [d.Description1Key, d.Description2Key, d.Description3Key].forEach(k => {
    const v = k ? (T[k] || "") : "";
    if (v) descs.push(v);
  });
  out[String(cid)] = {
    n: T[e.NameKey] || ("专武 " + e.Id),      /* 专武名（游戏内简中） */
    r: e.RarityFlags >= 512 ? "LR" : (e.RarityFlags >= 256 ? "UR" : "SSR"),
    d: descs,                                  /* 3 条专武强化描述 */
    a: attrLines(fx)                           /* 专武属性加成 */
  };
});

const outPath = path.join(OUTDIR, "pvp_excl.json");
fs.writeFileSync(outPath, JSON.stringify(out), "utf8");
const lrCount = Object.values(out).filter(v => v.r === "LR").length;
console.log("写出", outPath, "角色数", Object.keys(out).length, "其中 LR", lrCount, "字节", fs.statSync(outPath).size);
