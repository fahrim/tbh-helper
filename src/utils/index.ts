import { invoke } from "@tauri-apps/api/core";

export async function fetchUrlWithRetry(url: string, retries = 3, baseDelay = 2000): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      return await invoke<string>("fetch_url", { url });
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
      return { text: "Knight Only", color: "#ef4444" };
    case "BOW":
      return { text: "Ranger Only", color: "#ef4444" };
    case "STAFF":
      return { text: "Sorcerer Only", color: "#ef4444" };
    case "SCEPTER":
      return { text: "Priest Only", color: "#ef4444" };
    case "DAGGER":
      return { text: "Rogue Only", color: "#ef4444" };
    case "GRIMOIRE":
      return { text: "Warlock Only", color: "#ef4444" };
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
    default: return `Özellik #${statType}`;
  }
};

export const formatStatValue = (statType: number, value: number): string => {
  const percentStats = [6, 7, 8, 9, 10, 17, 18, 19, 24, 25, 26, 27];
  const prefix = value > 0 ? "+" : "";
  const formatted = formatDecimal(value);
  if (percentStats.includes(statType)) {
    return `${prefix}${formatted}%`;
  }
  return `${prefix}${formatted}`;
};

export const formatEnchantOrSlot = (ench: any): string => {
  const isPercent = ench.ModType === 1 || [6, 7, 8, 9, 10, 16, 17, 18, 19, 24, 25, 26, 27].includes(ench.StatType);
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
    "SWORD", "BOW", "STAFF", "SCEPTER", "DAGGER", "GRIMOIRE", "HELMET", "ARMOR", "GLOVES", "BOOTS",
    "NECKLACE", "EARRING", "RING", "BRACELET", "BRACER", "AMULET"
  ].includes(gearType || "");
  
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

export const getInherentStats = (gearType: string | null, level: number | null, grade: string) => {
  if (!gearType || !level) return [];
  
  const stats: { name: string; value: string }[] = [];
  
  const gradeMult: Record<string, number> = {
    Common: 1,
    Uncommon: 1.2,
    Rare: 1.5,
    Legendary: 2,
    Immortal: 2.8,
    Arcana: 4,
    Beyond: 5.5,
    Celestial: 7.5,
    Divine: 10,
    Cosmic: 13
  };
  
  const m = gradeMult[grade] || 1;
  
  const uGearType = gearType.toUpperCase();
  if (uGearType === "SWORD" || uGearType === "BOW" || uGearType === "DAGGER") {
    const isDagger = uGearType === "DAGGER";
    stats.push({ name: "Attack Damage", value: `${Math.round(level * (isDagger ? 1.8 : 2) * m + 10)}` });
    stats.push({ name: "Attack Per Second", value: uGearType === "SWORD" ? "1,27" : uGearType === "BOW" ? "1,45" : "1,50" });
  } else if (uGearType === "STAFF" || uGearType === "SCEPTER" || uGearType === "GRIMOIRE") {
    const isScepter = uGearType === "SCEPTER";
    const isGrimoire = uGearType === "GRIMOIRE";
    stats.push({ name: "Magic Damage", value: `${Math.round(level * (isScepter ? 2.1 : isGrimoire ? 2.3 : 2.2) * m + 12)}` });
    stats.push({ name: "Attack Per Second", value: isScepter ? "1,20" : isGrimoire ? "1,10" : "1,15" });
  } else if (["HELMET", "ARMOR", "GLOVES", "BOOTS"].includes(uGearType)) {
    stats.push({ name: "Defense", value: `${Math.round(level * 0.8 * m + 3)}` });
  }
  
  return stats;
};

export const getInherentOptions = (gearType: string | null, level: number | null, grade: string) => {
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
  
  if (["SWORD", "BOW", "DAGGER", "STAFF"].includes(uGearType)) {
    const incDmg = Math.round(15 + levelMult * 10);
    const critChance = formatDecimal((1.5 + levelMult * 0.8).toFixed(1));
    const flatDmg = Math.round(5 + levelMult * 12);
    
    const isStaff = uGearType === "STAFF";
    if (count >= 1) options.push(`${incDmg}% ${isStaff ? "Increased Magic Damage" : "Increased Attack Damage"}`);
    if (count >= 2) options.push(`Critical Chance +${critChance}%`);
    if (count >= 3) options.push(`${isStaff ? "Magic Damage" : "Attack Damage"} +${flatDmg}`);
  } else if (["HELMET", "ARMOR", "GLOVES", "BOOTS"].includes(uGearType)) {
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
