import type { ProblemAnalysis, ProblemBrief } from "@/schemas/problem-brief.schema";
import type { RepairResult } from "@/schemas/repair-result.schema";
import type { ProblemAnalysisInput } from "./inputs";

const tapWords = /tap|faucet|水龙头/;
const locationWords = /(bedroom|bathroom|kitchen|living room|balcony|卧室|厕所|浴室|厨房|客厅)/;
const locations: Record<string, string> = {
  卧室: "Bedroom",
  厕所: "Bathroom",
  浴室: "Bathroom",
  厨房: "Kitchen",
  客厅: "Living room",
};

function inferItem(text: string, category?: string) {
  if (category?.includes("water")) {
    if (tapWords.test(text)) return "Tap";
    if (/sink|basin|水槽/.test(text)) return "Sink / drainage";
    if (/pipe|水管/.test(text)) return "Pipe";
    return "Plumbing fixture";
  }

  if (category?.includes("electrical")) {
    if (/light|lamp|灯/.test(text)) return "Light fitting";
    if (/switch|开关/.test(text)) return "Light switch";
    if (/socket|outlet|插座/.test(text)) return "Power socket";
    return "Electrical fixture";
  }

  if (category?.includes("door") || category?.includes("cabinet")) {
    return /cabinet|cupboard|柜/.test(text) ? "Cabinet" : "Door";
  }

  if (category?.includes("wall") || category?.includes("ceiling")) {
    return /ceiling|天花/.test(text) ? "Ceiling" : "Wall";
  }

  if (category?.includes("tile") || category?.includes("floor")) {
    return /tile|瓷砖/.test(text) ? "Floor tile" : "Flooring";
  }

  if (/door|门/.test(text)) return "Door";
  if (/leak|water|pipe|tap|漏水|水管|水龙头/.test(text)) {
    return tapWords.test(text) ? "Tap" : "Pipe";
  }
  if (/socket|power|switch|electric|插座|电/.test(text)) return "Power socket";
  if (/wall|ceiling|crack|paint|墙|天花/.test(text)) return "Wall / ceiling";
  if (/tile|floor|瓷砖|地板/.test(text)) return "Tiles / floor";
  if (/aircon|air conditioner|空调/.test(text)) return "Air conditioner";
  return "Unknown item";
}

export function demoAnalysis(input: ProblemAnalysisInput): ProblemAnalysis {
  const description = input.description.trim();
  const clarification = input.clarification?.trim();
  const text = `${input.description} ${input.clarification || ""}`.toLowerCase();
  const existingBrief = input.existing_problem_brief || input.existing_brief;

  let item = inferItem(text, input.category_hint?.toLowerCase());
  if (item === "Unknown item" && existingBrief?.affected_item && existingBrief.affected_item !== "Unknown") {
    item = existingBrief.affected_item;
  }

  const locationMatch = text.match(locationWords)?.[1];
  let location = locationMatch
    ? locations[locationMatch] || locationMatch.replace(/^./, (character) => character.toUpperCase())
    : "Unknown";
  if (location === "Unknown" && existingBrief?.location && existingBrief.location !== "Unknown") {
    location = existingBrief.location;
  }

  const missingQuestions: string[] = [];
  if (item === "Unknown item") missingQuestions.push("Which item or fixture is affected?");
  if (location === "Unknown") missingQuestions.push("Where in the home is the issue located?");
  if (description.length < 12) missingQuestions.push("What happened, and what is the item doing now?");

  return {
    problem_brief: {
      request_id: input.request_id,
      property_id: input.property.id,
      property: input.property.home_type,
      location,
      affected_item: item,
      observed_problem: description || existingBrief?.observed_problem || "Unknown",
      condition: clarification || existingBrief?.condition || "Based on homeowner description",
      customer_goal: existingBrief?.customer_goal && existingBrief.customer_goal !== "Unknown"
        ? existingBrief.customer_goal
        : `Restore the ${item.toLowerCase()} to safe, normal working condition`,
      dynamic_details: {
        ...(existingBrief?.dynamic_details || {}),
        selected_issue_type: input.category_hint || null,
        issue_type_source: input.category_hint ? "user_selected" : "ai_inferred",
      },
    },
    is_complete: missingQuestions.length === 0,
    missing_questions: missingQuestions,
  };
}

export function demoRepair(brief: ProblemBrief): RepairResult {
  const text = `${brief.affected_item} ${brief.observed_problem} ${brief.condition || ""}`.toLowerCase();
  if (/door/.test(text)) {
    return {
      likely_issue: "Door alignment or hinge issue",
      urgency: "Low",
      recommended_work: "Inspect and adjust the hinges and door alignment. Trim the bottom edge only if adjustment is insufficient.",
      estimated_duration: "1–2 hours",
      site_visit_required: false,
      confidence: "Medium",
    };
  }
  if (/leak|pipe|tap|water/.test(text)) {
    return {
      likely_issue: "Worn fitting, seal, or loose pipe connection",
      urgency: /major|flood|burst/.test(text) ? "High" : "Medium",
      recommended_work: "Isolate the water source, inspect the fitting and surrounding pipework, then replace or reseal the failed component.",
      estimated_duration: "1–3 hours",
      site_visit_required: true,
      confidence: "Medium",
    };
  }
  if (/socket|power|electric|switch/.test(text)) {
    return {
      likely_issue: "Loose connection or failed electrical accessory",
      urgency: /spark|burn|smoke/.test(text) ? "High" : "Medium",
      recommended_work: "Stop using the affected point and have a licensed electrician test the circuit before replacing the accessory if required.",
      estimated_duration: "1–2 hours",
      site_visit_required: true,
      confidence: "Medium",
    };
  }
  return {
    likely_issue: "Cause requires on-site inspection",
    urgency: "Medium",
    recommended_work: "Inspect the affected area and confirm the failure before carrying out repair work.",
    estimated_duration: "To be confirmed after inspection",
    site_visit_required: true,
    confidence: "Low",
  };
}
