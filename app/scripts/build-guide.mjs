// Builds the public guide pages (plain HTML Google can read) into dist/guide/,
// in English (/guide/<page>.html) and Chinese, Malay, Tamil and Thai
// (/guide/<lang>/<page>.html), plus sitemap.xml and robots.txt. Runs after
// `vite build`. Rule names and reasons come from the app's own translations and
// src/rules.js, so the guide and the checker never disagree; NEA areas come from
// the live API (if that's unreachable the Orchard page links to the app instead).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { RULES, NEA_SOURCE, RULES_CHECKED, PARKS_WITH_DSAS } from '../../src/rules.js'
import en from '../src/i18n/en.js'
import zh from '../src/i18n/zh.js'
import ms from '../src/i18n/ms.js'
import ta from '../src/i18n/ta.js'
import th from '../src/i18n/th.js'

const SITE = 'https://smoke-finder-eight.vercel.app'
const API = process.env.VITE_API_URL ?? 'https://center-kitchen-backend.onrender.com/api/smoke'
const DIST = join(import.meta.dirname, '..', 'dist')

const LANGS = [
  { id: 'en', name: 'English', dict: en, locale: 'en-SG' },
  { id: 'zh', name: '中文', dict: zh, locale: 'zh-SG' },
  { id: 'ms', name: 'Bahasa Melayu', dict: ms, locale: 'ms-SG' },
  { id: 'ta', name: 'தமிழ்', dict: ta, locale: 'ta-SG' },
  { id: 'th', name: 'ไทย', dict: th, locale: 'th-TH' },
]
const SLUGS = ['where-can-i-smoke-in-singapore', 'orchard-road-smoking-areas', 'sentosa-smoking-areas', 'parks-with-smoking-areas', 'ntu-smoking-areas']
// Operators' own lists (Sentosa, NTU): the same file the app's spots are imported from.
const OPERATORS = JSON.parse(await readFile(join(import.meta.dirname, '..', '..', 'data', 'operator-spots.json'), 'utf8'))

// Page wording not in the app's dictionaries. {n} = a number.
const TEXT = {
  en: {
    titles: ['Where can you smoke in Singapore?', 'Orchard Road smoking areas', 'Sentosa smoking areas', 'Parks with smoking areas in Singapore'],
    short: ['The rules', 'Orchard Road', 'Sentosa', 'Parks'],
    desc: [
      "Singapore's smoking rules in plain language: where smoking is banned (bus stops, parks, HDB void decks, taxi stands and more), the Orchard Road No Smoking Zone, and where it's usually allowed.",
      'All NEA designated smoking areas in the Orchard Road No Smoking Zone, with descriptions and map links.',
      "Sentosa's designated smoking areas at Siloso, Palawan and Tanjong beaches. Smoking on Sentosa's beaches is banned.",
      'Smoking is banned in all Singapore parks, except in designated smoking areas in these 12 NParks parks.',
    ],
    guide: 'Guide',
    cta: 'Check if you can smoke where you are →',
    maps: 'Google Maps',
    inApp: 'open in the app',
    orchardRule: 'The whole Orchard Road precinct is a No Smoking Zone. Smoking is only allowed inside its marked designated smoking areas.',
    seeOrchard: 'See all Orchard Road smoking areas',
    orchardHistory: 'Since 2019 the Orchard Road precinct has been a No Smoking Zone, expanded along Exeter Road and Killiney Road in February 2024. You can only smoke inside the yellow-marked designated smoking areas (DSAs).',
    orchardCount: 'There are {n} NEA designated smoking areas in the Orchard Road No Smoking Zone. Outside these marked areas, smoking anywhere in the zone can be fined.',
    orchardMissing: "The list couldn't be loaded when this page was built. Open the app's Nearby list to see the smoking areas.",
    sentosaIntro: "Smoking is banned on Sentosa's three beaches (Siloso, Palawan and Tanjong). Sentosa officers enforce it: a $200 composition sum, or a fine of up to $1,000 in court. Use the designated smoking areas near the beaches instead.",
    sentosaNote: 'Look for the Designated Smoking Area signs on site.',
    parksIntro: 'Smoking is banned in all parks, gardens and nature reserves in Singapore.',
    parksNote: "NParks doesn't publish the exact positions, so look for the signs when you're there.",
    source: 'Source',
    checked: "Rules last checked against NEA's list on {date}.",
    adults: 'For adults aged 21 and over.',
  },
  zh: {
    titles: ['在新加坡哪里可以吸烟？', '乌节路吸烟区', '圣淘沙吸烟区', '新加坡设有吸烟区的公园'],
    short: ['规定', '乌节路', '圣淘沙', '公园'],
    desc: [
      '用简单的话说明新加坡的吸烟规定：哪些地方禁止吸烟（巴士站、公园、组屋楼下、德士站等）、乌节路禁烟区，以及通常可以吸烟的地方。',
      '乌节路禁烟区内所有环境局指定吸烟区，附说明和地图链接。',
      '圣淘沙西乐索、巴拉湾和丹戎海滩附近的指定吸烟区。圣淘沙海滩禁止吸烟。',
      '新加坡所有公园禁止吸烟，但以下 12 个国家公园局公园设有指定吸烟区。',
    ],
    guide: '指南',
    cta: '查看你所在的地方能不能吸烟 →',
    maps: 'Google 地图',
    inApp: '在应用中打开',
    orchardRule: '整个乌节路一带是禁烟区，只能在标示的指定吸烟区内吸烟。',
    seeOrchard: '查看乌节路所有吸烟区',
    orchardHistory: '乌节路一带自 2019 年起成为禁烟区，并在 2024 年 2 月扩大到 Exeter Road 和 Killiney Road。只能在黄色框标示的指定吸烟区内吸烟。',
    orchardCount: '乌节路禁烟区内共有 {n} 个环境局指定吸烟区。在这些区域以外吸烟可被罚款。',
    orchardMissing: '制作本页时未能载入名单。请在应用的“附近”列表中查看吸烟区。',
    sentosaIntro: '圣淘沙的三个海滩（西乐索、巴拉湾和丹戎）禁止吸烟。圣淘沙执法人员可处以 200 元和解罚款，或在法庭被罚最高 1,000 元。请改用海滩附近的指定吸烟区。',
    sentosaNote: '到现场时请留意指定吸烟区的标志。',
    parksIntro: '新加坡所有公园、花园和自然保护区都禁止吸烟。',
    parksNote: '国家公园局没有公布确切位置，到场时请留意标志。',
    source: '资料来源',
    checked: '规定已于 {date} 对照环境局的清单核对。',
    adults: '仅供 21 岁及以上成人使用。',
  },
  ms: {
    titles: ['Di mana boleh merokok di Singapura?', 'Kawasan merokok Orchard Road', 'Kawasan merokok Sentosa', 'Taman dengan kawasan merokok di Singapura'],
    short: ['Peraturan', 'Orchard Road', 'Sentosa', 'Taman'],
    desc: [
      'Peraturan merokok Singapura dalam bahasa mudah: di mana merokok dilarang (perhentian bas, taman, kolong blok HDB, perhentian teksi dan lain-lain), Zon Larangan Merokok Orchard Road, dan di mana biasanya dibenarkan.',
      'Semua kawasan merokok yang ditetapkan NEA dalam Zon Larangan Merokok Orchard Road, dengan keterangan dan pautan peta.',
      'Kawasan merokok yang ditetapkan Sentosa di pantai Siloso, Palawan dan Tanjong. Merokok di pantai Sentosa dilarang.',
      'Merokok dilarang di semua taman di Singapura, kecuali di kawasan merokok yang ditetapkan dalam 12 taman NParks ini.',
    ],
    guide: 'Panduan',
    cta: 'Semak sama ada anda boleh merokok di tempat anda →',
    maps: 'Google Maps',
    inApp: 'buka dalam aplikasi',
    orchardRule: 'Seluruh kawasan Orchard Road ialah Zon Larangan Merokok. Merokok hanya dibenarkan di dalam kawasan merokok yang ditanda.',
    seeOrchard: 'Lihat semua kawasan merokok Orchard Road',
    orchardHistory: 'Sejak 2019 kawasan Orchard Road ialah Zon Larangan Merokok, diperluas ke Exeter Road dan Killiney Road pada Februari 2024. Anda hanya boleh merokok di dalam kawasan merokok yang ditanda kuning.',
    orchardCount: 'Terdapat {n} kawasan merokok yang ditetapkan NEA dalam Zon Larangan Merokok Orchard Road. Di luar kawasan ini, merokok boleh didenda.',
    orchardMissing: 'Senarai tidak dapat dimuatkan semasa halaman ini dibina. Buka senarai Berhampiran dalam aplikasi untuk melihat kawasan merokok.',
    sentosaIntro: 'Merokok dilarang di tiga pantai Sentosa (Siloso, Palawan dan Tanjong). Pegawai Sentosa menguatkuasakannya: kompaun $200, atau denda sehingga $1,000 di mahkamah. Gunakan kawasan merokok yang ditetapkan berhampiran pantai.',
    sentosaNote: 'Cari papan tanda Kawasan Merokok yang Ditetapkan di tempat itu.',
    parksIntro: 'Merokok dilarang di semua taman, kebun dan rizab alam semula jadi di Singapura.',
    parksNote: 'NParks tidak menerbitkan kedudukan tepat, jadi cari papan tandanya apabila anda di sana.',
    source: 'Sumber',
    checked: 'Peraturan disemak dengan senarai NEA pada {date}.',
    adults: 'Untuk orang dewasa berumur 21 tahun ke atas.',
  },
  ta: {
    titles: ['சிங்கப்பூரில் எங்கே புகைபிடிக்கலாம்?', 'ஆர்ச்சர்ட் ரோடு புகைபிடிக்கும் பகுதிகள்', 'செந்தோசா புகைபிடிக்கும் பகுதிகள்', 'புகைபிடிக்கும் பகுதிகள் உள்ள சிங்கப்பூர் பூங்காக்கள்'],
    short: ['விதிகள்', 'ஆர்ச்சர்ட் ரோடு', 'செந்தோசா', 'பூங்காக்கள்'],
    desc: [
      'சிங்கப்பூரின் புகைபிடித்தல் விதிகள் எளிய மொழியில்: எங்கே தடை (பேருந்து நிறுத்தங்கள், பூங்காக்கள், வீவக புளோக்கின் கீழ்த்தளம், டாக்ஸி நிறுத்தங்கள் போன்றவை), ஆர்ச்சர்ட் ரோடு புகைபிடிக்கத் தடை மண்டலம், பொதுவாக எங்கே அனுமதி.',
      'ஆர்ச்சர்ட் ரோடு புகைபிடிக்கத் தடை மண்டலத்தில் உள்ள அனைத்து NEA புகைபிடிக்கும் பகுதிகள், விளக்கங்கள் மற்றும் வரைபட இணைப்புகளுடன்.',
      'சிலோசோ, பலாவான், தஞ்சோங் கடற்கரைகளுக்கு அருகிலுள்ள செந்தோசா புகைபிடிக்கும் பகுதிகள். செந்தோசா கடற்கரைகளில் புகைபிடிக்கத் தடை.',
      'சிங்கப்பூரின் அனைத்துப் பூங்காக்களிலும் புகைபிடிக்கத் தடை, இந்த 12 NParks பூங்காக்களில் உள்ள புகைபிடிக்கும் பகுதிகளைத் தவிர.',
    ],
    guide: 'வழிகாட்டி',
    cta: 'நீங்கள் இருக்கும் இடத்தில் புகைபிடிக்கலாமா என்று பாருங்கள் →',
    maps: 'Google Maps',
    inApp: 'செயலியில் திற',
    orchardRule: 'ஆர்ச்சர்ட் ரோடு பகுதி முழுவதும் புகைபிடிக்கத் தடை மண்டலம். குறிக்கப்பட்ட புகைபிடிக்கும் பகுதிகளுக்குள் மட்டுமே அனுமதி.',
    seeOrchard: 'ஆர்ச்சர்ட் ரோடு புகைபிடிக்கும் பகுதிகள் அனைத்தையும் பாருங்கள்',
    orchardHistory: '2019 முதல் ஆர்ச்சர்ட் ரோடு பகுதி புகைபிடிக்கத் தடை மண்டலம்; 2024 பிப்ரவரியில் Exeter Road, Killiney Road வரை விரிவாக்கப்பட்டது. மஞ்சள் கோட்டால் குறிக்கப்பட்ட பகுதிகளுக்குள் மட்டுமே புகைபிடிக்கலாம்.',
    orchardCount: 'ஆர்ச்சர்ட் ரோடு தடை மண்டலத்தில் {n} NEA புகைபிடிக்கும் பகுதிகள் உள்ளன. இவற்றுக்கு வெளியே புகைத்தால் அபராதம் விதிக்கப்படலாம்.',
    orchardMissing: 'இந்தப் பக்கம் உருவாக்கப்பட்டபோது பட்டியலை ஏற்ற முடியவில்லை. செயலியின் அருகில் பட்டியலில் பாருங்கள்.',
    sentosaIntro: 'செந்தோசாவின் மூன்று கடற்கரைகளிலும் (சிலோசோ, பலாவான், தஞ்சோங்) புகைபிடிக்கத் தடை. செந்தோசா அதிகாரிகள் $200 அபராதம் அல்லது நீதிமன்றத்தில் $1,000 வரை அபராதம் விதிக்கலாம். கடற்கரைகளுக்கு அருகிலுள்ள புகைபிடிக்கும் பகுதிகளைப் பயன்படுத்துங்கள்.',
    sentosaNote: 'அங்கே புகைபிடிக்கும் பகுதி அறிவிப்புப் பலகைகளைத் தேடுங்கள்.',
    parksIntro: 'சிங்கப்பூரில் அனைத்துப் பூங்காக்கள், தோட்டங்கள், இயற்கைக் காப்பகங்களில் புகைபிடிக்கத் தடை.',
    parksNote: 'NParks சரியான இடங்களை வெளியிடவில்லை; அங்கே சென்றதும் அறிவிப்புப் பலகைகளைத் தேடுங்கள்.',
    source: 'ஆதாரம்',
    checked: 'விதிகள் {date} அன்று NEA பட்டியலுடன் சரிபார்க்கப்பட்டன.',
    adults: '21 வயதும் அதற்கு மேற்பட்டவர்களுக்கும் மட்டும்.',
  },
  th: {
    titles: ['ในสิงคโปร์สูบบุหรี่ได้ที่ไหน?', 'จุดสูบบุหรี่ถนนออร์ชาร์ด', 'จุดสูบบุหรี่เซ็นโตซ่า', 'สวนในสิงคโปร์ที่มีจุดสูบบุหรี่'],
    short: ['กฎ', 'ถนนออร์ชาร์ด', 'เซ็นโตซ่า', 'สวน'],
    desc: [
      'กฎการสูบบุหรี่ของสิงคโปร์แบบเข้าใจง่าย: ที่ไหนห้ามสูบ (ป้ายรถเมล์ สวน ใต้ตึก HDB จุดจอดแท็กซี่ และอื่น ๆ) เขตปลอดบุหรี่ถนนออร์ชาร์ด และที่ไหนโดยทั่วไปสูบได้',
      'จุดสูบบุหรี่ที่ NEA กำหนดทั้งหมดในเขตปลอดบุหรี่ถนนออร์ชาร์ด พร้อมคำอธิบายและลิงก์แผนที่',
      'จุดสูบบุหรี่ที่เซ็นโตซ่ากำหนดใกล้ชายหาดซิโลโซ ปาลาวัน และตันจง ห้ามสูบบุหรี่บนชายหาดเซ็นโตซ่า',
      'ห้ามสูบบุหรี่ในสวนทุกแห่งในสิงคโปร์ ยกเว้นในจุดสูบบุหรี่ที่กำหนดในสวน 12 แห่งของ NParks นี้',
    ],
    guide: 'คู่มือ',
    cta: 'ตรวจว่าที่ที่คุณอยู่สูบบุหรี่ได้ไหม →',
    maps: 'Google Maps',
    inApp: 'เปิดในแอป',
    orchardRule: 'ย่านถนนออร์ชาร์ดทั้งหมดเป็นเขตปลอดบุหรี่ สูบได้เฉพาะในจุดสูบบุหรี่ที่มีเครื่องหมายเท่านั้น',
    seeOrchard: 'ดูจุดสูบบุหรี่ถนนออร์ชาร์ดทั้งหมด',
    orchardHistory: 'ย่านถนนออร์ชาร์ดเป็นเขตปลอดบุหรี่ตั้งแต่ปี 2019 และขยายไปถึง Exeter Road และ Killiney Road ในเดือนกุมภาพันธ์ 2024 สูบได้เฉพาะในกรอบสีเหลืองที่กำหนดเท่านั้น',
    orchardCount: 'ในเขตปลอดบุหรี่ถนนออร์ชาร์ดมีจุดสูบบุหรี่ที่ NEA กำหนด {n} จุด การสูบนอกจุดเหล่านี้อาจถูกปรับ',
    orchardMissing: 'โหลดรายการไม่ได้ขณะสร้างหน้านี้ เปิดรายการ “ใกล้เคียง” ในแอปเพื่อดูจุดสูบบุหรี่',
    sentosaIntro: 'ห้ามสูบบุหรี่บนชายหาดทั้งสามแห่งของเซ็นโตซ่า (ซิโลโซ ปาลาวัน และตันจง) เจ้าหน้าที่เซ็นโตซ่าปรับได้ 200 ดอลลาร์ หรือปรับสูงสุด 1,000 ดอลลาร์หากขึ้นศาล ใช้จุดสูบบุหรี่ที่กำหนดใกล้ชายหาดแทน',
    sentosaNote: 'มองหาป้ายจุดสูบบุหรี่ที่กำหนดเมื่อไปถึง',
    parksIntro: 'ห้ามสูบบุหรี่ในสวน สวนพฤกษศาสตร์ และเขตอนุรักษ์ธรรมชาติทุกแห่งในสิงคโปร์',
    parksNote: 'NParks ไม่ได้เผยแพร่ตำแหน่งที่แน่นอน จึงควรมองหาป้ายเมื่อไปถึง',
    source: 'ที่มา',
    checked: 'ตรวจสอบกฎกับรายการของ NEA เมื่อ {date}',
    adults: 'สำหรับผู้ใหญ่อายุ 21 ปีขึ้นไป',
  },
}

const NTU_TEXT = {
  en: { title: 'NTU smoking areas', short: 'NTU', desc: "Nanyang Technological University's designated smoking areas on its campus. The rest of the campus is smoke-free.", intro: "NTU's campus is smoke-free, including halls and all buildings. Smoking is only allowed in these designated smoking areas (NTU's list as of {date}). Campus Security enforces it: a warning first, then fines from $200, and referral to NEA." },
  zh: { title: '南大吸烟区', short: '南大', desc: '南洋理工大学校园内的指定吸烟区。校园其他地方禁止吸烟。', intro: '南大校园（包括宿舍和所有建筑）禁止吸烟，只能在以下指定吸烟区吸烟（南大名单，截至 {date}）。校园保安负责执法：先警告，之后罚款 200 元起，并转交环境局。' },
  ms: { title: 'Kawasan merokok NTU', short: 'NTU', desc: 'Kawasan merokok yang ditetapkan di kampus Universiti Teknologi Nanyang. Bahagian lain kampus bebas asap rokok.', intro: 'Kampus NTU bebas asap rokok, termasuk asrama dan semua bangunan. Merokok hanya dibenarkan di kawasan ini (senarai NTU setakat {date}). Keselamatan Kampus menguatkuasakannya: amaran dahulu, kemudian denda dari $200 dan rujukan kepada NEA.' },
  ta: { title: 'NTU புகைபிடிக்கும் பகுதிகள்', short: 'NTU', desc: 'நன்யாங் தொழில்நுட்பப் பல்கலைக்கழக வளாகத்தில் உள்ள புகைபிடிக்கும் பகுதிகள். வளாகத்தின் மற்ற இடங்களில் புகைபிடிக்கத் தடை.', intro: 'NTU வளாகம் முழுவதும் (விடுதிகள், அனைத்துக் கட்டடங்கள் உட்பட) புகைபிடிக்கத் தடை. இந்தப் பகுதிகளில் மட்டுமே அனுமதி (NTU பட்டியல், {date} நிலவரப்படி). வளாகப் பாதுகாப்புப் பிரிவு அமல்படுத்துகிறது: முதலில் எச்சரிக்கை, பிறகு $200 முதல் அபராதம், NEA-விடம் ஒப்படைப்பு.' },
  th: { title: 'จุดสูบบุหรี่ NTU', short: 'NTU', desc: 'จุดสูบบุหรี่ที่กำหนดในมหาวิทยาลัยเทคโนโลยีหนานหยาง ส่วนอื่นของมหาวิทยาลัยห้ามสูบบุหรี่', intro: 'มหาวิทยาลัย NTU ห้ามสูบบุหรี่ทั่วทั้งพื้นที่ รวมถึงหอพักและอาคารทุกหลัง สูบได้เฉพาะในจุดที่กำหนดเหล่านี้ (รายการของ NTU ณ {date}) เจ้าหน้าที่รักษาความปลอดภัยเป็นผู้บังคับใช้: ตักเตือนก่อน จากนั้นปรับตั้งแต่ 200 ดอลลาร์ และส่งเรื่องให้ NEA' },
}
for (const [id, t] of Object.entries(NTU_TEXT)) {
  TEXT[id].titles.push(t.title)
  TEXT[id].short.push(t.short)
  TEXT[id].desc.push(t.desc)
  TEXT[id].ntuIntro = t.intro
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const titleCase = (s) => String(s).toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, b, c) => b + c.toUpperCase())
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
const path = (lang, slug) => (lang === 'en' ? `/guide/${slug}.html` : `/guide/${lang}/${slug}.html`)

function layout(L, i, body) {
  const T = TEXT[L.id]
  const d = L.dict
  const slug = SLUGS[i]
  const nav = SLUGS.map((s, j) => (j === i ? `<b>${esc(T.short[j])}</b>` : `<a href="${path(L.id, s)}">${esc(T.short[j])}</a>`)).join(' · ')
  const langs = LANGS.map((o) => (o.id === L.id ? `<b>${esc(o.name)}</b>` : `<a href="${path(o.id, slug)}" hreflang="${o.id}" lang="${o.id}">${esc(o.name)}</a>`)).join(' · ')
  const alternates = LANGS.map((o) => `<link rel="alternate" hreflang="${o.id}" href="${SITE}${path(o.id, slug)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${SITE}${path('en', slug)}">`
  const checkedOn = new Date(`${RULES_CHECKED.on}T12:00:00+08:00`).toLocaleDateString(L.locale, { day: 'numeric', month: 'long', year: 'numeric' })
  return `<!doctype html>
<html lang="${L.id}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(T.titles[i])} · Smoke Finder SG</title>
<meta name="description" content="${esc(T.desc[i])}">
<link rel="canonical" href="${SITE}${path(L.id, slug)}">
${alternates}
<meta property="og:title" content="${esc(T.titles[i])}">
<meta property="og:description" content="${esc(T.desc[i])}">
<meta property="og:image" content="${SITE}/og.png">
<link rel="icon" href="/icon.svg">
<style>
:root{--bg:#f5f5f4;--card:#fff;--ink:#1c1917;--muted:#57534e;--line:#e7e5e4;--go:#1b7d44;--stop:#c0392b}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--card:#1c1917;--ink:#f5f5f4;--muted:#a8a29e;--line:#292524;--go:#3fb872;--stop:#e5604f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:44rem;margin:0 auto;padding:1.25rem 1rem 3rem}a{color:var(--go)}
h1{font-size:1.75rem;line-height:1.25;margin:.75rem 0 .25rem}h2{font-size:1.1rem;margin:1.75rem 0 .5rem}
.muted{color:var(--muted);font-size:.9rem}.nav{font-size:.9rem;color:var(--muted);margin:.25rem 0}
.card{background:var(--card);border-radius:1rem;padding:.25rem 1rem;box-shadow:0 1px 2px rgb(0 0 0/.06)}
.card li{padding:.7rem 0;border-bottom:1px solid var(--line)}.card li:last-child{border:0}ul.card{list-style:none;margin:0}
.cta{display:block;text-align:center;background:var(--go);color:#fff;font-weight:600;border-radius:.9rem;padding:.9rem;margin:1.5rem 0;text-decoration:none}
@media (prefers-color-scheme:dark){.cta{color:#0c0a09}}
.small{font-size:.85rem}.red{color:var(--stop);font-weight:600}
</style>
</head>
<body>
<main>
<p class="nav"><a href="/">Smoke Finder SG</a> › ${esc(T.guide)}: ${nav}</p>
<p class="nav">${esc(d['common.language'])}: ${langs}</p>
<h1>${esc(T.titles[i])}</h1>
${body}
<a class="cta" href="/">${esc(T.cta)}</a>
<p class="muted small">${esc(d.disclaimer)} ${esc(d.fine)}. ${esc(T.adults)} ${esc(T.source)}: <a href="${NEA_SOURCE}">NEA</a>. ${esc(fill(T.checked, { date: checkedOn }))} ${esc(d['rules.quit'])} <a href="https://www.healthhub.sg/programmes/iquit">${esc(d['onb.iquit'])}</a></p>
</main>
</body>
</html>
`
}

function rulesPage(L) {
  const d = L.dict
  const T = TEXT[L.id]
  const label = (id) => d[`rule.${id}.label`] ?? en[`rule.${id}.label`] ?? RULES.find((r) => r.id === id)?.label
  const reason = (id) => d[`rule.${id}.reason`] ?? en[`rule.${id}.reason`] ?? RULES.find((r) => r.id === id)?.reason
  const banned = RULES.filter((r) => r.inside === 'red' && r.id !== 'orchard_nsz')
  const signs = RULES.filter((r) => r.inside === 'amber')
  const item = (r) => `<li><b>${esc(label(r.id))}</b>${r.bufferM ? ` <span class="muted">(${esc(fill(d['rules.around'], { m: r.bufferM }))})</span>` : ''}<br><span class="muted">${esc(reason(r.id))}</span></li>`
  const allowed = [1, 2, 3, 4, 5, 6, 7].map((n) => d[`rules.allowed.${n}`])
  return layout(L, 0, `<p>${esc(d['rules.intro'])}</p>
<h2 class="red">${esc(d['rules.never'])} (${banned.length})</h2><ul class="card">${banned.map(item).join('')}</ul>
<h2>${esc(d['rules.orchard'])}</h2><p>${esc(T.orchardRule)} <a href="${path(L.id, SLUGS[1])}">${esc(T.seeOrchard)}</a></p>
<h2>${esc(d['rules.checkSigns'])} (${signs.length})</h2><ul class="card">${signs.map(item).join('')}</ul>
<h2>${esc(d['rules.usually'])}</h2><ul class="card">${allowed.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`)
}

function orchardPage(L, dsas) {
  const T = TEXT[L.id]
  const list = dsas?.length
    ? `<p>${esc(fill(T.orchardCount, { n: dsas.length }))}</p>
<ul class="card">${dsas
        .map((d) => `<li><b>${esc(titleCase(d.name))}</b>${d.description ? `<br><span class="muted">${esc(d.description)}</span>` : ''}<br><span class="small"><a href="https://www.google.com/maps/search/?api=1&amp;query=${d.lat},${d.lng}">${esc(T.maps)}</a> · <a href="/spot?nea=${d.neaId}">${esc(T.inApp)}</a></span></li>`)
        .join('')}</ul>`
    : `<p>${esc(T.orchardMissing)} <a href="/map">→</a></p>`
  return layout(L, 1, `<p>${esc(T.orchardHistory)}</p>${list}<p class="muted small">${esc(T.source)}: NEA (data.gov.sg).</p>`)
}

// An operator's spots as cards grouped by area, in the operator's own (English) wording.
function operatorList(list, T) {
  const groups = new Map()
  for (const s of list.spots) groups.set(s.group, [...(groups.get(s.group) ?? []), s])
  const many = groups.size > 1
  return [...groups]
    .map(([group, spots]) => `${many ? `<h2 lang="en">${esc(group)}</h2>` : ''}<ul class="card" lang="en">${spots
      .map((s) => `<li>${esc(s.official)}<br><span class="small"><a href="https://www.google.com/maps/search/?api=1&amp;query=${s.lat},${s.lng}">${esc(T.maps)}</a></span></li>`)
      .join('')}</ul>`)
    .join('')
}

function sentosaPage(L) {
  const T = TEXT[L.id]
  const list = OPERATORS.sdc
  return layout(L, 2, `<p>${esc(T.sentosaIntro)}</p>
${operatorList(list, T)}
<p class="muted small">${esc(T.sentosaNote)} ${esc(T.source)}: <a href="${list.source}">Sentosa</a>.</p>`)
}

function ntuPage(L) {
  const T = TEXT[L.id]
  const list = OPERATORS.ntu
  return layout(L, 4, `<p>${esc(fill(T.ntuIntro, { date: list.listDate }))}</p>
${operatorList(list, T)}
<p class="muted small">${esc(T.sentosaNote)} ${esc(T.source)}: <a href="${list.source}">NTU</a>.</p>`)
}

function parksPage(L) {
  const T = TEXT[L.id]
  return layout(L, 3, `<p>${esc(T.parksIntro)} ${esc(L.dict['park.listIntro'])}</p>
<ul class="card" lang="en">${PARKS_WITH_DSAS.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
<p>${esc(T.parksNote)}</p>
<p class="muted small">${esc(T.source)}: <a href="https://www.nparks.gov.sg/visit/when-visiting-parks/etiquette/parks-dos-donts">NParks</a>.</p>`)
}

let dsas = null
try {
  const res = await fetch(`${API}/dsas`, { signal: AbortSignal.timeout(20_000) })
  if (res.ok) dsas = await res.json()
} catch {
  // unreachable: the Orchard page links to the app instead
}

const urls = ['/']
for (const L of LANGS) {
  await mkdir(join(DIST, ...path(L.id, 'x').split('/').slice(1, -1)), { recursive: true })
  const pages = [rulesPage(L), orchardPage(L, dsas), sentosaPage(L), parksPage(L), ntuPage(L)]
  for (const [i, html] of pages.entries()) {
    await writeFile(join(DIST, ...path(L.id, SLUGS[i]).split('/').slice(1)), html)
    urls.push(path(L.id, SLUGS[i]))
  }
}

const today = new Date().toISOString().slice(0, 10)
await writeFile(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`,
)
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nDisallow: /admin\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
console.log(`guide: ${urls.length - 1} pages in ${LANGS.length} languages${dsas ? `, ${dsas.length} NEA areas` : ', NEA list unavailable'}; sitemap.xml, robots.txt`)
