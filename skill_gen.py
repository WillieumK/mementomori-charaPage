# -*- coding: utf-8 -*-
"""读取本地 MasterData 主数据 -> 生成 data/skill_*.json（角色技能页专用压缩映射）。

用法：python skill_gen.py
输出（UTF-8）：
  skill_char.json   {cid: {n,e,j,r,nor,act[],pas[],m,en,in,he,g,spd,ibp[[type,val]...]}}
  skill_skill.json  {a_id:{n,cd,d:[[lv,desc]...]}, p_id:{n,cd,d:[[lv,desc]...]}}
  skill_coll.json   {cid:{n,req[],lv:[{l,rar,add[]}]}}
  skill_weapon.json {cid:{desc[3行],ef:[{memo,add[]}]}}
  skill_stat.json   {pot:{"lv.sub":total}, coef:[[init,target,m,b]...], rname:{flags:name}}
"""
import json, urllib.request, msgpack
from pathlib import Path

MASTER_DIR = Path(__file__).resolve().parent.parent.parent   # MasterData 目录
OUT_DIR = Path(__file__).resolve().parent / "data"

BASE_PARAM = {1: "力量", 2: "战技", 3: "魔力", 4: "耐力"}
BATTLE = {1: "生命", 2: "攻击力", 3: "物理防御", 4: "魔法防御", 5: "命中", 6: "闪避",
          7: "暴击", 8: "暴击抗性", 9: "暴击伤害强化", 10: "物暴降低", 11: "魔暴降低",
          12: "防御穿透", 13: "防御力", 14: "物魔防御穿透", 15: "弱化效果命中",
          16: "弱化效果抗性", 17: "伤害反弹", 18: "吸血", 19: "速度"}
IBP_TO_TYPE = {"HP": 1, "AttackPower": 2, "PhysicalDamageRelax": 3, "MagicDamageRelax": 4,
               "Hit": 5, "Avoidance": 6, "Critical": 7, "CriticalResist": 8,
               "CriticalDamageEnhance": 9, "PhysicalCriticalDamageRelax": 10,
               "MagicCriticalDamageRelax": 11, "DefensePenetration": 12, "Defense": 13,
               "DamageEnhance": 14, "DebuffHit": 15, "DebuffResist": 16, "DamageReflect": 17,
               "HpDrain": 18, "Speed": 19}
RARITY_BITS = ["N", "R", "R+", "SR", "SR+", "SSR", "SSR+", "UR", "UR+", "LR"] + \
              ["LR+" + str(i) for i in range(1, 11)]
RARITY_MAP = {1 << i: RARITY_BITS[i] for i in range(len(RARITY_BITS))}


_mver = None
def _auth():
    global _mver
    if _mver:
        return _mver
    for ver in ["4.19.2", "4.19.0", "4.18.0"]:
        try:
            h = {"OrtegaDeviceType": "4", "ortegaappversion": ver, "Content-Type": "application/octet-stream"}
            r = urllib.request.Request("https://prd1-auth.mememori-boi.com/api/auth/getDataUri", data=msgpack.packb({"CountryCode": "JP", "UserId": 0}), headers=h, method="POST")
            _mver = dict(urllib.request.urlopen(r, timeout=30).headers)["ortegamasterversion"]
            return _mver
        except Exception:
            continue
    raise RuntimeError("auth failed")

def load_official(name):
    base = "https://cdn-mememori.akamaized.net/master/prd1/version/%s/" % _auth()
    url = base + name.replace(".json", "")
    req = urllib.request.Request(url, headers={"User-Agent": "codex"})
    return msgpack.unpackb(urllib.request.urlopen(req, timeout=120).read())

def load(name):
    # 官方 boi CDN 优先（msgpack 解码），失败则 fallback 本地
    try:
        return load_official(name)
    except Exception as e:
        print("official fail", name, e)
    fp = MASTER_DIR / name
    if not fp.exists():
        print("MISSING:", name)
        return []
    with open(fp, encoding="utf-8") as f:
        return json.load(f)


def rarity_name(flags):
    if not flags:
        return ""
    if flags in RARITY_MAP:
        return RARITY_MAP[flags]
    return "R" + str(flags)


def fmt_change(pname, ct, val):
    if ct == 1:
        return "%s +%d" % (pname, val)
    if ct == 2:
        return "%s +%.2f%%" % (pname, val / 100.0)
    return "%s +%d\u00d7\u89d2\u8272\u7b49\u7ea7" % (pname, val)  # ×角色等级


def change_lines(base_list, bat_list):
    out = []
    for info in (base_list or []):
        pn = BASE_PARAM.get(info.get("BaseParameterType"), "四维%d" % info.get("BaseParameterType"))
        out.append(fmt_change(pn, info.get("ChangeParameterType"), info.get("Value")))
    for info in (bat_list or []):
        pn = BATTLE.get(info.get("BattleParameterType"), "属性%d" % info.get("BattleParameterType"))
        out.append(fmt_change(pn, info.get("ChangeParameterType"), info.get("Value")))
    return out


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = load("TextResourceZhCnMB.json")
    tmap = {}
    for i in text:
        k = (i.get("StringKey") or "").strip("[]")
        if k and k not in tmap:
            tmap[k] = i.get("Text", "")

    # ---- skill_char.json ----
    chars = load("CharacterMB.json")
    char_map = {}
    for c in chars:
        cid = c["Id"]
        bp = c.get("BaseParameterCoefficient") or {}
        ibp = c.get("InitialBattleParameter") or {}
        ibp_list = []
        for k in ("HP", "AttackPower", "PhysicalDamageRelax", "MagicDamageRelax", "Hit",
                  "Avoidance", "Critical", "CriticalResist", "CriticalDamageEnhance",
                  "PhysicalCriticalDamageRelax", "MagicCriticalDamageRelax",
                  "DefensePenetration", "Defense", "DamageEnhance", "DebuffHit",
                  "DebuffResist", "DamageReflect", "HpDrain", "Speed"):
            t = IBP_TO_TYPE[k]
            if k in ibp:
                ibp_list.append([t, ibp[k]])
        char_map[str(cid)] = {
            "n": tmap.get("CharacterName%d" % cid, c.get("Memo") or ("角色%d" % cid)),
            "e": c.get("ElementType", 0),
            "j": c.get("JobFlags", 0),
            "r": c.get("RarityFlags", 0),
            "nor": c.get("NormalSkillId", 0),
            "act": c.get("ActiveSkillIds") or [],
            "pas": c.get("PassiveSkillIds") or [],
            "m": bp.get("Muscle", 0),
            "en": bp.get("Energy", 0),
            "in": bp.get("Intelligence", 0),
            "he": bp.get("Health", 0),
            "g": c.get("BaseParameterGrossCoefficient", 0),
            "spd": ibp.get("Speed", 0),
            "ibp": ibp_list,
        }
    with open(OUT_DIR / "skill_char.json", "w", encoding="utf-8") as f:
        json.dump(char_map, f, ensure_ascii=False, separators=(",", ":"))
    print("skill_char.json:", len(char_map))

    # ---- skill_skill.json ----
    skill_map = {}
    active = load("ActiveSkillMB.json")
    for s in active:
        sid = s["Id"]
        d = []
        for info in s.get("ActiveSkillInfos") or []:
            desc = tmap.get((info.get("DescriptionKey") or "").strip("[]"), "")
            if desc:
                d.append([info.get("CharacterLevel", 0), desc])
        if not d:
            continue
        skill_map["a_%d" % sid] = {
            "n": tmap.get((s.get("NameKey") or "").strip("[]"), s.get("Memo") or ("技能%d" % sid)),
            "cd": s.get("SkillMaxCoolTime", 0),
            "d": d,
        }
    passive = load("PassiveSkillMB.json")
    for s in passive:
        sid = s["Id"]
        d = []
        cd = 0
        for info in s.get("PassiveSkillInfos") or []:
            desc = tmap.get((info.get("DescriptionKey") or "").strip("[]"), "")
            subs = info.get("PassiveSubSetSkillInfos") or []
            if subs and not cd:
                cd = subs[0].get("SkillMaxCoolTime", 0)
            if desc:
                d.append([info.get("CharacterLevel", 0), desc])
        if not d:
            continue
        skill_map["p_%d" % sid] = {
            "n": tmap.get((s.get("NameKey") or "").strip("[]"), s.get("Memo") or ("技能%d" % sid)),
            "cd": cd,
            "d": d,
        }
    with open(OUT_DIR / "skill_skill.json", "w", encoding="utf-8") as f:
        json.dump(skill_map, f, ensure_ascii=False, separators=(",", ":"))
    print("skill_skill.json:", len(skill_map))

    # ---- skill_coll.json ----
    coll_main = load("CharacterCollectionMB.json")
    coll_lv = load("CharacterCollectionLevelMB.json")
    lv_by_coll = {}
    for it in coll_lv:
        lv_by_coll.setdefault(it.get("CollectionId"), []).append(it)
    coll_map = {}
    for c in coll_main:
        cid = c["Id"]
        lvs = []
        for it in sorted(lv_by_coll.get(cid, []), key=lambda x: x.get("CollectionLevel", 0)):
            lvs.append({
                "l": it.get("CollectionLevel", 0),
                "rar": rarity_name(it.get("CharacterRarityFlags", 0)),
                "add": change_lines(it.get("BaseParameterChangeInfos"), it.get("BattleParameterChangeInfos")),
            })
        coll_map[str(cid)] = {
            "n": tmap.get("CharacterCollectionName%d" % cid, c.get("Memo") or ("秘仪%d" % cid)),
            "req": [x for x in (c.get("RequiredCharacterIds") or []) if x and x > 0],
            "lv": lvs,
        }
    with open(OUT_DIR / "skill_coll.json", "w", encoding="utf-8") as f:
        json.dump(coll_map, f, ensure_ascii=False, separators=(",", ":"))
    print("skill_coll.json:", len(coll_map))

    # ---- skill_weapon.json ----
    wep = load("EquipmentExclusiveEffectMB.json")
    wep_map = {}
    for w in wep:
        cid = w.get("CharacterId")
        if not cid:
            continue
        key = str(cid)
        if key not in wep_map:
            wep_map[key] = {"desc": [tmap.get("EquipmentExclusiveSkill%dDescription%d" % (cid, lv), "")
                                     for lv in range(1, 4)],
                            "ef": []}
        wep_map[key]["ef"].append({
            "memo": w.get("Memo", ""),
            "add": change_lines(w.get("BaseParameterChangeInfoList"), w.get("BattleParameterChangeInfoList")),
        })
    with open(OUT_DIR / "skill_weapon.json", "w", encoding="utf-8") as f:
        json.dump(wep_map, f, ensure_ascii=False, separators=(",", ":"))
    print("skill_weapon.json:", len(wep_map))

    # ---- skill_stat.json ----
    pot_map = {}
    pot = load("CharacterPotentialMB.json")
    for p in pot:
        pot_map["%d.%d" % (p.get("CharacterLevel"), p.get("CharacterSubLevel"))] = p.get("TotalBaseParameter")
    coeff = load("CharacterPotentialCoefficientMB.json")
    coef_list = []
    for c in coeff:
        rc = c.get("RarityCoefficientInfo") or {}
        coef_list.append([c.get("InitialRarityFlags"), c.get("RarityFlags"),
                          rc.get("m", 0), rc.get("b", 0)])
    stat = {
        "pot": pot_map,
        "coef": coef_list,
        "rname": {str(flags): RARITY_MAP[flags] for flags in RARITY_MAP},
    }
    with open(OUT_DIR / "skill_stat.json", "w", encoding="utf-8") as f:
        json.dump(stat, f, ensure_ascii=False, separators=(",", ":"))
    print("skill_stat.json: pot=%d coef=%d" % (len(pot_map), len(coef_list)))


if __name__ == "__main__":
    main()
