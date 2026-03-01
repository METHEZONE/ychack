/* eslint-disable */
/**
 * Generated data model stub — replace with real generated file after running `npx convex dev`
 */
import type { GenericId } from "convex/values";

// Re-export GenericId as Id for use in the app
export type Id<TableName extends string> = GenericId<TableName>;

export type TableNames =
  | "users"
  | "quests"
  | "vendors"
  | "messages"
  | "chatMessages"
  | "workflowNodes";

export interface DataModel {
  users: {
    _id: Id<"users">;
    _creationTime: number;
    name: string;
    avatar?: string;
    companyName?: string;
    companyDescription?: string;
    website?: string;
    extractedCompanyData?: unknown;
    needs?: string[];
    isNewBusiness?: boolean;
    villageName?: string;
  };
  quests: {
    _id: Id<"quests">;
    _creationTime: number;
    userId: Id<"users">;
    description: string;
    status: "active" | "completed" | "paused";
    createdAt: number;
  };
  vendors: {
    _id: Id<"vendors">;
    _creationTime: number;
    questId: Id<"quests">;
    userId: Id<"users">;
    companyName: string;
    website?: string;
    location?: string;
    animalType: string;
    characterName: string;
    contactEmail?: string;
    formSubmitted: boolean;
    emailSent: boolean;
    agentmailInboxId?: string;
    stage: "discovered" | "contacted" | "replied" | "negotiating" | "closed" | "dead";
    deadReason?: string;
    quote?: { price?: string; moq?: string; leadTime?: string };
    agentNotes?: string;
    positionX?: number;
    positionY?: number;
  };
  messages: {
    _id: Id<"messages">;
    _creationTime: number;
    vendorId: Id<"vendors">;
    direction: "inbound" | "outbound";
    content: string;
    type: "form_submission" | "email" | "auto_negotiation";
    isDraft: boolean;
    sentAt?: number;
    subject?: string;
    from?: string;
  };
  chatMessages: {
    _id: Id<"chatMessages">;
    _creationTime: number;
    userId: Id<"users">;
    role: "user" | "agent";
    content: string;
    choices?: string[];
    metadata?: unknown;
    createdAt: number;
  };
  workflowNodes: {
    _id: Id<"workflowNodes">;
    _creationTime: number;
    questId: Id<"quests">;
    vendorId?: Id<"vendors">;
    parentNodeId?: Id<"workflowNodes">;
    stage: string;
    label: string;
    isRecommended: boolean;
    reason?: string;
    isDead: boolean;
    deadReason?: string;
  };
}
