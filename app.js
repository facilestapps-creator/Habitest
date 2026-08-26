/* ============================================================
   FINANZAS APP - ENTREGA B: INGRESO + CLASIFICACION FIJO/VARIABLE
   ============================================================ */

const STORAGE_KEYS = {
  TRANSACTIONS: 'fin_transactions',
  CATEGORIES: 'fin_categories',
  LEARNING: 'fin_learning',
  SETTINGS: 'fin_settings',
  BACKUP_STATE: 'fin_backup_state',
  INCOMES: 'fin_incomes'
};

const BASE_CATEGORIES = [
  'Supermercado','Transporte','Salud','Servicios','Ocio',
  'Alquiler','Ropa','Educacion','Mascotas','Otros'
];

const BASE_CLASSIFICATION = {
  'Servicios': 'fijo',
  'Alquiler': 'fijo',
  'Supermercado': 'variable',
  'Transporte': 'variable',
  'Salud': 'variable',
  'Ocio': 'variable',
  'Ropa': 'variable',
  'Educacion': 'variable',
  'Mascotas': 'variable',
  'Otros': 'variable'
};

const CHIP_RULES = {
  'Supermercado': ['Supermercado','Comida afuera','Delivery'],
  'Transporte': ['SUBE/colectivo','Taxi/Uber','Nafta/peajes'],
  'Salud': ['Farmacia','Consulta medica','Obra social/prepaga'],
  'Servicios': ['Luz/gas/agua','Internet/celular','Streaming/suscripciones'],
  'Ocio': ['Salidas/bares','Cine/eventos','Hobbies']
};

const CATEGORY_ICONS = {
  'Supermercado':'\u{1F6D2}','Transporte':'\u{1F697}','Salud':'\u{1F48A}',
  'Servicios':'\u{1F4A1}','Ocio':'\u{1F389}','Alquiler':'\u{1F3E0}',
  'Ropa':'\u{1F455}','Educacion':'\u{1F4DA}','Mascotas':'\u{1F415}','Otros':'\u{1F4E6}'
};

const BAR_COLORS = ['#0f766e','#14b8a6','#2dd4bf','#5eead4','#99f6e4','#0d9488','#115e59','#134e4a'];

function getData(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function setData(key,value){localStorage.setItem(key,JSON.stringify(value))}

function initData(){
  const existingCats = getData(STORAGE_KEYS.CATEGORIES);
  if(!existingCats){
    const cats = BASE_CATEGORIES.map((name,i)=>({
      id:'cat_'+i, name, isBase:true,
      classification: BASE_CLASSIFICATION[name] || 'variable'
    }));
    setData(STORAGE_KEYS.CATEGORIES,cats);
  } else {
    // Migrate: add classification if missing
    let migrated = false;
    const updated = existingCats.map(c=>{
      if(c.classification===undefined||c.classification===null){
        migrated = true;
        return {...c, classification: c.isBase ? (BASE_CLASSIFICATION[c.name]||'variable') : null};
      }
      return c;
    });
    if(migrated) setData(STORAGE_KEYS.CATEGORIES,updated);
  }
  if(!getData(STORAGE_KEYS.TRANSACTIONS)) setData(STORAGE_KEYS.TRANSACTIONS,[]);
  if(!getData(STORAGE_KEYS.LEARNING)) setData(STORAGE_KEYS.LEARNING,{});
  if(!getData(STORAGE_KEYS.SETTINGS)) setData(STORAGE_KEYS.SETTINGS,{assistanceEnabled:true});
  if(!getData(STORAGE_KEYS.BACKUP_STATE)) setData(STORAGE_KEYS.BACKUP_STATE,{
    lastBackupDate:new Date().toISOString(),transactionsSinceBackup:0,dismissedDate:null
  });
  if(!getData(STORAGE_KEYS.INCOMES)) setData(STORAGE_KEYS.INCOMES,[]);
}

function normalizeText(text){
  if(!text)return'';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\d+/g,'').replace(/\s+/g,' ').trim();
}
function formatCurrency(amount){return'$'+amount.toLocaleString('es-AR')}
function formatDate(dateStr){
  const d=new Date(dateStr+'T00:00:00');
  return d.toLocaleDateString('es-AR',{day:'numeric',month:'short'});
}
function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function getMonthKey(date){
  const d=new Date(date+'T00:00:00');
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function getMonthName(monthKey){
  const[y,m]=monthKey.split('-');
  const d=new Date(parseInt(y),parseInt(m)-1,1);
  return d.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
}
function todayStr(){return new Date().toISOString().split('T')[0]}

let currentView='home';
let pendingTransaction=null;
let reportMonthOffset=0;
let selectedCategoryId=null;
let selectedChip=null;
let pendingClassification=null;
let pendingFrequency=null;
let editingIncomeId=null;

const $=id=>document.getElementById(id);

function showView(viewName){
  currentView=viewName;
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.view===viewName);
  });
  const main=$('main-content');
  main.innerHTML='';
  main.scrollTop=0;
  switch(viewName){
    case'home':renderHome();break;
    case'add':renderAddTransaction();break;
    case'transactions':renderTransactions();break;
    case'report':renderReport();break;
    case'settings':renderSettings();break;
    case'categories':renderCategories();break;
    case'incomes':renderIncomes();break;
  }
  checkBackupReminder();
}

/* ===== HOME ===== */
function renderHome(){
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]);
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const now=new Date();
  const currentMonthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthTx=transactions.filter(t=>getMonthKey(t.date)===currentMonthKey);
  const totalMonth=monthTx.reduce((s,t)=>s+t.amount,0);
  const today=todayStr();
  const todayTx=transactions.filter(t=>t.date===today);
  const totalToday=todayTx.reduce((s,t)=>s+t.amount,0);
  const recent=[...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const catMap={};
  categories.forEach(c=>catMap[c.id]=c.name);
  let html=`<div class="home-view">`;
  html+=`
    <div class="quick-add-card">
      <h2>Cuanto gastaste?</h2>
      <div class="quick-input-row">
        <input type="number" id="quick-amount" class="form-input" placeholder="0.00" step="0.01">
        <button class="btn btn-primary" onclick="onQuickAdd()">Agregar</button>
      </div>
    </div>`;
  html+=`
    <div class="summary-cards">
      <div class="summary-card"><div class="label">Hoy</div><div class="value ${totalToday>0?'negative':''}">${formatCurrency(totalToday)}</div></div>
      <div class="summary-card"><div class="label">Este mes</div><div class="value ${totalMonth>0?'negative':''}">${formatCurrency(totalMonth)}</div></div>
    </div>`;
  html+=`<div class="recent-section"><h3>Ultimos gastos</h3>`;
  if(recent.length===0){
    html+=`<div class="empty-state"><span class="emoji">\u{1F4DD}</span><p>Todavia no cargaste ningun gasto.<br>Empeza ahora!</p></div>`;
  }else{
    html+=`<div class="tx-list">`;
    recent.forEach(t=>{
      const catName=catMap[t.categoryId]||'Otros';
      const icon=CATEGORY_ICONS[catName]||'\u{1F4E6}';
      html+=`<div class="tx-item" onclick="showView('transactions')"><div class="tx-icon">${icon}</div><div class="tx-details"><div class="tx-category">${catName}${t.description?' - '+t.description:''}</div>${t.subcategory?`<div class="tx-subcategory">${t.subcategory}</div>`:''}</div><div class="tx-amount">${formatCurrency(t.amount)}</div><div class="tx-date">${formatDate(t.date)}</div></div>`;
    });
    html+=`</div>`;
  }
  html+=`</div></div>`;
  $('main-content').innerHTML=html;
}

function onQuickAdd(){
  const amount=parseFloat($('quick-amount').value);
  if(!amount||amount<=0){showToast('Ingresa un monto valido');return;}
  pendingTransaction={id:generateId(),amount,description:'',date:todayStr(),categoryId:null,subcategory:null};
  showView('add');
}

/* ===== ADD TRANSACTION ===== */
function renderAddTransaction(){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  let html=`<div class="add-view"><h2>Nuevo gasto</h2>`;
  const prefillAmount=pendingTransaction?pendingTransaction.amount:'';
  const prefillDesc=pendingTransaction?pendingTransaction.description:'';
  const prefillDate=pendingTransaction?pendingTransaction.date:todayStr();
  html+=`<div class="form-group"><label class="form-label">Monto</label><input type="number" id="tx-amount" class="form-input" placeholder="0.00" step="0.01" value="${prefillAmount}"></div>`;
  html+=`<div class="form-group"><label class="form-label">Descripcion (opcional)</label><input type="text" id="tx-desc" class="form-input" placeholder="Ej: Cena con amigos" value="${prefillDesc}"></div>`;
  html+=`<div class="form-group"><label class="form-label">Fecha</label><input type="date" id="tx-date" class="form-input" value="${prefillDate}"></div>`;
  html+=`<div class="form-group"><label class="form-label">Categoria</label><div class="category-grid" id="category-grid">`;
  categories.forEach(c=>{
    const unclass=c.classification===null||c.classification===undefined;
    html+=`<div class="category-chip" data-cat="${c.id}" onclick="onSelectCategory('${c.id}')">${c.name}${unclass?'<br><span style="font-size:0.7rem;color:#f59e0b;">Sin clasificar</span>':''}</div>`;
  });
  html+=`</div></div>`;
  html+=`<div id="chip-area" class="form-group hidden"><label class="form-label" id="chip-label">Que tipo de gasto?</label><div class="chip-grid" id="chip-grid"></div></div>`;
  html+=`<button class="btn btn-primary mt-2" onclick="onSaveTransaction()">Guardar gasto</button></div>`;
  $('main-content').innerHTML=html;
}

function onSelectCategory(catId){
  selectedCategoryId=catId;
  selectedChip=null;
  pendingClassification=null;
  pendingFrequency=null;
  document.querySelectorAll('.category-chip').forEach(el=>{
    el.classList.toggle('selected',el.dataset.cat===catId);
  });
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const cat=categories.find(c=>c.id===catId);
  if(!cat)return;
  // If category has no classification, ask first
  if(cat.classification===null||cat.classification===undefined){
    $('classify-subtitle').textContent=`Como clasificas "${cat.name}"?`;
    $('classify-modal').classList.remove('hidden');
    return;
  }
  pendingClassification=cat.classification;
  continueCategoryFlow();
}

function onClassifyCategory(value){
  pendingClassification=value;
  // Save classification to category immediately
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const cat=categories.find(c=>c.id===selectedCategoryId);
  if(cat){
    cat.classification=value;
    setData(STORAGE_KEYS.CATEGORIES,categories);
  }
  $('classify-modal').classList.add('hidden');
  continueCategoryFlow();
}

function continueCategoryFlow(){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const catName=categories.find(c=>c.id===selectedCategoryId)?.name;
  const settings=getData(STORAGE_KEYS.SETTINGS,{});
  const assistance=settings.assistanceEnabled!==false;
  // Show chip disambiguation if applicable
  if(!assistance||!CHIP_RULES[catName]){
    $('chip-area').classList.add('hidden');
    // If fixed and assistance on, ask frequency
    if(pendingClassification==='fijo'&&assistance){
      $('freq-modal').classList.remove('hidden');
    }
    return;
  }
  const desc=normalizeText($('tx-desc').value);
  const learning=getData(STORAGE_KEYS.LEARNING,{});
  if(desc&&learning[desc]&&learning[desc].categoryId===selectedCategoryId){
    selectedChip=learning[desc].subcategory;
    $('chip-area').classList.add('hidden');
    showToast(`Usando aprendizaje previo: ${selectedChip}`);
    // After learning, check frequency
    if(pendingClassification==='fijo'&&assistance){
      $('freq-modal').classList.remove('hidden');
    }
    return;
  }
  const chips=CHIP_RULES[catName];
  $('chip-label').textContent=`Que tipo de ${catName.toLowerCase()}?`;
  let chipHtml='';
  chips.forEach(chip=>{
    chipHtml+=`<div class="chip-option" onclick="onSelectChip('${chip.replace(/'/g,"\\'")}')">${chip}</div>`;
  });
  $('chip-grid').innerHTML=chipHtml;
  $('chip-area').classList.remove('hidden');
  // Note: frequency will be asked after chip selection, in onSelectChip
}

function onSelectChip(chip){
  selectedChip=chip;
  document.querySelectorAll('.chip-option').forEach(el=>{
    el.style.borderColor=el.textContent===chip?'#0f766e':'#e5e7eb';
    el.style.background=el.textContent===chip?'#f0fdfa':'#fff';
  });
  const settings=getData(STORAGE_KEYS.SETTINGS,{});
  const assistance=settings.assistanceEnabled!==false;
  // If fixed and assistance on, ask frequency now
  if(pendingClassification==='fijo'&&assistance){
    $('freq-modal').classList.remove('hidden');
  }
}

function onSelectFrequency(value){
  pendingFrequency=value;
  $('freq-modal').classList.add('hidden');
}

function onSaveTransaction(){
  const amount=parseFloat($('tx-amount').value);
  const description=$('tx-desc').value.trim();
  const date=$('tx-date').value;
  if(!amount||amount<=0){showToast('Ingresa un monto valido');return;}
  if(!selectedCategoryId){showToast('Selecciona una categoria');return;}
  const tx={
    id:generateId(),amount,description,date,
    categoryId:selectedCategoryId,subcategory:selectedChip,
    frequency:pendingFrequency
  };
  if(description){
    const norm=normalizeText(description);
    if(norm){
      const learning=getData(STORAGE_KEYS.LEARNING,{});
      learning[norm]={categoryId:selectedCategoryId,subcategory:selectedChip};
      setData(STORAGE_KEYS.LEARNING,learning);
    }
  }
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]);
  transactions.push(tx);
  setData(STORAGE_KEYS.TRANSACTIONS,transactions);
  const backupState=getData(STORAGE_KEYS.BACKUP_STATE,{});
  backupState.transactionsSinceBackup=(backupState.transactionsSinceBackup||0)+1;
  setData(STORAGE_KEYS.BACKUP_STATE,backupState);
  pendingTransaction=null;
  selectedCategoryId=null;
  selectedChip=null;
  pendingClassification=null;
  pendingFrequency=null;
  showToast('Gasto guardado');
  showView('home');
}

/* ===== TRANSACTIONS ===== */
function renderTransactions(){
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]);
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const catMap={};
  categories.forEach(c=>catMap[c.id]=c);
  const sorted=[...transactions].sort((a,b)=>b.date.localeCompare(a.date));
  let html=`<div class="transactions-view"><h2 class="mb-2">Mis gastos</h2>`;
  if(sorted.length===0){
    html+=`<div class="empty-state"><span class="emoji">\u{1F4CB}</span><p>No hay gastos registrados todavia.</p></div>`;
  }else{
    html+=`<div class="tx-list">`;
    sorted.forEach(t=>{
      const cat=catMap[t.categoryId]||{name:'Otros'};
      const icon=CATEGORY_ICONS[cat.name]||'\u{1F4E6}';
      let freqBadge=t.frequency?`<span style="font-size:0.7rem;color:#0f766e;background:#f0fdfa;padding:1px 6px;border-radius:4px;margin-left:4px;">${t.frequency}</span>`:'';
      html+=`<div class="tx-item"><div class="tx-icon">${icon}</div><div class="tx-details"><div class="tx-category">${cat.name}${t.description?' - '+t.description:''}${freqBadge}</div>${t.subcategory?`<div class="tx-subcategory">${t.subcategory}</div>`:''}</div><div class="tx-amount">${formatCurrency(t.amount)}</div><div class="tx-date">${formatDate(t.date)}</div><button onclick="onDeleteTransaction('${t.id}')" style="background:none;border:none;font-size:1.2rem;margin-left:4px;cursor:pointer;">\u{1F5D1}</button></div>`;
    });
    html+=`</div>`;
  }
  html+=`</div>`;
  $('main-content').innerHTML=html;
}

function onDeleteTransaction(id){
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]);
  const tx=transactions.find(t=>t.id===id);
  if(!tx)return;
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const cat=categories.find(c=>c.id===tx.categoryId);
  showAlert('Eliminar gasto?',`${cat?.name||'Otros'} - ${formatCurrency(tx.amount)} - ${formatDate(tx.date)}`,()=>{
    const filtered=transactions.filter(t=>t.id!==id);
    setData(STORAGE_KEYS.TRANSACTIONS,filtered);
    showToast('Gasto eliminado');
    renderTransactions();
  });
}

/* ===== CATEGORIES ===== */
function renderCategories(){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]);
  let html=`<div class="categories-view"><h2 class="mb-2">Categorias</h2>`;
  html+=`<div class="add-category-form"><input type="text" id="new-cat-name" class="form-input" placeholder="Nueva categoria..."><button class="btn btn-primary" style="width:auto;padding:12px 16px;" onclick="onAddCategory()">Agregar</button></div>`;
  html+=`<div class="cat-list">`;
  categories.forEach(c=>{
    const count=transactions.filter(t=>t.categoryId===c.id).length;
    const isFixed=c.classification==='fijo';
    const isVar=c.classification==='variable';
    const isNone=c.classification===null||c.classification===undefined;
    let classBadge='';
    if(isFixed) classBadge=`<span class="cat-class-label cat-class-fijo">Fijo</span>`;
    else if(isVar) classBadge=`<span class="cat-class-label cat-class-variable">Variable</span>`;
    else classBadge=`<span class="cat-class-label cat-class-none">Sin clasificar</span>`;
    html+=`<div class="cat-item"><div><div class="cat-name">${c.name}</div><div class="cat-classification">${classBadge}<span style="font-size:0.75rem;color:#9ca3af;">${count} gasto${count!==1?'s':''}</span></div></div><div style="display:flex;align-items:center;gap:8px;">${c.isBase?'<span class="cat-badge">Base</span>':''}<div class="toggle toggle-mini ${isFixed?'active':''}" onclick="toggleCategoryClassification('${c.id}')"></div><div class="cat-actions"><button onclick="onEditCategory('${c.id}')">\u{270F}</button>${!c.isBase?`<button onclick="onDeleteCategory('${c.id}')">\u{1F5D1}</button>`:''}</div></div></div>`;
  });
  html+=`</div></div>`;
  $('main-content').innerHTML=html;
}

function onAddCategory(){
  const input=$('new-cat-name');
  const name=input.value.trim();
  if(!name)return;
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const exists=categories.some(c=>c.name.toLowerCase()===name.toLowerCase());
  if(exists){showToast('Ya existe una categoria con ese nombre');return;}
  categories.push({id:generateId(),name,isBase:false,classification:null});
  setData(STORAGE_KEYS.CATEGORIES,categories);
  showToast('Categoria agregada');
  renderCategories();
}

function onEditCategory(id){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const cat=categories.find(c=>c.id===id);
  if(!cat)return;
  const newName=prompt('Nuevo nombre:',cat.name);
  if(!newName||newName.trim()===''||newName.trim()===cat.name)return;
  const name=newName.trim();
  const exists=categories.some(c=>c.id!==id&&c.name.toLowerCase()===name.toLowerCase());
  if(exists){showToast('Ya existe una categoria con ese nombre');return;}
  cat.name=name;
  setData(STORAGE_KEYS.CATEGORIES,categories);
  showToast('Categoria actualizada');
  renderCategories();
}

function onDeleteCategory(id){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const cat=categories.find(c=>c.id===id);
  if(!cat||cat.isBase)return;
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]);
  const count=transactions.filter(t=>t.categoryId===id).length;
  const othersId=categories.find(c=>c.name==='Otros')?.id;
  showAlert('Eliminar categoria?',`${count} gasto${count!==1?'s':''} se van a reasignar a "Otros".`,()=>{
    const newCats=categories.filter(c=>c.id!==id);
    const newTx=transactions.map(t=>{if(t.categoryId===id)return{...t,categoryId:othersId||t.categoryId};return t;});
    setData(STORAGE_KEYS.CATEGORIES,newCats);
    setData(STORAGE_KEYS.TRANSACTIONS,newTx);
    showToast('Categoria eliminada');
    renderCategories();
  });
}

function toggleCategoryClassification(id){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const cat=categories.find(c=>c.id===id);
  if(!cat)return;
  // Cycle: null -> fijo -> variable -> null
  if(cat.classification===null||cat.classification===undefined)cat.classification='fijo';
  else if(cat.classification==='fijo')cat.classification='variable';
  else cat.classification='fijo';
  setData(STORAGE_KEYS.CATEGORIES,categories);
  renderCategories();
}

/* ===== REPORT ===== */
function renderReport(){
  const now=new Date();
  now.setMonth(now.getMonth()-reportMonthOffset);
  const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]);
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const catMap={};
  categories.forEach(c=>catMap[c.id]=c.name);
  const monthTx=transactions.filter(t=>getMonthKey(t.date)===monthKey);
  const prevMonthDate=new Date(now.getFullYear(),now.getMonth()-1,1);
  const prevMonthKey=`${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth()+1).padStart(2,'0')}`;
  const prevMonthTx=transactions.filter(t=>getMonthKey(t.date)===prevMonthKey);
  let html=`<div class="report-view">`;
  html+=`<div class="report-month-selector"><button onclick="changeReportMonth(1)">\u25C0</button><h2>${getMonthName(monthKey)}</h2><button onclick="changeReportMonth(-1)">\u25B6</button></div>`;
  if(monthTx.length===0){
    html+=`<div class="empty-state"><span class="emoji">\u{1F4CA}</span><p>No hay gastos en este mes.</p></div>`;
    $('main-content').innerHTML=html+`</div>`;
    return;
  }
  const catTotals={};
  monthTx.forEach(t=>{const name=catMap[t.categoryId]||'Otros';catTotals[name]=(catTotals[name]||0)+t.amount;});
  const sortedCats=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const maxVal=sortedCats[0]?.[1]||1;
  const totalMonth=monthTx.reduce((s,t)=>s+t.amount,0);
  html+=`<div class="chart-container"><div class="chart-title">Gastos por categoria - ${formatCurrency(totalMonth)}</div><div class="bar-chart">`;
  sortedCats.forEach(([name,amount],i)=>{
    const pct=(amount/maxVal)*100;
    const color=BAR_COLORS[i%BAR_COLORS.length];
    html+=`<div class="bar-row"><div class="bar-label">${name}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div><div class="bar-value" style="${pct>50?'color:rgba(255,255,255,0.9);left:8px;right:auto;':''}">${formatCurrency(amount)}</div></div></div>`;
  });
  html+=`</div></div>`;
  const prevTotals={};
  prevMonthTx.forEach(t=>{const name=catMap[t.categoryId]||'Otros';prevTotals[name]=(prevTotals[name]||0)+t.amount;});
  html+=`<div class="comparison-section"><h3>Comparacion con mes anterior</h3>`;
  const allCats=new Set([...Object.keys(catTotals),...Object.keys(prevTotals)]);
  if(allCats.size===0){
    html+=`<p style="color:#9ca3af;font-size:0.9rem;">No hay datos para comparar.</p>`;
  }else{
    allCats.forEach(catName=>{
      const curr=catTotals[catName]||0;
      const prev=prevTotals[catName]||0;
      let changeHtml='';
      if(prev===0&&curr===0)return;
      if(prev===0){changeHtml=`<span class="comp-change up">Nuevo</span>`;}
      else{
        const diff=curr-prev;
        const pct=Math.round((diff/prev)*100);
        if(diff>0)changeHtml=`<span class="comp-change up">+${formatCurrency(diff)} (+${pct}%)</span>`;
        else if(diff<0)changeHtml=`<span class="comp-change down">${formatCurrency(diff)} (${pct}%)</span>`;
        else changeHtml=`<span class="comp-change same">Sin cambios</span>`;
      }
      html+=`<div class="comp-row"><span class="comp-cat">${catName}</span>${changeHtml}</div>`;
    });
  }
  html+=`</div></div>`;
  $('main-content').innerHTML=html;
}

function changeReportMonth(delta){
  reportMonthOffset+=delta;
  if(reportMonthOffset<0)reportMonthOffset=0;
  renderReport();
}

/* ===== SETTINGS ===== */
function renderSettings(){
  const settings=getData(STORAGE_KEYS.SETTINGS,{});
  const assistance=settings.assistanceEnabled!==false;
  let html=`<div class="settings-view"><h2 class="mb-2">Configuracion</h2>`;
  html+=`<div class="settings-section"><div class="setting-row"><div><div class="setting-label">Asistencia para categorizar</div><div class="setting-desc">Preguntar chips de precision al cargar gastos</div></div><div class="toggle ${assistance?'active':''}" onclick="toggleAssistance()"></div></div></div>`;
  html+=`<div class="settings-section"><h3>Ingresos</h3><button class="btn btn-secondary btn-full" onclick="showView('incomes')">Gestionar ingresos</button></div>`;
  html+=`<div class="settings-section"><h3>Backup</h3><div class="backup-actions"><button class="btn btn-primary" onclick="exportBackup()">Exportar datos</button><button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">Importar datos</button><input type="file" id="import-file" accept=".json" style="display:none" onchange="onImportFile(this)"></div></div>`;
  html+=`<div class="settings-section"><h3>Categorias</h3><button class="btn btn-secondary btn-full" onclick="showView('categories')">Gestionar categorias</button></div>`;
  $('main-content').innerHTML=html;
}

function toggleAssistance(){
  const settings=getData(STORAGE_KEYS.SETTINGS,{});
  settings.assistanceEnabled=!settings.assistanceEnabled;
  setData(STORAGE_KEYS.SETTINGS,settings);
  renderSettings();
}

/* ===== INCOMES ===== */
let incomeBudgetSelected=null;
let incomeTypeSelected=null;

function renderIncomes(){
  const incomes=getData(STORAGE_KEYS.INCOMES,[]);
  let html=`<div class="incomes-view"><h2 class="mb-2">Mis ingresos</h2>`;
  html+=`<div class="settings-section">`;
  html+=`<div class="form-group"><label class="form-label">Monto</label><input type="number" id="inc-amount" class="form-input" placeholder="0.00" step="0.01" value="${editingIncomeId?'':''}"></div>`;
  html+=`<div class="form-group"><label class="form-label">Descripcion (opcional)</label><input type="text" id="inc-desc" class="form-input" placeholder="Ej: Sueldo, changa, dividendo..."></div>`;
  html+=`<div class="form-group"><label class="form-label">Fecha</label><input type="date" id="inc-date" class="form-input" value="${todayStr()}"></div>`;
  html+=`<div class="form-group"><label class="form-label">Es parte de tu presupuesto habitual?</label><div class="radio-group"><div class="radio-option" id="inc-budget-yes" onclick="selectIncomeBudget(true)"><div class="radio-circle"></div><div><div class="radio-text">Si, es parte de mi presupuesto</div></div></div><div class="radio-option" id="inc-budget-no" onclick="selectIncomeBudget(false)"><div class="radio-circle"></div><div><div class="radio-text">No, es un ingreso extra</div><div class="radio-desc">No se usa en los calculos de disponible</div></div></div></div></div>`;
  html+=`<div id="inc-type-group" class="form-group hidden"><label class="form-label">Que tipo de ingreso es?</label><div class="radio-group"><div class="radio-option" id="inc-type-fixed" onclick="selectIncomeType('fijo')"><div class="radio-circle"></div><div><div class="radio-text">Fijo / previsible</div><div class="radio-desc">Ej: sueldo, jubilacion</div></div></div><div class="radio-option" id="inc-type-variable" onclick="selectIncomeType('variable')"><div class="radio-circle"></div><div><div class="radio-text">Variable</div><div class="radio-desc">Ej: changas, comisiones, ventas</div></div></div></div></div>`;
  html+=`<button class="btn btn-primary" onclick="onSaveIncome()">Guardar ingreso</button></div>`;
  if(incomes.length===0){
    html+=`<div class="empty-state"><span class="emoji">\u{1F4B5}</span><p>Todavia no registraste ningun ingreso.</p></div>`;
  }else{
    html+=`<div class="income-list">`;
    const sorted=[...incomes].sort((a,b)=>b.date.localeCompare(a.date));
    sorted.forEach(inc=>{
      const meta=inc.isBudget?(inc.type==='fijo'?'Fijo - Presupuesto':'Variable - Presupuesto'):'Extra (fuera de presupuesto)';
      html+=`<div class="income-item"><div class="income-details"><div class="income-amount">${formatCurrency(inc.amount)}</div><div class="income-meta">${inc.description||'Sin descripcion'} - ${formatDate(inc.date)} - ${meta}</div></div><div class="income-actions"><button onclick="onEditIncome('${inc.id}')">\u{270F}</button><button onclick="onDeleteIncome('${inc.id}')">\u{1F5D1}</button></div></div>`;
    });
    html+=`</div>`;
  }
  html+=`</div>`;
  $('main-content').innerHTML=html;
  if(editingIncomeId){
    const inc=incomes.find(i=>i.id===editingIncomeId);
    if(inc){
      document.getElementById('inc-amount').value=inc.amount;
      document.getElementById('inc-desc').value=inc.description||'';
      document.getElementById('inc-date').value=inc.date;
      selectIncomeBudget(inc.isBudget);
      if(inc.isBudget&&inc.type)selectIncomeType(inc.type);
    }
  }
}

function selectIncomeBudget(value){
  incomeBudgetSelected=value;
  document.getElementById('inc-budget-yes').classList.toggle('selected',value===true);
  document.getElementById('inc-budget-no').classList.toggle('selected',value===false);
  const typeGroup=document.getElementById('inc-type-group');
  if(value===true){typeGroup.classList.remove('hidden');}else{typeGroup.classList.add('hidden');incomeTypeSelected=null;}
}

function selectIncomeType(value){
  incomeTypeSelected=value;
  document.getElementById('inc-type-fixed').classList.toggle('selected',value==='fijo');
  document.getElementById('inc-type-variable').classList.toggle('selected',value==='variable');
}

function onSaveIncome(){
  const amount=parseFloat(document.getElementById('inc-amount').value);
  const description=document.getElementById('inc-desc').value.trim();
  const date=document.getElementById('inc-date').value;
  if(!amount||amount<=0){showToast('Ingresa un monto valido');return;}
  if(incomeBudgetSelected===null){showToast('Indica si es parte del presupuesto');return;}
  if(incomeBudgetSelected===true&&!incomeTypeSelected){showToast('Selecciona el tipo de ingreso');return;}
  const incomes=getData(STORAGE_KEYS.INCOMES,[]);
  if(editingIncomeId){
    const idx=incomes.findIndex(i=>i.id===editingIncomeId);
    if(idx!==-1){incomes[idx]={id:editingIncomeId,amount,description,date,isBudget:incomeBudgetSelected,type:incomeBudgetSelected?incomeTypeSelected:null};showToast('Ingreso actualizado');}
    editingIncomeId=null;
  }else{
    incomes.push({id:generateId(),amount,description,date,isBudget:incomeBudgetSelected,type:incomeBudgetSelected?incomeTypeSelected:null});
    showToast('Ingreso guardado');
  }
  setData(STORAGE_KEYS.INCOMES,incomes);
  incomeBudgetSelected=null;
  incomeTypeSelected=null;
  renderIncomes();
}

function onEditIncome(id){
  editingIncomeId=id;
  renderIncomes();
  document.querySelector('.settings-section').scrollIntoView({behavior:'smooth'});
}

function onDeleteIncome(id){
  const incomes=getData(STORAGE_KEYS.INCOMES,[]);
  const inc=incomes.find(i=>i.id===id);
  if(!inc)return;
  showAlert('Eliminar ingreso?',`${formatCurrency(inc.amount)} - ${inc.description||'Sin descripcion'} - ${formatDate(inc.date)}`,()=>{
    const filtered=incomes.filter(i=>i.id!==id);
    setData(STORAGE_KEYS.INCOMES,filtered);
    showToast('Ingreso eliminado');
    renderIncomes();
  });
}

/* ===== MODALS ===== */
let alertCallback=null;
function showAlert(title,message,onConfirm){
  alertCallback=onConfirm;
  $('alert-title').textContent=title;
  $('alert-message').textContent=message;
  $('alert-modal').classList.remove('hidden');
}
function hideAlert(){
  $('alert-modal').classList.add('hidden');
  alertCallback=null;
}
function confirmAlert(){
  if(alertCallback)alertCallback();
  hideAlert();
}

/* ===== BACKUP ===== */
function checkBackupReminder(){
  const backupState=getData(STORAGE_KEYS.BACKUP_STATE,{});
  const lastBackup=new Date(backupState.lastBackupDate||0);
  const now=new Date();
  const daysSince=(now-lastBackup)/(1000*60*60*24);
  const txCount=backupState.transactionsSinceBackup||0;
  const dismissed=backupState.dismissedDate?new Date(backupState.dismissedDate):null;
  const banner=$('backup-banner');
  if(dismissed&&(now-dismissed)/(1000*60*60*24)<2){banner.classList.add('hidden');return;}
  if(daysSince>=7||txCount>=10){banner.classList.remove('hidden');}else{banner.classList.add('hidden');}
}
function dismissBackup(){
  const backupState=getData(STORAGE_KEYS.BACKUP_STATE,{});
  backupState.dismissedDate=new Date().toISOString();
  setData(STORAGE_KEYS.BACKUP_STATE,backupState);
  $('backup-banner').classList.add('hidden');
}
function exportBackup(){
  const data={
    transactions:getData(STORAGE_KEYS.TRANSACTIONS,[]),
    categories:getData(STORAGE_KEYS.CATEGORIES,[]),
    learning:getData(STORAGE_KEYS.LEARNING,{}),
    settings:getData(STORAGE_KEYS.SETTINGS,{}),
    incomes:getData(STORAGE_KEYS.INCOMES,[]),
    exportedAt:new Date().toISOString()
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`finanzas-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  const backupState=getData(STORAGE_KEYS.BACKUP_STATE,{});
  backupState.lastBackupDate=new Date().toISOString();
  backupState.transactionsSinceBackup=0;
  backupState.dismissedDate=null;
  setData(STORAGE_KEYS.BACKUP_STATE,backupState);
  showToast('Backup exportado');
  checkBackupReminder();
}
function onImportFile(input){
  const file=input.files[0];
  if(!file)return;
  const currentTx=getData(STORAGE_KEYS.TRANSACTIONS,[]).length;
  showAlert('Restaurar backup?',`Se van a reemplazar todos los datos actuales. ${currentTx>0?`Vas a perder ${currentTx} gasto${currentTx!==1?'s':''} actual${currentTx!==1?'es':''}.`:''}`,()=>{
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const data=JSON.parse(e.target.result);
        if(!data.transactions||!data.categories){showToast('El archivo no es valido');return;}
        setData(STORAGE_KEYS.TRANSACTIONS,data.transactions);
        setData(STORAGE_KEYS.CATEGORIES,data.categories);
        if(data.learning)setData(STORAGE_KEYS.LEARNING,data.learning);
        if(data.settings)setData(STORAGE_KEYS.SETTINGS,data.settings);
        if(data.incomes)setData(STORAGE_KEYS.INCOMES,data.incomes);
        const backupState={lastBackupDate:new Date().toISOString(),transactionsSinceBackup:0,dismissedDate:null};
        setData(STORAGE_KEYS.BACKUP_STATE,backupState);
        showToast('Backup restaurado');
        showView('home');
      }catch(err){showToast('Error al leer el archivo');}
    };
    reader.readAsText(file);
  });
  input.value='';
}

/* ===== TOAST ===== */
let toastTimeout;
function showToast(message){
  const toast=$('toast');
  toast.textContent=message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>{toast.classList.add('hidden');},2500);
}

/* ===== EVENT LISTENERS ===== */
function setupEventListeners(){
  document.querySelectorAll('.nav-btn').forEach(btn=>{btn.addEventListener('click',()=>showView(btn.dataset.view));});
  $('alert-cancel').addEventListener('click',hideAlert);
  $('alert-confirm').addEventListener('click',confirmAlert);
  $('btn-backup-now').addEventListener('click',exportBackup);
  $('btn-dismiss-backup').addEventListener('click',dismissBackup);
}

/* ===== BOOT ===== */
function init(){
  initData();
  setupEventListeners();
  showView('home');
}
init();
