/**
 * thai-lunar-engine.js — SevenStar corrected candidate v1.1.0
 * ============================================================================
 * Thai Lunisolar (Chulasakarat / จุลศักราช) Calendar Engine
 * ----------------------------------------------------------------------------
 * แปลงวันที่ปฏิทินสุริยคติ (Gregorian / พ.ศ.) เป็นวันเดือนปีจันทรคติไทย
 * (ขึ้น/แรม, เดือนจันทรคติ, ปีนักษัตร) ตามระบบคำนวณ "สุริยยาตร์" (Suriyayart)
 * ซึ่งเป็นระบบดั้งเดิมที่ใช้ในตำราโหราศาสตร์ไทยและปฏิทินหลวง
 *
 * อัลกอริทึมนี้พอร์ตมาจากไลบรารีโอเพนซอร์ส `pythaidate`
 * (https://github.com/hmmbug/pythaidate, MIT-style, โดย hmmbug)
 * ซึ่งอิงตามงานวิชาการของ J.C. Eade, "The Calendrical Systems of Mainland
 * South-East Asia" และบทความ "Rules for interpolation in the Thai calendar"
 * (Journal of the Siam Society) — เป็นสูตรคณิตศาสตร์ล้วน (ไม่ต้องพึ่งพา
 * ตำแหน่งดวงจันทร์ทางดาราศาสตร์จริง) จึงสามารถคำนวณล่วงหน้า/ย้อนหลังได้แม่นยำ
 * และตรวจสอบผลลัพธ์แล้วว่าตรงกับปฏิทินอ้างอิงจริงของ myhora.com
 * (ดูไฟล์ validate.js / VALIDATION.md ที่แนบมาด้วย)
 *
 * ทิศทางที่รองรับ: "สุริยคติ -> จันทรคติ" (ทิศทางที่ใช้งานบ่อยที่สุดสำหรับ
 * การแปลงวันเกิดเพื่อดูดวง) การแปลงย้อนกลับ (จันทรคติ -> สุริยคติ) ยังไม่ได้
 * พอร์ตในไฟล์นี้ (ดูหมายเหตุท้ายไฟล์)
 *
 * ไม่มี dependency ภายนอก ใช้ได้ทั้งฝั่ง Node.js และเบราว์เซอร์
 * ============================================================================
 */
 
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ThaiLunarEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
 
  // ==========================================================================
  // ส่วนที่ 1: Julian Day Number <-> ปฏิทินเกรกอเรียน (สุริยคติสากล)
  // ==========================================================================
  // Julian Day Number (JDN) คือหมายเลขวันต่อเนื่องที่ใช้เป็น "แกนกลาง" ในการ
  // แปลงไปมาระหว่างปฏิทินต่าง ๆ ทำให้ไม่ต้องกังวลเรื่องจำนวนวันในแต่ละเดือน/ปี
 
  /**
   * แปลงวันที่ปฏิทินเกรกอเรียน (ค.ศ.) เป็น Julian Day Number
   * @param {number} year  ปี ค.ศ.
   * @param {number} month เดือน (1-12)
   * @param {number} day   วันที่ (1-31)
   * @returns {number} Julian Day Number (จำนวนเต็ม)
   */
  function toJulianDay(year, month, day) {
    let yearp, monthp;
    if (month === 1 || month === 2) {
      yearp = year - 1;
      monthp = month + 12;
    } else {
      yearp = year;
      monthp = month;
    }
 
    let B;
    if (
      year < 1582 ||
      (year === 1582 && month < 10) ||
      (year === 1582 && month === 10 && day < 15)
    ) {
      // ก่อนเริ่มใช้ปฏิทินเกรกอเรียน (ใช้ปฏิทินจูเลียน)
      B = 0;
    } else {
      const A = Math.trunc(yearp / 100);
      B = 2 - A + Math.trunc(A / 4);
    }
 
    const C =
      yearp < 0
        ? Math.trunc(365.25 * yearp - 0.75)
        : Math.trunc(365.25 * yearp);
    const D = Math.trunc(30.6001 * (monthp + 1));
 
    return Math.trunc(B + C + D + day + 1720994.5 + 0.5);
  }
 
  /**
   * แปลง Julian Day Number กลับเป็นวันที่ปฏิทินเกรกอเรียน (ค.ศ.)
   * @param {number} jd Julian Day Number
   * @returns {{year:number, month:number, day:number}}
   */
  function fromJulianDay(jd) {
    jd = Math.trunc(jd);
    const I = jd;
    const F = 0;
    const A = Math.trunc((I - 1867216.25) / 36524.25);
    const B = I > 2299160 ? I + 1 + A - Math.trunc(A / 4) : I;
    const C = B + 1524;
    const D = Math.trunc((C - 122.1) / 365.25);
    const E = Math.trunc(365.25 * D);
    const G = Math.trunc((C - E) / 30.6001);
    const days = C - E + F - Math.trunc(30.6001 * G);
    const month = G < 13.5 ? G - 1 : G - 13;
    const year = month > 2.5 ? D - 4716 : D - 4715;
    return { year, month, day: Math.trunc(days) };
  }
 
  // ==========================================================================
  // ส่วนที่ 2: ค่าคงที่ของระบบคำนวณสุริยยาตร์ (Suriyayart constants)
  // ==========================================================================
  // ค่าคงที่เหล่านี้เป็นตัวเลขดั้งเดิมที่ตำราโหราศาสตร์ไทยใช้สืบทอดกันมา
  // (ไม่ใช่ค่าที่คำนวณจากตำแหน่งดาราศาสตร์จริง แต่เป็นค่าประมาณเฉลี่ยที่ตำรา
  // กำหนดไว้ตายตัว) ห้ามแก้ไขตัวเลขเหล่านี้โดยไม่เข้าใจที่มา
 
  // จำนวนวันใน 800 ปีจุลศักราช (ตัวหารร่วมของระบบ = 292,207 วัน ต่อ 800 ปี
  // ซึ่งให้ค่าเฉลี่ยความยาวปีสุริยคติ = 292207/800 = 365.25875 วัน/ปี)
  const DAYS_IN_800_YEARS = 292207;
  const TIME_UNITS_IN_1_DAY = 800; // หน่วยย่อยของวัน (สำหรับ กัมมัชพล)
  const EPOCH_OFFSET = 373; // ค่าชดเชยจุดเริ่มต้นศักราช
  const UCCAPON_CONSTANT = 2611; // ค่าตั้งต้นของอุจจพล (ตำแหน่งจุดสูงสุดวงโคจรจันทร์)
  const APOGEE_ROTATION_DAYS = 3232; // จำนวนวันที่อุจจพลหมุนครบรอบ (0-3231)
 
  // Julian Day Number ของ "วันที่ 0" ของปฏิทินจุลศักราช (จ.ศ. 0)
  // ใช้แปลง หรคุณ (horakhun) <-> Julian Day Number
  const CS_JULIAN_DAY_OFFSET = 1954167;
 
  // จำนวนวันในปีจันทรคติแต่ละประเภท
  const CAL_TYPE_DAY_COUNTS = { A: 354, B: 355, C: 384, c: 384 };
 
  const WEEKDAYS_TH = [
    "วันเสาร์", // 0 (และ 7)
    "วันอาทิตย์",
    "วันจันทร์",
    "วันอังคาร",
    "วันพุธ",
    "วันพฤหัสบดี",
    "วันศุกร์",
  ];
 
  // ชื่อปีนักษัตร 12 ปี เรียงตาม index = (ปีจุลศักราช + 11) % 12  (1-12, ไม่ใช่ 0-11)
  const YEAR_NAKSATR = [
    null,
    "ชวด",
    "ฉลู",
    "ขาล",
    "เถาะ",
    "มะโรง",
    "มะเส็ง",
    "มะเมีย",
    "มะแม",
    "วอก",
    "ระกา",
    "จอ",
    "กุน",
  ];
 
  // ชื่อเดือนจันทรคติไทย (เดือนอ้าย=1 ... เดือนสิบสอง=12)
  const LUNAR_MONTH_NAMES = [
    null,
    "เดือนอ้าย",
    "เดือนยี่",
    "เดือนสาม",
    "เดือนสี่",
    "เดือนห้า",
    "เดือนหก",
    "เดือนเจ็ด",
    "เดือนแปด",
    "เดือนเก้า",
    "เดือนสิบ",
    "เดือนสิบเอ็ด",
    "เดือนสิบสอง",
  ];
 
  // ตารางจำนวนวันสะสม (cumulative days) นับจากวันขึ้นปีใหม่ (เดือนห้า ขึ้น ๑ ค่ำ
  // ตามธรรมเนียม) จนถึงจุดเริ่มต้นของแต่ละ "ตำแหน่งเดือน" (ไม่ใช่เลขเดือนตรง ๆ)
  // แยกตามประเภทปี A (ปกติ 354 วัน), B (อธิกวาร 355 วัน), C (อธิกมาส 384 วัน)
  const MONTH_CUMULATIVE_DAYS = {
    A: [0, 29, 59, 88, 118, 147, 177, 206, 236, 265, 295, 324, 354, 383],
    B: [0, 29, 59, 89, 119, 148, 178, 207, 237, 266, 296, 325, 355, 384],
    C: [0, 29, 59, 88, 118, 148, 177, 207, 236, 266, 295, 325, 354, 384],
  };
 
  // แปลง "ตำแหน่งเดือน" (index ในตารางข้างบน) กลับเป็นเลขเดือนจันทรคติจริง
  // หมายเหตุ: 8 คือเดือนแปด(แรก), 88 คือเดือนแปดหลัง (อธิกมาส),
  // 15/16 คือเดือนห้า/เดือนหก ที่ปรากฏซ้ำท้ายปี (กรณีปีเริ่มไม่ตรงวันขึ้น ๑ ค่ำ
  // เดือนห้าพอดี) — ใช้เฉพาะทิศทางจันทรคติ->สุริยคติซึ่งไฟล์นี้ไม่ได้ใช้งาน
  const LUNAR_MONTHS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 8, 88, 15, 16];
 
  // ==========================================================================
  // ส่วนที่ 3: คำนวณค่าประจำปี (เทียบเท่า LSYear ใน pythaidate)
  // ==========================================================================
  /**
   * คำนวณค่าต่าง ๆ ของปีจุลศักราชที่ระบุ ณ "วันขึ้นปีใหม่" (วันที่ตั้งต้นปี)
   * ประกอบด้วยศัพท์โหราศาสตร์ไทยดั้งเดิม:
   *   - หรคุณ (horakhun): จำนวนวันสะสมนับแต่วันตั้งจุลศักราช
   *   - กัมมัชพล (kammacapon): เศษวันสุริยคติที่ยังไม่ครบวัน
   *   - อุจจพล (uccapon): ตำแหน่งจุดสูงสุดของวงโคจรดวงจันทร์ (0-3231)
   *   - อวมาน (avoman): ผลต่างสะสมระหว่างวันจันทรคติกับวันสุริยคติ
   *     (หน่วย 1/692 ของดิถี) ใช้ตัดสินว่าปีใดต้องมีอธิกวาร/อธิกมาส
   *   - มาสเกณฑ์ (masaken): จำนวนเดือนจันทรคติสะสมนับแต่ตั้งศักราช
   *   - ดิถี (tithi): วันทางจันทรคติ (ข้างขึ้น-ข้างแรม) ของวันขึ้นปีใหม่
   * @param {number} csYear ปีจุลศักราช (จ.ศ.)
   */
  function computeLSYear(csYear) {
    const horakhun =
      Math.floor((csYear * DAYS_IN_800_YEARS + EPOCH_OFFSET) / TIME_UNITS_IN_1_DAY) + 1;
    const kammacapon =
      TIME_UNITS_IN_1_DAY -
      ((csYear * DAYS_IN_800_YEARS + EPOCH_OFFSET) % TIME_UNITS_IN_1_DAY);
    const uccapon = (UCCAPON_CONSTANT + horakhun) % APOGEE_ROTATION_DAYS;
 
    const avoQuot = Math.floor((horakhun * 11 + 650) / 692);
    let avoman = (horakhun * 11 + 650) % 692;
    if (avoman === 0) avoman = 692;
    const masaken = Math.floor((avoQuot + horakhun) / 30);
    let tithi = (avoQuot + horakhun) % 30;
    if (avoman === 692) tithi -= 1;
 
    const weekday = horakhun % 7;
 
    // ค่าดิถีของ "ปีถัดไป" (ใช้ตรวจสอบเงื่อนไขพิเศษ tithi=25 & tithi1=5)
    const horakhun1 =
      Math.floor(
        ((csYear + 1) * DAYS_IN_800_YEARS + EPOCH_OFFSET) / TIME_UNITS_IN_1_DAY
      ) + 1;
    const quot1 = Math.floor((horakhun1 * 11 + 650) / 692);
    const tithi1 = (quot1 + horakhun1) % 30;
 
    // Faraut, pg 28 — คำนวณ "ลงศก" (langsak) และวันขึ้นปีใหม่ (nyd = new year's day, วันในสัปดาห์)
    const langsak = Math.max(1, tithi);
    let nyd = langsak;
    if (nyd < 6) nyd += 29;
    nyd = (((weekday - nyd + 1 + 35) % 7) + 7) % 7;
 
    // ปีสุริยคติอธิกสุรทินหรือไม่ (มีผลต่อการตัดสินอธิกวาร)
    const leapday = kammacapon <= 207;
 
    // ประเภทปี: A = ปกติ (354 วัน), B = อธิกวาร (355 วัน), C = อธิกมาส (384 วัน)
    let calType = "A";
    if (tithi > 24 || tithi < 6) calType = "C";
    if (tithi === 25 && tithi1 === 5) calType = "A";
    if ((leapday && avoman <= 126) || (!leapday && avoman <= 137)) {
      calType = calType !== "C" ? "B" : "c";
    }
 
    let nextNyd;
    if (calType === "A") nextNyd = (nyd + 4) % 7;
    else if (calType === "B") nextNyd = (nyd + 5) % 7;
    else nextNyd = (nyd + 6) % 7; // C หรือ c
 
    return {
      year: csYear,
      horakhun,
      kammacapon,
      uccapon,
      avoman,
      masaken,
      tithi,
      weekday,
      langsak,
      nyd,
      nextNyd,
      leapday,
      calType,
      offset: false, // จะถูกปรับใน adjustYearTypes ถ้าจำเป็น
    };
  }
 
  /**
   * ปรับประเภทปี (cal_type) ของปีที่ระบุให้สอดคล้องกับปีข้างเคียง (±2 ปี)
   * ตามกฎของ Eade เพื่อจัดการกรณีพิเศษที่อธิกวารกับอธิกมาสจะตกในปีเดียวกัน
   * (ซึ่งเป็นไปไม่ได้ในปฏิทินไทย ต่างจากปฏิทินพม่า) และกรณีวันขึ้นปีใหม่
   * ของปีติดกันไม่ต่อเนื่องกัน
   * @param {number} csYear ปีจุลศักราชที่ต้องการผลลัพธ์
   * @returns {object} ค่าปีที่ปรับแล้ว (เทียบเท่า calculate_year0 คืนค่า y[2])
   */
  function calculateYear0(csYear) {
    const y = [
      computeLSYear(csYear - 2),
      computeLSYear(csYear - 1),
      computeLSYear(csYear),
      computeLSYear(csYear + 1),
      computeLSYear(csYear + 2),
    ];
 
    for (let i = 0; i <= 4; i++) {
      if (y[2].tithi === 24 && y[3].tithi === 6) {
        y[i].calType = "C";
        y[i].nextNyd = (y[i].nextNyd + 2) % 7;
      }
    }
 
    for (let i = 1; i <= 3; i++) {
      if (y[i].calType === "c") {
        const j = y[i].nyd === y[i - 1].nextNyd ? 1 : -1;
        y[i + j].calType = "B";
        y[i + j].nextNyd = (y[i + j].nextNyd + 1) % 7;
      }
    }
 
    for (let i = 1; i <= 3; i++) {
      if (y[i - 1].nextNyd !== y[i].nyd && y[i].nextNyd !== y[i + 1].nyd) {
        y[i].offset = true;
        y[i].langsak += 1;
        y[i].nyd = (y[i].nyd + 6) % 7;
        y[i].nextNyd = (y[i].nextNyd + 6) % 7;
      }
    }
 
    for (let i = 0; i <= 4; i++) {
      if (y[i].calType === "c") y[i].calType = "C";
      y[i].caldays = CAL_TYPE_DAY_COUNTS[y[i].calType];
    }
 
    // กำหนดเดือน/วันแรกของปี (จุดเริ่ม "เดือนห้า" หรือ "เดือนหก" ตามธรรมเนียม
    // Caitra(C)/Vaisakha(V) ของ Eade) และ offset_days (จำนวนวันชดเชยจากวันขึ้น
    // ๑ ค่ำ เดือนห้า ไปยังวันขึ้นปีใหม่จริงของปีนี้)
    y[2].firstMonth = "C";
    y[2].firstDay = y[2].langsak;
    y[2].offsetDays = y[2].langsak;
    if (y[2].offsetDays < 6 + (y[2].offset ? 1 : 0)) {
      y[2].firstMonth = "V";
      y[2].firstDay = y[2].offsetDays;
      y[2].offsetDays += 29;
    }
 
    return y[2];
  }
 
  // ตารางค้นหาเดือน/วัน จากจำนวนวันสะสมนับแต่วันขึ้นปีใหม่ (เทียบเท่า find_date)
  const FIND_DATE_TABLE = {
    A: [
      [383, 16], [354, 15], [324, 12], [295, 11], [265, 10], [236, 9],
      [206, 8], [177, 7], [147, 6], [118, 5], [88, 4], [59, 3], [29, 2],
    ],
    B: [
      [384, 16], [355, 15], [325, 12], [296, 11], [266, 10], [237, 9],
      [207, 8], [178, 7], [148, 6], [119, 5], [89, 4], [59, 3], [29, 2],
    ],
    C: [
      [384, 15], [354, 12], [325, 11], [295, 10], [266, 9], [236, 8],
      [207, 7], [177, 6], [148, 5], [118, 14], [88, 13], [59, 3], [29, 2],
    ],
  };
 
  /**
   * ค้นหาว่าจำนวนวัน (นับแต่วันขึ้นปีใหม่ของปีนั้น) ตกอยู่ในเดือนจันทรคติใด
   * และเป็นวันที่เท่าไรของเดือนนั้น (1-30, โดย 1-15=ขึ้น, 16-30=แรม)
   * @param {"A"|"B"|"C"} calType ประเภทปี
   * @param {number} days จำนวนวันสะสม (offsetDays + วันที่ผ่านมาแล้วในปี)
   */
  function findDate(calType, days) {
    const table = FIND_DATE_TABLE[calType];
    let month = LUNAR_MONTHS[1]; // ค่าเริ่มต้น = เดือนห้า
    for (const [a, b] of table) {
      if (days > a) {
        days -= a;
        month = LUNAR_MONTHS[b];
        return { month, day: days };
      }
    }
    return { month, day: days };
  }
 
  // ==========================================================================
  // ส่วนที่ 4: แปลง Julian Day Number -> วันที่จุลศักราช (ทิศทางหลักของไฟล์นี้)
  // ==========================================================================
 
  /**
   * แปลง Julian Day Number เป็นวันที่จุลศักราชแบบดิบ (ปี, เดือน(ตำแหน่ง), วัน)
   * เทียบเท่า CsDate.fromjulianday + fromyd ใน pythaidate
   * @param {number} jd Julian Day Number
   */
  function csDateFromJulianDay(jd) {
    const hk = jd - CS_JULIAN_DAY_OFFSET;
    if (hk <= 0) {
      throw new RangeError(
        "วันที่ที่ระบุอยู่ก่อนจุดเริ่มต้นจุลศักราช (จ.ศ. 1) ไม่สามารถคำนวณได้"
      );
    }
 
    let year = Math.floor((hk * 800 - 373) / 292207);
 
    // กรณีพิเศษที่เกิดขึ้นทุก 800 ปี (292,207 วัน) ในวันสุดท้ายของปีอธิกสุรทิน
    // ที่ตรงกับปีอธิกมาสพอดี สูตร jd->year ข้างต้นจะคลาดเคลื่อนไป 1 ปี
    let days;
    if (((hk % 292207) + 292207) % 292207 === 95333) {
      year -= 1;
      days = 365;
    } else {
      const year0 = calculateYear0(year);
      days = hk - year0.horakhun;
    }
 
    return csDateFromYD(year, days);
  }
 
  /**
   * แปลง (ปีจุลศักราช, จำนวนวันนับแต่วันขึ้นปีใหม่) เป็นวันที่จุลศักราชแบบดิบ
   * จัดการกรณีที่ days ล้นไปยังปีถัดไปด้วย (loop ปรับปี)
   */
  function csDateFromYD(year, days) {
    let year0 = calculateYear0(year);
    let daysInYear = 365 + (year0.leapday ? 1 : 0);
    while (days > daysInYear) {
      year += 1;
      days -= daysInYear;
      year0 = calculateYear0(year);
      daysInYear = 365 + (year0.leapday ? 1 : 0);
    }
    const { month, day } = findDate(year0.calType, year0.offsetDays + days);
    return { year, month, day, year0 };
  }
 
  // ==========================================================================
  // ส่วนที่ 5: ฟังก์ชันระดับสูง (High-level API) — จุดที่ควรเรียกใช้งานจริง
  // ==========================================================================
 
  /**
   * คำนวณชื่อปีนักษัตรจากปีจุลศักราช
   * @param {number} csYear ปีจุลศักราช (จ.ศ.)
   */
  function yearNaksatrName(csYear) {
    let idx = (csYear + 11) % 12;
    if (idx === 0) idx = 12;
    return YEAR_NAKSATR[idx];
  }
 
  /**
   * แปลงเลข "ตำแหน่งเดือน" ดิบ (5,6,7,8,9,10,11,12,1,2,3,4,8,88) ให้เป็น
   * ข้อมูลเดือนจันทรคติที่อ่านง่าย { number, name, isLeapSecondEight }
   */
  function describeMonth(rawMonth) {
    // รหัส 15/16 เป็นเดือนห้า/เดือนหกที่อยู่ปลายปี จ.ศ. ก่อนวันเถลิงศก
    // สำหรับการแสดงผลและเลขตั้งต้น ต้องปรับกลับเป็นเดือน 5/6
    if (rawMonth === 15 || rawMonth === 16) {
      const normalized = rawMonth - 10;
      return {
        number: normalized,
        displayCode: normalized,
        name: LUNAR_MONTH_NAMES[normalized],
        isLeapSecondEight: false,
        isChulasakaratYearCarry: true,
        rawMonth,
      };
    }
    if (rawMonth === 88) {
      // เดือนแปดหลัง (เดือน 8 รอบที่สอง ของปีอธิกมาส) — คงรหัส "88" ไว้ในผลลัพธ์
      // ด้วย เพื่อให้ตรงกับรูปแบบที่ปฏิทินโหราศาสตร์ไทยทั่วไป (เช่น myhora.com)
      // แสดงผลเป็น "เดือนแปดหลัง (๘๘)"
      return {
        number: 8,
        displayCode: 88,
        name: "เดือนแปดหลัง",
        isLeapSecondEight: true,
        isChulasakaratYearCarry: false,
        rawMonth,
      };
    }
    return {
      number: rawMonth,
      displayCode: rawMonth,
      name: LUNAR_MONTH_NAMES[rawMonth],
      isLeapSecondEight: false,
      isChulasakaratYearCarry: false,
      rawMonth,
    };
  }
 
  /**
   * ★ ฟังก์ชันหลักสำหรับใช้งาน ★
   * แปลงวันเดือนปีเกิดตามปฏิทินสุริยคติ (พ.ศ.) เป็นวันเดือนปีจันทรคติ-นักษัตร
   *
   * @param {number} day    วันที่ (1-31)
   * @param {number} month  เดือน (1-12) ตามปฏิทินสุริยคติ/สากล
   * @param {number} beYear ปี พ.ศ. (พุทธศักราช)
   * @returns {object} ผลลัพธ์ครบถ้วนสำหรับใช้ดูดวง (ดูตัวอย่างโครงสร้างด้านล่าง)
   *
   * ตัวอย่างผลลัพธ์:
   * {
   *   input: { day: 1, month: 5, beYear: 2520 },
   *   gregorian: { year: 1977, month: 5, day: 1 },
   *   julianDay: 2443265,
   *   weekday: "วันอาทิตย์",
   *   lunar: {
   *     phase: "ขึ้น",          // "ขึ้น" หรือ "แรม"
   *     dayOfPhase: 14,          // ขึ้น/แรม "กี่ค่ำ" (1-15)
   *     month: { number: 6, displayCode: 6, name: "เดือนหก", isLeapSecondEight: false },
   *     yearAnimal: "มะเส็ง",
   *     chulaSakaratYear: 1339,  // จ.ศ.
   *   },
   *   display: "วันอาทิตย์ ขึ้น ๑๔ ค่ำ เดือนหก (๖) ปีมะเส็ง จ.ศ.๑๓๓๙"
   * }
   */
  function thaiSolarToLunar(day, month, beYear) {
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new RangeError("day ต้องเป็นจำนวนเต็มระหว่าง 1-31");
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new RangeError("month ต้องเป็นจำนวนเต็มระหว่าง 1-12");
    }
    if (!Number.isInteger(beYear)) {
      throw new RangeError("beYear (ปี พ.ศ.) ต้องเป็นจำนวนเต็ม");
    }
 
    const ceYear = beYear - 543; // พ.ศ. -> ค.ศ.
    if (ceYear < 640) {
      // จุลศักราชเริ่มที่ ค.ศ. 638 (จ.ศ. 1) การคำนวณก่อนหน้านี้ไม่รองรับ
      throw new RangeError(
        "ปี พ.ศ. ที่ระบุเก่าเกินไป (ก่อนเริ่มจุลศักราช) เอนจินนี้ไม่รองรับ"
      );
    }
    const jd = toJulianDay(ceYear, month, day);
 
    // ตรวจสอบว่า day/month ที่ป้อนมาเป็นวันที่ปฏิทินสุริยคติที่มีอยู่จริง
    // (เช่น กัน 31 เม.ย., 30 ก.พ. ที่ไม่มีอยู่จริง) โดยแปลงกลับไป-กลับมาเทียบผล
    const check = fromJulianDay(jd);
    if (check.year !== ceYear || check.month !== month || check.day !== day) {
      throw new RangeError(
        `วันที่ ${day}/${month}/${beYear} ไม่ใช่วันที่ปฏิทินสุริยคติที่มีอยู่จริง`
      );
    }
    const cs = csDateFromJulianDay(jd);
 
    const weekdayIndex = ((jd % 7) + 7) % 7;
    // csweekday ใน pythaidate ใช้ horakhun % 7 ตรง ๆ (ไม่ใช่ jd) — คำนวณผ่าน
    // horakhun ของวันนั้นเพื่อความถูกต้องตรงตามต้นฉบับ
    const horakhunOfDay = jd - CS_JULIAN_DAY_OFFSET;
    const csWeekdayIndex = ((horakhunOfDay % 7) + 7) % 7;
 
    const phase = cs.day <= 15 ? "ขึ้น" : "แรม";
    const dayOfPhase = cs.day <= 15 ? cs.day : cs.day - 15;
    const monthInfo = describeMonth(cs.month);
    // ระบบเลข 7 ตัว 9 ฐานเปลี่ยนปีนักษัตรตั้งแต่ขึ้น 1 ค่ำ เดือน 5
    // เดือนดิบ 15/16 หมายถึงเดือน 5/6 ที่มาถึงแล้ว แต่ จ.ศ. ยังไม่ขึ้นปีใหม่
    const naksatrCsYear = monthInfo.isChulasakaratYearCarry ? cs.year + 1 : cs.year;
    const animal = yearNaksatrName(naksatrCsYear);
 
    const thaiDigits = (n) =>
      String(n).replace(/[0-9]/g, (d) => "๐๑๒๓๔๕๖๗๘๙"[d]);
 
    const display =
      `${WEEKDAYS_TH[csWeekdayIndex]} ${phase} ${thaiDigits(dayOfPhase)} ค่ำ ` +
      `${monthInfo.name} (${thaiDigits(monthInfo.displayCode)}) ปี${animal} ` +
      `จ.ศ.${thaiDigits(cs.year)}`;
 
    return {
      input: { day, month, beYear },
      gregorian: { year: ceYear, month, day },
      julianDay: jd,
      weekday: WEEKDAYS_TH[csWeekdayIndex],
      lunar: {
        phase,
        dayOfPhase,
        month: monthInfo,
        yearAnimal: animal,
        naksatrChulaSakaratYear: naksatrCsYear,
        chulaSakaratYear: cs.year,
      },
      yearType: {
        code: cs.year0.calType, // "A" ปกติ, "B" อธิกวาร, "C" อธิกมาส
        label:
          cs.year0.calType === "A"
            ? "ปีปกติ"
            : cs.year0.calType === "B"
            ? "ปีอธิกวาร (มีวันแทรก)"
            : "ปีอธิกมาส (มีเดือนแทรก)",
        daysInYear: cs.year0.caldays,
      },
      display,
    };
  }
 
  /**
   * API สำหรับวันเวลาเกิดของระบบเลข 7 ตัว 9 ฐาน
   * เวลา 00:00–05:59 ใช้วันที่โหราศาสตร์เป็นวันก่อนหน้า
   */
  function thaiBirthDateTimeToLunar(day, month, beYear, time) {
    if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
      throw new RangeError("time ต้องอยู่ในรูป HH:MM");
    }
    const [hour, minute] = time.split(":").map(Number);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new RangeError("เวลาเกิดไม่ถูกต้อง");
    }

    // ให้ thaiSolarToLunar ตรวจวันที่ตั้งต้นก่อน เพื่อไม่ให้วันที่ผิดถูกเลื่อนจนดูเหมือนถูก
    thaiSolarToLunar(day, month, beYear);
    const originalJd = toJulianDay(beYear - 543, month, day);
    const shifted = hour < 6;
    const effectiveGregorian = fromJulianDay(originalJd - (shifted ? 1 : 0));
    const effective = thaiSolarToLunar(
      effectiveGregorian.day,
      effectiveGregorian.month,
      effectiveGregorian.year + 543
    );

    const daySeedByName = {
      "วันอาทิตย์": 1, "วันจันทร์": 2, "วันอังคาร": 3, "วันพุธ": 4,
      "วันพฤหัสบดี": 5, "วันศุกร์": 6, "วันเสาร์": 7,
    };
    const zodiacSeedByName = {
      "ชวด": 1, "ฉลู": 2, "ขาล": 3, "เถาะ": 4, "มะโรง": 5, "มะเส็ง": 6,
      "มะเมีย": 7, "มะแม": 1, "วอก": 2, "ระกา": 3, "จอ": 4, "กุน": 5,
    };
    const monthSeed = ((effective.lunar.month.number - 1) % 7) + 1;

    return {
      ...effective,
      birthInput: { day, month, beYear, time },
      effectiveInput: {
        day: effectiveGregorian.day,
        month: effectiveGregorian.month,
        beYear: effectiveGregorian.year + 543,
      },
      shiftedBeforeSix: shifted,
      seeds: {
        day: daySeedByName[effective.weekday],
        month: monthSeed,
        zodiac: zodiacSeedByName[effective.lunar.yearAnimal],
      },
      engineVersion: "1.1.0-candidate",
    };
  }

  return {
    // ฟังก์ชันหลักที่ควรใช้งาน
    thaiSolarToLunar,
    thaiBirthDateTimeToLunar,
    // ยูทิลิตี/ฟังก์ชันระดับล่าง (เปิดให้ใช้กรณีต้องการควบคุมเอง หรือทดสอบ/ตรวจสอบ)
    toJulianDay,
    fromJulianDay,
    csDateFromJulianDay,
    calculateYear0,
    yearNaksatrName,
    describeMonth,
  };
});
