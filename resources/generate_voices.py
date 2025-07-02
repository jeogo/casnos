import os
import time
import requests
import json
import subprocess
import shutil

ELEVEN_LABS_API_KEY = "sk_0b9acc29366a4da33c6eca3a5207147cd06470f47a573cc7"
VOICE_ID = "Xb7hH8MSUJpSbSDYk0k2"

STABILITY = 0.93
SIMILARITY = 0.93
STYLE = 0.65
SPEAKING_RATE = 0.95
VOICE_MODEL = "eleven_multilingual_v2"

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
VOICE_DIR = os.path.join(OUT_DIR, "voice")
COMPRESSED_DIR = os.path.join(OUT_DIR, "voice_small")
os.makedirs(VOICE_DIR, exist_ok=True)
os.makedirs(COMPRESSED_DIR, exist_ok=True)

def generate_arabic_numbers_dict():
    arabic_numbers = {
        0: "صفر",
        1: "واحد", 2: "اثنان", 3: "ثلاثة", 4: "أربعة", 5: "خمسة",
        6: "ستة", 7: "سبعة", 8: "ثمانية", 9: "تسعة",
        10: "عشرة",
        11: "أحد عشر", 12: "اثنا عشر", 13: "ثلاثة عشر", 14: "أربعة عشر", 15: "خمسة عشر",
        16: "ستة عشر", 17: "سبعة عشر", 18: "ثمانية عشر", 19: "تسعة عشر",
        20: "عشرون", 30: "ثلاثون", 40: "أربعون", 50: "خمسون",
        60: "ستون", 70: "سبعون", 80: "ثمانون", 90: "تسعون",
        100: "مائة", 200: "مائتان", 300: "ثلاثمائة", 400: "أربعمائة",
        500: "خمسمائة", 600: "ستمائة", 700: "سبعمائة", 800: "ثمانمائة", 900: "تسعمائة", 1000: "ألف"
    }

    # الأرقام المركبة للعشرات
    for tens in [20, 30, 40, 50, 60, 70, 80, 90]:
        for ones in range(1, 10):
            arabic_numbers[tens + ones] = f"{arabic_numbers[ones]} و {arabic_numbers[tens]}"

    # المئات + الباقي
    for hundreds in [100, 200, 300, 400, 500, 600, 700, 800, 900]:
        for rest in range(1, 100):
            if hundreds + rest <= 999:
                arabic_numbers[hundreds + rest] = f"{arabic_numbers[hundreds]} و {arabic_numbers[rest]}"

    # الألف + الباقي
    for rest in range(1, 1000):
        arabic_numbers[1000 - rest] = arabic_numbers.get(1000 - rest, f"{arabic_numbers[rest]} و ألف")

    return arabic_numbers

ARABIC_NUMBERS = generate_arabic_numbers_dict()

def get_arabic_number_text(num):
    return ARABIC_NUMBERS.get(num, str(num))

def synthesize_elevenlabs(text, filename):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_LABS_API_KEY
    }

    data = {
        "text": text,
        "model_id": VOICE_MODEL,
        "voice_settings": {
            "stability": STABILITY,
            "similarity_boost": SIMILARITY,
            "style": STYLE,
            "use_speaker_boost": True,
            "speaking_rate": SPEAKING_RATE
        }
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            filepath = os.path.join(VOICE_DIR, filename)
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f"تم الحفظ: {filename}")
            time.sleep(0.7)
            return True
        else:
            print(f"خطأ: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"خطأ في إنشاء {filename}: {str(e)}")
        return False

def generate_all_voice_files():
    print("\n=== توليد جميع الملفات الصوتية حتى 1000 ===")

    os.makedirs(VOICE_DIR, exist_ok=True)

    print("\n--- العبارات الثابتة ---")
    phrases = [
        ("يرجى التوجه إلى", "please_go_to.mp3"),
        ("التذكرة", "ticket.mp3"),
    ]

    for text, filename in phrases:
        print(f"توليد: {text} (ملف: {filename})")
        synthesize_elevenlabs(text, filename)

    print("\n--- أرقام الشبابيك (1-10) ---")
    for i in range(1, 11):
        arabic_text = get_arabic_number_text(i)
        text = f"الشباك رقم {arabic_text}"
        synthesize_elevenlabs(text, f"counter_{i}.mp3")

    print("\n--- أرقام التذاكر (1-1000) ---")
    for i in range(1, 1001):
        arabic_text = get_arabic_number_text(i)
        text = f"الرقم {arabic_text}"
        synthesize_elevenlabs(text, f"number_{i}.mp3")

    print("\nاكتمل توليد جميع الملفات حتى الرقم 1000.")
    return True

def compress_audio_files():
    print("\n=== ضغط ملفات الصوت ===")
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except FileNotFoundError:
        print("ffmpeg غير مثبت.")
        return False

    files = [f for f in os.listdir(VOICE_DIR) if f.endswith('.mp3')]
    if not files:
        print("لا توجد ملفات صوت.")
        return False

    os.makedirs(COMPRESSED_DIR, exist_ok=True)
    for file in os.listdir(COMPRESSED_DIR):
        if file.endswith('.mp3'):
            os.remove(os.path.join(COMPRESSED_DIR, file))

    for file in files:
        input_path = os.path.join(VOICE_DIR, file)
        output_path = os.path.join(COMPRESSED_DIR, file)
        cmd = [
            "ffmpeg", "-i", input_path,
            "-map", "0:a:0",
            "-b:a", "28k",
            "-ac", "1",
            "-ar", "22050",
            "-filter:a", "volume=1.5,dynaudnorm=f=150:g=15",
            "-y",
            output_path
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    print(f"تم ضغط جميع الملفات إلى المجلد: {COMPRESSED_DIR}")
    return True

def check_missing_files():
    print("\n=== فحص الملفات المفقودة ===")

    expected_files = [
        ("يرجى التوجه إلى", "please_go_to.mp3"),
        ("التذكرة", "ticket.mp3")
    ]

    for i in range(1, 11):
        text = f"الشباك رقم {get_arabic_number_text(i)}"
        expected_files.append((text, f"counter_{i}.mp3"))

    for i in range(1, 1001):
        text = f"الرقم {get_arabic_number_text(i)}"
        expected_files.append((text, f"number_{i}.mp3"))

    missing = [(text, f) for text, f in expected_files if not os.path.exists(os.path.join(VOICE_DIR, f))]

    if not missing:
        print("لا توجد ملفات مفقودة.")
        return True

    print(f"{len(missing)} ملف مفقود. يتم إنشاؤها الآن...")
    for text, filename in missing:
        synthesize_elevenlabs(text, filename)

    print("تم استكمال الملفات المفقودة.")
    return True

def test_pronunciation():
    print("\n=== اختبار نطق بعض الأرقام ===")
    for num in [1, 10, 20, 99, 100, 101, 250, 999, 1000]:
        text = f"الرقم {get_arabic_number_text(num)}"
        synthesize_elevenlabs(text, f"test_{num}.mp3")
    return True

if __name__ == "__main__":
    print("\n=== برنامج توليد الأصوات العربية ===")
    print("1. توليد الملفات المفقودة فقط")
    print("2. اختبار النطق")
    print("3. توليد جميع الملفات حتى 1000")
    print("4. ضغط الملفات")
    print("5. خروج")

    choice = input("اختر عملية: ")

    if choice == "1":
        check_missing_files()
    elif choice == "2":
        test_pronunciation()
    elif choice == "3":
        confirmation = input("هل أنت متأكد؟ (y/n): ")
        if confirmation.lower() == 'y':
            generate_all_voice_files()
            if input("ضغط الملفات؟ (y/n): ").lower() == 'y':
                compress_audio_files()
    elif choice == "4":
        compress_audio_files()
    elif choice == "5":
        print("وداعاً!")
    else:
        print("خيار غير معروف.")
