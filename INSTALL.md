# 🚀 Quick Install

## One-liner Installation

Copy-paste câu lệnh này vào terminal và nhấn Enter:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/noobd3mon/zalo-personal/main/quick-install.sh)
```

Hoặc dùng wget:

```bash
bash <(wget -qO- https://raw.githubusercontent.com/noobd3mon/zalo-personal/main/quick-install.sh)
```

---

## Script sẽ làm gì?

1. ✅ Kiểm tra OpenClaw đã cài chưa
2. 📦 Cài extension `zalo-personal` từ npm
3. 🔧 Hỏi bạn chọn mode: **Open** hoặc **Pairing**
4. ⚙️ Tự động cấu hình channel
5. 📱 Hiển thị QR code để đăng nhập Zalo
6. 🔄 Tự động restart gateway sau khi login thành công

**Tất cả chỉ trong 1 lần chạy!**

---

## Yêu cầu

- [x] OpenClaw đã được cài đặt (`npm install -g openclaw`)
- [x] Node.js version 18+
- [x] Internet connection

---

## Chọn Mode

### 🌐 Open Mode (Khuyến nghị cho test)
- Nhận tin nhắn từ **mọi người**
- Dễ test, không cần pair
- Phù hợp cho bot công khai

### 🔒 Pairing Mode (An toàn hơn)
- Chỉ nhận tin từ **người đã pair**
- User phải reply tin nhắn của bot để pair
- Phù hợp cho bot cá nhân

---

## 🔄 Cập nhật Plugin

### Cách 1: Script cập nhật (Nhanh nhất)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/noobd3mon/zalo-personal/main/script/update.sh)
```

Script sẽ:
- ✅ Kiểm tra version hiện tại vs mới nhất
- ✅ Tự động backup vào `/tmp` (tự xóa sau reboot)
- ✅ Tải và cài đặt version mới từ npm
- ✅ Giữ nguyên cấu hình của bạn
- ✅ Hỏi restart gateway

**Lưu ý:** Backup lưu trong `/tmp/zalo-personal-backup-*` và tự động xóa sau khi reboot hệ thống.

### Cách 2: Dùng quick-install script

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/noobd3mon/zalo-personal/main/quick-install.sh)
```

Khi được hỏi, chọn **[2] Update to latest version**

### Cách 3: Thủ công (nếu 2 cách trên không work)

```bash
cd ~/.openclaw/extensions/zalo-personal
npm pack zalo-personal@latest
tar -xzf zalo-personal-*.tgz --strip-components=1
rm zalo-personal-*.tgz
openclaw gateway restart
```

---

## Chặn người dùng (Blocklist)

### Chặn user toàn cục

Chặn người dùng khỏi bot trong mọi ngữ cảnh (DM và nhóm):

```yaml
channels:
  zalo-personal:
    dmPolicy: open
    allowFrom: ["*"]
    denyFrom:
      - "Tên user cần chặn"
      - "123456789"    # Hoặc dùng User ID
```

### Chặn user trong nhóm cụ thể

Cho phép nhóm nhưng chặn một số thành viên:

```yaml
channels:
  zalo-personal:
    groupPolicy: allowlist
    groups:
      "Nhóm công việc":
        allow: true
        denyUsers:
          - "User không mong muốn"
          - "987654321"
```

### Quy tắc ưu tiên

- **Chặn (deny) luôn thắng cho phép (allow)**
- User trong cả `allowFrom` và `denyFrom` → BỊ CHẶN
- Dùng tên thân thiện, bot tự resolve sang ID
- Tên không tìm thấy → cảnh báo trong log, bỏ qua

### Ví dụ: Kết hợp allow và deny

```yaml
channels:
  zalo-personal:
    dmPolicy: open
    allowFrom: ["*"]       # Cho phép mọi người
    denyFrom:
      - "Spammer"          # Trừ những người này
      - "Troll"
    groupPolicy: allowlist
    groups:
      "Nhóm công khai":
        allow: true
        denyUsers:
          - "BadUser"      # Chặn trong nhóm này
```

### Quản lý blocklist qua AI

Bot có thể tự quản lý blocklist khi bạn yêu cầu:

**Ví dụ:**
```
Bạn: "Chặn user Bob đi"
AI: ✅ User Bob (ID: 123456) đã bị chặn toàn cục
    ⚠️ Restart gateway: openclaw gateway restart

Bạn: "Bỏ chặn Alice"
AI: ✅ User Alice (ID: 789012) đã được bỏ chặn

Bạn: "Cho xem danh sách blocked"
AI: 📋 Blocked users (2): 123456, 999888
```

**Lệnh AI hỗ trợ:**
- `block-user` - Chặn user toàn cục
- `unblock-user` - Bỏ chặn user
- `block-user-in-group` - Chặn trong nhóm cụ thể
- `unblock-user-in-group` - Bỏ chặn trong nhóm
- `list-blocked` - Xem danh sách blocked
- `list-allowed` - Xem danh sách allowed

**Lưu ý:** Luôn restart gateway sau khi thay đổi blocklist!

---

## Sau khi cài đặt

### Kiểm tra status:
```bash
openclaw status
```

### Xem thông tin channel:
```bash
openclaw channel status zalo-personal
```

### Gửi tin nhắn thử:
```bash
openclaw send -c zalo-personal -to USER_ID "Xin chào!"
```

### Nếu dùng Pairing Mode:
1. Gửi tin nhắn cho bot từ Zalo app
2. Bot reply tin nhắn đó
3. Bạn đã được pair! ✅

---

## Reinstall hoặc Reconfigure

Nếu đã cài rồi muốn cài lại:

```bash
# Chạy lại script - sẽ tự detect và hỏi bạn
bash <(curl -fsSL https://raw.githubusercontent.com/noobd3mon/zalo-personal/main/quick-install.sh)

# Chọn option 2 để clean install
```

## Manual Installation

Nếu không muốn dùng script:

```bash
# 1. Cài extension
openclaw plugins install zalo-personal

# 2. Configure channel
# Edit ~/.openclaw/openclaw.json, thêm:
{
  "channels": {
    "zalo-personal": {
      "dmPolicy": "pairing",  # hoặc "open"
      "allowFrom": ["*"]      # chỉ cần nếu dùng open mode
    }
  }
}

# 3. Login
openclaw channels login --channel zalo-personal

# 4. Restart gateway
openclaw gateway restart
```

---

## Troubleshooting

### Script báo "OpenClaw chưa được cài đặt"
```bash
npm install -g openclaw
```

### Không thấy QR code
- Kiểm tra terminal có hỗ trợ hiển thị unicode không
- Hoặc mở file: `/tmp/openclaw-zalo-personal-qr.png`

### Login thất bại
- Kiểm tra internet connection
- Thử quét QR nhanh hơn (QR expires sau 60s)

### Gateway không restart
```bash
# Restart thủ công
openclaw gateway restart
```

---

## Uninstall

### Quick Uninstall (Recommended)

Copy-paste câu lệnh này để gỡ cài đặt tự động:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/noobd3mon/zalo-personal/main/script/uninstall.sh)
```

Script sẽ tự động:
- ✅ Logout khỏi channel
- ✅ Disable plugin
- ✅ Xóa thư mục extension
- ✅ Dọn dẹp config trong openclaw.json
- ✅ Hỏi restart gateway

### Manual Uninstall

```bash
# 1. Logout
openclaw channels logout --channel zalo-personal

# 2. Disable plugin
openclaw plugins disable zalo-personal

# 3. Remove files
rm -rf ~/.openclaw/extensions/zalo-personal

# 4. Restart gateway
openclaw gateway restart
```

---

## 📚 More Info

- GitHub: https://github.com/noobd3mon/zalo-personal
- npm: https://www.npmjs.com/package/zalo-personal
- Issues: https://github.com/noobd3mon/zalo-personal/issues
- Nhóm Zalo Support: https://zalo.me/g/zgictz077

---

**Enjoy! 🎉**
