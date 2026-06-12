import { useState, useEffect, useCallback, useRef, memo } from "react";
import { db } from "./db";
import { supabase } from "./supabaseClient";

// Isolated text input — fully local while typing, syncs to parent ONLY on blur
const NoteInput = memo(({ value, onChange, placeholder, rows, className, style }) => {
  const ref = useRef(null);
  const [local, setLocal] = useState(value || "");
  const localRef = useRef(local);
  localRef.current = local;
  const syncing = useRef(false);
  useEffect(() => {
    if (!syncing.current) setLocal(value || "");
    syncing.current = false;
  }, [value]);
  const handleBlur = () => {
    syncing.current = true;
    onChange(localRef.current);
  };
  // Expose current value so parent can grab it without waiting for blur
  useEffect(() => {
    if (ref.current) ref.current._getLocal = () => localRef.current;
  });
  const props = { ref, value: local, onChange: e => setLocal(e.target.value), onBlur: handleBlur, placeholder, className, style };
  return rows === 0 || style?.height ? <input {...props}/> : <textarea {...props} rows={rows || 1}/>;
});

// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════

const RESTAURANT_TOP = {
  phase: "Key Info",
  title: "Key Details",
  sections: [
    { id: "dm", label: "Decision Maker(s)", placeholder: "Name, title, contact…", noPain: true, noGoal: true, noCheck: true },
    { id: "gpv", label: "GPV", placeholder: "Annual card processing volume…", noPain: true, noGoal: true, noCheck: true },
    { id: "service_and_flow", label: "Service Type", placeholder: "FSR, QSR, café, pub, bar… Covers per day/week…", noPain: true, noGoal: true, noCheck: true },
  ]
};

const RETAIL_TOP = {
  phase: "Key Info",
  title: "Key Details",
  sections: [
    { id: "dm", label: "Decision Maker(s)", placeholder: "Name, title, contact…", noPain: true, noGoal: true, noCheck: true },
    { id: "gpv", label: "GPV", placeholder: "Annual card processing volume…", noPain: true, noGoal: true, noCheck: true },
    { id: "retail_type", label: "Type of Retail", placeholder: "Apparel, home & gifts, garden centre, electronics, grocery, alcohol…", noPain: true, noGoal: true },
  ]
};

const RESTAURANT_SETUP = {
  phase: "Setup",
  title: "Current Setup & Providers",
  sections: [
    { id: "order_flow", label: "Order Flow / Coursing", placeholder: "Table or counter orders? Coursing? Hold and fire?…", noCheck: true },
    { id: "pos", label: "POS", placeholder: "Current system, how long on it…", noCheck: true },
    { id: "payments", label: "Payment Processor & Reconciliation", placeholder: "Who processes cards? Rates? Reconciliation time?…", noCheck: true },
    { id: "online_ordering", label: "Online Ordering / Other Channels", placeholder: "Own website? UberEats, Deliveroo, Just Eat? Dine-in, takeaway, delivery, catering…", noCheck: true },
    { id: "loyalty_marketing", label: "Loyalty / Gift Cards / Marketing", placeholder: "Loyalty programme? Gift cards? Email/SMS campaigns?…", noCheck: true },
    { id: "inventory", label: "Inventory", placeholder: "Ingredient-level tracking? Stock management?…", noCheck: true },
    { id: "payroll_staff", label: "Staff Management", placeholder: "Scheduling, timecards, tips, tip pooling…", noCheck: true },
    { id: "integrations", label: "Integrations / Booking System", placeholder: "Accounting (Xero/QBO), reservations, delivery platforms, other tools?…", noCheck: true },
    { id: "hardware", label: "Hardware", placeholder: "Terminals, registers, KDS, printers, handhelds, kiosks…", noCheck: true },
  ]
};

const RETAIL_SETUP = {
  phase: "Setup",
  title: "Current Setup & Providers",
  sections: [
    { id: "pos", label: "POS / Till System", placeholder: "Current system, how long on it, contract end date…", noCheck: true },
    { id: "payments", label: "Payment Processor & Reconciliation", placeholder: "Who processes cards? Rates? How long to reconcile end of day?…", noCheck: true },
    { id: "ecommerce", label: "Online / eCommerce", placeholder: "Sell online? Shopify, WooCommerce, Square Online? Synced with in-store stock?…", noCheck: true },
    { id: "loyalty_marketing", label: "Loyalty / Gift Cards / Marketing", placeholder: "Loyalty programme? Gift cards (physical/digital)? Email/SMS campaigns? What tools?…", noCheck: true },
    { id: "inventory", label: "Inventory & Stock Management", placeholder: "Stock tracking? Barcode scanning? Purchase orders? Vendor management? Stockouts?…", noCheck: true },
    { id: "payroll", label: "Staff Management", placeholder: "How do they manage payroll? Rotas? Clock in/out?…", noCheck: true },
    { id: "integrations", label: "Integrations", placeholder: "Accounting (Xero/QBO), eCommerce platform, shipping, other tools?…", noCheck: true },
    { id: "hardware", label: "Hardware", placeholder: "Terminals, registers, barcode scanners, receipt printers, cash drawers, handhelds…", noCheck: true },
  ]
};

const RETAIL_OVERVIEW = {
  phase: "Overview",
  title: "Business Overview",
  sections: [
    { id: "locations", label: "Locations & Footprint", placeholder: "Single site? Multi-location? Plans to expand?…" },
    { id: "years_operating", label: "Years Operating", placeholder: "How long in business? (1yr+ needed for loans)…" },
    { id: "footfall", label: "Footfall & Peak Periods", placeholder: "Daily/weekly customers? Seasonal peaks? Busiest days?…" },
  ]
};

const RETAIL_PROBES = {
  phase: "Probes",
  title: "Dig Deeper (if minimal pain)",
  sections: [
    { id: "probe_systems", label: "Disconnected Systems", placeholder: "Separate POS, payments, stock, accounting? How many logins?…" },
    { id: "probe_reporting", label: "Reporting & Reconciliation", placeholder: "End-of-day cashing up? Matching POS to bank? Time spent?…" },
    { id: "probe_omnichannel", label: "Omnichannel Gaps", placeholder: "Online stock out of sync with store? Separate item catalogues?…" },
    { id: "probe_inventory", label: "Stock Blind Spots", placeholder: "Stockouts costing sales? Over-ordering? Manual stock counts?…" },
    { id: "probe_costs", label: "Total Cost of Ownership", placeholder: "Monthly spend across all vendors? Hidden fees? Multiple contracts?…" },
  ]
};

const SHARED_CLOSING = {
  phase: "Close",
  title: "Next Steps & Close",
  sections: [
    { id: "loans", label: "Loans", placeholder: "Square Loans interest, financing, cash flow needs…", noPain: true, noGoal: true },
    { id: "barriers", label: "Barriers to Switching", placeholder: "Contracts, training concerns, data migration, staff resistance…", noPain: true, noGoal: true },
    { id: "timeline_dm_demo", label: "Timeline / Additional Decision Makers / Demo", placeholder: "When switching? Who else involved? Demo needed? What to showcase?…", noPain: true, noGoal: true },
  ]
};

const BDR_CLOSING = {
  phase: "Close",
  title: "Next Steps & Handoff",
  sections: [
    { id: "bdr_timeline", label: "Timeline", placeholder: "", noPain: true, noGoal: true, noNotes: true,
      dropdown: true, dropdownType: "timeline", options: ["ASAP", "1–3 weeks", "1–3 months", "3–6 months"], dropdownPlaceholder: "Select timeline…" },
    { id: "bdr_dm_contact", label: "Confirmed DM Contact Details", placeholder: "Email address, mobile number…", noPain: true, noGoal: true, noNotes: true,
      dropdown: true, dropdownType: "confirmed", options: ["Yes — confirmed", "No — not yet"], dropdownPlaceholder: "Contact confirmed?…" },
    { id: "bdr_outcome", label: "Outcome", placeholder: "", noPain: true, noGoal: true, noNotes: true,
      dropdown: true, dropdownType: "outcome", options: ["Hot Handoff → AE Now", "Booked Meeting"], dropdownPlaceholder: "Select outcome…" },
  ]
};

// BDR-only tickbox added to Key Details — just a checkbox, no notes/pain/goal
const CALL_RECORDED = { id: "call_recorded", label: "Call recorded language confirmed?", placeholder: "", noPain: true, noGoal: true, noNotes: true };

const getPhases = (v, role) => {
  const closing = role === "bdr" ? BDR_CLOSING : SHARED_CLOSING;
  const baseTop = v === "restaurant" ? RESTAURANT_TOP : RETAIL_TOP;
  const top = role === "bdr" ? { ...baseTop, sections: [CALL_RECORDED, ...baseTop.sections] } : baseTop;
  const baseSetup = v === "restaurant" ? RESTAURANT_SETUP : RETAIL_SETUP;
  // BDRs don't need the Hardware section — strip it from their Setup phase
  const setup = role === "bdr" ? { ...baseSetup, sections: baseSetup.sections.filter(s => s.id !== "hardware") } : baseSetup;
  return [top, setup, closing];
};
const getAllSections = (v, role) => getPhases(v, role).flatMap(p => p.sections);

// Booked-meeting date/time picker helpers (BDR Outcome → "Booked Meeting")
// Time slots: 8:30 am → 5:00 pm in 15-min steps
const MTG_TIMES = (() => {
  const out = [];
  for (let mins = 8 * 60 + 30; mins <= 17 * 60; mins += 15) {
    const h24 = Math.floor(mins / 60), mm = mins % 60;
    const ap = h24 < 12 ? "am" : "pm";
    const h12 = ((h24 + 11) % 12) + 1;
    out.push(`${h12}:${String(mm).padStart(2, "0")} ${ap}`);
  }
  return out;
})();
const composeMeeting = (n) => {
  const dt = n.bdr_meeting_date, t = n.bdr_meeting_time;
  if (!dt || !t) return "";
  return `${dt}, ${t}`;
};

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════
export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  :root,[data-theme="dark"]{
    --bg:#0d0d0d;--glass:rgba(255,255,255,0.03);--glass-border:rgba(255,255,255,0.06);
    --glass-hover:rgba(255,255,255,0.05);--glass-active:rgba(255,255,255,0.06);
    --pill:rgba(255,255,255,0.08);
    --text:#ffffff;--text2:rgba(255,255,255,0.5);--text3:rgba(255,255,255,0.4);
    --accent:#00C2A8;--accent2:#00a892;--accent-glow:rgba(0,194,168,0.15);
    --amber:#E8A44A;--red:#E8706A;--orange:#E8A44A;
    --input-bg:rgba(255,255,255,0.03);--input-border:rgba(255,255,255,0.06);--input-focus-bg:rgba(255,255,255,0.05);
    --row-border:rgba(255,255,255,0.05);--cb-border:rgba(255,255,255,0.15);--cb-check:#0d0d0d;--btn1-text:#0d0d0d;
    --btn2-bg:rgba(255,255,255,0.03);--btn2-hover:rgba(255,255,255,0.08);--btn2-border-hover:rgba(255,255,255,0.1);
    --shadow:rgba(0,0,0,0.25);--pain-bg:rgba(232,112,106,0.06);--pain-border:rgba(232,112,106,0.14);
    --goal-bg:rgba(232,164,74,0.06);--goal-border:rgba(232,164,74,0.14);
    --orb:rgba(0,194,168,0.05);--logo-fill:white;--logo-bg:rgba(255,255,255,0.08);
    --marquee-fill:rgba(255,255,255,0.55);--marquee-inner:#0d0d0d;--credit:#fff;
    --cal-bg:rgba(18,18,18,0.9);--cal-glow:rgba(255,255,255,0.06);--cal-hover:rgba(255,255,255,0.04);
    --badge-neutral:rgba(255,255,255,0.08);
    --radius:16px;--radius-sm:10px;--font:'Outfit',-apple-system,sans-serif;
  }
  [data-theme="light"]{
    --bg:#f3f4f6;--glass:rgba(255,255,255,0.45);--glass-border:rgba(0,0,0,0.1);
    --glass-hover:rgba(255,255,255,0.75);--glass-active:rgba(0,0,0,0.05);--pill:rgba(0,0,0,0.06);
    --text:#1a1a2e;--text2:rgba(26,26,46,0.55);--text3:rgba(26,26,46,0.3);
    --accent:#00a892;--accent2:#008f7a;--accent-glow:rgba(0,168,146,0.12);
    --amber:#b06e10;--red:#b83d37;--orange:#b06e10;
    --input-bg:rgba(255,255,255,0.7);--input-border:rgba(0,0,0,0.08);--input-focus-bg:rgba(255,255,255,0.95);
    --row-border:rgba(0,0,0,0.05);--cb-border:rgba(0,0,0,0.14);--cb-check:#fff;--btn1-text:#fff;
    --btn2-bg:rgba(255,255,255,0.55);--btn2-hover:rgba(255,255,255,0.85);--btn2-border-hover:rgba(0,0,0,0.1);
    --shadow:rgba(0,0,0,0.04);--pain-bg:rgba(184,61,55,0.05);--pain-border:rgba(184,61,55,0.12);
    --goal-bg:rgba(176,110,16,0.05);--goal-border:rgba(176,110,16,0.12);
    --orb:rgba(0,168,146,0.04);--logo-fill:#1a1a2e;--logo-bg:rgba(0,0,0,0.04);
    --marquee-fill:rgba(0,0,0,0.55);--marquee-inner:#f3f4f6;--credit:#1a1a2e;
    --cal-bg:rgba(255,255,255,0.85);--cal-glow:rgba(0,0,0,0.03);--cal-hover:rgba(0,0,0,0.04);
    --badge-neutral:rgba(0,0,0,0.05);
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);transition:background .4s}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes float-orb{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.05)}66%{transform:translate(-20px,15px) scale(0.95)}}
  @keyframes pulse-glow{0%,100%{box-shadow:0 0 20px var(--accent-glow)}50%{box-shadow:0 0 40px var(--accent-glow)}}
  @keyframes saved-flash{0%{transform:scale(1)}50%{transform:scale(1.02)}100%{transform:scale(1)}}
  @keyframes slideDown{from{opacity:0;max-height:0;transform:translateY(-8px)}to{opacity:1;max-height:600px;transform:translateY(0)}}
  @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(calc(-100% / 3))}}
  @keyframes marquee-fade{0%,100%{opacity:0.25}50%{opacity:0.45}}
  @keyframes theme-spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}

  .glass{background:var(--glass);backdrop-filter:blur(40px) saturate(200%);-webkit-backdrop-filter:blur(40px) saturate(200%);border:1px solid var(--glass-border);border-radius:var(--radius);overflow:hidden;box-shadow:0 2px 8px var(--shadow);transition:all .4s}
  .gin{width:100%;background:var(--input-bg);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid var(--input-border);border-radius:var(--radius-sm);padding:8px 12px;font-size:13px;font-family:var(--font);color:var(--text);outline:none;transition:all .3s;line-height:1.5;resize:vertical}
  .gin::placeholder{color:var(--text3)}
  .gin:focus{border-color:rgba(255,255,255,0.18);background:var(--input-focus-bg);box-shadow:0 0 0 3px rgba(255,255,255,0.05)}
  .row{display:flex;align-items:flex-start;gap:14px;padding:15px 24px;border-bottom:1px solid var(--row-border);transition:all .25s}
  .row:last-child{border-bottom:none}
  .row.on{background:var(--glass-active)}
  .cb{width:22px;height:22px;min-width:22px;border-radius:7px;border:1.5px solid var(--cb-border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-top:2px;transition:all .25s;color:var(--cb-check);padding:0}
  .cb.on{background:var(--accent);border-color:var(--accent);box-shadow:0 0 8px var(--accent-glow)}
  .cbtn{background:none;border:none;cursor:pointer;color:var(--text3);padding:4px;margin-top:2px;transition:color .2s}
  .cbtn:hover{color:var(--text)}
  .btn1{display:flex;align-items:center;gap:8px;background:var(--pill);color:var(--text);border:1px solid var(--glass-border);border-radius:var(--radius-sm);padding:11px 22px;font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;transition:all .3s;letter-spacing:-.01em}
  .btn1:hover{background:rgba(255,255,255,0.14);border-color:rgba(255,255,255,0.16);transform:translateY(-1px)}
  .btn2{display:flex;align-items:center;gap:6px;background:var(--btn2-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--text);border:1px solid var(--glass-border);border-radius:var(--radius-sm);padding:10px 18px;font-size:13px;font-weight:500;font-family:var(--font);cursor:pointer;transition:all .3s}
  .btn2:hover{background:var(--btn2-hover);border-color:var(--btn2-border-hover)}
  .badge{font-size:9px;font-weight:600;padding:2px 7px;border-radius:6px;letter-spacing:.02em;white-space:nowrap}
  .count-pill{font-size:10px;font-weight:600;padding:3px 9px;border-radius:999px;background:var(--pill);color:var(--text2);white-space:nowrap}
  .phase-head{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;cursor:pointer;user-select:none;transition:background .2s}
  .phase-head:hover{background:var(--glass-hover)}
  .tag-btn{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;font-family:var(--font);cursor:pointer;border:1px solid;transition:all .2s}
  .tag-btn:hover{transform:translateY(-1px)}
  .pain-card{background:var(--pain-bg);border:1px solid var(--pain-border);border-radius:8px;padding:10px 12px;margin-top:6px;animation:slideDown .3s ease}
  .goal-card{background:var(--goal-bg);border:1px solid var(--goal-border);border-radius:8px;padding:10px 12px;margin-top:6px;animation:slideDown .3s ease}
  .pf{display:flex;gap:6px;align-items:center;margin-bottom:5px}
  .pf:last-child{margin-bottom:0}
  .pf-label{font-size:10px;font-weight:700;min-width:50px;text-transform:uppercase;letter-spacing:.04em;padding-top:1px}
  .progress-ring{transition:stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)}

  /* ── Role toggle label switching ── */
  .role-label-short{display:none}
  .role-label-full{display:inline}

  /* ── Responsive ── */
  .wrap-outer{min-height:100vh;padding:24px 16px;transition:background .4s,color .4s}
  .container{max-width:720px;margin:0 auto;width:100%}

  /* Small phones (SE, mini) */
  @media(max-width:380px){
    .wrap-outer{padding:16px 10px}
    .row{padding:10px 14px;gap:10px}
    .phase-head{padding:12px 14px}
    .gin{font-size:12px;padding:7px 10px}
    .btn1,.btn2{font-size:11px;padding:8px 14px}
    .badge{font-size:9px;padding:2px 6px}
    .select-card{padding:28px 18px!important;border-radius:16px!important}
    .select-card-title{font-size:16px!important}
    .select-icon{width:48px!important;height:48px!important;border-radius:14px!important}
    .role-label-full{display:none!important}
    .role-label-short{display:inline!important}
    .role-toggle-btn{font-size:12px!important;padding:8px 20px!important}
    .theme-toggle{width:32px!important;height:32px!important;top:14px!important;right:14px!important;border-radius:9px!important}
    .theme-toggle svg{width:14px!important;height:14px!important}
    .home-feedback-btn{display:none!important}
    .home-report-btn{display:none!important}
  }

  /* Narrow windows — switch to short label */
  @media(max-width:480px){
    .role-label-full{display:none!important}
    .role-label-short{display:inline!important}
    .role-toggle-btn{font-size:13px!important;padding:9px 24px!important}
    .theme-toggle{width:34px!important;height:34px!important;top:16px!important;right:16px!important}
  }

  /* Medium — show full labels */
  @media(min-width:481px){
    .role-label-full{display:inline}
    .role-label-short{display:none}
  }

  /* Tablets */
  @media(min-width:768px){
    .wrap-outer{padding:32px 24px}
    .container{max-width:800px}
    .row{padding:17px 26px}
    .phase-head{padding:20px 26px}
    .select-card{padding:44px 32px!important}
    .select-card-title{font-size:20px!important}
    .select-icon{width:64px!important;height:64px!important;border-radius:18px!important}
  }

  /* Desktop */
  @media(min-width:1024px){
    .wrap-outer{padding:40px 32px}
    .container{max-width:880px}
    .row{padding:18px 30px}
    .phase-head{padding:22px 30px}
    .gin{font-size:14px;padding:10px 14px}
    .btn1{padding:12px 26px;font-size:14px}
    .btn2{padding:11px 22px;font-size:14px}
    .select-card{padding:52px 40px!important;border-radius:24px!important}
    .select-card-title{font-size:22px!important}
    .select-card-sub{font-size:13px!important}
    .select-icon{width:72px!important;height:72px!important;border-radius:20px!important}
    .hero-title{font-size:32px!important}
    .hero-sub{font-size:16px!important}
  }

  /* Ultrawide */
  @media(min-width:1440px){
    .container{max-width:960px}
    .wrap-outer{padding:48px 40px}
    .select-card{padding:60px 48px!important}
  }
`;

// ═══════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════
export const I = {
  Check: () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Copy: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 4V2.5A1.5 1.5 0 008.5 1H2.5A1.5 1.5 0 001 2.5v6A1.5 1.5 0 002.5 10H4" stroke="currentColor" strokeWidth="1.3"/></svg>,
  Done: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="var(--accent)"/><path d="M4 7L6 9L10 5" stroke="#0d0d0d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  History: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Back: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Search: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3"/><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Trash: () => <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5A.5.5 0 015.5 2h3a.5.5 0 01.5.5V4m1.5 0l-.5 8a1 1 0 01-1 1h-5a1 1 0 01-1-1l-.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  SF: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 4v4c0 3 2.5 4.5 5 5.5 2.5-1 5-2.5 5-5.5V4L7 1z" stroke="#13131a" strokeWidth="1.4" fill="none"/></svg>,
  Chev: ({open}) => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transform:open?"rotate(90deg)":"rotate(0)",transition:"transform .25s"}}><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Plus: () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Utensils: () => <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M9 4v8c0 2 2 3 4 3v9M19 4v4c0 3-2 4-2 7v9M19 4c2 0 3 2 3 4v0c0 2-1 4-3 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Bag: () => <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="5" y="10" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M10 10V8a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Pain: () => <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v6M6 9v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Goal: () => <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>,
  Home: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 7l5-5 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 8v4a1 1 0 001 1h5a1 1 0 001-1V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Sun: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 3.3l1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Moon: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 9.5A5.5 5.5 0 016.5 2.5 5.5 5.5 0 1013.5 9.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

const ProgressRing = ({ pct }) => {
  const r = 20, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <div style={{ position: "relative", width: 52, height: 52 }}>
      <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--glass-border)" strokeWidth="3"/>
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} className="progress-ring" style={{ filter: pct > 0 ? "drop-shadow(0 0 4px var(--accent-glow))" : "none" }}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? "var(--accent)" : "var(--text)" }}>{pct}%</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
export default function DiscoveryTile({ session, theme: themeProp, toggleTheme: toggleThemeProp }) {
  const [theme, setTheme] = useState(themeProp || "dark");
  useEffect(() => { if (themeProp) setTheme(themeProp); }, [themeProp]);
  const toggleTheme = toggleThemeProp || (() => setTheme(t => t === "dark" ? "light" : "dark"));
  const [screen, setScreen] = useState("select");
  const [vertical, setVertical] = useState(null);
  const [role, setRole] = useState("ae"); // "ae" | "bdr"
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState({});
  const [copied, setCopied] = useState(null);
  const [allCopied, setAllCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [savedList, setSavedList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailRecord, setDetailRecord] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [openPhases, setOpenPhases] = useState({});
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "today" | "week" | "month" | "custom"
  const [customDate, setCustomDate] = useState("");
  // Pain points & goals per section: { sectionId: { pains: [...], goals: [...] } }
  const [sectionExtras, setSectionExtras] = useState({});
  // Which dropdown is open: { sectionId: "pain" | "goal" | null }
  const [openDropdown, setOpenDropdown] = useState({});
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackStep, setFeedbackStep] = useState(0); // 0=rating, 1=category, 2=message, 3=sent
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackCategory, setFeedbackCategory] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);

  const loadIndex = useCallback(async () => {
    try { const data = await db.loadDiscoveries(); setSavedList(data.map(d => ({ id: d.discovery_id, vertical: d.vertical, role: d.role, businessName: d.business_name, sfUrl: d.sf_url, recordType: d.record_type, completion: d.completion, savedAt: d.saved_at }))); } catch { setSavedList([]); }
  }, []);
  useEffect(() => { loadIndex(); }, [loadIndex]);

  const toggle = (id) => {
    // Blur any focused input to sync its value before toggling
    if (document.activeElement && document.activeElement.tagName !== "BUTTON") {
      document.activeElement.blur();
    }
    setTimeout(() => setChecked(p => ({ ...p, [id]: !p[id] })), 10);
  };
  const setNote = (id, v) => setNotes(p => ({ ...p, [id]: v }));
  const togglePhase = (k) => setOpenPhases(p => ({ ...p, [k]: !p[k] }));

  const toggleDD = (sectionId, type) => {
    setOpenDropdown(p => ({ ...p, [sectionId]: p[sectionId] === type ? null : type }));
  };

  const getExtras = (sectionId) => sectionExtras[sectionId] || { pains: [], goals: [] };

  const addPain = (sectionId) => {
    setSectionExtras(p => {
      const cur = p[sectionId] || { pains: [], goals: [] };
      return { ...p, [sectionId]: { ...cur, pains: [...cur.pains, { id: `p_${Date.now()}`, pain: "", impact: "", quantify: "", position: "" }] } };
    });
  };
  const updatePain = (sectionId, idx, field, val) => {
    setSectionExtras(p => {
      const cur = { ...(p[sectionId] || { pains: [], goals: [] }) };
      cur.pains = cur.pains.map((x, i) => i === idx ? { ...x, [field]: val } : x);
      return { ...p, [sectionId]: cur };
    });
  };
  const removePain = (sectionId, idx) => {
    setSectionExtras(p => {
      const cur = { ...(p[sectionId] || { pains: [], goals: [] }) };
      cur.pains = cur.pains.filter((_, i) => i !== idx);
      return { ...p, [sectionId]: cur };
    });
  };
  const addGoal = (sectionId) => {
    setSectionExtras(p => {
      const cur = p[sectionId] || { pains: [], goals: [] };
      return { ...p, [sectionId]: { ...cur, goals: [...cur.goals, { id: `g_${Date.now()}`, goal: "" }] } };
    });
  };
  const updateGoal = (sectionId, idx, val) => {
    setSectionExtras(p => {
      const cur = { ...(p[sectionId] || { pains: [], goals: [] }) };
      cur.goals = cur.goals.map((x, i) => i === idx ? { ...x, goal: val } : x);
      return { ...p, [sectionId]: cur };
    });
  };
  const removeGoal = (sectionId, idx) => {
    setSectionExtras(p => {
      const cur = { ...(p[sectionId] || { pains: [], goals: [] }) };
      cur.goals = cur.goals.filter((_, i) => i !== idx);
      return { ...p, [sectionId]: cur };
    });
  };

  const phases = vertical ? getPhases(vertical, role) : [];
  const allSections = vertical ? getAllSections(vertical, role) : [];
  const total = allSections.filter(s => !s.noCheck).length;
  const doneItems = Object.values(checked).filter(Boolean).length;
  const pct = total ? Math.round((doneItems / total) * 100) : 0;

  const recType = (url) => { if (!url) return null; if (url.includes("/Lead/")) return "Lead"; if (url.includes("/Opportunity/")) return "Opportunity"; return null; };

  const copyToClipboard = async (text) => {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return; } } catch {}
    try { const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0"; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch {}
  };

  const formatSF = (n, c, ext, v) => {
    n = n || notes; c = c || checked; ext = ext || sectionExtras; v = v || vertical;
    const r = arguments[4] || role;
    let o = `Discovery Notes — ${v === "restaurant" ? "Restaurant" : "Retail"} (${r === "bdr" ? "BDR" : "AE"})\n═══════════════════════════════\n\n`;
    if (n.businessName) o += `Business: ${n.businessName}\n\n`;
    o += `Date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}\n\n`;
    if (n.sfUrl) o += `Salesforce: ${n.sfUrl}\nRecord Type: ${recType(n.sfUrl) || "Unknown"}\n\n`;
    getPhases(v, r).forEach(phase => {
      o += `── ${phase.title} ──\n\n`;
      phase.sections.forEach(s => {
        const dropVal = n[s.id + "_dropdown"] || "";
        if (dropVal) o += `${c[s.id] ? "✓" : "○"} ${s.label}: [${dropVal}] ${n[s.id] || ""}\n`;
        else o += `${c[s.id] ? "✓" : "○"} ${s.label}: ${n[s.id] || ""}\n`;
        if (s.dropdownType === "outcome" && dropVal === "Booked Meeting") {
          const when = composeMeeting(n);
          if (when) o += `   📅 Meeting Date & Time: ${when}\n`;
        }
        const ex = ext[s.id];
        if (ex) {
          ex.pains?.forEach((p, i) => {
            if (p.pain || p.impact || p.quantify || p.position) {
              o += `   ⚠ Pain ${i + 1}: ${p.pain}\n     Impact: ${p.impact}\n     Quantify: ${p.quantify}\n     Position: ${p.position}\n`;
            }
          });
          ex.goals?.forEach((g, i) => {
            if (g.goal) o += `   ◎ Goal ${i + 1}: ${g.goal}\n`;
          });
        }
        o += "\n";
      });
    });
    const d = Object.values(c).filter(Boolean).length;
    const ct = getAllSections(v, r).filter(s => !s.noCheck).length;
    o += `═══════════════════════════════\nDiscovery Completion: ${d}/${ct} (${Math.round(d / ct * 100)}%)\n`;
    return o;
  };

  // ── Feedback database functions ──
  const [feedbackData, setFeedbackData] = useState({ total: 0, avg: 0, thisWeek: 0, categories: [], trending: null, recent: [] });

  const submitFeedback = async (rating, category, message) => {
    try {
      // Load existing feedback array
      // Save to Supabase feedback table
      
      
      await supabase.from("feedback").insert({ rating, category, message });
    } catch {}
  };

  const loadFeedbackReport = useCallback(async () => {
    try {
      const { data: items } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
      if (!items?.length) return;
      
      
      const total = items.length;
      const avg = Math.round((items.reduce((s, i) => s + i.rating, 0) / total) * 10) / 10;
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const thisWeek = items.filter(i => new Date(i.created_at) >= weekAgo).length;
      const catCount = {};
      items.forEach(i => { catCount[i.category] = (catCount[i.category] || 0) + 1; });
      const categories = Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({
        label, count, pct: Math.round(count / total * 100),
        color: label.includes("Feature") ? "var(--accent)" : label.includes("Bug") ? "var(--red)" : label.includes("Template") ? "var(--amber)" : label.includes("Design") ? "var(--amber)" : "var(--text3)",
      }));
      const topCat = categories[0]?.label || "—";
      const recent = items.slice(0, 3).map(i => ({
        emoji: ["😟","😕","😐","😊","🤩"][(i.rating || 1) - 1],
        cat: i.category, msg: i.message || "", time: new Date(i.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      }));
      setFeedbackData({ total, avg, thisWeek: thisWeek || total, categories, trending: topCat, recent });
    } catch {}
  }, []);

  useEffect(() => { loadFeedbackReport(); }, [loadFeedbackReport]);

  const copySingle = async (s) => {
    let t = "";
    if (notes.businessName) t += `Business: ${notes.businessName}\n`;
    if (notes.sfUrl) t += `Salesforce: ${notes.sfUrl}\n`;
    if (notes.businessName || notes.sfUrl) t += "\n";
    t += `${s.label}: `;
    const dropVal = notes[s.id + "_dropdown"] || "";
    if (dropVal) t += `[${dropVal}] `;
    t += notes[s.id] || "";
    if (s.dropdownType === "outcome" && dropVal === "Booked Meeting") {
      const when = composeMeeting(notes);
      if (when) t += `\n  Meeting Date & Time: ${when}`;
    }
    const ex = sectionExtras[s.id];
    if (ex) {
      ex.pains?.forEach((p, i) => { if (p.pain) t += `\n  Pain ${i+1}: ${p.pain} | Impact: ${p.impact} | Quantify: ${p.quantify} | Position: ${p.position}`; });
      ex.goals?.forEach((g, i) => { if (g.goal) t += `\n  Goal ${i+1}: ${g.goal}`; });
    }
    await copyToClipboard(t);
    setCopied(s.id); setTimeout(() => setCopied(null), 1500);
  };
  const copyAll = async () => { await copyToClipboard(formatSF()); setAllCopied(true); setTimeout(() => setAllCopied(false), 2000); };

  const saveDiscovery = async () => {
    if (!notes.businessName?.trim()) { setSaveStatus("needsName"); setTimeout(() => setSaveStatus(null), 2500); return; }
    setSaveStatus("saving");
    const id = "disc_" + Date.now();
    const rec = { id, vertical, role, businessName: notes.businessName, sfUrl: notes.sfUrl || "", recordType: recType(notes.sfUrl), notes: { ...notes }, checked: { ...checked }, sectionExtras: JSON.parse(JSON.stringify(sectionExtras)), completion: pct, savedAt: new Date().toISOString() };
    try {
      await db.saveDiscovery(rec);
      const nl = [{ id, vertical: rec.vertical, role: rec.role, businessName: rec.businessName, sfUrl: rec.sfUrl, recordType: rec.recordType, completion: rec.completion, savedAt: rec.savedAt }, ...savedList];
      setSavedList(nl); setSaveStatus("saved");
      setTimeout(() => { setChecked({}); setNotes({}); setSectionExtras({}); setOpenDropdown({}); setOpenPhases({}); setSaveStatus(null); setScreen("select"); setVertical(null); }, 2000);
    } catch { setSaveStatus("error"); setTimeout(() => setSaveStatus(null), 2500); }
  };

  const loadDiscovery = async (id) => {
    try { const data = await db.loadDiscovery(id); if (data) { setDetailRecord({ id: data.discovery_id, vertical: data.vertical, role: data.role, businessName: data.business_name, sfUrl: data.sf_url, recordType: data.record_type, notes: data.notes, checked: data.checked, sectionExtras: data.section_extras, completion: data.completion, savedAt: data.saved_at }); setScreen("detail"); } } catch {}
  };
  const deleteDiscovery = async (id) => {
    try {
      await db.deleteDiscovery(id);
      setSavedList(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      console.error("Failed to delete discovery", e);
    }
    setDeleteConfirm(null);
  };

  const filtered = savedList.filter(d => {
    const term = searchTerm.toLowerCase();
    const dateStr = new Date(d.savedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toLowerCase();
    const matchesSearch = d.businessName?.toLowerCase().includes(term) || d.sfUrl?.toLowerCase().includes(term) || dateStr.includes(term);
    if (!matchesSearch) return false;

    if (dateFilter === "all") return true;
    const saved = new Date(d.savedAt);
    const now = new Date();
    if (dateFilter === "today") {
      return saved.toDateString() === now.toDateString();
    }
    if (dateFilter === "week") {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      return saved >= weekAgo;
    }
    if (dateFilter === "month") {
      const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
      return saved >= monthAgo;
    }
    if (dateFilter === "custom" && customDate) {
      return saved.toISOString().slice(0, 10) === customDate;
    }
    return true;
  });


  const wrap = (ch) => (
    <div data-theme={theme} className="wrap-outer" style={{ fontFamily: "var(--font)", background: "var(--bg)", color: "var(--text)", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      {/* Theme toggle — fixed top right */}
      <button className="theme-toggle" onClick={toggleTheme} title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
        style={{
          position: "fixed", top: 20, right: 20, zIndex: 10,
          width: 38, height: 38, borderRadius: 11,
          border: "1px solid var(--glass-border)", background: "var(--glass)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text2)", padding: 0,
          transition: "all .3s",
          boxShadow: "0 2px 8px var(--shadow)",
          opacity: themeToggleVisible ? 1 : 0,
          pointerEvents: themeToggleVisible ? "auto" : "none",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.borderColor = "var(--glass-border)"; e.currentTarget.style.transform = "scale(1)"; }}
      >
        {theme === "dark" ? <I.Sun/> : <I.Moon/>}
      </button>
      <div style={{ position: "fixed", top: "-10%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, var(--orb) 0%, transparent 70%)", animation: "float-orb 20s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }}/>
      <div style={{ position: "fixed", bottom: "-15%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, var(--orb) 0%, transparent 70%)", animation: "float-orb 25s ease-in-out infinite reverse", pointerEvents: "none", zIndex: 0 }}/>
      <div style={{ position: "relative", zIndex: 1 }}>
        {ch}
        {/* Block Ecosystem Logo Banner */}
        <div style={{ margin: "36px auto 0", maxWidth: "100%", overflow: "hidden", position: "relative", padding: "20px 0" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "18%", background: "linear-gradient(90deg, var(--bg) 0%, transparent 100%)", zIndex: 2, pointerEvents: "none" }}/>
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "18%", background: "linear-gradient(270deg, var(--bg) 0%, transparent 100%)", zIndex: 2, pointerEvents: "none" }}/>
          <div style={{ display: "flex", animation: "marquee 30s linear infinite", willChange: "transform", width: "fit-content", opacity: 0.35 }}>
            {[0,1,2].map(set => (
              <div key={set} style={{ display: "flex", paddingRight: 56, gap: 56, alignItems: "center", flexShrink: 0 }}>
                {/* Block */}
                <svg width="34" height="34" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}><rect x="3" y="3" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="11" y="3" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="19" y="3" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="3" y="11" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="11" y="11" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="19" y="11" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="3" y="19" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="11" y="19" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="19" y="19" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/></svg>
                {/* Square */}
                <svg width="32" height="32" viewBox="0 0 30 30" fill="none" style={{ flexShrink: 0 }}><rect x="3" y="3" width="24" height="24" rx="5" stroke="var(--marquee-fill)" strokeWidth="2" fill="none"/><rect x="10" y="10" width="10" height="10" rx="2" fill="var(--marquee-fill)"/></svg>
                {/* Cash App */}
                <svg width="32" height="32" viewBox="0 0 30 30" fill="none" style={{ flexShrink: 0 }}><rect x="3" y="3" width="24" height="24" rx="5" fill="var(--marquee-fill)"/><path d="M15 7v1.5m0 13V23m-3.5-5.5c0 1.4 1.6 2.5 3.5 2.5s3.5-1.1 3.5-2.5-1.6-2.5-3.5-2.5-3.5-1.1-3.5-2.5 1.6-2.5 3.5-2.5 3.5 1.1 3.5 2.5" stroke="var(--marquee-inner)" strokeWidth="2" strokeLinecap="round"/></svg>
                {/* Afterpay */}
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--marquee-fill)", fontFamily: "var(--font)", letterSpacing: "-0.03em", flexShrink: 0, whiteSpace: "nowrap" }}>afterpay</span>
                {/* Block */}
                <svg width="34" height="34" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}><rect x="3" y="3" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="11" y="3" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="19" y="3" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="3" y="11" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="11" y="11" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="19" y="11" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="3" y="19" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="11" y="19" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/><rect x="19" y="19" width="6" height="6" rx="1.2" fill="var(--marquee-fill)"/></svg>
                {/* Square */}
                <svg width="32" height="32" viewBox="0 0 30 30" fill="none" style={{ flexShrink: 0 }}><rect x="3" y="3" width="24" height="24" rx="5" stroke="var(--marquee-fill)" strokeWidth="2" fill="none"/><rect x="10" y="10" width="10" height="10" rx="2" fill="var(--marquee-fill)"/></svg>
                {/* Cash App */}
                <svg width="32" height="32" viewBox="0 0 30 30" fill="none" style={{ flexShrink: 0 }}><rect x="3" y="3" width="24" height="24" rx="5" fill="var(--marquee-fill)"/><path d="M15 7v1.5m0 13V23m-3.5-5.5c0 1.4 1.6 2.5 3.5 2.5s3.5-1.1 3.5-2.5-1.6-2.5-3.5-2.5-3.5-1.1-3.5-2.5 1.6-2.5 3.5-2.5 3.5 1.1 3.5 2.5" stroke="var(--marquee-inner)" strokeWidth="2" strokeLinecap="round"/></svg>
                {/* Afterpay */}
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--marquee-fill)", fontFamily: "var(--font)", letterSpacing: "-0.03em", flexShrink: 0, whiteSpace: "nowrap" }}>afterpay</span>
              </div>
            ))}
          </div>
        </div>
        {/* Credit + Feedback button */}
        <div style={{ padding: "16px 16px 20px", position: "relative" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--text2)", fontSize: 11, letterSpacing: "0.02em" }}>
              <span style={{ width: 24, height: 1, background: "var(--glass-border)", display: "inline-block" }}/>
              <span style={{ fontWeight: 700 }}>Created by Damani Joseph Dias</span>
              <span style={{ width: 24, height: 1, background: "var(--glass-border)", display: "inline-block" }}/>
            </div>
          </div>
          {/* Feedback button — bottom right for non-admin users */}
          {screen === "select" && session?.user?.email !== "ddias@squareup.com" && (
            <button className="home-feedback-btn" onClick={() => { setFeedbackOpen(!feedbackOpen); setFeedbackReportOpen(false); setFeedbackStep(0); setFeedbackRating(0); setFeedbackCategory(""); setFeedbackMessage(""); }}
              style={{
                position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 13,
                background: "var(--glass)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                border: feedbackOpen ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: feedbackOpen ? "var(--accent)" : "var(--text3)",
                transition: "all .3s", boxShadow: "0 4px 20px var(--shadow)",
              }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 1C5 1 1 4.6 1 9c0 2.4 1.2 4.5 3 5.9V19l3.5-2.1c.8.2 1.6.3 2.5.3 5 0 9-3.6 9-8s-4-8-9-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: 8, fontWeight: 600, color: feedbackOpen ? "var(--accent)" : "var(--text3)", letterSpacing: "0.02em" }}>Feedback</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Pain/Goal inline components ──
  const PainCards = ({ sectionId }) => {
    const ex = getExtras(sectionId);
    return (
      <div>
        {ex.pains.map((p, i) => (
          <div key={p.id} className="pain-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--red)" }}>Pain Point {i + 1}</span>
              <button onClick={() => removePain(sectionId, i)} className="cbtn" style={{ color: "var(--red)" }}><I.Trash/></button>
            </div>
            {[
              { k: "pain", l: "Pain", ph: "What issue?…" },
              { k: "impact", l: "Impact", ph: "How is it affecting the business?…" },
              { k: "quantify", l: "Quantify", ph: "£ / time / waste…" },
              { k: "position", l: "Position", ph: "How Square solves this…" },
            ].map(f => (
              <div key={f.k} className="pf">
                <span className="pf-label" style={{ color: "var(--red)" }}>{f.l}</span>
                <NoteInput value={p[f.k]} onChange={v => updatePain(sectionId, i, f.k, v)} placeholder={f.ph} rows={0} className="gin" style={{ height: 32, fontSize: 12 }}/>
              </div>
            ))}
          </div>
        ))}
        <button onClick={() => addPain(sectionId)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "1px dashed rgba(232,112,106,0.2)", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: "var(--red)", cursor: "pointer", marginTop: 6, fontFamily: "var(--font)", width: "100%", justifyContent: "center", transition: "all .2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(232,112,106,0.04)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        ><I.Plus/> Add Pain Point</button>
      </div>
    );
  };

  const GoalCards = ({ sectionId }) => {
    const ex = getExtras(sectionId);
    return (
      <div>
        {ex.goals.map((g, i) => (
          <div key={g.id} className="goal-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--orange)" }}>Goal {i + 1}</span>
              <button onClick={() => removeGoal(sectionId, i)} className="cbtn" style={{ color: "var(--orange)" }}><I.Trash/></button>
            </div>
            <NoteInput value={g.goal} onChange={v => updateGoal(sectionId, i, v)} placeholder="What's the goal?…" rows={0} className="gin" style={{ height: 32, fontSize: 12 }}/>
          </div>
        ))}
        <button onClick={() => addGoal(sectionId)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "1px dashed rgba(232,164,74,0.2)", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: "var(--orange)", cursor: "pointer", marginTop: 6, fontFamily: "var(--font)", width: "100%", justifyContent: "center", transition: "all .2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(232,164,74,0.04)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        ><I.Plus/> Add Goal</button>
      </div>
    );
  };

  // ── Row renderer ──
  const DiscoveryRow = ({ s, readOnly, rNotes, rChecked, rExtras }) => {
    const isOn = readOnly ? rChecked?.[s.id] : checked[s.id];
    const noteVal = readOnly ? (rNotes?.[s.id] || "—") : (notes[s.id] || "");
    const ex = readOnly ? (rExtras?.[s.id] || { pains: [], goals: [] }) : getExtras(s.id);
    const dd = openDropdown[s.id];
    const hasPains = ex.pains?.length > 0;
    const hasGoals = ex.goals?.length > 0;
    const dropdownVal = notes[s.id + "_dropdown"] || "";

    return (
      <div className={`row ${isOn ? "on" : ""}`}>
        {s.noCheck ? null : readOnly ? (
          <div className={`cb ${isOn ? "on" : ""}`} style={{ cursor: "default" }}>{isOn && <I.Check/>}</div>
        ) : (
          <button onMouseDown={e => { e.preventDefault(); toggle(s.id); }} className={`cb ${isOn ? "on" : ""}`}>{isOn && <I.Check/>}</button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: isOn ? 700 : 500, color: isOn ? "var(--text)" : "var(--text2)", transition: "color .2s", letterSpacing: "-.01em" }}>{s.label}</span>
            {/* Show selected dropdown value as inline badge */}
            {s.dropdown && dropdownVal && !readOnly && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "rgba(0,194,168,0.1)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(0,194,168,0.15)" }}>{dropdownVal}</span>
            )}
            {!readOnly && !s.noPain && (
              <button className="tag-btn" onClick={() => toggleDD(s.id, "pain")}
                style={{ color: dd === "pain" || hasPains ? "var(--red)" : "var(--text3)", borderColor: dd === "pain" || hasPains ? "rgba(255,68,53,0.3)" : "rgba(255,255,255,0.08)", background: dd === "pain" ? "rgba(232,112,106,0.06)" : "transparent" }}>
                <I.Pain/> Pain{hasPains ? ` (${ex.pains.length})` : ""}
              </button>
            )}
            {!readOnly && !s.noGoal && (
              <button className="tag-btn" onClick={() => toggleDD(s.id, "goal")}
                style={{ color: dd === "goal" || hasGoals ? "var(--orange)" : "var(--text3)", borderColor: dd === "goal" || hasGoals ? "rgba(255,159,10,0.3)" : "rgba(255,255,255,0.08)", background: dd === "goal" ? "rgba(232,164,74,0.06)" : "transparent" }}>
                <I.Goal/> Goal{hasGoals ? ` (${ex.goals.length})` : ""}
              </button>
            )}
          </div>

          {/* BDR Dropdown selector */}
          {s.dropdown && !readOnly && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: s.noNotes ? 0 : 8 }}>
              {s.options.map(opt => (
                <button key={opt} onClick={() => { setNote(s.id + "_dropdown", dropdownVal === opt ? "" : opt); if (!checked[s.id]) toggle(s.id); }}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    fontFamily: "var(--font)", cursor: "pointer", transition: "all .25s",
                    border: dropdownVal === opt ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                    background: dropdownVal === opt ? "rgba(0,194,168,0.1)" : "var(--glass)",
                    color: dropdownVal === opt ? "var(--accent)" : "var(--text2)",
                    boxShadow: dropdownVal === opt ? "0 0 8px var(--accent-glow)" : "none",
                  }}
                >{opt}</button>
              ))}
            </div>
          )}
          {s.dropdown && readOnly && (
            <div style={{ marginBottom: 4 }}>
              <span style={{
                display: "inline-block", padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: "rgba(0,194,168,0.1)", color: "var(--accent)", border: "1px solid rgba(0,194,168,0.2)",
              }}>{(rNotes?.[s.id + "_dropdown"]) || "Not selected"}</span>
            </div>
          )}

          {/* Booked-meeting date/time picker — only when outcome is "Booked Meeting" */}
          {s.dropdownType === "outcome" && !readOnly && dropdownVal === "Booked Meeting" && (() => {
            const sel = (val, onCh, opts, ph) => (
              <select value={val} onChange={e => onCh(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "var(--font)",
                  cursor: "pointer", border: "1px solid var(--glass-border)", background: "var(--glass)",
                  color: val ? "var(--text)" : "var(--text3)", outline: "none" }}>
                <option value="">{ph}</option>
                {opts.map(o => <option key={o.v} value={o.v} style={{ background: "var(--bg)", color: "var(--text)" }}>{o.l}</option>)}
              </select>
            );
            const base = new Date(); base.setHours(0, 0, 0, 0);
            const dates = Array.from({ length: 90 }, (_, i) => {
              const d = new Date(base); d.setDate(base.getDate() + i);
              return d;
            }).filter(d => d.getDay() !== 0 && d.getDay() !== 6).map(d => {
              const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
              return { v: label, l: label };
            });
            const times = MTG_TIMES.map(t => ({ v: t, l: t }));
            return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, alignItems: "center" }}>
                {sel(notes.bdr_meeting_date || "", v => setNote("bdr_meeting_date", v), dates, "Date")}
                <span style={{ color: "var(--text3)", fontSize: 12, fontWeight: 600, padding: "0 2px" }}>at</span>
                {sel(notes.bdr_meeting_time || "", v => setNote("bdr_meeting_time", v), times, "Time")}
                {composeMeeting(notes) && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "rgba(0,194,168,0.1)", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(0,194,168,0.15)" }}>{composeMeeting(notes)}</span>
                )}
              </div>
            );
          })()}
          {/* Read-only booked-meeting date/time */}
          {s.dropdownType === "outcome" && readOnly && (rNotes?.[s.id + "_dropdown"]) === "Booked Meeting" && composeMeeting(rNotes || {}) && (
            <div style={{ marginBottom: 4, fontSize: 12, color: "var(--text2)" }}>📅 {composeMeeting(rNotes || {})}</div>
          )}

          {/* Notes input */}
          {readOnly && !s.noNotes && (
            <div style={{ fontSize: 13, color: "var(--text2)", whiteSpace: "pre-wrap" }}>{noteVal !== "—" ? noteVal : ""}{noteVal === "—" && !s.dropdown ? "—" : ""}</div>
          )}
          {!readOnly && !s.noNotes && (
            <NoteInput value={noteVal} onChange={v => setNote(s.id, v)} placeholder={s.placeholder} rows={s.multiline ? 3 : 1} className="gin" style={{ minHeight: s.multiline ? 72 : 34 }}/>
          )}

          {/* Inline pain dropdown */}
          {!readOnly && dd === "pain" && <PainCards sectionId={s.id}/>}
          {/* Inline goal dropdown */}
          {!readOnly && dd === "goal" && <GoalCards sectionId={s.id}/>}
          {/* Read-only pains/goals */}
          {readOnly && ex.pains?.filter(p => p.pain).map((p, i) => (
            <div key={i} className="pain-card" style={{ animation: "none" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>Pain {i + 1}</div>
              {["pain", "impact", "quantify", "position"].map(f => (
                <div key={f} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 1 }}><span style={{ color: "var(--red)", fontWeight: 600, textTransform: "capitalize" }}>{f === "position" ? "Position" : f}: </span>{p[f] || "—"}</div>
              ))}
            </div>
          ))}
          {readOnly && ex.goals?.filter(g => g.goal).map((g, i) => (
            <div key={i} className="goal-card" style={{ animation: "none" }}>
              <div style={{ fontSize: 12, color: "var(--text2)" }}><span style={{ color: "var(--orange)", fontWeight: 700, fontSize: 11 }}>Goal {i + 1}: </span>{g.goal}</div>
            </div>
          ))}
        </div>
        {!readOnly && !s.noNotes && <button onClick={() => copySingle(s)} className="cbtn">{copied === s.id ? <I.Done/> : <I.Copy/>}</button>}
      </div>
    );
  };

  // Announcement state
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [feedbackReportOpen, setFeedbackReportOpen] = useState(false);
  const [themeToggleVisible, setThemeToggleVisible] = useState(true);
  const roleToggleRef = useRef(null);

  useEffect(() => {
    const wrap = document.querySelector(".wrap-outer");
    if (!wrap) return;
    const handleScroll = () => {
      const toggle = document.querySelector(".theme-toggle");
      const roleTrack = document.querySelector(".role-toggle-track");
      if (!toggle || !roleTrack) { setThemeToggleVisible(true); return; }
      const toggleRect = toggle.getBoundingClientRect();
      const roleRect = roleTrack.getBoundingClientRect();
      // Hide if they'd overlap vertically and horizontally
      const overlapV = toggleRect.bottom > roleRect.top - 8 && toggleRect.top < roleRect.bottom + 8;
      const overlapH = toggleRect.right > roleRect.left - 8 && toggleRect.left < roleRect.right + 8;
      setThemeToggleVisible(!(overlapV && overlapH));
    };
    wrap.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => { wrap.removeEventListener("scroll", handleScroll); window.removeEventListener("scroll", handleScroll); };
  }, [screen]);

  // ═══════════════════════════════════
  // SELECT SCREEN
  // ═══════════════════════════════════
  if (screen === "select") return wrap(
    <div className="container">

      {/* Top pill — Upcoming Features */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, animation: "fadeUp 0.3s ease" }}>
        {!announceOpen ? (
          <button onClick={() => setAnnounceOpen(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(0,194,168,0.06)", border: "1px solid rgba(0,194,168,0.12)",
              borderRadius: 9, padding: "5px 12px",
              fontSize: 11, fontWeight: 600, fontFamily: "var(--font)",
              color: "var(--accent)", cursor: "pointer", transition: "all .3s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,194,168,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,194,168,0.06)"; }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M13 2v10l-6-2.5V4.5L13 2zM7 4.5H4a2 2 0 00-2 2v1a2 2 0 002 2h3M7 9.5l1 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Upcoming Features
          </button>
        ) : null}
      </div>

      {/* Upcoming Features expanded */}
      {announceOpen && (
        <div style={{
          background: "var(--glass)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: 14,
          padding: "14px 16px", maxWidth: 340, marginBottom: 20,
          animation: "fadeUp .3s cubic-bezier(.175,.885,.32,1.275)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Upcoming Features</span>
            <button onClick={() => setAnnounceOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 12, lineHeight: 1, padding: 2 }}
            >✕</button>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>AI-Enhanced Notes</div>
          <p style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5, marginBottom: 10 }}>
            Auto-correct spelling, expand abbreviations, and structure your notes for Salesforce.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", background: "rgba(0,194,168,0.08)", padding: "2px 7px", borderRadius: 5, letterSpacing: "0.02em" }}>Q2 2026</span>
            <span style={{ fontSize: 10, color: "var(--text3)" }}>Mon 27 Apr · 8 AM BST</span>
          </div>
        </div>
      )}

      {/* Feedback Report expanded */}
      <div style={{ textAlign: "center", marginBottom: 32, animation: "fadeUp 0.4s ease" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 12, background: "var(--logo-bg)", marginBottom: 16, boxShadow: "0 0 24px rgba(255,255,255,0.06)" }}>
          <svg width="30" height="30" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="11" y="3" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="19" y="3" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="3" y="11" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="11" y="11" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="19" y="11" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="3" y="19" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="11" y="19" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="19" y="19" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/></svg>
        </div>
        <h1 className="hero-title" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 6 }}>Discovery Bank</h1>
        {session?.user?.user_metadata?.full_name && (
          <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
            {(() => { const h = new Date().getHours(); const name = session.user.user_metadata.full_name.split(" ")[0]; return h < 12 ? `Good morning, ${name}` : h < 17 ? `Good afternoon, ${name}` : `Good evening, ${name}`; })()}
          </p>
        )}
        <p className="hero-sub" style={{ fontSize: 14, color: "var(--text2)", marginBottom: 0 }}>Choose your role & vertical</p>
      </div>

      {/* Role Toggle — Sliding Pill */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24, animation: "fadeUp 0.45s ease" }}>
        <div className="role-toggle-track" style={{
          display: "inline-grid", gridTemplateColumns: "1fr 1fr", position: "relative",
          background: "var(--glass)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          border: "1px solid var(--glass-border)", borderRadius: 14, padding: 4,
        }}>
          {/* Sliding background pill */}
          <div style={{
            position: "absolute", top: 4, bottom: 4,
            width: "calc(50% - 2px)",
            left: role === "ae" ? 4 : "calc(50% - 2px)",
            background: "var(--pill)",
            borderRadius: 11,
            transition: "left .4s cubic-bezier(.175,.885,.32,1.275)",
            zIndex: 0,
          }}/>
          {[
            { key: "ae", full: "Account Executive", short: "AE" },
            { key: "bdr", full: "BDR", short: "BDR" },
          ].map(r => (
            <button key={r.key} onClick={() => setRole(r.key)}
              className="role-toggle-btn"
              style={{
                position: "relative", zIndex: 1,
                padding: "9px 28px", borderRadius: 11, fontSize: 13, fontWeight: 600,
                fontFamily: "var(--font)", cursor: "pointer", border: "none",
                background: "transparent", whiteSpace: "nowrap",
                transition: "color .35s cubic-bezier(.4,0,.2,1)",
                color: role === r.key ? "var(--text)" : "var(--text3)",
                textAlign: "center",
              }}
            >
              <span className="role-label-full">{r.full}</span>
              <span className="role-label-short">{r.short}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.5s ease" }}>
        {[
          { key: "restaurant", label: "Restaurant", sub: "FSR · QSR · Café · Bar", icon: <I.Utensils/> },
          { key: "retail", label: "Retail", sub: "Apparel · Home · Gifts · Grocery", icon: <I.Bag/> },
        ].map(v => (
          <button key={v.key} onClick={() => { setVertical(v.key); setScreen("tile"); }}
            className="select-card"
            style={{ flex: "1 1 240px", maxWidth: 360, background: "var(--glass)", backdropFilter: "blur(40px)", border: "1px solid var(--glass-border)", borderRadius: 20, padding: "36px 24px", cursor: "pointer", transition: "all .3s", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "var(--text)", fontFamily: "var(--font)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,194,168,0.3)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,194,168,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div className="select-icon" style={{ width: 56, height: 56, borderRadius: 16, background: "var(--glass)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>{v.icon}</div>
            <div className="select-card-title" style={{ fontSize: 18, fontWeight: 700 }}>{v.label}</div>
            <div className="select-card-sub" style={{ fontSize: 12, color: "var(--text3)" }}>{v.sub}</div>
          </button>
        ))}
      </div>
      {/* Action buttons row */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", marginTop: 28, padding: "0 4px", position: "relative", minHeight: 58 }}>
        {/* Report — admin only, far left */}
        {session?.user?.email === "ddias@squareup.com" && (
          <button className="home-report-btn" onClick={() => { setFeedbackReportOpen(!feedbackReportOpen); setFeedbackOpen(false); }}
            style={{ position: "absolute", left: 4, top: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "var(--glass)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
              border: feedbackReportOpen ? "1px solid var(--amber)" : "1px solid var(--glass-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: feedbackReportOpen ? "var(--amber)" : "var(--text3)",
              transition: "all .3s", boxShadow: "0 4px 20px var(--shadow)",
            }}>
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M5 10V7M8 10V5M11 10V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: feedbackReportOpen ? "var(--amber)" : "var(--text3)", letterSpacing: "0.02em" }}>Report</span>
          </button>
        )}

        {/* Saved Discoveries — center */}
        <button onClick={() => { loadIndex(); setScreen("history"); }} className="btn2" style={{ flexShrink: 0 }}>
          <I.History/> Saved Discoveries
          {savedList.length > 0 && <span style={{ background: "var(--glass)", color: "var(--text3)", borderRadius: 8, padding: "1px 7px", fontSize: 10, fontWeight: 600, border: "1px solid var(--glass-border)" }}>{savedList.length}</span>}
        </button>

        {/* Feedback — admin only in this row, far right */}
        {session?.user?.email === "ddias@squareup.com" && (
          <button className="home-feedback-btn" onClick={() => { setFeedbackOpen(!feedbackOpen); setFeedbackReportOpen(false); setFeedbackStep(0); setFeedbackRating(0); setFeedbackCategory(""); setFeedbackMessage(""); }}
            style={{ position: "absolute", right: 4, top: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "var(--glass)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
              border: feedbackOpen ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: feedbackOpen ? "var(--accent)" : "var(--text3)",
              transition: "all .3s", boxShadow: "0 4px 20px var(--shadow)",
            }}>
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M10 1C5 1 1 4.6 1 9c0 2.4 1.2 4.5 3 5.9V19l3.5-2.1c.8.2 1.6.3 2.5.3 5 0 9-3.6 9-8s-4-8-9-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: feedbackOpen ? "var(--accent)" : "var(--text3)", letterSpacing: "0.02em" }}>Feedback</span>
          </button>
        )}
      </div>

      {/* Sign out */}
      {session && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button onClick={() => db.signOut()} className="btn2" style={{ fontSize: 11, padding: "7px 14px", opacity: 0.7 }}>
            {session.user?.user_metadata?.avatar_url && (
              <img src={session.user.user_metadata.avatar_url} alt="" style={{ width: 16, height: 16, borderRadius: "50%" }}/>
            )}
            Sign Out
          </button>
        </div>
      )}

      {/* Report expanded — below buttons */}
      {feedbackReportOpen && screen === "select" && (
        <div style={{
          maxWidth: 420, margin: "16px auto 0",
          maxHeight: "60vh", overflowY: "auto",
          background: "rgba(255,255,255,0.02)", backdropFilter: "blur(60px) saturate(200%)", WebkitBackdropFilter: "blur(60px) saturate(200%)",
          border: "1px solid var(--glass-border)", borderRadius: 16,
          boxShadow: "0 4px 24px var(--shadow)",
          overflow: "hidden auto", animation: "fadeUp .35s cubic-bezier(.175,.885,.32,1.275)",
          WebkitOverflowScrolling: "touch",
        }}>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--amber)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Feedback Report</span>
              <button onClick={() => setFeedbackReportOpen(false)}
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; }}
              >✕</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {[{ label: "Responses", val: feedbackData.total || "—", color: "var(--text)" }, { label: "Avg Rating", val: feedbackData.avg || "—", color: "var(--accent)" }, { label: "This Week", val: feedbackData.thisWeek || "—", color: "var(--text)" }].map(m => (
                <div key={m.label} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.03em" }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>By Category</div>
              {(feedbackData.categories.length ? feedbackData.categories : [{ label: "No feedback yet", count: 0, pct: 0, color: "var(--text3)" }]).map(c => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--text2)", minWidth: 90 }}>{c.label}</span>
                  <div style={{ flex: 1, height: 6, background: "var(--glass-border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: c.pct + "%", height: "100%", background: c.color, borderRadius: 3 }}/>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", minWidth: 16, textAlign: "right" }}>{c.count}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(0,194,168,0.04)", border: "1px solid rgba(0,194,168,0.1)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 12l4-4 3 3 5-7" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.03em", textTransform: "uppercase" }}>Trending This Week</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{feedbackData.trending || "No data yet"}</div>
              <p style={{ fontSize: 10, color: "var(--text2)", margin: 0 }}>{feedbackData.thisWeek ? `${feedbackData.thisWeek} submission${feedbackData.thisWeek === 1 ? "" : "s"} this week` : "Submit feedback to see trends"}</p>
            </div>
            <div style={{ background: "rgba(232,164,74,0.04)", border: "1px solid rgba(232,164,74,0.1)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--amber)" strokeWidth="1.3"/><path d="M8 5v3l2 1.5" stroke="var(--amber)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--amber)", letterSpacing: "0.03em", textTransform: "uppercase" }}>Recommended Next Build</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{feedbackData.categories[0]?.label || "Waiting for feedback"}</div>
              <p style={{ fontSize: 10, color: "var(--text2)", margin: 0 }}>{feedbackData.total ? `Most requested across ${feedbackData.total} response${feedbackData.total === 1 ? "" : "s"}` : "Recommendations appear after first submissions"}</p>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Recent</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 140, overflowY: "auto" }}>
              {(feedbackData.recent.length ? feedbackData.recent : [{ emoji: "—", cat: "—", msg: "No feedback yet", time: "" }]).map((f, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 12 }}>{f.emoji}</span>
                      <span style={{ fontSize: 8, fontWeight: 600, color: "var(--text2)", background: "var(--glass)", border: "1px solid var(--glass-border)", padding: "1px 5px", borderRadius: 4 }}>{f.cat}</span>
                    </div>
                    <span style={{ fontSize: 8, color: "var(--text3)" }}>{f.time}</span>
                  </div>
                  <p style={{ fontSize: 10, color: "var(--text)", margin: 0, lineHeight: 1.3 }}>{f.msg}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feedback expanded — below buttons */}
      {feedbackOpen && screen === "select" && (
        <div style={{
          maxWidth: 420, margin: "16px auto 0",
          background: "var(--glass)", backdropFilter: "blur(40px) saturate(200%)", WebkitBackdropFilter: "blur(40px) saturate(200%)",
          border: "1px solid var(--glass-border)", borderRadius: 16,
          boxShadow: "0 4px 24px var(--shadow)",
          overflow: "hidden", animation: "fadeUp .35s cubic-bezier(.175,.885,.32,1.275)",
        }}>
          <div style={{ height: 3, background: "var(--glass-border)" }}>
            <div style={{ height: "100%", background: "var(--accent)", width: feedbackStep === 0 ? "25%" : feedbackStep === 1 ? "50%" : feedbackStep === 2 ? "75%" : "100%", borderRadius: 3, transition: "width .5s cubic-bezier(.175,.885,.32,1.275)" }}/>
          </div>
          <div style={{ padding: "20px 20px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                {feedbackStep === 0 ? "How's Discovery Bank?" : feedbackStep === 1 ? "What's this about?" : feedbackStep === 2 ? "Tell us more" : "Thank you!"}
              </span>
              {feedbackStep < 3 && (
                <button onClick={() => setFeedbackOpen(false)}
                  style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; }}
                >✕</button>
              )}
            </div>
            {feedbackStep === 0 && (
              <div style={{ animation: "fadeUp .3s ease" }}>
                <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>All feedback is anonymous. Thank you for taking the time — it helps us build something better for everyone.</p>
                <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 14 }}>Tap to rate your experience</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => { setFeedbackRating(n); setTimeout(() => setFeedbackStep(1), 300); }}
                      style={{ width: 48, height: 48, borderRadius: 14, fontSize: 22, border: feedbackRating === n ? "2px solid rgba(255,255,255,0.25)" : "1px solid var(--glass-border)", background: feedbackRating === n ? "var(--pill)" : "transparent", cursor: "pointer", transition: "all .25s cubic-bezier(.175,.885,.32,1.275)", transform: feedbackRating === n ? "scale(1.15)" : "scale(1)", boxShadow: "none" }}
                      onMouseEnter={e => { if (feedbackRating !== n) e.currentTarget.style.transform = "scale(1.08)"; }}
                      onMouseLeave={e => { if (feedbackRating !== n) e.currentTarget.style.transform = "scale(1)"; }}
                    >{["😟","😕","😐","😊","🤩"][n-1]}</button>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", padding: "0 8px" }}><span>Needs work</span><span>Love it</span></div>
              </div>
            )}
            {feedbackStep === 1 && (
              <div style={{ animation: "fadeUp .3s ease" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {["Bug / Issue", "Feature Request", "Design", "Templates", "General"].map(cat => (
                    <button key={cat} onClick={() => { setFeedbackCategory(cat); setTimeout(() => setFeedbackStep(2), 250); }}
                      style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "var(--font)", cursor: "pointer", transition: "all .25s", border: "1px solid var(--glass-border)", background: feedbackCategory === cat ? "var(--pill)" : "transparent", color: feedbackCategory === cat ? "var(--text)" : "var(--text2)" }}
                    >{cat}</button>
                  ))}
                </div>
                <button onClick={() => setFeedbackStep(0)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 11, fontFamily: "var(--font)" }}>← Back</button>
              </div>
            )}
            {feedbackStep === 2 && (
              <div style={{ animation: "fadeUp .3s ease" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "var(--pill)", color: "var(--text)" }}>{["😟","😕","😐","😊","🤩"][feedbackRating-1]} {feedbackRating}/5</span>
                  <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "var(--glass)", color: "var(--text2)", border: "1px solid var(--glass-border)" }}>{feedbackCategory}</span>
                </div>
                <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder="What's on your mind?…" className="gin" rows={3} style={{ minHeight: 80, marginBottom: 12, fontSize: 13 }}/>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setFeedbackStep(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 11, fontFamily: "var(--font)" }}>← Back</button>
                  <button onClick={async () => { setFeedbackSending(true); await submitFeedback(feedbackRating, feedbackCategory, feedbackMessage); loadFeedbackReport(); setTimeout(() => { setFeedbackSending(false); setFeedbackStep(3); }, 500); }} disabled={feedbackSending}
                    className="btn1" style={{ padding: "9px 20px", fontSize: 13, opacity: feedbackSending ? 0.7 : 1 }}>{feedbackSending ? "Sending…" : "Send Feedback"}</button>
                </div>
              </div>
            )}
            {feedbackStep === 3 && (
              <div style={{ textAlign: "center", padding: "10px 0", animation: "fadeUp .3s ease" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Feedback sent!</p>
                <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 14, lineHeight: 1.6 }}>Discovery Bank is a passion project built outside of work hours, so popular requests get shipped twice a month. You'll be notified by email when updates land.</p>
                <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16, fontStyle: "italic" }}>— Damani</p>
                <button onClick={() => { setFeedbackOpen(false); setFeedbackStep(0); }} className="btn2" style={{ margin: "0 auto", padding: "8px 18px", fontSize: 12 }}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════
  if (screen === "history") return wrap(
    <div className="container">
      <button onClick={() => setScreen(vertical ? "tile" : "select")} className="btn2" style={{ marginBottom: 20, padding: "8px 14px", fontSize: 12 }}><I.Back/> Back</button>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 16 }}>Saved Discoveries</h2>
      <div className="glass" style={{ padding: "11px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 11 }}>
        <I.Search/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name, SF URL, or date…" className="gin" style={{ border: "none", background: "transparent", padding: "6px 0" }}/>
      </div>
      {/* Date filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "all", label: "All" },
          { key: "today", label: "Today" },
          { key: "week", label: "This Week" },
          { key: "month", label: "This Month" },
          { key: "custom", label: "Pick Date" },
        ].map(f => (
          <button key={f.key} onClick={() => setDateFilter(f.key)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              fontFamily: "var(--font)", cursor: "pointer", transition: "all .2s",
              border: "1px solid var(--glass-border)",
              background: dateFilter === f.key ? "var(--pill)" : "transparent",
              color: dateFilter === f.key ? "var(--text)" : "var(--text2)",
            }}
          >{f.label}</button>
        ))}
        {dateFilter === "custom" && (() => {
          const cd = customDate ? new Date(customDate) : new Date();
          const viewMonth = cd.getMonth();
          const viewYear = cd.getFullYear();
          const firstDay = new Date(viewYear, viewMonth, 1).getDay();
          const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
          const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
          const adjustedFirst = (firstDay + 6) % 7; // Monday start
          const cells = [];
          for (let i = adjustedFirst - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false });
          for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, current: true });
          const remaining = 42 - cells.length;
          for (let i = 1; i <= remaining; i++) cells.push({ day: i, current: false });
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const todayStr = new Date().toISOString().slice(0, 10);
          const selectedStr = customDate;

          const navMonth = (dir) => {
            const nd = new Date(viewYear, viewMonth + dir, 1);
            setCustomDate(nd.toISOString().slice(0, 10));
          };
          const pickDay = (day) => {
            const picked = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            setCustomDate(picked);
          };

          return (
            <div style={{
              position: "relative", marginTop: 8, width: 240,
              background: "rgba(20,20,30,0.85)", backdropFilter: "blur(60px) saturate(200%)",
              WebkitBackdropFilter: "blur(60px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "12px 10px", animation: "slideDown .3s ease",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
              {/* Month nav */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 2px" }}>
                <button onClick={() => navMonth(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 14, padding: "2px 6px", borderRadius: 4, transition: "all .2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>‹</button>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>{monthNames[viewMonth]} {viewYear}</span>
                <button onClick={() => navMonth(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 14, padding: "2px 6px", borderRadius: 4, transition: "all .2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>›</button>
              </div>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 2 }}>
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--text3)", padding: "2px 0", letterSpacing: ".04em" }}>{d}</div>
                ))}
              </div>
              {/* Day grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
                {cells.map((cell, i) => {
                  const cellDate = cell.current ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}` : "";
                  const isToday = cellDate === todayStr;
                  const isSelected = cellDate === selectedStr;
                  return (
                    <button key={i} onClick={() => cell.current && pickDay(cell.day)}
                      style={{
                        width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: isSelected ? 700 : 400, fontFamily: "var(--font)",
                        color: !cell.current ? "var(--text3)" : isSelected ? "#fff" : isToday ? "var(--accent)" : "var(--text)",
                        background: isSelected ? "var(--accent)" : "transparent",
                        border: isToday && !isSelected ? "1px solid rgba(0,194,168,0.3)" : "1px solid transparent",
                        borderRadius: 6, cursor: cell.current ? "pointer" : "default",
                        transition: "all .15s",
                        boxShadow: isSelected ? "0 0 10px var(--accent-glow)" : "none",
                      }}
                      onMouseEnter={e => { if (cell.current && !isSelected) e.currentTarget.style.background = "rgba(0,194,168,0.05)"; }}
                      onMouseLeave={e => { if (cell.current && !isSelected) e.currentTarget.style.background = "transparent"; }}
                    >{cell.day}</button>
                  );
                })}
              </div>
              {/* Quick actions */}
              <div style={{ display: "flex", gap: 4, marginTop: 8, justifyContent: "center" }}>
                <button onClick={() => setCustomDate(todayStr)}
                  style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font)", padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(0,194,168,0.15)", background: "rgba(0,194,168,0.04)", color: "var(--accent)", cursor: "pointer", transition: "all .2s" }}>Today</button>
                <button onClick={() => setCustomDate("")}
                  style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font)", padding: "4px 10px", borderRadius: 5, border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text2)", cursor: "pointer", transition: "all .2s" }}>Clear</button>
              </div>
            </div>
          );
        })()}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text3)" }}>{savedList.length === 0 ? "No saved discoveries yet." : "No results."}</div>
      ) : (
        <div className="glass">
          {filtered.map((d, i) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", cursor: "pointer", transition: "background .2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,194,168,0.025)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div onClick={() => loadDiscovery(d.id)} style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{d.businessName}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", gap: 8 }}>
                  {new Date(d.savedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  <span className="badge" style={{ background: "var(--logo-bg)", color: "var(--text2)" }}>{d.vertical === "restaurant" ? "Restaurant" : "Retail"}</span>
                  {d.role && <span className="badge" style={{ background: d.role === "bdr" ? "rgba(0,194,168,0.08)" : "var(--logo-bg)", color: d.role === "bdr" ? "var(--accent)" : "var(--text2)" }}>{d.role === "bdr" ? "BDR" : "AE"}</span>}
                  {d.recordType && <span className="badge" style={{ background: d.recordType === "Lead" ? "rgba(251,191,36,0.15)" : "rgba(0,214,50,0.12)", color: d.recordType === "Lead" ? "var(--amber)" : "var(--accent)" }}>{d.recordType}</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: d.completion === 100 ? "var(--accent)" : "var(--text2)" }}>{d.completion}%</span>
                {deleteConfirm === d.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={e => { e.stopPropagation(); deleteDiscovery(d.id); }} style={{ fontSize: 11, fontWeight: 600, background: "var(--red)", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Delete</button>
                    <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }} style={{ fontSize: 11, fontWeight: 600, background: "var(--glass)", color: "var(--text2)", border: "1px solid var(--glass-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm(d.id); }} className="cbtn"><I.Trash/></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════
  // DETAIL (read-only)
  // ═══════════════════════════════════
  if (screen === "detail" && detailRecord) {
    const r = detailRecord;
    const dph = getPhases(r.vertical, r.role || "ae");
    const dt = getAllSections(r.vertical, r.role || "ae").filter(s => !s.noCheck).length;
    const dd = Object.values(r.checked).filter(Boolean).length;
    const dp = Math.round(dd / dt * 100);
    return wrap(
      <div className="container">
        <button onClick={() => setScreen("history")} className="btn2" style={{ marginBottom: 20, padding: "8px 14px", fontSize: 12 }}><I.Back/> Back</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{r.businessName}</h2>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
              {new Date(r.savedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {dp}% · {r.vertical === "restaurant" ? "Restaurant" : "Retail"}
            </div>
          </div>
          <button onClick={async () => { await copyToClipboard(formatSF(r.notes, r.checked, r.sectionExtras, r.vertical)); setAllCopied(true); setTimeout(() => setAllCopied(false), 2000); }}
            className={allCopied ? "btn1" : "btn2"}>{allCopied ? <><I.Done/> Copied</> : <><I.Copy/> Copy for Salesforce</>}</button>
        </div>
        {dph.map(phase => (
          <div key={phase.phase} className="glass" style={{ marginBottom: 16 }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--glass-border)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{phase.phase}</span>
              <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 10 }}>{phase.title}</span>
            </div>
            {phase.sections.map(s => <DiscoveryRow key={s.id} s={s} readOnly rNotes={r.notes} rChecked={r.checked} rExtras={r.sectionExtras}/>)}
          </div>
        ))}
      </div>
    );
  }

  // ═══════════════════════════════════
  // MAIN TILE
  // ═══════════════════════════════════
  return wrap(
    <div className="container">
      {/* Back to home */}
      <button onClick={() => setScreen("select")}
        style={{
          display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
          cursor: "pointer", color: "var(--text3)", fontSize: 12, fontWeight: 500,
          fontFamily: "var(--font)", padding: "0 0 14px", transition: "color .2s",
          animation: "fadeUp 0.3s ease",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
      >
        <I.Back/> Discovery Bank
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12, animation: "fadeUp 0.4s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setScreen("select")} style={{ width: 40, height: 40, borderRadius: 10, background: "var(--logo-bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", boxShadow: "0 0 20px rgba(255,255,255,0.06)" }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="11" y="3" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="19" y="3" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="3" y="11" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="11" y="11" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="19" y="11" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="3" y="19" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="11" y="19" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/><rect x="19" y="19" width="6" height="6" rx="1.5" fill="var(--logo-fill)"/></svg>
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{vertical === "restaurant" ? "Restaurant" : "Retail" } Discovery Bank</h1>
            <p style={{ fontSize: 12, color: "var(--text3)", letterSpacing: "0.04em", fontWeight: 500 }}>{role === "bdr" ? "BDR" : "AE"} · BLOCK · SQUARE</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => { loadIndex(); setScreen("history"); }} className="btn2" style={{ padding: "7px 12px", fontSize: 12 }}>
            <I.History/> History
            {savedList.length > 0 && <span style={{ background: "var(--glass)", color: "var(--text3)", borderRadius: 8, padding: "1px 7px", fontSize: 10, fontWeight: 600, border: "1px solid var(--glass-border)" }}>{savedList.length}</span>}
          </button>
          <ProgressRing pct={pct}/>
        </div>
      </div>

      {/* Biz + SF URL + Date */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", animation: "fadeUp 0.5s ease" }}>
        <div className="glass" style={{ flex: 1, minWidth: 180, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, borderColor: saveStatus === "needsName" ? "var(--red)" : undefined }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>Biz</span>
          <NoteInput value={notes.businessName || ""} onChange={v => setNote("businessName", v)} placeholder="Business name…" rows={0} className="" style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "var(--font)", color: "var(--text)", background: "transparent", height: 34, padding: 0 }}/>
        </div>
        <div className="glass" style={{ minWidth: 130, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>Date</span>
          <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {/* Phases */}
      {phases.map((phase, pi) => {
        const isOpen = openPhases[phase.phase] !== false;
        return (
          <div key={phase.phase} className="glass" style={{ marginBottom: 16, animation: `fadeUp ${0.4 + pi * 0.05}s ease` }}>
            <div className="phase-head" onClick={() => togglePhase(phase.phase)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <I.Chev open={isOpen}/>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{phase.phase}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{phase.title}</span>
              </div>
              <div className="count-pill">{phase.sections.filter(s => checked[s.id]).length}/{phase.sections.filter(s => !s.noCheck).length}</div>
            </div>
            {isOpen && phase.sections.map(s => <DiscoveryRow key={s.id} s={s}/>)}
          </div>
        );
      })}

      {/* Footer */}
      <div className="glass" style={{ animation: "fadeUp 0.9s ease" }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <button onClick={copyAll} className="btn2" style={{ ...(allCopied ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : {}) }}>
            {allCopied ? <><I.Done/> Copied</> : <><I.Copy/> Copy for Salesforce</>}
          </button>
          <button onClick={saveDiscovery} disabled={saveStatus === "saving"} className="btn1"
            style={{
              ...(saveStatus === "saved" ? { animation: "saved-flash 0.3s ease" } : {}),
              ...(saveStatus === "needsName" || saveStatus === "error" ? { background: "var(--red)" } : {}),
              ...(saveStatus === "saving" ? { opacity: 0.7 } : {}),
              ...(saveStatus === null && pct === 100 ? { animation: "pulse-glow 3s ease-in-out infinite" } : {}),
            }}>
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? `✓ Saved — ${notes.businessName}` : saveStatus === "needsName" ? "Enter business name" : saveStatus === "error" ? "Error — try again" : "Discovery Complete"}
          </button>
        </div>
      </div>

      {/* Home */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 14, animation: "fadeUp 1s ease" }}>
        <button onClick={() => { setScreen("select"); setVertical(null); setChecked({}); setNotes({}); setSectionExtras({}); setOpenDropdown({}); setOpenPhases({}); }}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "none", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10, padding: "9px 18px",
            fontSize: 12, fontWeight: 500, fontFamily: "var(--font)",
            color: "var(--text3)", cursor: "pointer",
            transition: "all .3s",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "rgba(0,194,168,0.2)"; e.currentTarget.style.background = "rgba(0,194,168,0.04)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "none"; }}
        >
          <I.Home/> New Discovery
        </button>
      </div>

      {/* Feedback — at bottom of template */}
      <div style={{ marginTop: 32, paddingBottom: 8, textAlign: "center", animation: "fadeUp 1.2s ease" }}>
        {!feedbackOpen ? (
          <button onClick={() => { setFeedbackOpen(true); setFeedbackStep(0); setFeedbackRating(0); setFeedbackCategory(""); setFeedbackMessage(""); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "none", border: "1px solid var(--glass-border)",
              borderRadius: 10, padding: "8px 18px",
              fontSize: 11, fontWeight: 600, fontFamily: "var(--font)",
              color: "var(--text3)", cursor: "pointer", transition: "all .3s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "rgba(0,194,168,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--glass-border)"; }}
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M10 1C5 1 1 4.6 1 9c0 2.4 1.2 4.5 3 5.9V19l3.5-2.1c.8.2 1.6.3 2.5.3 5 0 9-3.6 9-8s-4-8-9-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            Share Feedback
          </button>
        ) : (
          <div style={{
            maxWidth: 400, margin: "0 auto", textAlign: "left",
            background: "var(--glass)", backdropFilter: "blur(40px) saturate(180%)", WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid var(--glass-border)", borderRadius: 20,
            boxShadow: "0 4px 24px var(--shadow)",
            overflow: "hidden", animation: "fadeUp .35s cubic-bezier(.175,.885,.32,1.275)",
          }}>
            <div style={{ height: 3, background: "var(--glass-border)" }}>
              <div style={{ height: "100%", background: "var(--accent)", width: feedbackStep === 0 ? "25%" : feedbackStep === 1 ? "50%" : feedbackStep === 2 ? "75%" : "100%", borderRadius: 3, transition: "width .5s cubic-bezier(.175,.885,.32,1.275)" }}/>
            </div>
            <div style={{ padding: "20px 20px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                  {feedbackStep === 0 ? "How's Discovery Bank?" : feedbackStep === 1 ? "What's this about?" : feedbackStep === 2 ? "Tell us more" : "Thank you!"}
                </span>
                {feedbackStep < 3 && (
                  <button onClick={() => setFeedbackOpen(false)}
                    style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, transition: "all .2s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; }}
                  >✕</button>
                )}
              </div>
              {feedbackStep === 0 && (
                <div style={{ animation: "fadeUp .3s ease" }}>
                  <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>All feedback is anonymous. Thank you for taking the time — it helps us build something better for everyone.</p>
                <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 14 }}>Tap to rate your experience</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => { setFeedbackRating(n); setTimeout(() => setFeedbackStep(1), 300); }}
                        style={{ width: 48, height: 48, borderRadius: 14, fontSize: 22, border: feedbackRating === n ? "2px solid rgba(255,255,255,0.25)" : "1px solid var(--glass-border)", background: feedbackRating === n ? "var(--pill)" : "transparent", cursor: "pointer", transition: "all .25s cubic-bezier(.175,.885,.32,1.275)", transform: feedbackRating === n ? "scale(1.15)" : "scale(1)", boxShadow: "none" }}
                        onMouseEnter={e => { if (feedbackRating !== n) e.currentTarget.style.transform = "scale(1.08)"; }}
                        onMouseLeave={e => { if (feedbackRating !== n) e.currentTarget.style.transform = "scale(1)"; }}
                      >{["😟","😕","😐","😊","🤩"][n-1]}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", padding: "0 8px" }}><span>Needs work</span><span>Love it</span></div>
                </div>
              )}
              {feedbackStep === 1 && (
                <div style={{ animation: "fadeUp .3s ease" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                    {["Bug / Issue", "Feature Request", "Design", "Templates", "General"].map(cat => (
                      <button key={cat} onClick={() => { setFeedbackCategory(cat); setTimeout(() => setFeedbackStep(2), 250); }}
                        style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "var(--font)", cursor: "pointer", transition: "all .25s", border: "1px solid var(--glass-border)", background: feedbackCategory === cat ? "var(--pill)" : "transparent", color: feedbackCategory === cat ? "var(--text)" : "var(--text2)" }}
                      >{cat}</button>
                    ))}
                  </div>
                  <button onClick={() => setFeedbackStep(0)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 11, fontFamily: "var(--font)" }}>← Back</button>
                </div>
              )}
              {feedbackStep === 2 && (
                <div style={{ animation: "fadeUp .3s ease" }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "var(--pill)", color: "var(--text)" }}>{["😟","😕","😐","😊","🤩"][feedbackRating-1]} {feedbackRating}/5</span>
                    <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "var(--glass)", color: "var(--text2)", border: "1px solid var(--glass-border)" }}>{feedbackCategory}</span>
                  </div>
                  <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder="What's on your mind? Be as brief or detailed as you like…" className="gin" rows={3} style={{ minHeight: 80, marginBottom: 12, fontSize: 13 }}/>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button onClick={() => setFeedbackStep(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 11, fontFamily: "var(--font)" }}>← Back</button>
                    <button onClick={async () => { setFeedbackSending(true); await submitFeedback(feedbackRating, feedbackCategory, feedbackMessage); loadFeedbackReport(); setTimeout(() => { setFeedbackSending(false); setFeedbackStep(3); }, 500); }} disabled={feedbackSending}
                      className="btn1" style={{ padding: "9px 20px", fontSize: 13, opacity: feedbackSending ? 0.7 : 1 }}>{feedbackSending ? "Sending…" : "Send Feedback"}</button>
                  </div>
                </div>
              )}
              {feedbackStep === 3 && (
                <div style={{ textAlign: "center", padding: "10px 0", animation: "fadeUp .3s ease" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Feedback sent!</p>
                  <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 14, lineHeight: 1.6 }}>Discovery Bank is a passion project built outside of work hours, so popular requests get shipped twice a month. You'll be notified by email when updates land.</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16, fontStyle: "italic" }}>— Damani</p>
                  <button onClick={() => { setFeedbackOpen(false); setFeedbackStep(0); }} className="btn2" style={{ margin: "0 auto", padding: "8px 18px", fontSize: 12 }}>Close</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
