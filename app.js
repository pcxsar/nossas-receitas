/* =====================================================
   Nossas Receitas — Paulo & Julia
   Guardado no localStorage deste navegador. Sincronização
   entre aparelhos (Firebase) pode ser plugada depois, quando
   tiver um projeto Firebase criado — a estrutura já separa
   os dados (loadX/saveXLocal) pra isso ser fácil de encaixar.
===================================================== */

/* =====================================================
   Helpers gerais
===================================================== */
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
function normalizeTitle(t){
  return (t || '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
function iconHtml(name, cls){
  return `<svg class="icon${cls ? ' '+cls : ''}"><use href="#i-${name}"/></svg>`;
}
function linesFrom(text){
  return (text || '').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
}
const posterPlaceholderHTML = `<div class="r-poster-placeholder">${iconHtml('utensils')}</div>`;

/* =====================================================
   Categorias (agrupadas em Salgados / Doces / Bebidas)
===================================================== */
const CATEGORY_GROUPS = [
  {id:'salgados', icon:'utensils', label:'Salgados'},
  {id:'doces', icon:'cake', label:'Doces'},
  {id:'bebidas', icon:'cup-soda', label:'Bebidas'},
];
const CATEGORIES = [
  {id:'prato', group:'salgados', icon:'soup', label:'Prato principal', color:'#d97a4d'},
  {id:'lanche', group:'salgados', icon:'sandwich', label:'Lanche', color:'#c9793f'},
  {id:'petisco', group:'salgados', icon:'drumstick', label:'Petisco', color:'#b8622e'},
  {id:'acompanhamento', group:'salgados', icon:'salad', label:'Acompanhamento', color:'#8a9a4f'},
  {id:'bolo', group:'doces', icon:'cake', label:'Bolo/Torta', color:'#d9667a'},
  {id:'sobremesa', group:'doces', icon:'ice-cream-bowl', label:'Sobremesa', color:'#c94f7a'},
  {id:'gelado', group:'doces', icon:'ice-cream-cone', label:'Doce gelado', color:'#b83f7a'},
  {id:'bebida', group:'bebidas', icon:'cup-soda', label:'Bebida', color:'#a884c9'},
];
function categoryGroupById(id){ return CATEGORY_GROUPS.find(g => g.id === id) || null; }
function categoryById(id){ return CATEGORIES.find(c => c.id === id) || null; }
function categoryChipHtml(id){
  const c = categoryById(id);
  if(!c) return '';
  return `<span class="rc-genre-chip" style="background:${c.color}22; color:${c.color};">${iconHtml(c.icon)} ${escapeHtml(c.label)}</span>`;
}

// Fábrica de dropdown de categoria, agrupado por Salgados/Doces (single-select)
function createCategoryDropdown(mountEl, opts){
  const { allLabel, onSelect } = opts;
  mountEl.innerHTML = `
    <div class="genre-dropdown">
      <button type="button" class="genre-dropdown-btn">
        <span class="gd-label">${escapeHtml(allLabel)}</span>
        <span class="gd-arrow">▾</span>
      </button>
      <div class="genre-dropdown-menu"></div>
    </div>`;
  const root = mountEl.querySelector('.genre-dropdown');
  const btn = root.querySelector('.genre-dropdown-btn');
  const labelEl = root.querySelector('.gd-label');
  const menu = root.querySelector('.genre-dropdown-menu');
  let value = null;

  const allOpt = document.createElement('div');
  allOpt.className = 'gd-option';
  allOpt.dataset.cat = '';
  allOpt.textContent = allLabel;
  menu.appendChild(allOpt);

  CATEGORY_GROUPS.forEach(group=>{
    const label = document.createElement('div');
    label.className = 'gd-group-label';
    label.innerHTML = `${iconHtml(group.icon)} ${escapeHtml(group.label)}`;
    menu.appendChild(label);
    CATEGORIES.filter(c => c.group === group.id).forEach(c=>{
      const opt = document.createElement('div');
      opt.className = 'gd-option';
      opt.dataset.cat = c.id;
      opt.innerHTML = `<span class="gd-dot" style="background:${c.color}"></span>${iconHtml(c.icon)} ${escapeHtml(c.label)}`;
      menu.appendChild(opt);
    });
  });

  function setValue(v){
    value = v || null;
    const c = categoryById(value);
    labelEl.innerHTML = c ? (iconHtml(c.icon) + ' ' + escapeHtml(c.label)) : escapeHtml(allLabel);
    labelEl.style.color = c ? c.color : '';
    [...menu.querySelectorAll('.gd-option')].forEach(opt=>{
      const active = (opt.dataset.cat || '') === (value || '');
      opt.classList.toggle('active', active);
      const oc = categoryById(opt.dataset.cat);
      if(active && oc){ opt.style.background = oc.color + '22'; opt.style.color = oc.color; }
      else { opt.style.background = ''; opt.style.color = ''; }
    });
  }
  [...menu.querySelectorAll('.gd-option')].forEach(opt=>{
    opt.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      setValue(opt.dataset.cat || null);
      root.classList.remove('open');
      if(onSelect) onSelect(value);
    });
  });
  btn.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    document.querySelectorAll('.genre-dropdown.open').forEach(d=>{ if(d!==root) d.classList.remove('open'); });
    root.classList.toggle('open');
  });
  setValue(null);
  return { setValue, getValue: ()=>value, close: ()=> root.classList.remove('open') };
}

document.addEventListener('click', ()=>{
  document.querySelectorAll('.genre-dropdown.open').forEach(d=> d.classList.remove('open'));
});
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape'){
    document.querySelectorAll('.genre-dropdown.open').forEach(d=> d.classList.remove('open'));
  }
});

// Navegação por seções (Todas / Salgados / Doces / Bebidas) — usada na
// listagem/filtro das receitas. Ao escolher uma seção, revela um segundo
// nível de chips com os tipos daquele grupo (só se tiver mais de um).
function createCategorySections(mountEl, opts){
  const { onChange } = opts;
  mountEl.innerHTML = `
    <div class="cat-groups">
      <button type="button" class="cat-group-btn active" data-group="">Todas as receitas</button>
      ${CATEGORY_GROUPS.map(g => `<button type="button" class="cat-group-btn" data-group="${g.id}">${iconHtml(g.icon)} ${escapeHtml(g.label)}</button>`).join('')}
    </div>
    <div class="chip-row cat-type-row" style="display:none;"></div>
  `;
  const groupBtns = [...mountEl.querySelectorAll('.cat-group-btn')];
  const typeRow = mountEl.querySelector('.cat-type-row');
  let activeGroup = null;
  let activeType = null;

  function renderTypeRow(){
    const types = activeGroup ? CATEGORIES.filter(c => c.group === activeGroup) : [];
    if(!activeGroup || types.length < 2){
      typeRow.style.display = 'none';
      typeRow.innerHTML = '';
      return;
    }
    typeRow.style.display = 'flex';
    typeRow.innerHTML = `
      <div class="toggle-chip${activeType ? '' : ' active'}" data-type="">Tudo</div>
      ${types.map(c => `<div class="toggle-chip${activeType===c.id ? ' active' : ''}" data-type="${c.id}">${iconHtml(c.icon)} ${escapeHtml(c.label)}</div>`).join('')}
    `;
    [...typeRow.querySelectorAll('.toggle-chip')].forEach(chip=>{
      chip.addEventListener('click', ()=>{
        activeType = chip.dataset.type || null;
        renderTypeRow();
        if(onChange) onChange(activeGroup, activeType);
      });
    });
  }

  groupBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      activeGroup = btn.dataset.group || null;
      activeType = null;
      groupBtns.forEach(b => b.classList.toggle('active', b === btn));
      renderTypeRow();
      if(onChange) onChange(activeGroup, activeType);
    });
  });

  return {
    getGroup: ()=>activeGroup,
    getType: ()=>activeType,
  };
}

/* =====================================================
   Extrator simples de ingredientes a partir de uma legenda
   colada (TikTok/Instagram) — heurística, não é IA: procura
   linhas com cara de ingrediente (marcador ou quantidade+unidade)
   e devolve como rascunho pra revisar antes de salvar.
===================================================== */
function extractIngredientLines(text){
  if(!text) return '';
  const bulletPattern = /^[-•*▪◦→✔✓]\s*/;
  const unitPattern = /(x[ií]caras?|xic\.?|colheres?|colh\.?|gramas?|\bg\b|\bgr\b|\bkg\b|\bml\b|\bl\b|litros?|unidades?|\bun\.?|dentes?|fatias?|pitadas?|copos?|latas?|pacotes?|talos?|folhas?|ramos?)/i;
  const qtyStart = /^\s*\d+([.,/]\d+)?\s/;
  const fractionStart = /^[½¼¾⅓⅔⅛]/;
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const picked = lines.filter(line=>{
    const noBullet = line.replace(bulletPattern, '');
    if(bulletPattern.test(line)) return true;
    if(fractionStart.test(noBullet)) return true;
    if(qtyStart.test(noBullet) && (unitPattern.test(noBullet) || noBullet.length < 40)) return true;
    return false;
  });
  return picked.map(l => l.replace(bulletPattern, '').trim()).join('\n');
}

/* =====================================================
   Upload/compressão de foto (reaproveitado em receita e
   item "quero fazer")
===================================================== */
function readAndCompressImage(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDim = 640;
        let { width, height } = img;
        if(width > height && width > maxDim){ height = Math.round(height * maxDim/width); width = maxDim; }
        else if(height >= width && height > maxDim){ width = Math.round(width * maxDim/height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function setupPosterPicker(previewEl, fileInputEl, clearBtnEl){
  const state = { pending: undefined };
  function render(entry){
    if(entry && entry.poster){
      previewEl.innerHTML = `<img class="r-poster" src="${entry.poster}" alt="">`;
      clearBtnEl.style.display = 'block';
    } else {
      previewEl.innerHTML = posterPlaceholderHTML;
      clearBtnEl.style.display = 'none';
    }
  }
  fileInputEl.addEventListener('change', async ()=>{
    const file = fileInputEl.files && fileInputEl.files[0];
    if(!file) return;
    try{
      const dataUrl = await readAndCompressImage(file);
      state.pending = dataUrl;
      previewEl.innerHTML = `<img class="r-poster" src="${dataUrl}" alt="">`;
      clearBtnEl.style.display = 'block';
    }catch(err){
      console.warn('Falha ao processar imagem:', err);
    }
    fileInputEl.value = '';
  });
  clearBtnEl.addEventListener('click', ()=>{
    state.pending = null;
    previewEl.innerHTML = posterPlaceholderHTML;
    clearBtnEl.style.display = 'none';
  });
  return { render, state };
}

/* =====================================================
   RECEITAS — feitas
===================================================== */
const RECEITAS_STORAGE_KEY = 'nr-receitas-v2';

// Receitas fictícias só pra você ver o site populado de cara — edite ou
// apague à vontade, é só um ponto de partida.
const SEED_RECEITAS = [
  {id:'r1', title:'Frango à Parmegiana', category:'prato',
    ingredients:'2 filés de peito de frango\n1 xícara de farinha de rosca\n2 ovos\n1 xícara de molho de tomate\n200g de mussarela\nSal e pimenta a gosto',
    instructions:'Tempere o frango com sal e pimenta\nEmpane na farinha e depois no ovo batido\nFrite até dourar dos dois lados\nCubra com molho de tomate e a mussarela\nLeve ao forno até o queijo derreter',
    obs:'Ficou parecido com o do restaurante que a gente foi no aniversário. Repetir!', poster:null, addedAt: Date.now() - 86400000*3},
  {id:'r2', title:'Brigadeiro Gourmet', category:'sobremesa',
    ingredients:'1 lata de leite condensado\n1 colher de sopa de manteiga\n3 colheres de sopa de chocolate em pó\nChocolate granulado pra enrolar',
    instructions:'Leve o leite condensado, a manteiga e o chocolate ao fogo baixo\nMexa sem parar até desgrudar do fundo da panela\nDeixe esfriar completamente\nEnrole as bolinhas e passe no granulado',
    obs:'Vira sobremesa oficial de aniversário — os dois amaram.', poster:null, addedAt: Date.now() - 86400000*9},
  {id:'r3', title:'Misto Quente Especial', category:'lanche',
    ingredients:'4 fatias de pão de forma\n4 fatias de presunto\n4 fatias de queijo\n1 colher de sopa de manteiga',
    instructions:'Monte o sanduíche intercalando presunto e queijo\nPasse manteiga nas duas faces externas\nLeve à frigideira quente até dourar dos dois lados',
    obs:'Simples e rápido pra um lanche de sábado.', poster:null, addedAt: Date.now() - 86400000*15},
  {id:'r4', title:'Coxinha de Frango', category:'petisco',
    ingredients:'500g de frango desfiado\n2 xícaras de farinha de trigo\n1 xícara de caldo de galinha\n1 colher de sopa de manteiga\nFarinha de rosca pra empanar',
    instructions:'Ferva o caldo com a manteiga e adicione a farinha de uma vez\nMexa até formar uma massa lisa e deixe esfriar\nAbra porções da massa, recheie com o frango e molde em formato de gota\nEmpane na farinha de rosca e frite',
    obs:'Deu trabalho mas valeu — melhor que muita coxinha de festa por aí.', poster:null, addedAt: Date.now() - 86400000*21},
  {id:'r5', title:'Torta de Limão', category:'bolo',
    ingredients:'1 pacote de biscoito maisena\n100g de manteiga\n1 lata de leite condensado\nSuco de 3 limões\n1 caixa de creme de leite',
    instructions:'Triture o biscoito e misture com a manteiga derretida\nForre o fundo de uma forma e leve à geladeira por 15 minutos\nBata o leite condensado, o suco de limão e o creme de leite\nDespeje sobre a base e leve à geladeira por 3 horas',
    obs:'Julia pediu bis. Bom equilíbrio entre doce e azedinho.', poster:null, addedAt: Date.now() - 86400000*30},
  {id:'r6', title:'Suco Verde Detox', category:'bebida',
    ingredients:'1 folha de couve\n1 maçã\nSuco de 1 limão\n300ml de água gelada',
    instructions:'Lave bem a couve e a maçã\nBata tudo no liquidificador com a água\nCoe se preferir uma textura mais lisa',
    obs:'Bom pro café da manhã de segunda-feira.', poster:null, addedAt: Date.now() - 86400000*40},
];

function loadReceitas(){
  try{
    const raw = localStorage.getItem(RECEITAS_STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const seeded = SEED_RECEITAS.map(e=>({...e}));
  try{ localStorage.setItem(RECEITAS_STORAGE_KEY, JSON.stringify(seeded)); }catch(e){}
  return seeded;
}
function saveReceitasLocal(){
  localStorage.setItem(RECEITAS_STORAGE_KEY, JSON.stringify(receitas));
}
let receitas = loadReceitas();

function findDuplicateReceita(title, excludeId){
  const norm = normalizeTitle(title);
  if(!norm) return null;
  return receitas.find(e => e.id !== excludeId && normalizeTitle(e.title) === norm) || null;
}

const receitasGrid = document.getElementById('receitasGrid');
const receitasEmpty = document.getElementById('receitasEmpty');
const receitasSearch = document.getElementById('receitasSearch');
const RECEITAS_VIEW_KEY = 'nr-receitas-view';
let receitasView = localStorage.getItem(RECEITAS_VIEW_KEY) || 'mural';

function renderReceitas(){
  const q = receitasSearch.value.trim().toLowerCase();
  const activeGroup = receitasCategoryFilter.getGroup();
  const activeType = receitasCategoryFilter.getType();
  const filtered = receitas
    .filter(e => !q || e.title.toLowerCase().includes(q))
    .filter(e => !activeGroup || (categoryById(e.category) && categoryById(e.category).group === activeGroup))
    .filter(e => !activeType || e.category === activeType);
  const sorted = [...filtered].sort((a,b)=> b.addedAt - a.addedAt);
  receitasGrid.className = receitasView === 'mural' ? 'recipe-mural' : 'recipe-grid';
  receitasGrid.innerHTML = '';

  sorted.forEach(e=>{
    const cat = categoryById(e.category);
    const card = document.createElement('div');

    if(receitasView === 'mural'){
      card.className = 'recipe-mural-card';
      card.innerHTML = `
        <div class="pin"></div>
        <div class="polaroid">
          <div class="rm-poster">${e.poster ? `<img class="r-poster" src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">` : posterPlaceholderHTML}</div>
          <div class="polaroid-caption">${cat ? `<span class="rm-dot" style="background:${cat.color}"></span>` : ''}${escapeHtml(e.title)}</div>
        </div>
      `;
      card.addEventListener('click', ()=> openRecipeView(e, 'receita'));
      receitasGrid.appendChild(card);
      return;
    }

    card.className = 'recipe-card';
    if(cat) card.style.borderLeftColor = cat.color;
    card.innerHTML = `
      <div class="rc-poster">${e.poster ? `<img class="r-poster" src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">` : posterPlaceholderHTML}</div>
      <div class="rc-info">
        <div class="rc-title">${escapeHtml(e.title)}</div>
        ${cat ? categoryChipHtml(e.category) : ''}
      </div>
    `;
    card.addEventListener('click', ()=> openRecipeView(e, 'receita'));
    receitasGrid.appendChild(card);
  });

  receitasEmpty.style.display = sorted.length===0 ? 'block' : 'none';
}

const receitasViewToggle = document.getElementById('receitasViewToggle');
function updateReceitasViewToggle(){
  [...receitasViewToggle.children].forEach(btn=> btn.classList.toggle('active', btn.dataset.view === receitasView));
}
receitasViewToggle.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('.view-toggle-btn');
  if(!btn) return;
  receitasView = btn.dataset.view;
  localStorage.setItem(RECEITAS_VIEW_KEY, receitasView);
  updateReceitasViewToggle();
  renderReceitas();
});
updateReceitasViewToggle();

receitasSearch.addEventListener('input', renderReceitas);

const receitasCategoryFilter = createCategorySections(document.getElementById('receitasCategoryFilterRow'), {
  onChange: ()=> renderReceitas()
});

/* ---------- Modal de edição de receita ---------- */
const receitaModalOverlay = document.getElementById('receitaModalOverlay');
const receitaModalEyebrow = document.getElementById('receitaModalEyebrow');
const receitaTitleInput = document.getElementById('receitaTitleInput');
const receitaDupWarning = document.getElementById('receitaDupWarning');
const receitaIngredientsInput = document.getElementById('receitaIngredientsInput');
const receitaInstructionsInput = document.getElementById('receitaInstructionsInput');
const receitaObsInput = document.getElementById('receitaObsInput');
const receitaModalSave = document.getElementById('receitaModalSave');
const receitaModalRemove = document.getElementById('receitaModalRemove');
const receitaModalClose = document.getElementById('receitaModalClose');
const addReceitaBtn = document.getElementById('addReceitaBtn');
const receitaPosterPreview = document.getElementById('receitaPosterPreview');
const receitaPosterFile = document.getElementById('receitaPosterFile');
const receitaPosterClear = document.getElementById('receitaPosterClear');
const receitaPoster = setupPosterPicker(receitaPosterPreview, receitaPosterFile, receitaPosterClear);

const receitaCategoryPicker = createCategoryDropdown(document.getElementById('receitaCategoryRow'), {
  allLabel: 'Sem categoria'
});

let receitaEditId = null;
let convertingQueroFazerId = null;

function openReceitaModal(entry, prefill){
  receitaEditId = entry ? entry.id : null;
  receitaModalEyebrow.textContent = entry ? 'Editar receita' : 'Nova receita';
  receitaTitleInput.value = entry ? entry.title : ((prefill && prefill.title) || '');
  updateReceitaDupWarning();
  receitaCategoryPicker.setValue(entry ? entry.category : ((prefill && prefill.category) || null));
  receitaIngredientsInput.value = entry ? (entry.ingredients || '') : ((prefill && prefill.ingredients) || '');
  receitaInstructionsInput.value = entry ? (entry.instructions || '') : '';
  receitaObsInput.value = entry ? (entry.obs || '') : '';
  receitaModalRemove.style.display = entry ? 'block' : 'none';
  receitaModalOverlay.classList.add('open');
  receitaPoster.state.pending = undefined;
  receitaPoster.render(entry || (prefill && prefill.poster ? {poster: prefill.poster} : null));
  setTimeout(()=> receitaTitleInput.focus(), 150);
}
function closeReceitaModal(){
  receitaModalOverlay.classList.remove('open');
  receitaEditId = null;
  convertingQueroFazerId = null;
}
function updateReceitaDupWarning(){
  const dup = findDuplicateReceita(receitaTitleInput.value, receitaEditId);
  receitaDupWarning.style.display = dup ? 'block' : 'none';
}
receitaTitleInput.addEventListener('input', updateReceitaDupWarning);
addReceitaBtn.addEventListener('click', ()=> openReceitaModal(null));

receitaModalSave.addEventListener('click', ()=>{
  const title = receitaTitleInput.value.trim();
  if(!title){ receitaTitleInput.focus(); return; }
  const category = receitaCategoryPicker.getValue();
  const ingredients = receitaIngredientsInput.value.trim();
  const instructions = receitaInstructionsInput.value.trim();
  const obs = receitaObsInput.value.trim();

  let entryId = receitaEditId;
  let addedAt = Date.now();
  const pendingPoster = receitaPoster.state.pending;
  let poster = pendingPoster !== undefined ? pendingPoster : null;
  if(entryId){
    const entry = receitas.find(e => e.id === entryId);
    addedAt = entry ? entry.addedAt : Date.now();
    if(pendingPoster === undefined) poster = entry ? (entry.poster || null) : null;
    entry.title = title; entry.category = category;
    entry.ingredients = ingredients; entry.instructions = instructions; entry.obs = obs; entry.poster = poster;
  } else {
    entryId = 'r'+Date.now();
    receitas.push({ id:entryId, title, category, ingredients, instructions, obs, poster, addedAt });
  }
  saveReceitasLocal();

  const finishedConvertingId = convertingQueroFazerId;
  closeReceitaModal();
  renderReceitas();
  refreshInsights();
  if(finishedConvertingId) removeQueroFazerEntry(finishedConvertingId);
});

receitaModalRemove.addEventListener('click', ()=>{
  if(!receitaEditId) return;
  receitas = receitas.filter(e => e.id !== receitaEditId);
  saveReceitasLocal();
  closeReceitaModal();
  renderReceitas();
  refreshInsights();
});
receitaModalClose.addEventListener('click', closeReceitaModal);
receitaModalOverlay.addEventListener('click', (e)=>{ if(e.target === receitaModalOverlay) closeReceitaModal(); });

/* =====================================================
   QUERO FAZER — receitas guardadas pra experimentar
===================================================== */
const QUEROFAZER_STORAGE_KEY = 'nr-querofazer-v2';

// Itens fictícios só de exemplo — o "caption" mostra como fica depois de
// colar a legenda de um vídeo e usar o botão de extrair ingredientes.
const SEED_QUEROFAZER = [
  {id:'q1', title:'Nhoque de Batata Doce', category:'prato', videoUrl:'',
    caption:'NHOQUE DE BATATA DOCE que ninguém acredita que é fit 😍\n- 2 batatas doces médias\n- 1 xícara de farinha de trigo\n- 1 ovo\n- sal a gosto\nCozinhe, amasse, misture tudo e modele! Salva pra fazer no fim de semana',
    ingredients:'2 batatas doces médias\n1 xícara de farinha de trigo\n1 ovo\nsal a gosto', poster:null, addedAt: Date.now() - 86400000*2},
  {id:'q2', title:'Cookies Recheados', category:'sobremesa', videoUrl:'',
    caption:'', ingredients:'', poster:null, addedAt: Date.now() - 86400000*5},
  {id:'q3', title:'Pastel de Forno', category:'petisco', videoUrl:'',
    caption:'', ingredients:'', poster:null, addedAt: Date.now() - 86400000*8},
  {id:'q4', title:'Salada Caesar Caseira', category:'acompanhamento', videoUrl:'',
    caption:'', ingredients:'', poster:null, addedAt: Date.now() - 86400000*12},
];

function loadQueroFazer(){
  try{
    const raw = localStorage.getItem(QUEROFAZER_STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const seeded = SEED_QUEROFAZER.map(e=>({...e}));
  try{ localStorage.setItem(QUEROFAZER_STORAGE_KEY, JSON.stringify(seeded)); }catch(e){}
  return seeded;
}
function saveQueroFazerLocal(){
  localStorage.setItem(QUEROFAZER_STORAGE_KEY, JSON.stringify(queroFazer));
}
let queroFazer = loadQueroFazer();

function findDuplicateQueroFazer(title, excludeId){
  const norm = normalizeTitle(title);
  if(!norm) return null;
  return queroFazer.find(e => e.id !== excludeId && normalizeTitle(e.title) === norm) || null;
}

const QUEROFAZER_VIEW_KEY = 'nr-querofazer-view';
let queroFazerView = localStorage.getItem(QUEROFAZER_VIEW_KEY) || 'mural';

const querofazerGrid = document.getElementById('querofazerGrid');
const querofazerEmpty = document.getElementById('querofazerEmpty');
const querofazerSearch = document.getElementById('querofazerSearch');
const addQueroFazerBtn = document.getElementById('addQueroFazerBtn');

const querofazerCategoryFilter = createCategorySections(document.getElementById('querofazerCategoryFilterRow'), {
  onChange: ()=> renderQueroFazer()
});

function renderQueroFazer(){
  const q = querofazerSearch.value.trim().toLowerCase();
  const activeGroup = querofazerCategoryFilter.getGroup();
  const activeType = querofazerCategoryFilter.getType();
  const filtered = queroFazer
    .filter(e => !q || e.title.toLowerCase().includes(q))
    .filter(e => !activeGroup || (categoryById(e.category) && categoryById(e.category).group === activeGroup))
    .filter(e => !activeType || e.category === activeType)
    .sort((a,b) => b.addedAt - a.addedAt);
  querofazerGrid.className = queroFazerView === 'mural' ? 'recipe-mural' : 'recipe-grid';
  querofazerGrid.innerHTML = '';

  filtered.forEach(e=>{
    const cat = categoryById(e.category);
    const card = document.createElement('div');

    if(queroFazerView === 'mural'){
      card.className = 'recipe-mural-card';
      card.innerHTML = `
        <div class="pin"></div>
        <div class="polaroid">
          <div class="rm-poster">${e.poster ? `<img class="r-poster" src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">` : posterPlaceholderHTML}</div>
          <div class="polaroid-caption">${cat ? `<span class="rm-dot" style="background:${cat.color}"></span>` : ''}${escapeHtml(e.title)}</div>
        </div>
      `;
      card.addEventListener('click', ()=> openRecipeView(e, 'querofazer'));
      querofazerGrid.appendChild(card);
      return;
    }

    card.className = 'recipe-card';
    if(cat) card.style.borderLeftColor = cat.color;
    card.innerHTML = `
      <div class="rc-poster">${e.poster ? `<img class="r-poster" src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">` : posterPlaceholderHTML}</div>
      <div class="rc-info">
        <div class="rc-title">${escapeHtml(e.title)}</div>
        ${cat ? categoryChipHtml(e.category) : ''}
      </div>
    `;
    card.addEventListener('click', ()=> openRecipeView(e, 'querofazer'));
    querofazerGrid.appendChild(card);
  });

  querofazerEmpty.style.display = filtered.length===0 ? 'block' : 'none';
}

const querofazerViewToggle = document.getElementById('querofazerViewToggle');
function updateQueroFazerViewToggle(){
  [...querofazerViewToggle.children].forEach(btn=> btn.classList.toggle('active', btn.dataset.view === queroFazerView));
}
querofazerViewToggle.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('.view-toggle-btn');
  if(!btn) return;
  queroFazerView = btn.dataset.view;
  localStorage.setItem(QUEROFAZER_VIEW_KEY, queroFazerView);
  updateQueroFazerViewToggle();
  renderQueroFazer();
});
updateQueroFazerViewToggle();
querofazerSearch.addEventListener('input', renderQueroFazer);

/* ---------- Modal de edição "quero fazer" ---------- */
const queroFazerModalOverlay = document.getElementById('queroFazerModalOverlay');
const queroFazerModalEyebrow = document.getElementById('queroFazerModalEyebrow');
const queroFazerTitleInput = document.getElementById('queroFazerTitleInput');
const queroFazerDupWarning = document.getElementById('queroFazerDupWarning');
const queroFazerVideoInput = document.getElementById('queroFazerVideoInput');
const queroFazerCaptionInput = document.getElementById('queroFazerCaptionInput');
const queroFazerExtractBtn = document.getElementById('queroFazerExtractBtn');
const queroFazerIngredientsInput = document.getElementById('queroFazerIngredientsInput');
const queroFazerModalSave = document.getElementById('queroFazerModalSave');
const queroFazerModalRemove = document.getElementById('queroFazerModalRemove');
const queroFazerModalClose = document.getElementById('queroFazerModalClose');
const queroFazerMarkFeita = document.getElementById('queroFazerMarkFeita');

const queroFazerCategoryPicker = createCategoryDropdown(document.getElementById('queroFazerCategoryRow'), {
  allLabel: 'Sem categoria'
});

let queroFazerEditId = null;

function openQueroFazerModal(entry){
  queroFazerEditId = entry ? entry.id : null;
  queroFazerModalEyebrow.textContent = entry ? 'Editar item' : 'Nova receita pra fazer';
  queroFazerTitleInput.value = entry ? entry.title : '';
  updateQueroFazerDupWarning();
  queroFazerCategoryPicker.setValue(entry ? entry.category : null);
  queroFazerVideoInput.value = entry ? (entry.videoUrl || '') : '';
  queroFazerCaptionInput.value = entry ? (entry.caption || '') : '';
  queroFazerIngredientsInput.value = entry ? (entry.ingredients || '') : '';
  queroFazerModalRemove.style.display = entry ? 'block' : 'none';
  queroFazerMarkFeita.style.display = entry ? 'block' : 'none';
  queroFazerModalOverlay.classList.add('open');
  setTimeout(()=> queroFazerTitleInput.focus(), 150);
}
function closeQueroFazerModal(){
  queroFazerModalOverlay.classList.remove('open');
  queroFazerEditId = null;
}
function updateQueroFazerDupWarning(){
  const dup = findDuplicateQueroFazer(queroFazerTitleInput.value, queroFazerEditId);
  queroFazerDupWarning.style.display = dup ? 'block' : 'none';
}
queroFazerTitleInput.addEventListener('input', updateQueroFazerDupWarning);
addQueroFazerBtn.addEventListener('click', ()=> openQueroFazerModal(null));

queroFazerExtractBtn.addEventListener('click', ()=>{
  const draft = extractIngredientLines(queroFazerCaptionInput.value);
  if(!draft){
    queroFazerCaptionInput.focus();
    return;
  }
  const current = queroFazerIngredientsInput.value.trim();
  queroFazerIngredientsInput.value = current ? (current + '\n' + draft) : draft;
});

queroFazerModalSave.addEventListener('click', ()=>{
  const title = queroFazerTitleInput.value.trim();
  if(!title){ queroFazerTitleInput.focus(); return; }
  const category = queroFazerCategoryPicker.getValue();
  const videoUrl = queroFazerVideoInput.value.trim();
  const caption = queroFazerCaptionInput.value.trim();
  const ingredients = queroFazerIngredientsInput.value.trim();

  let entryId = queroFazerEditId;
  let addedAt = Date.now();
  if(entryId){
    const entry = queroFazer.find(e => e.id === entryId);
    addedAt = entry ? entry.addedAt : Date.now();
    entry.title = title; entry.category = category; entry.videoUrl = videoUrl;
    entry.caption = caption; entry.ingredients = ingredients;
  } else {
    entryId = 'q'+Date.now();
    queroFazer.push({ id:entryId, title, category, videoUrl, caption, ingredients, poster:null, addedAt });
  }
  saveQueroFazerLocal();
  closeQueroFazerModal();
  renderQueroFazer();
  refreshInsights();
});

function removeQueroFazerEntry(id){
  queroFazer = queroFazer.filter(e => e.id !== id);
  saveQueroFazerLocal();
  renderQueroFazer();
  refreshInsights();
}
queroFazerModalRemove.addEventListener('click', ()=>{
  if(!queroFazerEditId) return;
  removeQueroFazerEntry(queroFazerEditId);
  closeQueroFazerModal();
});
queroFazerMarkFeita.addEventListener('click', ()=>{
  if(!queroFazerEditId) return;
  const entry = queroFazer.find(e => e.id === queroFazerEditId);
  if(!entry) return;
  convertingQueroFazerId = entry.id;
  closeQueroFazerModal();
  openReceitaModal(null, { title: entry.title, category: entry.category, ingredients: entry.ingredients, poster: entry.poster });
});
queroFazerModalClose.addEventListener('click', closeQueroFazerModal);
queroFazerModalOverlay.addEventListener('click', (e)=>{ if(e.target === queroFazerModalOverlay) closeQueroFazerModal(); });

/* =====================================================
   TELA DE LEITURA — abre ao clicar em qualquer receita
   (feita ou "quero fazer"), com o conteúdo bonitinho e
   separado, tipo página de livro de receitas. A edição só
   acontece se você clicar explicitamente em "Editar".
===================================================== */
const recipeViewOverlay = document.getElementById('recipeViewOverlay');
const recipeViewClose = document.getElementById('recipeViewClose');
const viewPhoto = document.getElementById('viewPhoto');
const viewCategory = document.getElementById('viewCategory');
const viewTitle = document.getElementById('viewTitle');
const viewVideoLink = document.getElementById('viewVideoLink');
const viewVideoLinkText = document.getElementById('viewVideoLinkText');
const viewIngredientsSection = document.getElementById('viewIngredientsSection');
const viewIngredientsList = document.getElementById('viewIngredientsList');
const viewInstructionsSection = document.getElementById('viewInstructionsSection');
const viewStepsList = document.getElementById('viewStepsList');
const viewObsSection = document.getElementById('viewObsSection');
const viewObsText = document.getElementById('viewObsText');
const viewEditBtn = document.getElementById('viewEditBtn');
const viewMarkFeitaBtn = document.getElementById('viewMarkFeitaBtn');

let viewingEntry = null;
let viewingKind = null; // 'receita' | 'querofazer'

function openRecipeView(entry, kind){
  viewingEntry = entry;
  viewingKind = kind;
  const cat = categoryById(entry.category);

  viewPhoto.innerHTML = entry.poster
    ? `<img src="${entry.poster}" alt="${escapeHtml(entry.title)}">`
    : iconHtml('utensils');

  if(cat){
    viewCategory.style.display = 'inline-flex';
    viewCategory.style.background = cat.color + '22';
    viewCategory.style.color = cat.color;
    viewCategory.innerHTML = iconHtml(cat.icon) + ' ' + escapeHtml(cat.label);
  } else {
    viewCategory.style.display = 'none';
  }

  viewTitle.textContent = entry.title;

  if(kind === 'querofazer' && entry.videoUrl){
    viewVideoLink.href = entry.videoUrl;
    viewVideoLink.style.display = 'inline-flex';
  } else {
    viewVideoLink.style.display = 'none';
  }

  const ingLines = linesFrom(entry.ingredients);
  if(ingLines.length){
    viewIngredientsSection.style.display = 'block';
    viewIngredientsList.innerHTML = ingLines.map(l => `<li>${escapeHtml(l)}</li>`).join('');
  } else {
    viewIngredientsSection.style.display = 'none';
  }

  const stepLines = linesFrom(entry.instructions);
  if(stepLines.length){
    viewInstructionsSection.style.display = 'block';
    viewStepsList.innerHTML = stepLines.map(l => `<li>${escapeHtml(l)}</li>`).join('');
  } else {
    viewInstructionsSection.style.display = 'none';
  }

  if(entry.obs){
    viewObsSection.style.display = 'flex';
    viewObsText.textContent = entry.obs;
  } else {
    viewObsSection.style.display = 'none';
  }

  viewMarkFeitaBtn.style.display = kind === 'querofazer' ? 'flex' : 'none';

  recipeViewOverlay.classList.add('open');
}
function closeRecipeView(){
  recipeViewOverlay.classList.remove('open');
  viewingEntry = null;
  viewingKind = null;
}
recipeViewClose.addEventListener('click', closeRecipeView);
recipeViewOverlay.addEventListener('click', (e)=>{ if(e.target === recipeViewOverlay) closeRecipeView(); });

viewEditBtn.addEventListener('click', ()=>{
  const entry = viewingEntry, kind = viewingKind;
  closeRecipeView();
  if(kind === 'receita') openReceitaModal(entry);
  else openQueroFazerModal(entry);
});
viewMarkFeitaBtn.addEventListener('click', ()=>{
  if(!viewingEntry) return;
  const entry = viewingEntry;
  closeRecipeView();
  convertingQueroFazerId = entry.id;
  openReceitaModal(null, { title: entry.title, category: entry.category, ingredients: entry.ingredients, poster: entry.poster });
});

document.addEventListener('keydown', (e)=>{
  if(e.key !== 'Escape') return;
  if(receitaModalOverlay.classList.contains('open')) closeReceitaModal();
  if(queroFazerModalOverlay.classList.contains('open')) closeQueroFazerModal();
  if(recipeViewOverlay.classList.contains('open')) closeRecipeView();
});

/* =====================================================
   HOME — insights animados sobre a jornada do casal,
   ficam girando acima das abas
===================================================== */
const insightCard = document.getElementById('insightCard');
const insightIcon = document.getElementById('insightIcon');
const insightIconUse = document.getElementById('insightIconUse');
const insightText = document.getElementById('insightText');
const insightProgress = document.getElementById('insightProgress');
const homeInsights = document.getElementById('homeInsights');

const INSIGHT_DURATION = 5000;
let insightList = [];
let insightIndex = 0;
let insightTimer = null;

function computeInsights(){
  const list = [];
  const total = receitas.length;

  if(total === 0){
    list.push({icon:'leaf', html:'Adicionem a primeira receita pra começar a história de vocês por aqui.'});
    return list;
  }

  list.push({icon:'sparkles', html:`Nessa jornada, vocês já fizeram <strong>${total}</strong> receita${total===1?'':'s'} juntos.`});

  const byGroup = (groupId) => receitas
    .filter(e => { const c = categoryById(e.category); return c && c.group === groupId; })
    .sort((a,b) => b.addedAt - a.addedAt);

  const salgadas = byGroup('salgados');
  if(salgadas.length) list.push({icon:'chef-hat', html:`A última receita salgada foi <strong>${escapeHtml(salgadas[0].title)}</strong>.`});

  const doces = byGroup('doces');
  if(doces.length) list.push({icon:'cake', html:`A última receita doce foi <strong>${escapeHtml(doces[0].title)}</strong>.`});

  const bebidas = byGroup('bebidas');
  if(bebidas.length) list.push({icon:'cup-soda', html:`Já prepararam <strong>${bebidas.length}</strong> bebida${bebidas.length===1?'':'s'} — a mais recente foi <strong>${escapeHtml(bebidas[0].title)}</strong>.`});

  const counts = {};
  receitas.forEach(e=>{ if(e.category) counts[e.category] = (counts[e.category]||0) + 1; });
  const topEntry = Object.entries(counts).sort((a,b)=> b[1]-a[1])[0];
  if(topEntry){
    const c = categoryById(topEntry[0]);
    if(c) list.push({icon:'heart', html:`A categoria favorita por aqui é <strong>${escapeHtml(c.label)}</strong>, com ${topEntry[1]} receita${topEntry[1]===1?'':'s'}.`});
  }

  const mostRecent = [...receitas].sort((a,b)=> b.addedAt - a.addedAt)[0];
  if(mostRecent){
    const days = Math.floor((Date.now() - mostRecent.addedAt) / 86400000);
    list.push({icon:'clock', html: days <= 0
      ? `A receita mais nova, <strong>${escapeHtml(mostRecent.title)}</strong>, entrou pro caderno hoje.`
      : `A receita mais nova, <strong>${escapeHtml(mostRecent.title)}</strong>, entrou pro caderno há ${days} dia${days===1?'':'s'}.`});
  }

  if(queroFazer.length){
    list.push({icon:'bookmark', html:`Tem <strong>${queroFazer.length}</strong> receita${queroFazer.length===1?'':'s'} esperando pra serem feitas.`});
  }

  const groupsExplored = new Set(receitas.map(e => { const c = categoryById(e.category); return c ? c.group : null; }).filter(Boolean));
  if(groupsExplored.size >= 2){
    list.push({icon:'layout-grid', html:`Vocês já circularam por <strong>${groupsExplored.size}</strong> tipos de receita diferentes.`});
  }

  return list;
}

function updateProgressSegments(){
  const fills = [...insightProgress.querySelectorAll('.insight-seg-fill')];
  fills.forEach((fill, idx)=>{
    fill.classList.remove('active', 'done');
    if(idx < insightIndex){
      fill.classList.add('done');
    } else if(idx === insightIndex){
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.animation = '';
      fill.classList.add('active');
    }
  });
}

// Faz a troca em duas fases: o texto/ícone atual saem, depois o novo
// conteúdo entra — em vez de simplesmente trocar o texto sem transição.
function showInsight(i){
  if(!insightList.length) return;
  const newIndex = ((i % insightList.length) + insightList.length) % insightList.length;

  insightIcon.classList.add('swap');
  insightText.classList.add('leaving');

  setTimeout(()=>{
    insightIndex = newIndex;
    const item = insightList[insightIndex];
    insightText.innerHTML = item.html;
    insightIconUse.setAttribute('href', '#i-' + item.icon);
    insightIcon.classList.remove('swap');

    insightText.classList.remove('leaving');
    insightText.classList.add('entering');
    void insightText.offsetWidth;
    insightText.classList.remove('entering');

    updateProgressSegments();
  }, 220);
}

function goToInsight(i){
  showInsight(i);
  scheduleInsightRotation();
}

function scheduleInsightRotation(){
  clearInterval(insightTimer);
  if(insightList.length <= 1) return;
  insightTimer = setInterval(()=> showInsight(insightIndex+1), INSIGHT_DURATION);
}

function refreshInsights(){
  insightList = computeInsights();
  insightIndex = 0;
  insightProgress.innerHTML = insightList.length > 1
    ? insightList.map(()=> `<div class="insight-seg"><div class="insight-seg-fill"></div></div>`).join('')
    : '';
  const firstItem = insightList[0];
  if(firstItem){
    insightText.innerHTML = firstItem.html;
    insightIconUse.setAttribute('href', '#i-' + firstItem.icon);
  }
  updateProgressSegments();
  scheduleInsightRotation();
}

insightProgress.addEventListener('click', (ev)=>{
  const seg = ev.target.closest('.insight-seg');
  if(!seg) return;
  ev.stopPropagation();
  const idx = [...insightProgress.children].indexOf(seg);
  if(idx > -1) goToInsight(idx);
});
insightCard.addEventListener('click', ()=> goToInsight(insightIndex + 1));

homeInsights.addEventListener('mouseenter', ()=>{
  clearInterval(insightTimer);
  insightProgress.classList.add('paused');
});
homeInsights.addEventListener('mouseleave', ()=>{
  insightProgress.classList.remove('paused');
  scheduleInsightRotation();
});

/* =====================================================
   Troca de abas
===================================================== */
const tabBtns = document.querySelectorAll('.tab-btn');
const panels = {
  receitas: document.getElementById('panel-receitas'),
  querofazer: document.getElementById('panel-querofazer'),
};
const ACTIVE_TAB_KEY = 'nr-active-tab';
let activeTab = localStorage.getItem(ACTIVE_TAB_KEY) || 'receitas';

function setActiveTab(tab){
  activeTab = tab;
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  Object.entries(panels).forEach(([name, el]) => { el.hidden = name !== tab; });
  localStorage.setItem(ACTIVE_TAB_KEY, tab);
}
tabBtns.forEach(b => b.addEventListener('click', ()=> setActiveTab(b.dataset.tab)));
setActiveTab(activeTab);

/* =====================================================
   Inicialização
===================================================== */
renderReceitas();
renderQueroFazer();
refreshInsights();
