/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_agentmail from "../actions/agentmail.js";
import type * as actions_browserUse from "../actions/browserUse.js";
import type * as actions_claude from "../actions/claude.js";
import type * as actions_forage from "../actions/forage.js";
import type * as actions_smartOutreach from "../actions/smartOutreach.js";
import type * as actions_tavily from "../actions/tavily.js";
import type * as chatMessages from "../chatMessages.js";
import type * as demo from "../demo.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as quests from "../quests.js";
import type * as users from "../users.js";
import type * as vendors from "../vendors.js";
import type * as workflowNodes from "../workflowNodes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/agentmail": typeof actions_agentmail;
  "actions/browserUse": typeof actions_browserUse;
  "actions/claude": typeof actions_claude;
  "actions/forage": typeof actions_forage;
  "actions/smartOutreach": typeof actions_smartOutreach;
  "actions/tavily": typeof actions_tavily;
  chatMessages: typeof chatMessages;
  demo: typeof demo;
  http: typeof http;
  messages: typeof messages;
  quests: typeof quests;
  users: typeof users;
  vendors: typeof vendors;
  workflowNodes: typeof workflowNodes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
