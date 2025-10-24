// Yardımcılar
const q = (s) => document.querySelector(s);
const qa = (s) => Array.from(document.querySelectorAll(s));
const val = (id) => document.getElementById(id).value.trim();
const lines = (t) => (t ? t.split("\n").map(s => s.trim()).filter(Boolean) : []);
const checked = (name) => qa(`input[name="${name}"]:checked`).map(x => x.value);

function defaultQC(){
  return [
    "Yanıt hedef kitleye uygun mu?",
    "Talep edilen biçim ve uzunlukta mı?",
    "Varsayımlar belirtilmiş ve belirsizlikler sorulmuş mu?",
    "Somut, uygulanabilir çıktı içeriyor mu?"
  ];
}

// Prompt üreticiler
function toSingleBlock(r){
  const parts=[];
  if(r.title) parts.push("# "+r.title);
  parts.push("ROL/PERSONAL:\n"+r.role_personal);
  parts.push("AMAÇ:\n"+r.objective);
  parts.push("HEDEF KİTLE ve DİL:\n- Hedef kitle: "+r.audience+"\n- Yanıt dili: "+r.language+"\n- Dil düzeyi: "+(r.language_level||"—"));
  const styleStr=r.style.length?r.style.join(", "):"Uygun gördüğün biçim";
  parts.push("TON ve ÜSLUP:\n- Ton: "+r.tone+"\n- Yazım/biçim: "+styleStr+"\n- Tercih edilen çıktı formatı: "+r.output_format+"\n- Yaklaşık uzunluk tercihi: "+r.length_pref);
  if(r.tools.length) parts.push("ARAÇLAR/KABİLİYETLER:\n"+r.tools.join(", "));
  if(r.context) parts.push("BAĞLAM/BİLGİ:\n"+r.context);
  if(r.input_data) parts.push("GİRDİ/VERİ:\n"+r.input_data);
  if(r.keywords?.length) parts.push("ANAHTAR KELİMELER:\n- "+r.keywords.join("\n- "));
  if(r.sections?.length) parts.push("İSTENEN BÖLÜMLER/BAŞLIKLAR:\n- "+r.sections.join("\n- "));
  const proc=[];
  if(r.ask_clar) proc.push("Eğer görev/bağlam belirsizse önce en fazla 3 netleştirici soru sor.");
  if(r.include_reasoning) proc.push("Problemi çözmeden önce kısa bir plan yap ve çözümde adım adım ilerle.");
  else proc.push("Gerekmedikçe içsel akıl yürütmeyi gösterme; nihai sonucu açık ve somut ver.");
  proc.push("Yanıtta gereksiz tekrar ve dolgu yapma; öz ve eyleme dönük ol.");
  parts.push("SÜREÇ/ÇALIŞMA BİÇİMİ:\n- "+proc.join("\n- "));
  if(r.references_required) parts.push("KAYNAK/KAYNAKÇA:\n"+(r.references_style||"Bağlantı (URL) ver, kaynağın güvenilirliğini belirt"));
  if(r.constraints.length) parts.push("KISITLAR/KURALLAR:\n- "+r.constraints.join("\n- "));
  if(r.do_not_list.length) parts.push("YAPMA/KAÇIN:\n- "+r.do_not_list.join("\n- "));
  if(r.explicit_format_instructions) parts.push("ÇIKTI BİÇİM TALİMATLARI:\n"+r.explicit_format_instructions);
  if(r.examples.length){
    const ex=r.examples.map((e,i)=>"ÖRNEK "+(i+1)+" - GİRİŞ:\n"+e.input_text+"\nÖRNEK "+(i+1)+" - ÇIKIŞ:\n"+e.output_text);
    parts.push("FEW-SHOT ÖRNEKLER:\n"+ex.join("\n\n"));
  }
  const qc=r.quality_checklist.length?r.quality_checklist:defaultQC();
  parts.push("KABUL KRİTERLERİ (yanıtın sağlaması gerekenler):\n- "+(r.acceptance_criteria.length?r.acceptance_criteria.join("\n- "):"—"));
  parts.push("KALİTE KONTROL — Göndermeden önce kontrol et:\n- "+qc.join("\n- "));
  if(r.additional_instructions) parts.push("EK TALİMATLAR:\n"+r.additional_instructions);
  return parts.join("\n\n");
}

function toOpenAIMessages(r){
  const systemLines=[];
  systemLines.push("Rol/Personal: "+r.role_personal);
  systemLines.push("Hedef kitle: "+r.audience);
  systemLines.push("Dil: "+r.language+" (Düzey: "+(r.language_level||"—")+")");
  systemLines.push("Ton: "+r.tone);
  const styleStr=r.style.length?r.style.join(", "):"Uygun gördüğün biçim";
  systemLines.push("Üslup: "+styleStr);
  if(r.tools.length) systemLines.push("Araçlar/kabiliyetler: "+r.tools.join(", "));
  if(r.constraints.length) systemLines.push("Kurallar:\n- "+r.constraints.join("\n- "));
  if(r.do_not_list.length) systemLines.push("Kaçın:\n- "+r.do_not_list.join("\n- "));
  if(r.references_required) systemLines.push("Kaynakça politikası: "+(r.references_style||"Bağlantı (URL) ver, kaynağın güvenilirliğini belirt"));
  if(r.additional_instructions) systemLines.push("Ek talimatlar: "+r.additional_instructions);

  const userLines=[];
  userLines.push("Amaç/Görev: "+r.objective);
  if(r.context) userLines.push("Bağlam:\n"+r.context);
  if(r.input_data) userLines.push("Girdi/Veri:\n"+r.input_data);
  if(r.keywords?.length) userLines.push("Anahtar kelimeler:\n- "+r.keywords.join("\n- "));
  if(r.sections?.length) userLines.push("İstenen bölümler/başlıklar:\n- "+r.sections.join("\n- "));
  if(r.ask_clar) userLines.push("Belirsizse önce en fazla 3 netleştirici soru sor.");
  if(r.include_reasoning) userLines.push("Planını kısaca yap ve adım adım ilerle.");
  else userLines.push("Gerekmedikçe içsel akıl yürütmeyi gösterme; net sonuca odaklan.");
  userLines.push("Çıktı formatı: "+r.output_format+". Uzunluk: "+r.length_pref+".");
  if(r.explicit_format_instructions) userLines.push("Çıktı biçim talimatları:\n"+r.explicit_format_instructions);
  if(r.acceptance_criteria.length) userLines.push("Kabul kriterleri:\n- "+r.acceptance_criteria.join("\n- "));
  if(r.examples.length){
    const ex=r.examples.map((e,i)=>"[Örnek "+(i+1)+" — Girdi]\n"+e.input_text+"\n[Örnek "+(i+1)+" — Çıktı]\n"+e.output_text);
    userLines.push("Örnekler:\n"+ex.join("\n\n"));
  }
  return [
    { role: "system", content: systemLines.join("\n") },
    { role: "user", content: userLines.join("\n\n") }
  ];
}

function toClaudePrompt(r){
  const styleStr=r.style.length?r.style.join(", "):"Uygun gördüğün biçim";
  let header =
`Rol: ${r.role_personal}
Hedef kitle: ${r.audience}
Dil: ${r.language} (Düzey: ${r.language_level||"—"})
Ton: ${r.tone}
Üslup: ${styleStr}
`;
  let rules="";
  if(r.constraints.length) rules += "Kurallar:\n- " + r.constraints.join("\n- ") + "\n";
  if(r.do_not_list.length) rules += "Kaçın:\n- " + r.do_not_list.join("\n- ") + "\n";
  if(r.references_required) rules += "Kaynakça politikası: " + (r.references_style||"Bağlantı (URL) ver, kaynağın güvenilirliğini belirt") + "\n";

  const proc=[];
  if(r.ask_clar) proc.push("Belirsizse önce en fazla 3 netleştirici soru sor.");
  if(r.include_reasoning) proc.push("Kısa bir plan yap ve adım adım ilerle.");
  else proc.push("İç düşünce zincirini paylaşma; doğrudan, net sonuç ver.");
  proc.push("Çıktı biçimi: "+r.output_format+", Uzunluk: "+r.length_pref+".");
  if(r.explicit_format_instructions) proc.push("Biçim talimatları:\n"+r.explicit_format_instructions);

  let body = "Amaç:\n"+r.objective+"\n\n";
  if(r.context) body += "Bağlam:\n"+r.context+"\n\n";
  if(r.input_data) body += "Girdi/Veri:\n"+r.input_data+"\n\n";
  if(r.keywords?.length) body += "Anahtar kelimeler:\n- "+r.keywords.join("\n- ")+"\n\n";
  if(r.sections?.length) body += "İstenen bölümler/başlıklar:\n- "+r.sections.join("\n- ")+"\n\n";

  if(r.examples.length){
    const ex=r.examples.map((e,i)=>`Örnek ${i+1} — Girdi:
${e.input_text}
Örnek ${i+1} — Çıktı:
${e.output_text}`);
    body += "Few-shot Örnekler:\n" + ex.join("\n\n") + "\n\n";
  }

  const qc = r.quality_checklist?.length ? r.quality_checklist
            : ["Biçim ve uzunluğa uyum","Hedef kitleye uygunluk","Somut ve uygulanabilir öneriler"];
  body += "Kalite Kontrol (sonlandırmadan önce):\n- " + qc.join("\n- ") + "\n";

  return header + rules + proc.join("\n") + "\n\n" + body;
}

// Form -> model
function collectRecipe(){
  return {
    title: val("title"),
    role_personal: val("role_personal"),
    objective: val("objective"),
    audience: val("audience"),
    language: val("language") || "Türkçe",
    language_level: q("#language_level").value,
    tone: q("#tone").value,
    style: checked("style"),
    output_format: q("#output_format").value,
    length_pref: q("#length_pref").value,
    ask_clar: q("#ask_clar").checked,
    include_reasoning: q("#include_reasoning").checked,
    constraints: lines(val("constraints")),
    do_not_list: lines(val("do_not_list")),
    references_required: q("#references_required").checked,
    references_style: val("references_style"),
    tools: checked("tools"),
    context: val("context"),
    input_data: val("input_data"),
    keywords: lines(val("keywords")),
    sections: lines(val("sections")),
    explicit_format_instructions: val("explicit_format_instructions"),
    acceptance_criteria: lines(val("acceptance_criteria")),
    quality_checklist: lines(val("quality_checklist")),
    examples: qa(".example").map(box=>({
      input_text: box.querySelector(".example-input").value.trim(),
      output_text: box.querySelector(".example-output").value.trim()
    })).filter(e=>e.input_text || e.output_text),
    additional_instructions: val("additional_instructions"),
    target_platform: q("#target_platform").value
  };
}

// UI yardımcıları
function setCode(sel,text){ const el=q(sel); if(el) el.textContent=text||""; }
function setStatus(msg){ const s=q("#status"); s.textContent=msg||""; if(!msg) return; setTimeout(()=>{s.textContent=""},2000); }
function updateChipActive(){ qa(".chips label").forEach(lbl=>{ const inp=lbl.querySelector("input[type=checkbox]"); lbl.classList.toggle("active", !!(inp && inp.checked)); }); }

function render(){
  const r=collectRecipe();
  setCode("#single-block-output", toSingleBlock(r));
  setCode("#openai-json-output", JSON.stringify(toOpenAIMessages(r), null, 2));
  setCode("#claude-output", toClaudePrompt(r));
  localStorage.setItem("promptWizardState", JSON.stringify(r));
  updateChipActive();
  setStatus("Önizleme güncellendi ✔");
}

function addExample(input="", output=""){
  const wrap=document.createElement("div");
  wrap.className="example example-block";
  wrap.innerHTML=`
    <div class="row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
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
    </div>`;
  wrap.querySelector(".example-input").value=input;
  wrap.querySelector(".example-output").value=output;
  wrap.querySelector(".remove-example").addEventListener("click", ()=>{ wrap.remove(); render(); });
  q("#examples").appendChild(wrap);
}

function copyFrom(selector){
  const text=q(selector).textContent;
  if(!text) return;
  navigator.clipboard.writeText(text).then(()=> setStatus("Kopyalandı ✔"));
}
function downloadFrom(selector, ext){
  const text=q(selector).textContent;
  const nameBase=(val("title") || val("objective") || "prompt").toLowerCase()
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s-]/gi,"").replace(/\s+/g,"-").slice(0,60) || "prompt";
  const ts=new Date().toISOString().replace(/[-:T]/g,"").slice(0,15);
  const fileName=`${nameBase}_${ts}.${ext}`;
  const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=fileName;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  setStatus(`${fileName} indirildi ✔`);
}

function deleteAll(){
  const f = q("#wizard-form");

  // Alanları tamamen boşalt
  f.reset();
  qa('input[type="text"], textarea').forEach(el => el.value = "");
  qa('input[type="checkbox"]').forEach(el => el.checked = false);
  qa('select').forEach(el => el.selectedIndex = 0);
  q("#examples").innerHTML="";

  // Çıktılar + storage temizle
  ["#single-block-output","#openai-json-output","#claude-output"].forEach(sel=> setCode(sel,""));
  localStorage.removeItem("promptWizardState");

  updateChipActive();
  setStatus("Her şey temizlendi ✔");
}

// Event bağlama
document.addEventListener("DOMContentLoaded", ()=>{
  // Butonlar
  q("#generate").addEventListener("click", render);
  q("#delete-all").addEventListener("click", deleteAll);
  q("#add-example").addEventListener("click", ()=> addExample());

  // Delegasyon: kopya/indir
  document.addEventListener("click",(e)=>{
    const btn=e.target.closest("[data-copy]");
    if(btn){ e.preventDefault(); copyFrom(btn.getAttribute("data-copy")); }
    const dbtn=e.target.closest("[data-download]");
    if(dbtn){ e.preventDefault(); downloadFrom(dbtn.getAttribute("data-download"), dbtn.getAttribute("data-ext")); }
  });

  // Otomatik render
  document.addEventListener("input",(e)=>{
    if(e.target.matches("input, textarea, select")){ render(); }
  });
  document.addEventListener("change",(e)=>{
    if(e.target.matches("input, textarea, select")){ render(); }
  });

  // State yükle
  try{
    const saved=localStorage.getItem("promptWizardState");
    if(saved){
      const r=JSON.parse(saved);
      const set=(id,v)=>{ const el=document.getElementById(id); if(el!=null) el.value=(v ?? ""); };
      set("title", r.title);
      set("role_personal", r.role_personal || r.role_persona || "");
      set("objective", r.objective);
      set("audience", r.audience);
      set("language", r.language);
      q("#language_level").value = r.language_level || "Orta";
      q("#tone").value = r.tone || "Samimi ama profesyonel";
      (r.style||[]).forEach(s=>{
        const cb=qa('input[name="style"]').find(x=>x.value===s);
        if(cb) cb.checked=true;
      });
      q("#output_format").value=r.output_format || "Markdown";
      q("#length_pref").value=r.length_pref || "Orta";
      q("#ask_clar").checked=!!r.ask_clar;
      q("#include_reasoning").checked=!!r.include_reasoning;
      set("constraints", (r.constraints||[]).join("\n"));
      set("do_not_list", (r.do_not_list||[]).join("\n"));
      q("#references_required").checked=!!r.references_required;
      set("references_style", r.references_style);
      (r.tools||[]).forEach(t=>{
        const cb=qa('input[name="tools"]').find(x=>x.value===t);
        if(cb) cb.checked=true;
      });
      set("context", r.context);
      set("input_data", r.input_data);
      set("keywords", (r.keywords||[]).join("\n"));
      set("sections", (r.sections||[]).join("\n"));
      set("explicit_format_instructions", r.explicit_format_instructions);
      set("acceptance_criteria", (r.acceptance_criteria||[]).join("\n"));
      set("quality_checklist", (r.quality_checklist||[]).join("\n"));
      (r.examples||[]).forEach(e=> addExample(e.input_text, e.output_text));
      set("additional_instructions", r.additional_instructions);
      q("#target_platform").value=r.target_platform || "Genel";
    }else{
      // İstersen varsayılan iki üslup seçili kalsın; yoksa hepsini boş bırak
      // qa('input[name="style"]').forEach(x=> x.checked=false);
    }
  }catch(e){ console.warn("State load failed", e); }

  updateChipActive();
  render(); // başlangıçta önizleme
});
