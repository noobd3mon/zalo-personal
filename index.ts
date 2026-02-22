import type { AnyAgentTool, OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { zaloPersonalDock, zaloPersonalPlugin } from "./src/channel.js";
import { setZaloPersonalRuntime } from "./src/runtime.js";
import { ZaloPersonalToolSchema, executeZaloPersonalTool } from "./src/tool.js";

const plugin = {
  id: "zalo-personal",
  name: "Zalo Personal",
  description: "Zalo personal account messaging via zca-js library",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setZaloPersonalRuntime(api.runtime);
    // Register channel plugin (for onboarding & gateway)
    api.registerChannel({ plugin: zaloPersonalPlugin, dock: zaloPersonalDock });

    // Register agent tool
    api.registerTool({
      name: "zalo-personal",
      label: "Zalo Personal",
      description:
        "Full Zalo personal account management (zca-js). " +
        "MESSAGING: send (text), image (URL), link, send-sticker, send-reaction, forward-message, delete-message, undo-message, send-card, send-typing-event. " +
        "FRIENDS: friends (list/search), find-user (phone), find-user-by-username, get-user-info, send-friend-request, accept-friend-request, reject-friend-request, undo-friend-request, remove-friend, change-friend-alias, remove-friend-alias, get-friend-onlines, block-view-feed. " +
        "GROUPS: groups (list), get-group-info, get-group-members, create-group, add-user-to-group, remove-user-from-group, change-group-name, change-group-owner, add-group-deputy, remove-group-deputy, leave-group, disperse-group, update-group-settings, add-group-blocked-member, remove-group-blocked-member, get-group-blocked-member. " +
        "STICKERS: search-stickers, get-sticker-detail, get-sticker-category. " +
        "POLLS: create-poll, vote-poll, lock-poll, get-poll-detail. " +
        "PROFILE: me (info), update-profile, update-profile-bio, change-avatar, status. " +
        "CONVERSATIONS: set-mute, pin-conversation, archive-conversation, delete-chat. " +
        "LABELS: get-labels, update-labels, get-quick-messages, add-quick-message, remove-quick-message. " +
        "BLOCKLIST: block-user, unblock-user, block-user-in-group, unblock-user-in-group, list-blocked, list-allowed. " +
        "MISC: keep-alive, parse-link, last-online, get-alias-list, block-user-zalo, unblock-user-zalo. " +
        "Names are auto-resolved to IDs.",
      parameters: ZaloPersonalToolSchema,
      execute: executeZaloPersonalTool,
    } as AnyAgentTool);
  },
};

export default plugin;
