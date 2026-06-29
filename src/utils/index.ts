import { invoke } from "@tauri-apps/api/core";
// @ts-ignore
import gearDetailsRaw from "../constants/gear_details.json";

const gearDetails = gearDetailsRaw as any;

export async function fetchUrlWithRetry(url: string, retries = 3, baseDelay = 2000, headers?: Record<string, string>): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      return await invoke<string>("fetch_url", { url, headers });
    } catch (err) {
      if (i === retries - 1) {
        throw err;
      }
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`Request failed for ${url}. Retrying in ${delay}ms... Error:`, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Failed after retries");
}

export async function fetchUrlPostWithRetry(url: string, body: string, retries = 3, baseDelay = 2000): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      return await invoke<string>("fetch_url_post", { url, body });
    } catch (err) {
      if (i === retries - 1) {
        throw err;
      }
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`POST request failed for ${url}. Retrying in ${delay}ms... Error:`, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Failed after retries");
}

export const formatDecimal = (val: string | number): string => {
  return String(val).replace(".", ",");
};

export const getTierColor = (tier: number): string => {
  switch (tier) {
    case 1: case 2: return "#48bb78"; // Green
    case 3: return "#3182ce"; // Blue
    case 4: return "#dd6b20"; // Orange
    case 5: return "#319795"; // Teal
    case 6: return "#805ad5"; // Purple
    case 7: case 8: return "#d69e2e"; // Gold
    default: return "#718096"; // Gray
  }
};

export const getClassRestriction = (gearType: string | null): { text: string; color: string } => {
  if (!gearType) return { text: "All Classes", color: "#4caf50" };
  
  switch (gearType.toUpperCase()) {
    case "SWORD":
    case "SHIELD":
      return { text: "Knight Only", color: "#ef4444" };
    case "BOW":
    case "ARROW":
      return { text: "Ranger Only", color: "#ef4444" };
    case "STAFF":
    case "ORB":
      return { text: "Sorcerer Only", color: "#ef4444" };
    case "SCEPTER":
    case "TOME":
      return { text: "Priest Only", color: "#ef4444" };
    case "CROSSBOW":
    case "BOLT":
      return { text: "Hunter Only", color: "#ef4444" };
    case "AXE":
    case "HATCHET":
      return { text: "Slayer Only", color: "#ef4444" };
    default:
      return { text: "All Classes", color: "#4caf50" };
  }
};

export const getStatName = (statType: number): string => {
  switch (statType) {
    case 1: return "Fiziksel Saldırı (Phys. Atk)";
    case 2: return "Büyüsel Saldırı (Mag. Atk)";
    case 3: return "Savunma (Defense)";
    case 4: return "Maks HP (Max HP)";
    case 5: return "Maks MP (Max MP)";
    case 6: return "Kritik Şansı (Crit Chance)";
    case 7: return "Kritik Hasarı (Crit Damage)";
    case 8: return "Saldırı Hızı (Attack Speed)";
    case 9: return "Hareket Hızı (Move Speed)";
    case 10: return "Can Çalma (Life Steal)";
    case 11: return "Can Yenileme (HP Regen)";
    case 12: return "Mana Yenileme (MP Regen)";
    case 13: return "İsabet (Accuracy)";
    case 14: return "Kaçınma (Evasion)";
    case 15: return "Nihai Hasar (Final Damage)";
    case 16: return "Hasar Azaltma (Damage Reduction)";
    case 17: return "TP Kazanımı (XP Gain)";
    case 18: return "Altın Kazanımı (Gold Gain)";
    case 19: return "Eşya Bulma Şansı (Item Find)";
    case 24: return "Fiziksel Hasar (Phys. Damage)";
    case 25: return "Arttırılmış Savunma (Inc. Defense)";
    case 26: return "Maks HP Artışı (Inc. Max HP)";
    case 27: return "Maks MP Artışı (Inc. Max MP)";
    case 49: return "Bekleme Süresi Azaltma (Cooldown Reduction)";
    case 52: return "Yetenek Seviyesi (Skill Level)";
    default: return `Özellik #${statType}`;
  }
};

export const formatStatValue = (statType: number, value: number): string => {
  const percentStats = [6, 7, 8, 9, 10, 17, 18, 19, 24, 25, 26, 27, 49];
  const prefix = value > 0 ? "+" : "";
  const formatted = formatDecimal(value);
  if (percentStats.includes(statType)) {
    return `${prefix}${formatted}%`;
  }
  return `${prefix}${formatted}`;
};

export const formatEnchantOrSlot = (ench: any): string => {
  const isPercent = ench.ModType === 1 || [6, 7, 8, 9, 10, 16, 17, 18, 19, 24, 25, 26, 27, 49].includes(ench.StatType);
  const prefix = ench.Value > 0 ? "+" : "";
  const displayVal = isPercent ? formatDecimal(Number((ench.Value / 10).toFixed(1))) : String(ench.Value);
  const suffix = isPercent ? "%" : "";
  
  let name = getStatName(ench.StatType);
  if (ench.StatType === 1 && ench.ModType === 1) {
    name = "Increased Attack Damage";
  } else if (ench.StatType === 2 && ench.ModType === 1) {
    name = "Increased Magic Damage";
  } else if (ench.StatType === 3 && ench.ModType === 1) {
    name = "Increased Defense";
  }
  
  return `${name} ${prefix}${displayVal}${suffix}`;
};

export const getSlotLimits = (grade: string, gearType: string | null) => {
  const isJewelryOrArmorOrWeapon = [
    "SWORD", "BOW", "CROSSBOW", "AXE", "HATCHET", "STAFF", "SCEPTER", "ORB", "TOME", "SHIELD", "ARROW", "BOLT",
    "HELMET", "ARMOR", "GLOVES", "BOOTS",
    "AMULET", "EARING", "EARRING", "RING", "BRACER", "BRACELET", "NECKLACE"
  ].includes(gearType?.toUpperCase() || "");
  
  if (!isJewelryOrArmorOrWeapon) {
    return { decoration: 0, engraving: 0, inscription: 0 };
  }
  
  switch (grade) {
    case "Common":
      return { decoration: 0, engraving: 0, inscription: 0 };
    case "Uncommon":
      return { decoration: 0, engraving: 0, inscription: 0 };
    case "Rare":
      return { decoration: 1, engraving: 0, inscription: 0 };
    case "Legendary":
      return { decoration: 1, engraving: 1, inscription: 0 };
    case "Immortal":
      return { decoration: 2, engraving: 1, inscription: 0 };
    case "Arcana":
      return { decoration: 2, engraving: 1, inscription: 1 };
    case "Beyond":
      return { decoration: 3, engraving: 1, inscription: 1 };
    case "Celestial":
      return { decoration: 3, engraving: 2, inscription: 1 };
    case "Divine":
      return { decoration: 4, engraving: 2, inscription: 1 };
    case "Cosmic":
      return { decoration: 4, engraving: 2, inscription: 2 };
    default:
      return { decoration: 0, engraving: 0, inscription: 0 };
  }
};

export interface SearchableItem {
  name: string;
  marketHashName: string;
  gearType: string | null;
  grade: string;
  level: number | null;
}

export function matchSearchQuery(item: SearchableItem, query: string): boolean {
  if (!query.trim()) return true;
  const tokens = query.trim().toLowerCase().split(/\s+/);
  return tokens.every((token) => {
    const isNumeric = /^\d+$/.test(token);
    const nameMatch = item.name?.toLowerCase().includes(token) ?? false;
    const engMatch = item.marketHashName?.toLowerCase().includes(token) ?? false;
    const gearMatch = item.gearType != null && item.gearType.toLowerCase() === token;
    const gradeMatch = item.grade?.toLowerCase() === token;
    if (isNumeric) {
      const levelMatch = item.level != null && item.level.toString() === token;
      return levelMatch || nameMatch || engMatch;
    }
    return nameMatch || engMatch || gearMatch || gradeMatch;
  });
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function parsePriceString(str: string): number | null {
  if (!str) return null;
  const cents = parseInt(str.replace(/[^0-9]/g, ""), 10);
  if (isNaN(cents)) return null;
  return centsToDollars(cents);
}

export function formatPrice(price: number, options?: { minFraction?: number; maxFraction?: number }): string {
  const minFrac = options?.minFraction ?? 2;
  const maxFrac = options?.maxFraction ?? 3;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac })}`;
}

export function formatPriceShort(price: number): string {
  return `$${price.toFixed(2)}`;
}
export const getInherentOptions = (
  gearType: string | null,
  level: number | null,
  grade: string,
  itemId?: string | null
) => {
  if (itemId && gearDetails.stats[itemId]) {
    const d = gearDetails.stats[itemId];
    const options: string[] = [];
    
    const PERCENT_STATS = new Set([
      'AttackSpeed', 'CriticalDamage', 'CooldownReduction', 'CriticalChance',
      'CastSpeed', 'DamageReduction', 'AllElementalResistance', 'BlockChance',
      'HpLeech', 'IncreaseProjectileDamage', 'SkillHealIncrease', 'SkillDurationIncrease',
      'SkillRangeExpansion', 'Multistrike', 'IncreaseExpAmount', 'DodgeChance'
    ]);
    
    const formatOption = (statName: string, modType: string, val: number) => {
      const displayNames: Record<string, string> = {
        MaxHp: "Max HP",
        CooldownReduction: "Cooldown Reduction",
        HpRegenPerSec: "HP Regen Per Sec",
        AttackDamage: "Attack Damage",
        CriticalChance: "Critical Chance",
        CriticalDamage: "Critical Damage",
        AttackSpeed: "Attack Speed",
        Armor: "Armor",
        DamageReduction: "Damage Reduction",
        AllElementalResistance: "All Elemental Resistance",
        BlockChance: "Block Chance",
        HpLeech: "Hp Leech",
        IncreaseProjectileDamage: "Increase Projectile Damage",
        SkillHealIncrease: "Skill Heal Increase",
        DamageAbsorption: "Damage Absorption",
        SkillDurationIncrease: "Skill Duration Increase",
        SkillRangeExpansion: "Skill Range Expansion",
        AddHpPerKill: "Add HP Per Kill",
        MovementSpeed: "Movement Speed",
        AddAllSkillLevel: "Add All Skill Level",
        BaseAttackCountReduction: "Base Attack Count Reduction",
        ProjectileCount: "Projectile Count",
        Multistrike: "Multistrike",
        IncreaseExpAmount: "Increase Exp Amount",
        DodgeChance: "Dodge Chance"
      };
      
      const name = displayNames[statName] || statName;
      
      if (statName === "HpRegenPerSec") {
        return `${name} +${(val / 100).toFixed(1).replace('.0', '')}`;
      }
      
      const isPercent = modType === "ADDITIVE" || modType === "MULTIPLICATIVE" || PERCENT_STATS.has(statName);
      
      if (isPercent) {
        return `${name} +${(val / 10).toFixed(1).replace('.0', '')}%`;
      }
      return `${name} +${val.toLocaleString()}`;
    };
    
    if (d.i1 && d.i1[0] !== 0 && gearDetails.statMap[d.i1[0]] !== "NONE") {
      options.push(formatOption(gearDetails.statMap[d.i1[0]], gearDetails.modMap[d.i1[1]], d.i1[2]));
    }
    if (d.i2 && d.i2[0] !== 0 && gearDetails.statMap[d.i2[0]] !== "NONE") {
      options.push(formatOption(gearDetails.statMap[d.i2[0]], gearDetails.modMap[d.i2[1]], d.i2[2]));
    }
    if (d.i3 && d.i3[0] !== 0 && gearDetails.statMap[d.i3[0]] !== "NONE") {
      options.push(formatOption(gearDetails.statMap[d.i3[0]], gearDetails.modMap[d.i3[1]], d.i3[2]));
    }
    
    return options;
  }

  if (!gearType || !level) return [];
  
  const options: string[] = [];
  
  const gradeCount: Record<string, number> = {
    Common: 0,
    Uncommon: 1,
    Rare: 1,
    Legendary: 2,
    Immortal: 2,
    Arcana: 3,
    Beyond: 3,
    Celestial: 3,
    Divine: 3,
    Cosmic: 3
  };
  
  const count = gradeCount[grade] || 0;
  if (count === 0) return [];
  
  const levelMult = level / 10;
  const uGearType = gearType.toUpperCase();
  
  const physicalWeapons = ["SWORD", "BOW", "CROSSBOW", "AXE", "HATCHET"];
  const magicalWeapons = ["STAFF", "SCEPTER", "ORB", "TOME"];
  const armors = ["HELMET", "ARMOR", "GLOVES", "BOOTS", "SHIELD"];
  
  if (physicalWeapons.includes(uGearType) || magicalWeapons.includes(uGearType)) {
    const incDmg = Math.round(15 + levelMult * 10);
    const critChance = formatDecimal((1.5 + levelMult * 0.8).toFixed(1));
    const flatDmg = Math.round(5 + levelMult * 12);
    
    const isMagic = magicalWeapons.includes(uGearType);
    if (count >= 1) options.push(`${incDmg}% ${isMagic ? "Increased Magic Damage" : "Increased Attack Damage"}`);
    if (count >= 2) options.push(`Critical Chance +${critChance}%`);
    if (count >= 3) options.push(`${isMagic ? "Magic Damage" : "Attack Damage"} +${flatDmg}`);
  } else if (armors.includes(uGearType)) {
    const incDef = Math.round(10 + levelMult * 8);
    const hpBonus = Math.round(20 + levelMult * 35);
    const dmgRed = formatDecimal((1 + levelMult * 0.5).toFixed(1));
    
    if (count >= 1) options.push(`${incDef}% Increased Defense`);
    if (count >= 2) options.push(`Max HP +${hpBonus}`);
    if (count >= 3) options.push(`Damage Reduction +${dmgRed}%`);
  } else {
    const cdr = formatDecimal((1.5 + levelMult * 1.1).toFixed(1));
    const critDmg = formatDecimal((3 + levelMult * 2.2).toFixed(1));
    const xpBonus = formatDecimal((2 + levelMult * 1.5).toFixed(1));
    
    if (count >= 1) options.push(`Cooldown Reduction +${cdr}%`);
    if (count >= 2) options.push(`Critical Damage +${critDmg}%`);
    if (count >= 3) options.push(`XP Gain +${xpBonus}%`);
  }
  
  return options;
};

export const getItemBaseStats = (
  itemId: string | null,
  gearType: string | null
): { name: string; value: string }[] => {
  if (!itemId || !gearType || !gearDetails.stats[itemId]) return [];
  
  const d = gearDetails.stats[itemId];
  const b1 = d.b1;
  if (!b1 || b1 === 0) return [];
  
  const stats: { name: string; value: string }[] = [];
  const uGearType = gearType.toUpperCase();
  
  const physicalWeapons = ["SWORD", "BOW", "CROSSBOW", "AXE", "HATCHET"];
  const magicalWeapons = ["STAFF", "SCEPTER", "ORB", "TOME"];
  const armors = ["HELMET", "ARMOR", "GLOVES", "BOOTS", "SHIELD"];
  
  if (physicalWeapons.includes(uGearType)) {
    stats.push({ name: "Attack Damage", value: String(b1) });
    
    let aps = "1.25";
    if (uGearType === "BOW") aps = "1.65";
    else if (uGearType === "CROSSBOW") aps = "1.35";
    else if (["AXE", "HATCHET"].includes(uGearType)) aps = "1.05";
    stats.push({ name: "Attack Per Second", value: aps });
  } else if (magicalWeapons.includes(uGearType)) {
    stats.push({ name: "Magic Damage", value: String(b1) });
    
    let aps = "1.15";
    if (uGearType === "SCEPTER") aps = "1.20";
    else if (uGearType === "ORB") aps = "1.30";
    else if (uGearType === "TOME") aps = "1.10";
    stats.push({ name: "Attack Per Second", value: aps });
  } else if (armors.includes(uGearType)) {
    stats.push({ name: "Armor", value: String(b1) });
  }
  
  return stats;
};

const OPTION_TRANSLATIONS: Record<string, string> = {
  "Increased Attack Damage": "Arttırılmış Saldırı Hasarı",
  "Increased Magic Damage": "Arttırılmış Büyü Hasarı",
  "Increased Defense": "Arttırılmış Savunma",
  "Critical Chance": "Kritik Şansı",
  "Critical Damage": "Kritik Hasarı",
  "Attack Damage": "Saldırı Hasarı",
  "Magic Damage": "Büyü Hasarı",
  "Defense": "Savunma",
  "Max HP": "Maks HP",
  "Damage Reduction": "Hasar Azaltma",
  "Cooldown Reduction": "Bekleme Süresi Azaltma",
  "XP Gain": "TP Kazanımı",
  "HP Regen Per Sec": "Saniye Başına HP Yenileme",
  "Hp Regen Per Sec": "Saniye Başına HP Yenileme",
  "Attack Speed": "Saldırı Hızı",
  "Armor": "Zırh",
  "All Elemental Resistance": "Tüm Element Dirençleri",
  "Block Chance": "Bloklama Şansı",
  "Hp Leech": "Can Çalma",
  "Increase Projectile Damage": "Fırlatılan Nesne Hasarı Artışı",
  "Skill Heal Increase": "Yetenek İyileştirme Artışı",
  "Damage Absorption": "Hasar Emilimi",
  "Skill Duration Increase": "Yetenek Süresi Artışı",
  "Skill Range Expansion": "Yetenek Menzili Genişlemesi",
  "Add HP Per Kill": "Öldürme Başına HP",
  "Movement Speed": "Hareket Hızı",
  "Add All Skill Level": "Tüm Yetenek Seviyelerine Ekle",
  "Base Attack Count Reduction": "Temel Saldırı Sayısı Azaltma",
  "Projectile Count": "Fırlatılan Nesne Sayısı",
  "Multistrike": "Çoklu Vuruş",
  "Increase Exp Amount": "TP Miktarı Artışı",
  "Dodge Chance": "Kaçınma Şansı"
};

export const translateInherentOption = (opt: string, lang: string): string => {
  let translated = opt;
  if (lang === "tr") {
    for (const [eng, tr] of Object.entries(OPTION_TRANSLATIONS)) {
      if (opt.includes(eng)) {
        translated = opt.replace(eng, tr);
        break;
      }
    }
    translated = translated.replace(".", ",");
  }
  return translated;
};

const WIKI_TO_LOCAL_MOD_MAP: Record<string, string> = {
  SkillMultiStrikeCountUp: "multistrikeCountPlusOne",
  ShieldChargeKillCooldown: "shieldChargeReset",
  SkillProjectileCountUp: "projectileCountPlusOne",
  SkewerShotBleedingStrike: "skewerShotBleed",
  ArrowRainCriticalCooldown: "arrowRainCritReduce",
  FlameHydraBerserk: "hydraSpeedIncrease",
  SorcererLightningShock: "lightningShockChance",
  IceOrbFreezeToCold: "iceOrbFreeze",
  SnowstormEnhanceFrozenEnemy: "snowstormFrozenBonus",
  SkillElementChange: "elementalChange",
  WrathOfHeavenHeal: "wrathOfHeavenHeal",
  ExplosiveBoltHalf: "explosiveBoltDecrease",
  ChargeTrapExplosiveCooldown: "knightHelmet",
  CrossbowTurretCooldown: "turretCooldownReduce",
  CrossbowTurretAddAmount: "turretAmountPlusOne",
  SlayerLowHpAttackSpeed: "steelAxe",
  WhirlwindFireIgnite: "whirlwindIgnite",
  AxeSpinBleedingChance: "axeSpinBleed",
  SkillBaseAttackCountReduce: "basicAttackTriggerReduce",
  SkillCooldownReduce: "cooldownReduced",
  WaveMoveFastestPartyMember: "knightBoots",
  WaveMoveSlowestPartyExcludeSelf: "waveMoveSlowest"
};

export const getUniqueModKeyById = (itemId: string | null): string | null => {
  if (itemId && gearDetails.stats[itemId]) {
    const s = gearDetails.stats[itemId];
    if (s.u !== undefined && s.u !== null) {
      const wikiKey = gearDetails.uniqueModMap[s.u];
      if (wikiKey) {
        return WIKI_TO_LOCAL_MOD_MAP[wikiKey] || wikiKey;
      }
    }
    return "none";
  }
  return null;
};

export const isUnobtainableItem = (itemId: string | null): boolean => {
  if (itemId && gearDetails.deleted) {
    const idNum = parseInt(itemId, 10);
    return gearDetails.deleted.includes(idNum);
  }
  return false;
};
