#!/bin/bash
# Zalo Personal Extension - Quick Install Script
# Usage: curl -fsSL https://raw.githubusercontent.com/noobd3mon/zalo-personal/main/quick-install.sh | bash

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     🚀 Zalo Personal Extension - Quick Install           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

CONFIG_FILE="$HOME/.openclaw/openclaw.json"

# Check if openclaw is installed
if ! command -v openclaw &> /dev/null; then
    echo "❌ OpenClaw chưa được cài đặt!"
    echo "📥 Cài OpenClaw trước: npm install -g openclaw"
    exit 1
fi

echo "✅ OpenClaw detected"
echo ""

# Clean stale config from previous failed install
# If config references zalo-personal but extension dir is missing/broken, clean it up
EXT_DIR_CHECK="$HOME/.openclaw/extensions/zalo-personal"
if [ -f "$CONFIG_FILE" ] && [ ! -d "$EXT_DIR_CHECK/node_modules" ]; then
    # Check if config has a stale zalo-personal entry
    HAS_STALE=$(node -e "
    const fs = require('fs');
    try {
      const c = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
      const hasPlugin = c.plugins && c.plugins.entries && c.plugins.entries['zalo-personal'];
      const hasInstall = c.plugins && c.plugins.installs && c.plugins.installs['zalo-personal'];
      console.log(hasPlugin || hasInstall ? 'yes' : 'no');
    } catch { console.log('no'); }
    " 2>/dev/null)

    if [ "$HAS_STALE" = "yes" ]; then
        echo "🧹 Phát hiện config từ lần cài trước bị lỗi, đang dọn dẹp..."

        node -e "
        const fs = require('fs');
        const path = '$CONFIG_FILE';
        try {
          const config = JSON.parse(fs.readFileSync(path, 'utf8'));

          let cleaned = false;
          if (config.plugins && config.plugins.entries && config.plugins.entries['zalo-personal']) {
            delete config.plugins.entries['zalo-personal'];
            cleaned = true;
          }
          if (config.plugins && config.plugins.installs && config.plugins.installs['zalo-personal']) {
            delete config.plugins.installs['zalo-personal'];
            cleaned = true;
          }
          if (config.channels && config.channels['zalo-personal']) {
            delete config.channels['zalo-personal'];
            cleaned = true;
          }

          if (cleaned) {
            fs.writeFileSync(path, JSON.stringify(config, null, 2));
            console.log('   ✅ Đã dọn config cũ thành công');
          }
        } catch (e) {
          console.error('   ⚠️  Warning:', e.message);
        }
        " 2>/dev/null || echo "   ⚠️  Không thể dọn config cũ"

        # Also remove broken extension directory if it exists
        if [ -d "$EXT_DIR_CHECK" ]; then
            rm -rf "$EXT_DIR_CHECK"
            echo "   🗑️  Đã xóa thư mục extension cũ bị lỗi"
        fi

        echo ""
    fi
fi

# Check if already installed
ALREADY_INSTALLED=false
if [ -d "$HOME/.openclaw/extensions/zalo-personal" ]; then
    ALREADY_INSTALLED=true
    echo "⚠️  Extension đã được cài đặt!"
    echo ""
    echo "Bạn muốn:"
    echo "  [1] Sử dụng extension hiện có (chỉ config lại)"
    echo "  [2] Update to latest version (cập nhật)"
    echo "  [3] Clean install (xóa hết, cài lại từ đầu)"
    echo ""

    while true; do
        read -p "Chọn [1/2/3]: " choice
        case $choice in
            1)
                echo ""
                echo "✅ Sử dụng extension hiện có"
                echo ""
                break
                ;;
            2)
                echo ""
                echo "🔄 Update to latest version"
                echo ""

                # Run update script
                bash <(curl -fsSL https://raw.githubusercontent.com/noobd3mon/zalo-personal/main/script/update.sh)

                # If update script exited successfully, we're done
                echo ""
                echo "✅ Update hoàn tất! Script dừng ở đây."
                echo "   (Nếu cần config lại, chạy lại script này và chọn [1])"
                exit 0
                ;;
            3)
                echo ""
                echo "🧹 Clean install - Xóa và cài lại từ đầu"
                echo ""

                # Step 1: Disable plugin first
                echo "🗑️  Disable plugin..."
                cd /tmp  # Change to safe directory
                openclaw plugins disable zalo-personal 2>/dev/null || true
                echo ""

                # Step 2: Clean old config
                if [ -f "$CONFIG_FILE" ]; then
                    echo "🧹 Đang dọn dẹp config cũ..."

                    # Backup config
                    cp "$CONFIG_FILE" "$CONFIG_FILE.backup-$(date +%s)"
                    echo "   📋 Backup: $CONFIG_FILE.backup-*"

                    # Clean using Node.js
                    node -e "
                    const fs = require('fs');
                    const path = '$CONFIG_FILE';

                    try {
                      const config = JSON.parse(fs.readFileSync(path, 'utf8'));

                      if (config.channels && config.channels['zalo-personal']) {
                        delete config.channels['zalo-personal'];
                        console.log('   ✓ Removed channels.zalo-personal');
                      }

                      if (config.plugins && config.plugins.entries && config.plugins.entries['zalo-personal']) {
                        delete config.plugins.entries['zalo-personal'];
                        console.log('   ✓ Removed plugins.entries.zalo-personal');
                      }

                      fs.writeFileSync(path, JSON.stringify(config, null, 2));
                      console.log('   ✅ Config cleaned!');
                    } catch (error) {
                      console.error('   ⚠️  Warning:', error.message);
                    }
                    " 2>/dev/null || echo "   ⚠️  Could not clean config"

                    echo ""
                fi

                # Step 3: Remove plugin files
                echo "🗑️  Xóa plugin files..."
                rm -rf "$HOME/.openclaw/extensions/zalo-personal"
                echo "✅ Đã xóa plugin files"
                echo ""

                # Step 4: Restart gateway
                echo "🔄 Đang restart gateway..."
                openclaw gateway restart
                echo "   ⏳ Đợi 5 giây..."
                sleep 5
                echo "✅ Gateway đã restart"
                echo ""

                break
                ;;
            *)
                echo "❌ Chọn 1, 2, hoặc 3!"
                ;;
        esac
    done
fi

# Install plugin (if not using existing)
if [ "$ALREADY_INSTALLED" = false ] || [ "$choice" = "2" ]; then
    echo "📦 Đang cài đặt extension zalo-personal..."
    echo "⚠️  Có thể xuất hiện warning về 'dangerous code patterns' - điều này bình thường"
    echo "    (Extension cần quyền restart gateway)"
    echo ""
    echo "─────────────────────────────────────────────────────────────"
    echo "📥 Installing plugin and dependencies..."
    echo ""
    echo "📦 Dependencies sẽ được cài:"
    echo "   • zca-js (Zalo library)"
    echo "   • qrcode-terminal (QR display)"
    echo "   • pngjs, jsqr (Image processing)"
    echo "   • zod, @sinclair/typebox (Validation)"
    echo ""

    # Set npm to show more output
    export NPM_CONFIG_LOGLEVEL=info

    # Run install command and show output
    openclaw plugins install github:noobd3mon/zalo-personal 2>&1

    INSTALL_EXIT_CODE=$?
    echo ""
    echo "─────────────────────────────────────────────────────────────"

    # Show installed packages
    if [ $INSTALL_EXIT_CODE -eq 0 ] && [ -d "$HOME/.openclaw/extensions/zalo-personal/node_modules" ]; then
        echo ""
        echo "✅ Đã cài đặt các dependencies:"
        ls -1 "$HOME/.openclaw/extensions/zalo-personal/node_modules" | grep -E "^(zca-js|qrcode|pngjs|jsqr|zod|typebox)" | sed 's/^/   ✓ /'
        echo ""
    fi
    echo ""

    if [ $INSTALL_EXIT_CODE -ne 0 ]; then
        echo "❌ Cài đặt thất bại!"
        echo ""
        echo "🔍 Có thể thử:"
        echo "  1. Kiểm tra internet connection"
        echo "  2. Xem log: openclaw logs"
        echo "  3. Báo lỗi: https://github.com/noobd3mon/zalo-personal/issues"
        exit 1
    fi

    echo "✅ Cài đặt extension thành công!"
    echo ""
fi

# Choose mode
echo "🔧 Chọn chế độ hoạt động:"
echo ""
echo "  [1] Open Mode - Nhận tin nhắn từ mọi người (khuyến nghị cho test)"
echo "  [2] Pairing Mode - Chỉ nhận tin từ người đã pair (an toàn hơn)"
echo ""

while true; do
    read -p "Chọn mode [1/2]: " mode_choice
    case $mode_choice in
        1)
            MODE="open"
            break
            ;;
        2)
            MODE="pairing"
            break
            ;;
        *)
            echo "❌ Chọn 1 hoặc 2!"
            ;;
    esac
done

echo ""
echo "✅ Đã chọn: $MODE mode"
echo ""

# Configure channel
echo "🔧 Đang cấu hình channel..."

EXT_DIR="$HOME/.openclaw/extensions/zalo-personal"

# Use Node.js helper to update config
node "$EXT_DIR/config-helper.cjs" "$MODE"

if [ $? -ne 0 ]; then
    echo "❌ Cấu hình thất bại!"
    exit 1
fi

echo ""

# Login with QR
echo "🔐 Đăng nhập Zalo..."
echo "📱 Mở app Zalo > QR icon > Quét mã QR bên dưới"
echo ""

openclaw channels login --channel zalo-personal

if [ $? -ne 0 ]; then
    echo "❌ Đăng nhập thất bại!"
    exit 1
fi

echo ""
echo "✅ Đăng nhập thành công!"
echo ""

# Restart gateway
echo "🔄 Đang khởi động lại gateway để nhận certificate..."
openclaw gateway restart

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              🎉 CÀI ĐẶT HOÀN TẤT!                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Thông tin:"
echo "  • Extension: zalo-personal"
echo "  • Mode: $MODE"
echo "  • Status: Đã đăng nhập và khởi động gateway"
echo ""
echo "📖 Kiểm tra status:"
echo "  openclaw status"
echo ""
echo "💬 Gửi tin thử:"
echo "  openclaw message send --channel zalo-personal --target YOUR_USER_ID --message \"Hello!\""
echo ""
echo "🔍 Xem thông tin channel:"
echo "  openclaw channels list"
echo ""

if [ "$MODE" = "pairing" ]; then
    echo "⚠️  PAIRING MODE: Nhớ pair với user trước khi chat!"
    echo "   Chat với bot và reply tin nhắn để pair."
    echo ""
fi

echo "📚 Docs: https://github.com/noobd3mon/zalo-personal"
echo ""
