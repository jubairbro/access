import telebot
from telebot import types
import os
import time
import datetime
import threading
import re
import random

# --- CONFIGURATION ---
BOT_TOKEN = "8102622534:AAEnFt3SIvnBVjkzrABgJSouvzoEBd35ZDo"
ADMIN_USER_ID = 8486562838

# চ্যানেলের ID (বট অবশ্যই এগুলোতে এডমিন থাকতে হবে)
CHANNEL_IDS = [-1001554012044, -1002378656827, -1001773601997]

# গিটহাব রেপো পাথ (আপনার ভিপিএস অনুযায়ী)
REPO_PATH = "/home/jubair/access"
USERS_FILE = "users.txt"

bot = telebot.TeleBot(BOT_TOKEN)

# --- STYLING FUNCTIONS ---

def to_small_caps(text):
    """টেক্সটকে স্মল ক্যাপস ফন্টে কনভার্ট করে"""
    chars = "abcdefghijklmnopqrstuvwxyz"
    caps = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ"
    trans = str.maketrans(chars, caps)
    return text.lower().translate(trans)

def to_mono(text):
    """টেক্সটকে মনোস্পেস ফন্টে কনভার্ট করে"""
    return f"`{text}`"

def progress_bar_animation(chat_id, text="Processing"):
    """রিয়েলিস্টিক হ্যাকিং স্টাইল প্রসেসিং বার"""
    msg = bot.send_message(chat_id, f"⏳ {text}...\n`[▢▢▢▢▢▢▢▢▢▢] 0%`", parse_mode="Markdown")
    
    # লোডিং এনিমেশন লুপ
    for i in range(1, 11):
        time.sleep(random.uniform(0.1, 0.4)) # র‍্যান্ডম স্পিড
        percent = i * 10
        filled = "▣" * i
        empty = "▢" * (10 - i)
        
        try:
            bot.edit_message_text(
                chat_id=chat_id,
                message_id=msg.message_id,
                text=f"⏳ {text}...\n`[{filled}{empty}] {percent}%`",
                parse_mode="Markdown"
            )
        except: pass
    
    # ১০০% হওয়ার পর একটু পজ দিয়ে ডিলিট
    time.sleep(0.5)
    bot.delete_message(chat_id, msg.message_id)

# --- GIT AUTOMATION ---

def git_push_changes(commit_msg):
    try:
        os.chdir(REPO_PATH)
        os.system("git pull") # কনফ্লিক্ট এড়াতে আগে পুল
        os.system("git add .")
        os.system(f'git commit -m "{commit_msg}"')
        os.system("git push")
        return True
    except Exception as e:
        print(f"Git Error: {e}")
        return False

# --- CHANNEL VERIFICATION (AUTO LINK) ---

def get_invite_link(chat_id):
    """বট এডমিন থাকায় অটো লিংক বের করবে"""
    try:
        return bot.export_chat_invite_link(chat_id)
    except:
        return "https://t.me/" # লিংক না পেলে ডিফল্ট

def check_membership(user_id):
    not_joined = []
    for chat_id in CHANNEL_IDS:
        try:
            status = bot.get_chat_member(chat_id, user_id).status
            if status not in ['member', 'administrator', 'creator']:
                link = get_invite_link(chat_id)
                # চ্যানেলের নাম বের করা
                chat_info = bot.get_chat(chat_id)
                not_joined.append({"name": chat_info.title, "link": link})
        except Exception as e:
            # বট এডমিন না থাকলে বা চ্যাট না পেলে
            print(f"Error checking {chat_id}: {e}")
            pass
    return not_joined

# --- HANDLERS ---

@bot.message_handler(commands=['start'])
def start_handler(message):
    user = message.from_user
    
    # মেম্বারশিপ চেক
    missing = check_membership(user.id)
    
    if missing:
        welcome_text = to_small_caps(f"wᴇʟᴄᴏᴍᴇ {user.first_name}!\n\nʏᴏᴜ ᴍᴜꜱᴛ ᴊᴏɪɴ ᴏᴜʀ ᴄʜᴀɴɴᴇʟꜱ ᴛᴏ ɢᴇᴛ ᴀᴄᴄᴇꜱꜱ.")
        markup = types.InlineKeyboardMarkup(row_width=1)
        
        for ch in missing:
            btn = types.InlineKeyboardButton(text=f"➕ ᴊᴏɪɴ {ch['name']}", url=ch['link'])
            markup.add(btn)
        
        verify = types.InlineKeyboardButton(text="✅ ᴠᴇʀɪꜰʏ ᴊᴏɪɴᴇᴅ", callback_data="verify_join")
        markup.add(verify)
        
        bot.send_message(message.chat.id, welcome_text, reply_markup=markup)
    else:
        show_main_menu(message.chat.id)

def show_main_menu(chat_id):
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    btn1 = types.KeyboardButton("🚀 ꜱᴇɴꜱᴇɪ ᴛᴜɴɴᴇʟ")
    btn2 = types.KeyboardButton("🛠 ᴄʀᴀᴄᴋ ᴛᴏᴏʟ")
    markup.add(btn1, btn2)
    
    text = f"""**JUBAIR SECURITY PANEL**
━━━━━━━━━━━━━━━━━━━━
👋 **Welcome User!**
🆔 **ID:** `{chat_id}`
🤖 **Bot Status:** `Running`
━━━━━━━━━━━━━━━━━━━━
👇 **Select Your Service:**"""
    
    bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

@bot.callback_query_handler(func=lambda call: call.data == "verify_join")
def verify_callback(call):
    if not check_membership(call.from_user.id):
        bot.delete_message(call.message.chat.id, call.message.message_id)
        # প্রসেসিং বার দেখানো
        progress_bar_animation(call.message.chat.id, "Verifying")
        show_main_menu(call.message.chat.id)
    else:
        bot.answer_callback_query(call.id, "❌ You haven't joined all channels!", show_alert=True)

# --- SENSEI TUNNEL LOGIC ---

@bot.message_handler(func=lambda msg: msg.text == "🚀 ꜱᴇɴꜱᴇɪ ᴛᴜɴɴᴇʟ")
def sensei_step1(message):
    msg = bot.send_message(message.chat.id, "📡 **Enter VPS IP Address:**", parse_mode="Markdown")
    bot.register_next_step_handler(msg, sensei_step2_ip)

def sensei_step2_ip(message):
    ip = message.text.strip()
    # আইপি ভ্যালিডেশন
    if not re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", ip):
        bot.send_message(message.chat.id, "❌ **Invalid IP!** Try again.")
        return

    # আইপি আগে আছে কিনা চেক
    if os.path.exists(os.path.join(REPO_PATH, f"ip.{ip}")):
        bot.send_message(message.chat.id, "⚠️ **IP Already Exists!** Contact Admin for renewal.")
        return

    msg = bot.send_message(message.chat.id, "👤 **Enter Username (No Space):**", parse_mode="Markdown")
    bot.register_next_step_handler(msg, sensei_step3_username, ip)

def sensei_step3_username(message, ip):
    username = message.text.strip().replace(" ", "-") # স্পেস রিমুভ
    
    if os.path.exists(os.path.join(REPO_PATH, username)):
        bot.send_message(message.chat.id, f"⚠️ Username `{username}` is taken!", parse_mode="Markdown")
        return

    # প্রসেসিং এনিমেশন শুরু
    progress_bar_animation(message.chat.id, "Creating Access")
    
    # ৩০ দিনের মেয়াদ
    expiry = (datetime.datetime.now() + datetime.timedelta(days=30)).strftime("%Y-%m-%d")
    
    try:
        os.chdir(REPO_PATH)
        # ফাইল ১
        with open(f"ip.{ip}", "w") as f: f.write(username)
        # ফাইল ২
        with open(username, "w") as f: f.write(expiry)
        
        # গিট পুশ
        if git_push_changes(f"Sensei: {username}"):
            text = f"""✅ **SENSEI TUNNEL ACTIVATED**
━━━━━━━━━━━━━━━━━━━━
📡 **IP:** `{ip}`
👤 **User:** `{username}`
📅 **Expiry:** `{expiry}`
⏱ **Duration:** `30 Days`
━━━━━━━━━━━━━━━━━━━━
_Thank you for using our service!_"""
            bot.send_message(message.chat.id, text, parse_mode="Markdown")
            
            # এডমিন লগ
            bot.send_message(ADMIN_USER_ID, f"🔔 **New VPS Approved**\nUser: {message.from_user.first_name}\nIP: {ip}")
        else:
            bot.send_message(message.chat.id, "❌ **Server Error!**")
            
    except Exception as e:
        bot.send_message(message.chat.id, f"❌ Error: {e}")

# --- CRACK TOOL LOGIC ---

@bot.message_handler(func=lambda msg: msg.text == "🛠 ᴄʀᴀᴄᴋ ᴛᴏᴏʟ")
def crack_step1(message):
    msg = bot.send_message(message.chat.id, "🔑 **Enter License Key:**\nFormat: `KEY-XXXX` or `##KEY-XXXX`", parse_mode="Markdown")
    bot.register_next_step_handler(msg, crack_step2_key)

def crack_step2_key(message):
    key = message.text.strip()
    if "KEY-" not in key:
        bot.send_message(message.chat.id, "❌ **Invalid Key Format!**")
        return
        
    final_key = key if key.startswith("##") else f"##{key}"
    
    # ডুপ্লিকেট চেক
    os.chdir(REPO_PATH)
    with open(USERS_FILE, "r") as f:
        if final_key in f.read():
            bot.send_message(message.chat.id, "⚠️ **Key Already Approved!**", parse_mode="Markdown")
            return

    msg = bot.send_message(message.chat.id, "👤 **Enter Your Name:**", parse_mode="Markdown")
    bot.register_next_step_handler(msg, crack_step3_name, final_key)

def crack_step3_name(message, final_key):
    name = message.text.strip()
    
    # প্রসেসিং এনিমেশন
    progress_bar_animation(message.chat.id, "Authorizing Key")
    
    try:
        os.chdir(REPO_PATH)
        with open(USERS_FILE, "a") as f:
            f.write(f"\n{final_key} {name}")
            
        if git_push_changes(f"Crack: {name}"):
            text = f"""✅ **CRACK TOOL APPROVED**
━━━━━━━━━━━━━━━━━━━━
🔑 **Key:** `{final_key}`
👤 **Name:** `{name}`
🔓 **Access:** `Granted`
━━━━━━━━━━━━━━━━━━━━
_You can now use the tool._"""
            bot.send_message(message.chat.id, text, parse_mode="Markdown")
            
            # এডমিন লগ
            bot.send_message(ADMIN_USER_ID, f"🔔 **New Tool User**\nName: {name}\nKey: {final_key}")
        else:
            bot.send_message(message.chat.id, "❌ **Server Error!**")
            
    except Exception as e:
        bot.send_message(message.chat.id, f"❌ Error: {e}")

# --- START BOT ---
print("Bot Started Successfully...")
while True:
    try:
        bot.polling(non_stop=True)
    except Exception as e:
        print(f"Bot Restarting: {e}")
        time.sleep(5)

