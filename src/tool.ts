import { Type } from "@sinclair/typebox";
import { ThreadType, Reactions } from "zca-js";
import { getApi } from "./zalo-client.js";
import {
  readOpenClawConfig,
  writeOpenClawConfig,
  addToDenyFrom,
  removeFromDenyFrom,
  addToGroupDenyUsers,
  removeFromGroupDenyUsers,
  listBlockedUsers,
  listAllowedUsers,
  listBlockedUsersInGroup,
} from "./config-manager.js";

const ACTIONS = [
  // ─── Messaging ───
  "send",
  "image",
  "link",
  "send-sticker",
  "send-reaction",
  "forward-message",
  "delete-message",
  "undo-message",
  "send-card",
  "send-typing-event",
  // ─── Friends / Users ───
  "friends",
  "find-user",
  "find-user-by-username",
  "get-user-info",
  "send-friend-request",
  "accept-friend-request",
  "reject-friend-request",
  "undo-friend-request",
  "remove-friend",
  "change-friend-alias",
  "remove-friend-alias",
  "get-friend-onlines",
  "block-view-feed",
  // ─── Groups ───
  "groups",
  "get-group-info",
  "get-group-members",
  "create-group",
  "add-user-to-group",
  "remove-user-from-group",
  "change-group-name",
  "change-group-owner",
  "add-group-deputy",
  "remove-group-deputy",
  "leave-group",
  "disperse-group",
  "update-group-settings",
  "add-group-blocked-member",
  "remove-group-blocked-member",
  "get-group-blocked-member",
  // ─── Stickers ───
  "search-stickers",
  "get-sticker-detail",
  "get-sticker-category",
  // ─── Polls ───
  "create-poll",
  "vote-poll",
  "lock-poll",
  "get-poll-detail",
  // ─── Profile / Account ───
  "me",
  "update-profile",
  "update-profile-bio",
  "change-avatar",
  "status",
  // ─── Conversations ───
  "set-mute",
  "pin-conversation",
  "archive-conversation",
  "delete-chat",
  // ─── Labels & Quick Messages ───
  "get-labels",
  "update-labels",
  "get-quick-messages",
  "add-quick-message",
  "remove-quick-message",
  // ─── Blocklist (OpenClaw config) ───
  "block-user",
  "unblock-user",
  "block-user-in-group",
  "unblock-user-in-group",
  "list-blocked",
  "list-allowed",
  // ─── Advanced / Misc ───
  "keep-alive",
  "parse-link",
  "last-online",
  "get-alias-list",
  "block-user-zalo",
  "unblock-user-zalo",
] as const;

type AgentToolResult = {
  content: Array<{ type: string; text: string }>;
  details?: unknown;
};

function stringEnum<T extends readonly string[]>(
  values: T,
  options: { description?: string } = {},
) {
  return Type.Unsafe<T[number]>({
    type: "string",
    enum: [...values],
    ...options,
  });
}

export const ZaloPersonalToolSchema = Type.Object(
  {
    action: stringEnum(ACTIONS, { description: `Action to perform: ${ACTIONS.join(", ")}` }),
    threadId: Type.Optional(Type.String({ description: "Thread ID (user or group)" })),
    message: Type.Optional(Type.String({ description: "Message text / question / alias / bio" })),
    isGroup: Type.Optional(Type.Boolean({ description: "Is group chat (default: false)" })),
    query: Type.Optional(Type.String({ description: "Search query or phone number" })),
    url: Type.Optional(Type.String({ description: "URL for media/link/avatar" })),
    userId: Type.Optional(Type.String({ description: "User ID or name" })),
    groupId: Type.Optional(Type.String({ description: "Group ID or name" })),
    msgId: Type.Optional(Type.String({ description: "Message ID (for reactions/delete/undo)" })),
    cliMsgId: Type.Optional(Type.String({ description: "Client message ID" })),
    reaction: Type.Optional(Type.String({ description: "Reaction icon: LIKE, HEART, HAHA, WOW, CRY, ANGRY, LOVE, etc." })),
    stickerId: Type.Optional(Type.Number({ description: "Sticker ID" })),
    stickerCateId: Type.Optional(Type.Number({ description: "Sticker category ID" })),
    stickerType: Type.Optional(Type.Number({ description: "Sticker type" })),
    options: Type.Optional(Type.Array(Type.String(), { description: "Poll options / member IDs" })),
    pollId: Type.Optional(Type.String({ description: "Poll ID" })),
    pollOptions: Type.Optional(Type.Array(Type.Number(), { description: "Poll option indices to vote on" })),
    members: Type.Optional(Type.Array(Type.String(), { description: "Member IDs for group operations" })),
    enabled: Type.Optional(Type.Boolean({ description: "Enable/disable flag (mute, pin, archive)" })),
    labelData: Type.Optional(Type.Any({ description: "Label data for update-labels action" })),
    onlyMe: Type.Optional(Type.Boolean({ description: "Delete message for only me (default: true)" })),
    targetIds: Type.Optional(Type.Array(Type.String(), { description: "Target thread IDs (for forward)" })),
    filePath: Type.Optional(Type.String({ description: "Local file path for avatar/attachment" })),
    displayName: Type.Optional(Type.String({ description: "Display name for profile update" })),
  },
  { additionalProperties: false },
);

type ToolParams = {
  action: (typeof ACTIONS)[number];
  threadId?: string;
  message?: string;
  isGroup?: boolean;
  query?: string;
  url?: string;
  userId?: string;
  groupId?: string;
  msgId?: string;
  cliMsgId?: string;
  reaction?: string;
  stickerId?: number;
  stickerCateId?: number;
  stickerType?: number;
  options?: string[];
  pollId?: string;
  pollOptions?: number[];
  members?: string[];
  enabled?: boolean;
  labelData?: unknown;
  onlyMe?: boolean;
  targetIds?: string[];
  filePath?: string;
  displayName?: string;
};

function json(payload: unknown): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

/**
 * Resolve user name to ID using friend list
 */
async function resolveUserId(nameOrId: string): Promise<string> {
  if (/^\d+$/.test(nameOrId)) {
    return nameOrId;
  }

  const api = await getApi();
  const friends = await api.getAllFriends();
  const friendList = Array.isArray(friends) ? friends : [];

  const query = nameOrId.toLowerCase();
  const match = friendList.find(
    (f: any) =>
      (f.displayName ?? "").toLowerCase() === query ||
      (f.zaloName ?? "").toLowerCase() === query ||
      String(f.userId) === nameOrId,
  );

  if (match) {
    return String(match.userId);
  }

  throw new Error(`User not found: ${nameOrId}. Use numeric ID or exact display name.`);
}

/**
 * Resolve group name to ID using group list
 */
async function resolveGroupId(nameOrId: string): Promise<string> {
  if (/^\d+$/.test(nameOrId)) {
    return nameOrId;
  }

  const api = await getApi();
  const groupsResp = await api.getAllGroups();
  const groupIds = Object.keys(groupsResp?.gridVerMap ?? {});

  if (groupIds.length === 0) {
    throw new Error("No groups found");
  }

  try {
    const infoResp = await api.getGroupInfo(groupIds);
    const gridInfoMap = infoResp?.gridInfoMap ?? {};

    const query = nameOrId.toLowerCase();
    const match = Object.entries(gridInfoMap).find(([_id, info]: [string, any]) =>
      (info.name ?? "").toLowerCase() === query,
    );

    if (match) {
      return match[0];
    }
  } catch {
    // Fallback
  }

  throw new Error(`Group not found: ${nameOrId}. Use numeric group ID or exact group name.`);
}

/**
 * Map a reaction name string to the Reactions enum
 */
function resolveReaction(name: string): Reactions {
  const map: Record<string, Reactions> = {
    LIKE: Reactions.LIKE,
    HEART: Reactions.HEART,
    HAHA: Reactions.HAHA,
    WOW: Reactions.WOW,
    CRY: Reactions.CRY,
    ANGRY: Reactions.ANGRY,
    LOVE: Reactions.LOVE,
    SAD: Reactions.SAD,
    KISS: Reactions.KISS,
    TEARS_OF_JOY: Reactions.TEARS_OF_JOY,
    DISLIKE: Reactions.DISLIKE,
    CONFUSED: Reactions.CONFUSED,
    WINK: Reactions.WINK,
    COOL: Reactions.COOL,
    OK: Reactions.OK,
    PEACE: Reactions.PEACE,
    THANKS: Reactions.THANKS,
    PRAY: Reactions.PRAY,
    PUNCH: Reactions.PUNCH,
    ROSE: Reactions.ROSE,
    BROKEN_HEART: Reactions.BROKEN_HEART,
    SUN: Reactions.SUN,
    BIRTHDAY: Reactions.BIRTHDAY,
    BOMB: Reactions.BOMB,
    HANDCLAP: Reactions.HANDCLAP,
    BEER: Reactions.BEER,
  };
  const upper = name.toUpperCase();
  if (map[upper]) return map[upper];
  throw new Error(`Unknown reaction: ${name}. Valid: ${Object.keys(map).join(", ")}`);
}

export async function executeZaloPersonalTool(
  _toolCallId: string,
  params: ToolParams,
  _signal?: AbortSignal,
  _onUpdate?: unknown,
): Promise<AgentToolResult> {
  try {
    switch (params.action) {
      // ═══════════════════════════════════════════
      // MESSAGING
      // ═══════════════════════════════════════════

      case "send": {
        if (!params.threadId || !params.message) {
          throw new Error("threadId and message required for send action");
        }
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const result = await api.sendMessage(
          { msg: params.message },
          params.threadId,
          type,
        );
        return json({ success: true, messageId: result?.message?.msgId });
      }

      case "image": {
        if (!params.threadId) throw new Error("threadId required for image action");
        if (!params.url && !params.filePath) throw new Error("url or filePath required for image action");
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const source = params.filePath || params.url!;
        const result = await api.sendMessage(
          { msg: params.message || "", attachments: source },
          params.threadId,
          type,
        );
        return json({ success: true, result });
      }

      case "link": {
        if (!params.threadId || !params.url) throw new Error("threadId and url required for link action");
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const result = await api.sendLink(
          { link: params.url, msg: params.message },
          params.threadId,
          type,
        );
        return json({ success: true, msgId: result?.msgId });
      }

      case "send-sticker": {
        if (!params.threadId) throw new Error("threadId required");
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;

        // If stickerId provided directly, send it
        if (params.stickerId && params.stickerCateId !== undefined) {
          const result = await api.sendSticker(
            { id: params.stickerId, cateId: params.stickerCateId, type: params.stickerType ?? 7 },
            params.threadId,
            type,
          );
          return json({ success: true, msgId: result?.msgId });
        }

        // Otherwise search by query and send first result
        if (!params.query) throw new Error("query or stickerId+stickerCateId required for send-sticker");
        const stickerIds = await api.getStickers(params.query);
        if (!stickerIds || stickerIds.length === 0) {
          return json({ success: false, error: `No stickers found for: ${params.query}` });
        }
        const detail = await api.getStickersDetail(stickerIds[0]);
        if (!detail) {
          return json({ success: false, error: "Failed to get sticker detail" });
        }
        const stickerResult = await api.sendSticker(
          detail as any,
          params.threadId,
          type,
        );
        return json({ success: true, msgId: stickerResult?.msgId, sticker: detail });
      }

      case "send-reaction": {
        if (!params.threadId || !params.msgId || !params.cliMsgId || !params.reaction) {
          throw new Error("threadId, msgId, cliMsgId, and reaction required for send-reaction");
        }
        const api = await getApi();
        const icon = resolveReaction(params.reaction);
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const result = await api.addReaction(icon, {
          data: { msgId: params.msgId, cliMsgId: params.cliMsgId },
          threadId: params.threadId,
          type,
        });
        return json({ success: true, result });
      }

      case "forward-message": {
        if (!params.message) throw new Error("message required for forward-message");
        if (!params.targetIds || params.targetIds.length === 0) throw new Error("targetIds required");
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const result = await api.forwardMessage(
          { message: params.message },
          params.targetIds,
          type,
        );
        return json({ success: true, result });
      }

      case "delete-message": {
        if (!params.threadId || !params.msgId || !params.cliMsgId) {
          throw new Error("threadId, msgId, cliMsgId required for delete-message");
        }
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const ownId = api.getOwnId();
        const result = await api.deleteMessage({
          data: {
            cliMsgId: params.cliMsgId,
            msgId: params.msgId,
            uidFrom: params.userId || String(ownId),
          },
          threadId: params.threadId,
          type,
        }, params.onlyMe !== false);
        return json({ success: true, result });
      }

      case "undo-message": {
        if (!params.threadId || !params.msgId || !params.cliMsgId) {
          throw new Error("threadId, msgId, cliMsgId required for undo-message");
        }
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const result = await api.undo(
          { msgId: parseInt(params.msgId), cliMsgId: parseInt(params.cliMsgId) },
          params.threadId,
          type,
        );
        return json({ success: true, result });
      }

      case "send-card": {
        if (!params.threadId || !params.userId) {
          throw new Error("threadId and userId required for send-card");
        }
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const result = await api.sendCard(
          { userId: params.userId },
          params.threadId,
          type,
        );
        return json({ success: true, result });
      }

      case "send-typing-event": {
        if (!params.threadId) throw new Error("threadId required");
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const result = await api.sendTypingEvent(params.threadId, type);
        return json({ success: true, result });
      }

      // ═══════════════════════════════════════════
      // FRIENDS / USERS
      // ═══════════════════════════════════════════

      case "friends": {
        const api = await getApi();
        const friends = await api.getAllFriends();
        let friendList = Array.isArray(friends) ? friends : [];
        if (params.query?.trim()) {
          const q = params.query.trim().toLowerCase();
          friendList = friendList.filter(
            (f: any) =>
              (f.displayName ?? "").toLowerCase().includes(q) ||
              (f.zaloName ?? "").toLowerCase().includes(q),
          );
        }
        const mapped = friendList.map((f: any) => ({
          userId: f.userId,
          displayName: f.displayName,
          avatar: f.avatar,
        }));
        return json(mapped);
      }

      case "find-user": {
        if (!params.query) throw new Error("query (phone number) required for find-user");
        const api = await getApi();
        const result = await api.findUser(params.query);
        return json(result);
      }

      case "find-user-by-username": {
        if (!params.query) throw new Error("query (username) required");
        const api = await getApi();
        // findUserByUsername not available in this version, fall back to findUser
        const result = await api.findUser(params.query);
        return json(result);
      }

      case "get-user-info": {
        if (!params.userId) throw new Error("userId required for get-user-info");
        const api = await getApi();
        const result = await api.getUserInfo(params.userId);
        return json(result);
      }

      case "send-friend-request": {
        if (!params.userId) throw new Error("userId required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.sendFriendRequest(params.message || "Hello!", userId);
        return json({ success: true, userId, result });
      }

      case "accept-friend-request": {
        if (!params.userId) throw new Error("userId required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.acceptFriendRequest(userId);
        return json({ success: true, userId, result });
      }

      case "reject-friend-request": {
        if (!params.userId) throw new Error("userId required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.rejectFriendRequest(userId);
        return json({ success: true, userId, result });
      }

      case "undo-friend-request": {
        if (!params.userId) throw new Error("userId required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.undoFriendRequest(userId);
        return json({ success: true, userId, result });
      }

      case "remove-friend": {
        if (!params.userId) throw new Error("userId required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.removeFriend(userId);
        return json({ success: true, userId, result });
      }

      case "change-friend-alias": {
        if (!params.userId || !params.message) throw new Error("userId and message (alias) required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.changeFriendAlias(params.message, userId);
        return json({ success: true, userId, alias: params.message, result });
      }

      case "remove-friend-alias": {
        if (!params.userId) throw new Error("userId required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.removeFriendAlias(userId);
        return json({ success: true, userId, result });
      }

      case "get-friend-onlines": {
        const api = await getApi();
        const result = await api.getFriendOnlines();
        return json(result);
      }

      case "block-view-feed": {
        if (!params.userId) throw new Error("userId required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.blockViewFeed(params.enabled !== false, userId);
        return json({ success: true, userId, blocked: params.enabled !== false, result });
      }

      // ═══════════════════════════════════════════
      // GROUPS
      // ═══════════════════════════════════════════

      case "groups": {
        const api = await getApi();
        const groupsResp = await api.getAllGroups();
        const groupIds = Object.keys(groupsResp?.gridVerMap ?? {});
        if (groupIds.length === 0) return json([]);
        try {
          const infoResp = await api.getGroupInfo(groupIds);
          const gridInfoMap = infoResp?.gridInfoMap ?? {};
          const groups = Object.entries(gridInfoMap).map(([id, info]: [string, any]) => ({
            groupId: id,
            name: info.name,
            totalMember: info.totalMember,
          }));
          return json(groups);
        } catch {
          return json(groupIds.map((id) => ({ groupId: id })));
        }
      }

      case "get-group-info": {
        if (!params.groupId) throw new Error("groupId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const result = await api.getGroupInfo(groupId);
        return json(result);
      }

      case "get-group-members": {
        if (!params.groupId) throw new Error("groupId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const infoResp = await api.getGroupInfo(groupId);
        const groupInfo = infoResp?.gridInfoMap?.[groupId];
        const memberIds = groupInfo?.memberIds ?? [];
        if (memberIds.length === 0) return json([]);
        const membersResp = await api.getGroupMembersInfo(memberIds);
        return json(membersResp);
      }

      case "create-group": {
        if (!params.members || params.members.length === 0) {
          throw new Error("members (array of user IDs) required");
        }
        const api = await getApi();
        const result = await api.createGroup({
          name: params.message || undefined,
          members: params.members,
        });
        return json({ success: true, result });
      }

      case "add-user-to-group": {
        if (!params.groupId || !params.members || params.members.length === 0) {
          throw new Error("groupId and members required");
        }
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const result = await api.addUserToGroup(params.members, groupId);
        return json({ success: true, groupId, result });
      }

      case "remove-user-from-group": {
        if (!params.groupId || !params.members || params.members.length === 0) {
          throw new Error("groupId and members required");
        }
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const result = await api.removeUserFromGroup(params.members, groupId);
        return json({ success: true, groupId, result });
      }

      case "change-group-name": {
        if (!params.groupId || !params.message) throw new Error("groupId and message (new name) required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const result = await api.changeGroupName(params.message, groupId);
        return json({ success: true, groupId, name: params.message, result });
      }

      case "change-group-owner": {
        if (!params.groupId || !params.userId) throw new Error("groupId and userId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const userId = await resolveUserId(params.userId);
        const result = await api.changeGroupOwner(userId, groupId);
        return json({ success: true, groupId, userId, result });
      }

      case "add-group-deputy": {
        if (!params.groupId || !params.userId) throw new Error("groupId and userId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const userId = await resolveUserId(params.userId);
        const result = await api.addGroupDeputy(userId, groupId);
        return json({ success: true, groupId, userId, result });
      }

      case "remove-group-deputy": {
        if (!params.groupId || !params.userId) throw new Error("groupId and userId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const userId = await resolveUserId(params.userId);
        const result = await api.removeGroupDeputy(userId, groupId);
        return json({ success: true, groupId, userId, result });
      }

      case "leave-group": {
        if (!params.groupId) throw new Error("groupId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const result = await api.leaveGroup(groupId);
        return json({ success: true, groupId, result });
      }

      case "disperse-group": {
        if (!params.groupId) throw new Error("groupId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const result = await api.disperseGroup(groupId);
        return json({ success: true, groupId, result });
      }

      case "update-group-settings": {
        if (!params.groupId) throw new Error("groupId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const result = await api.updateGroupSettings({}, groupId);
        return json({ success: true, groupId, result });
      }

      case "add-group-blocked-member": {
        if (!params.groupId || !params.userId) throw new Error("groupId and userId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const userId = await resolveUserId(params.userId);
        const result = await api.addGroupBlockedMember(userId, groupId);
        return json({ success: true, groupId, userId, result });
      }

      case "remove-group-blocked-member": {
        if (!params.groupId || !params.userId) throw new Error("groupId and userId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const userId = await resolveUserId(params.userId);
        const result = await api.removeGroupBlockedMember(userId, groupId);
        return json({ success: true, groupId, userId, result });
      }

      case "get-group-blocked-member": {
        if (!params.groupId) throw new Error("groupId required");
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const result = await api.getGroupBlockedMember({}, groupId);
        return json(result);
      }

      // ═══════════════════════════════════════════
      // STICKERS
      // ═══════════════════════════════════════════

      case "search-stickers": {
        if (!params.query) throw new Error("query required for search-stickers");
        const api = await getApi();
        const result = await api.getStickers(params.query);
        return json(result);
      }

      case "get-sticker-detail": {
        if (!params.stickerId) throw new Error("stickerId required");
        const api = await getApi();
        const result = await api.getStickersDetail(params.stickerId);
        return json(result);
      }

      case "get-sticker-category": {
        if (!params.stickerCateId) throw new Error("stickerCateId required");
        // getStickerCategoryDetail not available, return sticker detail for the given ID instead
        const api = await getApi();
        const result = await api.getStickersDetail(params.stickerCateId);
        return json(result);
      }

      // ═══════════════════════════════════════════
      // POLLS
      // ═══════════════════════════════════════════

      case "create-poll": {
        if (!params.groupId || !params.message || !params.options || params.options.length < 2) {
          throw new Error("groupId, message (question), and options (at least 2) required for create-poll");
        }
        const api = await getApi();
        const groupId = await resolveGroupId(params.groupId);
        const result = await api.createPoll({
          question: params.message,
          options: params.options,
        }, groupId);
        return json({ success: true, result });
      }

      case "vote-poll": {
        if (!params.pollId || !params.pollOptions || params.pollOptions.length === 0) {
          throw new Error("pollId and pollOptions (array of option indices) required");
        }
        const api = await getApi();
        const result = await api.votePoll(parseInt(params.pollId), params.pollOptions);
        return json({ success: true, result });
      }

      case "lock-poll": {
        if (!params.pollId) throw new Error("pollId required");
        const api = await getApi();
        const result = await api.lockPoll(parseInt(params.pollId));
        return json({ success: true, result });
      }

      case "get-poll-detail": {
        if (!params.pollId) throw new Error("pollId required");
        const api = await getApi();
        const result = await api.getPollDetail(parseInt(params.pollId));
        return json(result);
      }

      // ═══════════════════════════════════════════
      // PROFILE / ACCOUNT
      // ═══════════════════════════════════════════

      case "me": {
        const api = await getApi();
        const info = await api.fetchAccountInfo();
        return json(info ? {
          userId: info.userId,
          displayName: info.displayName,
          avatar: info.avatar,
        } : null);
      }

      case "update-profile": {
        if (!params.displayName) throw new Error("displayName required for update-profile");
        const api = await getApi();
        const result = await api.updateProfile({
          profile: {
            name: params.displayName,
            dob: "2000-01-01" as any,
            gender: 0 as any,
          },
        });
        return json({ success: true, result });
      }

      case "update-profile-bio": {
        // updateProfileBio not available in this zca-js version
        return json({ success: false, error: "updateProfileBio is not available in the current zca-js version" });
      }

      case "change-avatar": {
        if (!params.filePath && !params.url) throw new Error("filePath or url required for change-avatar");
        const api = await getApi();
        const source = params.filePath || params.url!;
        const result = await api.changeAccountAvatar(source);
        return json({ success: true, result });
      }

      case "status": {
        const { isAuthenticated, hasStoredCredentials } = await import("./zalo-client.js");
        return json({
          authenticated: isAuthenticated(),
          hasCredentials: hasStoredCredentials(),
        });
      }

      // ═══════════════════════════════════════════
      // CONVERSATIONS
      // ═══════════════════════════════════════════

      case "set-mute": {
        if (!params.threadId) throw new Error("threadId required");
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const result = await api.setMute(
          { action: params.enabled !== false ? 1 : 3, duration: -1 },
          params.threadId,
          type,
        );
        return json({ success: true, muted: params.enabled !== false, result });
      }

      case "pin-conversation": {
        if (!params.threadId) throw new Error("threadId required");
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const result = await api.setPinnedConversations(
          params.enabled !== false,
          params.threadId,
          type,
        );
        return json({ success: true, pinned: params.enabled !== false, result });
      }

      case "archive-conversation": {
        // setArchivedConversations not available in this zca-js version
        return json({ success: false, error: "setArchivedConversations is not available in the current zca-js version" });
      }

      case "delete-chat": {
        if (!params.threadId) throw new Error("threadId required");
        if (!params.msgId || !params.cliMsgId) throw new Error("msgId and cliMsgId of last message required");
        const api = await getApi();
        const type = params.isGroup ? ThreadType.Group : ThreadType.User;
        const ownId = api.getOwnId();
        const result = await api.deleteChat(
          { ownerId: params.userId || String(ownId), cliMsgId: params.cliMsgId, globalMsgId: params.msgId },
          params.threadId,
          type,
        );
        return json({ success: true, result });
      }

      // ═══════════════════════════════════════════
      // LABELS & QUICK MESSAGES
      // ═══════════════════════════════════════════

      case "get-labels": {
        const api = await getApi();
        const result = await api.getLabels();
        return json(result);
      }

      case "update-labels": {
        if (!params.labelData) throw new Error("labelData required");
        const api = await getApi();
        const result = await api.updateLabels(params.labelData as any);
        return json({ success: true, result });
      }

      case "get-quick-messages": {
        const api = await getApi();
        const result = await api.getQuickMessageList();
        return json(result);
      }

      case "add-quick-message": {
        if (!params.message) throw new Error("message required for quick message");
        const api = await getApi();
        const result = await api.addQuickMessage({
          keyword: params.query || "",
          message: params.message,
        } as any);
        return json({ success: true, result });
      }

      case "remove-quick-message": {
        if (!params.msgId) throw new Error("msgId (quick message ID) required");
        const api = await getApi();
        const result = await api.removeQuickMessage(parseInt(params.msgId));
        return json({ success: true, result });
      }

      // ═══════════════════════════════════════════
      // BLOCKLIST (OpenClaw config)
      // ═══════════════════════════════════════════

      case "block-user": {
        if (!params.userId) throw new Error("userId required for block-user action");
        const userId = await resolveUserId(params.userId);
        const config = readOpenClawConfig();
        const updated = addToDenyFrom(config, userId);
        writeOpenClawConfig(updated);
        return json({
          success: true,
          action: "blocked",
          userId,
          message: `User ${params.userId} (ID: ${userId}) has been blocked globally`,
          note: "Restart gateway for changes to take effect: openclaw gateway restart",
        });
      }

      case "unblock-user": {
        if (!params.userId) throw new Error("userId required for unblock-user action");
        const userId = await resolveUserId(params.userId);
        const config = readOpenClawConfig();
        const updated = removeFromDenyFrom(config, userId);
        writeOpenClawConfig(updated);
        return json({
          success: true,
          action: "unblocked",
          userId,
          message: `User ${params.userId} (ID: ${userId}) has been unblocked`,
          note: "Restart gateway for changes to take effect: openclaw gateway restart",
        });
      }

      case "block-user-in-group": {
        if (!params.userId) throw new Error("userId required");
        if (!params.groupId) throw new Error("groupId required");
        const userId = await resolveUserId(params.userId);
        const groupId = await resolveGroupId(params.groupId);
        const config = readOpenClawConfig();
        const updated = addToGroupDenyUsers(config, groupId, userId);
        writeOpenClawConfig(updated);
        return json({
          success: true,
          action: "blocked_in_group",
          userId,
          groupId,
          message: `User ${params.userId} (ID: ${userId}) has been blocked in group ${params.groupId} (ID: ${groupId})`,
          note: "Restart gateway for changes to take effect: openclaw gateway restart",
        });
      }

      case "unblock-user-in-group": {
        if (!params.userId) throw new Error("userId required");
        if (!params.groupId) throw new Error("groupId required");
        const userId = await resolveUserId(params.userId);
        const groupId = await resolveGroupId(params.groupId);
        const config = readOpenClawConfig();
        const updated = removeFromGroupDenyUsers(config, groupId, userId);
        writeOpenClawConfig(updated);
        return json({
          success: true,
          action: "unblocked_in_group",
          userId,
          groupId,
          message: `User ${params.userId} (ID: ${userId}) has been unblocked in group ${params.groupId} (ID: ${groupId})`,
          note: "Restart gateway for changes to take effect: openclaw gateway restart",
        });
      }

      case "list-blocked": {
        const config = readOpenClawConfig();
        const blocked = listBlockedUsers(config);
        return json({
          blocked,
          count: blocked.length,
          message: blocked.length > 0
            ? `Blocked users (${blocked.length}): ${blocked.join(", ")}`
            : "No users blocked globally",
        });
      }

      case "list-allowed": {
        const config = readOpenClawConfig();
        const allowed = listAllowedUsers(config);
        return json({
          allowed,
          count: allowed.length,
          message: allowed.length > 0
            ? `Allowed users (${allowed.length}): ${allowed.join(", ")}`
            : "No explicit allow list (check dmPolicy setting)",
        });
      }

      // ═══════════════════════════════════════════
      // ADVANCED / MISC
      // ═══════════════════════════════════════════

      case "keep-alive": {
        const api = await getApi();
        const result = await api.keepAlive();
        return json({ success: true, result });
      }

      case "parse-link": {
        if (!params.url) throw new Error("url required for parse-link");
        const api = await getApi();
        const result = await api.parseLink(params.url);
        return json(result);
      }

      case "last-online": {
        if (!params.userId) throw new Error("userId required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.lastOnline(userId);
        return json(result);
      }

      case "get-alias-list": {
        const api = await getApi();
        const result = await api.getAliasList();
        return json(result);
      }

      case "block-user-zalo": {
        if (!params.userId) throw new Error("userId required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.blockUser(userId);
        return json({ success: true, userId, result });
      }

      case "unblock-user-zalo": {
        if (!params.userId) throw new Error("userId required");
        const api = await getApi();
        const userId = await resolveUserId(params.userId);
        const result = await api.unblockUser(userId);
        return json({ success: true, userId, result });
      }

      default: {
        params.action satisfies never;
        throw new Error(
          `Unknown action: ${String(params.action)}. Valid actions: ${ACTIONS.join(", ")}`,
        );
      }
    }
  } catch (err) {
    return json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
