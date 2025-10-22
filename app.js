const TONES = [
  "Samimi ama profesyonel","Resmi","Nötr","Öğretici","Cesaretlendirici",
  "Mizahi (dozunda)","Kısa ve net","Akademik","Hikâye anlatımı odaklı"
];
const STYLES = [
  "Adım adım","Madde işaretli","Özet + detay","Kod ağırlıklı","Tablo kullan","Soru-cevap","Örnek odaklı"
];

function val(id){ return document.getElementById(id).value.trim(); }
function checked(name){ return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(x=>x.value); }
function linesToList(text){ return text.split("\n").map(s=>s.trim()).filter(Boolean); }

function defaultQC(){
  return [
    "Yanıt hedef kitleye uygun mu?",
    "Talep edilen biçim ve uzunlukta mı?",
    "Varsayımlar belirtilmiş ve belirsizlikler sorulmuş mu?",
    "Somut, uygulanabilir çıktı içeriyor mu?"
  ];
}

function toSingleBlock(r){
  const parts = [];
  if (r.title) parts.push(`# ${r.title}`);
  parts.push(`ROL/PERSONA:\n${r.role_persona}`);
  parts.push(`AMAÇ:\n${r.objective}`);
  parts.push(
    `HEDEF KİTLE ve DİL:\n- Hedef kitle: ${r.audience}\n- Yanıt dili: ${r.language}`
  );
  const styleStr = r.style.length ? r.style.join(", ") : "Uygun gördüğün biçim";
  parts.push(
    `TON ve ÜSLUP:\n- Ton: ${r.tone}\n- Yazım/biçim: ${styleStr}\n- Tercih edilen çıktı formatı: ${r.output_format}\n- Yaklaşık uzunluk tercihi: ${r.length_pref}`
  );
  if (r.tools.length) parts.push(`ARAÇLAR/KABİLİYETLER:\n${r.tools.join(", ")}`);
  if (r.context) parts.push(`BAĞLAM/BİLGİ:\n${r.context}`);
  if (r.input_data) parts.push(`GİRDİ/VERİ:\n${r.input_data}`);

  const process = [];
  if (r.ask_clar) process.push("Eğer görev/bağlam belirsizse önce en fazla 3 netleştirici soru sor.");
  if (r.include_reasoning) process.push("Problemi çözmeden önce kısa bir plan yap ve çözümde adım adım ilerle.");
  else process.push("Gerekmedikçe içsel akıl yürütmeyi gösterme; nihai sonucu açık ve somut ver.");
  process.push("Yanıtta gereksiz tekrar ve dolgu yapma; öz ve eyleme dönük ol.");
  parts.push("SÜREÇ/ÇALIŞMA BİÇİMİ:\n- " + process.join("\n- "));

  if (r.references_required){
    parts.push("KAYNAK/KAYNAKÇA:\n" + (r.references_style || "Bağlantı (URL) ver, kaynağın güvenilirliğini belirt"));
  }
  if (r.constraints.length) parts.push("KISITLAR/KURALLAR:\n- " + r.constraints.join("\n- "));
  if (r.do_not_list.length) parts.push("YAPMA/KAÇIN:\n- " + r.do_not_list.join("\n- "));
  if (r.explicit_format_instructions) parts.push("ÇIKTI BİÇİM TALİMATLARI:\n" + r.explicit_format_instructions);

  if (r.examples.length){
    const ex = r.examples.map((e,i)=>`ÖRNEK ${i+1} - GİRİŞ:\n${e.input_text}\nÖRNEK ${i+1} - ÇIKIŞ:\n${e.output_text}`);
    parts.push("FEW-SHOT ÖRNEKLER:\n" + ex.join("\n\n"));
  }

  const qc = r.quality_checklist.length ? r.quality_checklist : defaultQC();
  parts.push("KABUL KRİTERLERİ (yanıtın sağlaması gerekenler):\n- " + (r.acceptance_criteria.length ? r.acceptance_criteria.join("\n- ") : "—"));
  parts.push("KALİTE KONTROL — Göndermeden önce kontrol et:\n- " + qc.join("\n- "));
  if (r.additional_instructions) parts.push("EK TALİMATLAR:\n" + r.additional_instructions);
  return parts.join("\n\n");
}

function toOpenAIMessages(r){
  const systemLines = [];
  systemLines.push(`Rol/Persona: ${r.role_persona}`);
  systemLines.push(`Hedef kitle: ${r.audience}`);
  systemLines.push(`Dil: ${r.language}`);
  systemLines.push(`Ton: ${r.tone}`);
  const styleStr = r.style.length ? r.style.join(", ") : "Uygun gördüğün biçim";
  systemLines.push(`Üslup: ${styleStr}`);
  if (r.tools.length) systemLines.push(`Araçlar/kabiliyetler: ${r.tools.join(", ")}`);
  if (r.constraints.length) systemLines.push("Kurallar:\n- " + r.constraints.join("\n- "));
  if (r.do_not_list.length) systemLines.push("Kaçın:\n- " + r.do_not_list.join("\n- "));
  if (r.references_required) systemLines.push("Kaynakça politikası: " + (r.references_style || "Bağlantı (URL) ver, kaynağın güvenilirliğini belirt"));
  if (r.additional_instructions) systemLines.push("Ek talimatlar: " + r.additional_instructions);

  const userLines = [];
  userLines.push(`Amaç/Görev: ${r.objective}`);
  if (r.context) userLines.push("Bağlam:\n" + r.context);
  if (r.input_data) userLines.push("Girdi/Veri:\n" + r.input_data);
  if (r.ask_clar) userLines.push("Belirsizse önce en fazla 3 netleştirici soru sor.");
  if (r.include_reasoning) userLines.push("Planını kısaca yap ve adım adım ilerle.");
  else userLines.push("Gerekmedikçe içsel akıl yürütmeyi gösterme; net sonuca odaklan.");
  userLines.push(`Çıktı formatı: ${r.output_format}. Uzunluk: ${r.length_pref}.`);
  if (r.explicit_format_instructions) userLines.push("Çıktı biçim talimatları:\n" + r.explicit_format_instructions);
  if (r.acceptance_criteria.length) userLines.push("Kabul kriterleri:\n- " + r.acceptance_criteria.join("\n- "));
  if (r.examples.length){
    const ex = r.examples.map((e,i)=>`[Örnek ${i+1} — Girdi]\n${e.input_text}\n[Örnek ${i+1} — Çıktı]\n${e.output_text}`);
    userLines.push("Örnekler:\n" + ex.join("\n\n"));
  }

  return [
    { role: "system", content: systemLines.join("\n") },
    { role: "user", content: userLines.join("\n\n") }
  ];
}

function toClaudePrompt(r){
  const styleStr = r.style.length ? r.style.join(", ") : "Uygun gördüğün biçim";
  let header = `You are: ${r.role_persona}\nAudience: ${r.audience}\nLanguage: ${r.language}\nTone: ${r.tone}\nStyle: ${styleStr}\n`;
  let rules = "";
  if (r.constraints.length) rules += "Rules:\n- " + r.constraints.join("\n- ") + "\n";
  if (r.do_not_list.length) rules += "Avoid:\n- " + r.do_not_list.join("\n- ") + "\n";
  if (r.references_required) rules += `References: ${r.references_style || "Provide URLs and mention source credibility"}\n`;
  const proc = [];
  if (r.ask_clar) proc.push("If unclear, ask up to 3 clarifying questions first.");
  if (r.include_reasoning) proc.push("Plan briefly and proceed step-by-step.");
  else proc.push("Do not expose chain-of-thought; provide final answers.");
  proc.push(`Output format: ${r.output_format}, Length: ${r.length_pref}.`);
  if (r.explicit_format_instructions) proc.push("Formatting Instructions:\n" + r.explicit_format_instructions);

  let body = `Objective:\n${r.objective}\n\n`;
  if (r.context) body += `Context:\n${r.context}\n\n`;
  if (r.input_data) body += `Input Data:\n${r.input_data}\n\n`;

  if (r.examples.length){
    const ex = r.examples.map((e,i)=>`Example ${i+1} — Input:\n${e.input_text}\nExample ${i+1} — Output:\n${e.output_text}`);
    body += "Few-shot Examples:\n" + ex.join("\n\n") + "\n\n";
  }

  const qc = r.quality_checklist.length ? r.quality_checklist : ["Meets format and length","Suited to audience","Concrete and actionable"];
  body += "Quality Checklist (self-check before finalizing):\n- " + qc.join("\n- ") + "\n";
  return header + rules + proc.join("\n") + "\n\n" + body;
}

function collectRecipe(){
  return {
    title: val("title"),
    role_persona: val("role_persona"),
    objective: val("objective"),
    audience: val("audience"),
    language: val("language") || "Türkçe",
    tone: document.getElementById("tone").value,
    style: checked("style"),
    output_format: document.getElementById("output_format").value,
    length_pref: document.getElementById("length_pref").value,
    ask_clar: document.getElementById("ask_clar").checked,
    include_reasoning: document.getElementById("include_reasoning").checked,
    constraints: linesToList(val("constraints")),
    do_not_list: linesToList(val("do_not_list")),
    references_required: document.getElementById("references_required").checked,
    references_style: val("references_style"),
    tools: checked("tools"),
    context: val("context"),
    input_data: val("input_data"),
    explicit_format_instructions: val("explicit_format_instructions"),
    acceptance_criteria: linesToList(val("acceptance_criteria")),
    quality_checklist: linesToList(val("quality_checklist")),
    examples: Array.from(document.querySelectorAll(".example")).map(box=>{
      return {
        input_text: box.querySelector(".example-input").value.trim(),
        output_text: box.querySelector(".example-output").value.trim()
      };
    }).filter(e=>e.input_text || e.output_text),
    additional_instructions: val("additional_instructions"),
    target_platform: document.getElementById("target_platform").value
  };
}

function render(){
  const r = collectRecipe();
  const single = toSingleBlock(r);
  const openai = JSON.stringify(toOpenAIMessages(r), null, 2);
  const claude = toClaudePrompt(r);
  setCode("#single-block-output", single);
  setCode("#openai-json-output", openai);
  setCode("#claude-output", claude);
  localStorage.setItem("promptWizardState", JSON.stringify(r));
  setStatus("Önizleme güncellendi ✔");
}

function setCode(selector, text){
  const el = document.querySelector(selector);
  el.textContent = text;
}

function setStatus(msg){
  const s = document.getElementById("status");
  s.textContent = msg;
  if (!msg) return;
  setTimeout(()=>{ s.textContent=""; }, 2000);
}

function addExample(input="", output=""){
  const wrap = document.createElement("div");
  wrap.className = "example example-block";
  wrap.innerHTML = `
    <div class="row">
      <div class="field">
        <label>Örnek GİRİŞ</label>
        <textarea class="example-input" rows="3" placeholder="Örnek girdi..."></textarea>
      </div>
      <div class="field">
        <label>Örnek ÇIKIŞ</label>
        <textarea class="example-output" rows="3" placeholder="Örnek çıktı..."></textarea>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:6px">
      <button type="button" class="remove-example">Sil</button>
    </div>
  `;
  wrap.querySelector(".example-input").value = input;
  wrap.querySelector(".example-output").value = output;
  wrap.querySelector(".remove-example").addEventListener("click", ()=>{
    wrap.remove();
    render();
  });
  document.getElementById("examples").appendChild(wrap);
}

function copyFrom(selector){
  const el = document.querySelector(selector);
  const text = el.textContent;
  navigator.clipboard.writeText(text).then(()=> setStatus("Kopyalandı ✔"));
}

function downloadFrom(selector, ext){
  const el = document.querySelector(selector);
  const text = el.textContent;
  const nameBase = (document.getElementById("title").value || document.getElementById("objective").value || "prompt").toLowerCase()
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s-]/gi,"").replace(/\s+/g,"-").slice(0,60) || "prompt";
  const ts = new Date().toISOString().replace(/[-:T]/g,"").slice(0,15);
  const fileName = `${nameBase}_${ts}.${ext}`;
  const blob = new Blob([text], {type: "text/plain;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  setStatus(`${fileName} indirildi ✔`);
}

function resetForm(){
  document.getElementById("wizard-form").reset();
  document.getElementById("examples").innerHTML = "";
  localStorage.removeItem("promptWizardState");
  render();
}

// Event bindings
document.getElementById("generate").addEventListener("click", render);
document.getElementById("reset").addEventListener("click", resetForm);
document.getElementById("add-example").addEventListener("click", ()=>{ addExample(); });

document.querySelectorAll("[data-copy]").forEach(btn=>{
  btn.addEventListener("click", ()=> copyFrom(btn.getAttribute("data-copy")));
});
document.querySelectorAll("[data-download]").forEach(btn=>{
  btn.addEventListener("click", ()=> downloadFrom(btn.getAttribute("data-download"), btn.getAttribute("data-ext")));
});

// Auto-load state
(function init(){
  try{
    const saved = localStorage.getItem("promptWizardState");
    if (saved){
      const r = JSON.parse(saved);
      const set = (id,v)=>{ if (document.getElementById(id)) document.getElementById(id).value = v ?? ""; };
      set("title", r.title);
      set("role_persona", r.role_persona);
      set("objective", r.objective);
      set("audience", r.audience);
      set("language", r.language);
      document.getElementById("tone").value = r.tone || "Samimi ama profesyonel";
      (r.style||[]).forEach(s=>{
        const cb = Array.from(document.querySelectorAll('input[name="style"]')).find(x=>x.value===s);
        if (cb) cb.checked = true;
      });
      document.getElementById("output_format").value = r.output_format || "Markdown";
      document.getElementById("length_pref").value = r.length_pref || "Orta";
      document.getElementById("ask_clar").checked = !!r.ask_clar;
      document.getElementById("include_reasoning").checked = !!r.include_reasoning;
      set("constraints", (r.constraints||[]).join("\n"));
      set("do_not_list", (r.do_not_list||[]).join("\n"));
      document.getElementById("references_required").checked = !!r.references_required;
      set("references_style", r.references_style);
      (r.tools||[]).forEach(t=>{
        const cb = Array.from(document.querySelectorAll('input[name="tools"]')).find(x=>x.value===t);
        if (cb) cb.checked = true;
      });
      set("context", r.context);
      set("input_data", r.input_data);
      set("explicit_format_instructions", r.explicit_format_instructions);
      set("acceptance_criteria", (r.acceptance_criteria||[]).join("\n"));
      set("quality_checklist", (r.quality_checklist||[]).join("\n"));
      (r.examples||[]).forEach(e=> addExample(e.input_text, e.output_text));
      set("additional_instructions", r.additional_instructions);
      document.getElementById("target_platform").value = r.target_platform || "Genel";
    }
  }catch(e){ console.warn("State load failed", e); }
  render();
})();