/* ============================================================
   FINANZAS APP - ENTREGA C: OBJETIVO + ENTRADA NIVEL 2 + CONTACTO
   ============================================================ */

const STORAGE_KEYS={
  TRANSACTIONS:'fin_transactions',CATEGORIES:'fin_categories',LEARNING:'fin_learning',
  SETTINGS:'fin_settings',BACKUP_STATE:'fin_backup_state',INCOMES:'fin_incomes',GOAL:'fin_goal',
  FIRST_USE_DATE:'fin_first_use_date',LEVEL2_OFFER_DISMISSED:'fin_level2_offer_dismissed',LEVEL2_ENTERED:'fin_level2_entered'
};

const CONTACT_EMAIL='info.habitest@gmail.com';

const BASE_CATEGORIES=['Supermercado','Transporte','Salud','Servicios','Ocio','Alquiler','Ropa','Educacion','Mascotas','Otros'];
const BASE_CLASSIFICATION={'Servicios':'fijo','Alquiler':'fijo','Supermercado':'variable','Transporte':'variable','Salud':'variable','Ocio':'variable','Ropa':'variable','Educacion':'variable','Mascotas':'variable','Otros':'variable'};
const CHIP_RULES={'Supermercado':['Supermercado','Comida afuera','Delivery'],'Transporte':['SUBE/colectivo','Taxi/Uber','Nafta/peajes'],'Salud':['Farmacia','Consulta medica','Obra social/prepaga'],'Servicios':['Luz/gas/agua','Internet/celular','Streaming/suscripciones'],'Ocio':['Salidas/bares','Cine/eventos','Hobbies']};
const CATEGORY_ICONS={'Supermercado':'🛒','Transporte':'🚗','Salud':'💊','Servicios':'💡','Ocio':'🎉','Alquiler':'🏠','Ropa':'👕','Educacion':'📚','Mascotas':'🐕','Otros':'📦'};
const BAR_COLORS=['#0f766e','#14b8a6','#2dd4bf','#5eead4','#99f6e4','#0d9488','#115e59','#134e4a'];

function getData(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function setData(key,value){localStorage.setItem(key,JSON.stringify(value))}

function initData(){
  const existingCats=getData(STORAGE_KEYS.CATEGORIES);
  if(!existingCats){
    const cats=BASE_CATEGORIES.map((name,i)=>({id:'cat_'+i,name,isBase:true,classification:BASE_CLASSIFICATION[name]||'variable'}));
    setData(STORAGE_KEYS.CATEGORIES,cats);
  }else{
    let migrated=false;
    const updated=existingCats.map(c=>{
      if(c.classification===undefined||c.classification===null){migrated=true;return{...c,classification:c.isBase?(BASE_CLASSIFICATION[c.name]||'variable'):null};}
      return c;
    });
    if(migrated)setData(STORAGE_KEYS.CATEGORIES,updated);
  }
  if(!getData(STORAGE_KEYS.TRANSACTIONS))setData(STORAGE_KEYS.TRANSACTIONS,[]);
  if(!getData(STORAGE_KEYS.LEARNING))setData(STORAGE_KEYS.LEARNING,{});
  if(!getData(STORAGE_KEYS.SETTINGS))setData(STORAGE_KEYS.SETTINGS,{assistanceEnabled:true});
  if(!getData(STORAGE_KEYS.BACKUP_STATE))setData(STORAGE_KEYS.BACKUP_STATE,{lastBackupDate:new Date().toISOString(),transactionsSinceBackup:0,dismissedDate:null});
  if(!getData(STORAGE_KEYS.INCOMES))setData(STORAGE_KEYS.INCOMES,[]);
  if(!getData(STORAGE_KEYS.GOAL))setData(STORAGE_KEYS.GOAL,null);
  if(!getData(STORAGE_KEYS.FIRST_USE_DATE))setData(STORAGE_KEYS.FIRST_USE_DATE,new Date().toISOString());
}

function normalizeText(text){if(!text)return'';return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\d+/g,'').replace(/\s+/g,' ').trim();}
function formatCurrency(amount){return'$'+amount.toLocaleString('es-AR')}
function formatDate(dateStr){const d=new Date(dateStr+'T00:00:00');return d.toLocaleDateString('es-AR',{day:'numeric',month:'short'});}
function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function getMonthKey(date){const d=new Date(date+'T00:00:00');return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function getMonthName(monthKey){const[y,m]=monthKey.split('-');const d=new Date(parseInt(y),parseInt(m)-1,1);return d.toLocaleDateString('es-AR',{month:'long',year:'numeric'});}
function todayStr(){return new Date().toISOString().split('T')[0]}
function validateEmail(email){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}

let currentView='home',pendingTransaction=null,reportMonthOffset=0,selectedCategoryId=null,selectedChip=null,pendingClassification=null,pendingFrequency=null,editingIncomeId=null,editingGoalId=null;
const $=id=>document.getElementById(id);

function showView(viewName){
  currentView=viewName;
  document.querySelectorAll('.nav-btn').forEach(btn=>{btn.classList.toggle('active',btn.dataset.view===viewName);});
  const main=$('main-content');main.innerHTML='';main.scrollTop=0;
  switch(viewName){
    case'home':renderHome();break;case'add':renderAddTransaction();break;case'transactions':renderTransactions();break;
    case'chart':renderChart();break;case'report':renderReport();break;case'settings':renderSettings();break;case'categories':renderCategories();break;
    case'incomes':renderIncomes();break;case'level2':renderLevel2();break;case'goal':renderGoal();break;case'contact':renderContact();break;
  }
  checkBackupReminder();
}

/* ===== HOME ===== */
function renderHome(){
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]),categories=getData(STORAGE_KEYS.CATEGORIES,[]),goal=getData(STORAGE_KEYS.GOAL);
  const now=new Date(),currentMonthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthTx=transactions.filter(t=>getMonthKey(t.date)===currentMonthKey),totalMonth=monthTx.reduce((s,t)=>s+t.amount,0);
  const today=todayStr(),todayTx=transactions.filter(t=>t.date===today),totalToday=todayTx.reduce((s,t)=>s+t.amount,0);
  const recent=[...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const catMap={};categories.forEach(c=>catMap[c.id]=c.name);
  let html=`<div class="home-view">`;
  html+=`<div class="quick-add-card"><h2>Cuanto gastaste?</h2><div class="quick-input-row"><input type="number" id="quick-amount" class="form-input" placeholder="0.00" step="0.01"><button class="btn btn-primary" onclick="onQuickAdd()">Agregar</button></div></div>`;
  html+=`<div class="summary-cards"><div class="summary-card"><div class="label">Hoy</div><div class="value ${totalToday>0?'negative':''}">${formatCurrency(totalToday)}</div></div><div class="summary-card"><div class="label">Este mes</div><div class="value ${totalMonth>0?'negative':''}">${formatCurrency(totalMonth)}</div></div></div>`;
  if(goal){
    html+=`<div class="goal-card" onclick="showView('goal')"><span class="goal-card-icon">🏆</span><div class="goal-card-amount">${formatCurrency(goal.amount)}</div>${goal.name?`<div class="goal-card-name">${goal.name}</div>`:''}${goal.deadline?`<div class="goal-card-deadline">Meta: ${formatDate(goal.deadline)}</div>`:''}${goal.description?`<div class="goal-card-desc">${goal.description}</div>`:''}</div>`;
  }
  html+=`<div class="recent-section"><h3>Ultimos gastos</h3>`;
  if(recent.length===0){html+=`<div class="empty-state"><span class="emoji">📝</span><p>Todavia no cargaste ningun gasto.<br>Empeza ahora!</p></div>`;}
  else{html+=`<div class="tx-list">`;recent.forEach(t=>{const catName=catMap[t.categoryId]||'Otros',icon=CATEGORY_ICONS[catName]||'📦';html+=`<div class="tx-item" onclick="showView('transactions')"><div class="tx-icon">${icon}</div><div class="tx-details"><div class="tx-category">${catName}${t.description?' - '+t.description:''}</div>${t.subcategory?`<div class="tx-subcategory">${t.subcategory}</div>`:''}</div><div class="tx-amount">${formatCurrency(t.amount)}</div><div class="tx-date">${formatDate(t.date)}</div></div>`;});html+=`</div>`;}
  html+=`</div></div>`;
  $('main-content').innerHTML=html;
}
function onQuickAdd(){const amount=parseFloat($('quick-amount').value);if(!amount||amount<=0){showToast('Ingresa un monto valido');return;}pendingTransaction={id:generateId(),amount,description:'',date:todayStr(),categoryId:null,subcategory:null};showView('add');}

/* ===== ADD TRANSACTION ===== */
function renderAddTransaction(){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  let html=`<div class="add-view"><h2>Nuevo gasto</h2>`;
  const prefillAmount=pendingTransaction?pendingTransaction.amount:'',prefillDesc=pendingTransaction?pendingTransaction.description:'',prefillDate=pendingTransaction?pendingTransaction.date:todayStr();
  html+=`<div class="form-group"><label class="form-label">Monto</label><input type="number" id="tx-amount" class="form-input" placeholder="0.00" step="0.01" value="${prefillAmount}"></div>`;
  html+=`<div class="form-group"><label class="form-label">Descripcion (opcional)</label><input type="text" id="tx-desc" class="form-input" placeholder="Ej: Cena con amigos" value="${prefillDesc}"></div>`;
  html+=`<div class="form-group"><label class="form-label">Fecha</label><input type="date" id="tx-date" class="form-input" value="${prefillDate}"></div>`;
  html+=`<div class="form-group"><label class="form-label">Categoria</label><div class="category-grid" id="category-grid">`;
  categories.forEach(c=>{const unclass=c.classification===null||c.classification===undefined;html+=`<div class="category-chip" data-cat="${c.id}" onclick="onSelectCategory('${c.id}')">${c.name}${unclass?'<br><span style="font-size:0.7rem;color:#f59e0b;">Sin clasificar</span>':''}</div>`;});
  html+=`</div></div><div id="chip-area" class="form-group hidden"><label class="form-label" id="chip-label">Que tipo de gasto?</label><div class="chip-grid" id="chip-grid"></div></div>`;
  html+=`<button class="btn btn-primary mt-2" onclick="onSaveTransaction()">Guardar gasto</button></div>`;
  $('main-content').innerHTML=html;
}
function onSelectCategory(catId){
  selectedCategoryId=catId;selectedChip=null;pendingClassification=null;pendingFrequency=null;
  document.querySelectorAll('.category-chip').forEach(el=>{el.classList.toggle('selected',el.dataset.cat===catId);});
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]),cat=categories.find(c=>c.id===catId);
  if(!cat)return;
  if(cat.classification===null||cat.classification===undefined){$('classify-subtitle').textContent=`Como clasificas "${cat.name}"?`;$('classify-modal').classList.remove('hidden');return;}
  pendingClassification=cat.classification;continueCategoryFlow();
}
function onClassifyCategory(value){
  pendingClassification=value;
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]),cat=categories.find(c=>c.id===selectedCategoryId);
  if(cat){cat.classification=value;setData(STORAGE_KEYS.CATEGORIES,categories);}
  $('classify-modal').classList.add('hidden');continueCategoryFlow();
}
function continueCategoryFlow(){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]),catName=categories.find(c=>c.id===selectedCategoryId)?.name;
  const settings=getData(STORAGE_KEYS.SETTINGS,{}),assistance=settings.assistanceEnabled!==false;
  if(!assistance||!CHIP_RULES[catName]){$('chip-area').classList.add('hidden');if(pendingClassification==='fijo'&&assistance)$('freq-modal').classList.remove('hidden');return;}
  const desc=normalizeText($('tx-desc').value),learning=getData(STORAGE_KEYS.LEARNING,{});
  if(desc&&learning[desc]&&learning[desc].categoryId===selectedCategoryId){selectedChip=learning[desc].subcategory;$('chip-area').classList.add('hidden');showToast(`Usando aprendizaje previo: ${selectedChip}`);if(pendingClassification==='fijo'&&assistance)$('freq-modal').classList.remove('hidden');return;}
  const chips=CHIP_RULES[catName];$('chip-label').textContent=`Que tipo de ${catName.toLowerCase()}?`;
  let chipHtml='';chips.forEach(chip=>{chipHtml+=`<div class="chip-option" onclick="onSelectChip('${chip.replace(/'/g,"\\'")}')">${chip}</div>`;});
  $('chip-grid').innerHTML=chipHtml;$('chip-area').classList.remove('hidden');
}
function onSelectChip(chip){selectedChip=chip;document.querySelectorAll('.chip-option').forEach(el=>{el.style.borderColor=el.textContent===chip?'#0f766e':'#e5e7eb';el.style.background=el.textContent===chip?'#f0fdfa':'#fff';});if(pendingClassification==='fijo'){const settings=getData(STORAGE_KEYS.SETTINGS,{});if(settings.assistanceEnabled!==false)$('freq-modal').classList.remove('hidden');}}
function onSelectFrequency(value){pendingFrequency=value;$('freq-modal').classList.add('hidden');}
function onSaveTransaction(){
  const amount=parseFloat($('tx-amount').value),description=$('tx-desc').value.trim(),date=$('tx-date').value;
  if(!amount||amount<=0){showToast('Ingresa un monto valido');return;}if(!selectedCategoryId){showToast('Selecciona una categoria');return;}
  const tx={id:generateId(),amount,description,date,categoryId:selectedCategoryId,subcategory:selectedChip,frequency:pendingFrequency};
  if(description){const norm=normalizeText(description);if(norm){const learning=getData(STORAGE_KEYS.LEARNING,{});learning[norm]={categoryId:selectedCategoryId,subcategory:selectedChip};setData(STORAGE_KEYS.LEARNING,learning);}}
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]);transactions.push(tx);setData(STORAGE_KEYS.TRANSACTIONS,transactions);
  const backupState=getData(STORAGE_KEYS.BACKUP_STATE,{});backupState.transactionsSinceBackup=(backupState.transactionsSinceBackup||0)+1;setData(STORAGE_KEYS.BACKUP_STATE,backupState);
  pendingTransaction=null;selectedCategoryId=null;selectedChip=null;pendingClassification=null;pendingFrequency=null;
  showToast('Gasto guardado');showView('home');
}

/* ===== TRANSACTIONS ===== */
function renderTransactions(){
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]),categories=getData(STORAGE_KEYS.CATEGORIES,[]),catMap={};
  categories.forEach(c=>catMap[c.id]=c);const sorted=[...transactions].sort((a,b)=>b.date.localeCompare(a.date));
  let html=`<div class="transactions-view"><h2 class="mb-2">Mis gastos</h2>`;
  if(sorted.length===0){html+=`<div class="empty-state"><span class="emoji">📋</span><p>No hay gastos registrados todavia.</p></div>`;}
  else{html+=`<div class="tx-list">`;sorted.forEach(t=>{const cat=catMap[t.categoryId]||{name:'Otros'},icon=CATEGORY_ICONS[cat.name]||'📦';let freqBadge=t.frequency?`<span style="font-size:0.7rem;color:#0f766e;background:#f0fdfa;padding:1px 6px;border-radius:4px;margin-left:4px;">${t.frequency}</span>`:'';html+=`<div class="tx-item"><div class="tx-icon">${icon}</div><div class="tx-details"><div class="tx-category">${cat.name}${t.description?' - '+t.description:''}${freqBadge}</div>${t.subcategory?`<div class="tx-subcategory">${t.subcategory}</div>`:''}</div><div class="tx-amount">${formatCurrency(t.amount)}</div><div class="tx-date">${formatDate(t.date)}</div><button onclick="onDeleteTransaction('${t.id}')" style="background:none;border:none;font-size:1.2rem;margin-left:4px;cursor:pointer;">🗑</button></div>`;});html+=`</div>`;}
  html+=`</div>`;$('main-content').innerHTML=html;
}
function onDeleteTransaction(id){
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]),tx=transactions.find(t=>t.id===id);if(!tx)return;
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]),cat=categories.find(c=>c.id===tx.categoryId);
  showAlert('Eliminar gasto?',`${cat?.name||'Otros'} - ${formatCurrency(tx.amount)} - ${formatDate(tx.date)}`,()=>{const filtered=transactions.filter(t=>t.id!==id);setData(STORAGE_KEYS.TRANSACTIONS,filtered);showToast('Gasto eliminado');renderTransactions();});
}

/* ===== CATEGORIES ===== */
function renderCategories(){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]),transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]);
  let html=`<div class="categories-view"><h2 class="mb-2">Categorias</h2>`;
  html+=`<div class="add-category-form"><input type="text" id="new-cat-name" class="form-input" placeholder="Nueva categoria..."><button class="btn btn-primary" style="width:auto;padding:12px 16px;" onclick="onAddCategory()">Agregar</button></div>`;
  html+=`<div class="cat-list">`;
  categories.forEach(c=>{
    const count=transactions.filter(t=>t.categoryId===c.id).length;
    const isFixed=c.classification==='fijo',isVar=c.classification==='variable',isNone=c.classification===null||c.classification===undefined;
    let classBadge='';if(isFixed)classBadge=`<span class="cat-class-label cat-class-fijo">Fijo</span>`;else if(isVar)classBadge=`<span class="cat-class-label cat-class-variable">Variable</span>`;else classBadge=`<span class="cat-class-label cat-class-none">Sin clasificar</span>`;
    html+=`<div class="cat-item"><div><div class="cat-name">${c.name}</div><div class="cat-classification">${classBadge}<span style="font-size:0.75rem;color:#9ca3af;">${count} gasto${count!==1?'s':''}</span></div></div><div style="display:flex;align-items:center;gap:8px;">${c.isBase?'<span class="cat-badge">Base</span>':''}<div class="toggle toggle-mini ${isFixed?'active':''}" onclick="toggleCategoryClassification('${c.id}')"></div><div class="cat-actions"><button onclick="onEditCategory('${c.id}')">✏️</button>${!c.isBase?`<button onclick="onDeleteCategory('${c.id}')">🗑</button>`:''}</div></div></div>`;
  });
  html+=`</div></div>`;$('main-content').innerHTML=html;
}
function onAddCategory(){
  const input=$('new-cat-name'),name=input.value.trim();if(!name)return;
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]);if(categories.some(c=>c.name.toLowerCase()===name.toLowerCase())){showToast('Ya existe una categoria con ese nombre');return;}
  categories.push({id:generateId(),name,isBase:false,classification:null});setData(STORAGE_KEYS.CATEGORIES,categories);showToast('Categoria agregada');renderCategories();
}
function onEditCategory(id){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]),cat=categories.find(c=>c.id===id);if(!cat)return;
  const newName=prompt('Nuevo nombre:',cat.name);if(!newName||newName.trim()===''||newName.trim()===cat.name)return;
  const name=newName.trim();if(categories.some(c=>c.id!==id&&c.name.toLowerCase()===name.toLowerCase())){showToast('Ya existe una categoria con ese nombre');return;}
  cat.name=name;setData(STORAGE_KEYS.CATEGORIES,categories);showToast('Categoria actualizada');renderCategories();
}
function onDeleteCategory(id){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]),cat=categories.find(c=>c.id===id);if(!cat||cat.isBase)return;
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]),count=transactions.filter(t=>t.categoryId===id).length,othersId=categories.find(c=>c.name==='Otros')?.id;
  showAlert('Eliminar categoria?',`${count} gasto${count!==1?'s':''} se van a reasignar a "Otros".`,()=>{const newCats=categories.filter(c=>c.id!==id);const newTx=transactions.map(t=>{if(t.categoryId===id)return{...t,categoryId:othersId||t.categoryId};return t;});setData(STORAGE_KEYS.CATEGORIES,newCats);setData(STORAGE_KEYS.TRANSACTIONS,newTx);showToast('Categoria eliminada');renderCategories();});
}
function toggleCategoryClassification(id){
  const categories=getData(STORAGE_KEYS.CATEGORIES,[]),cat=categories.find(c=>c.id===id);if(!cat)return;
  if(cat.classification===null||cat.classification===undefined)cat.classification='fijo';else if(cat.classification==='fijo')cat.classification='variable';else cat.classification='fijo';
  setData(STORAGE_KEYS.CATEGORIES,categories);renderCategories();
}

/* ===== CHART (PIE) ===== */
function renderChart(){
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]),categories=getData(STORAGE_KEYS.CATEGORIES,[]);
  const now=new Date(),currentMonthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthTx=transactions.filter(t=>getMonthKey(t.date)===currentMonthKey);
  const catMap={};categories.forEach(c=>catMap[c.id]=c.name);
  const catTotals={};monthTx.forEach(t=>{const name=catMap[t.categoryId]||'Otros';catTotals[name]=(catTotals[name]||0)+t.amount;});
  const totalMonth=monthTx.reduce((s,t)=>s+t.amount,0);
  let html=`<div class="chart-view"><h2>Gastos del mes</h2>`;
  html+=`<p class="chart-subtitle">${getMonthName(currentMonthKey)}</p>`;
  if(monthTx.length===0){
    html+=`<div class="pie-empty"><span class="emoji">📊</span><p>No hay gastos este mes.<br>Carga tu primer gasto para ver el grafico!</p></div>`;
  }else{
    const sortedCats=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
    const pieColors=['#0f766e','#14b8a6','#2dd4bf','#5eead4','#99f6e4','#0d9488','#115e59','#134e4a','#f59e0b','#ef4444'];
    let conicGradient=[],currentDeg=0;
    sortedCats.forEach(([name,amount],i)=>{
      const pct=(amount/totalMonth)*100;
      const deg=(amount/totalMonth)*360;
      conicGradient.push(`${pieColors[i%pieColors.length]} ${currentDeg}deg ${currentDeg+deg}deg`);
      currentDeg+=deg;
    });
    html+=`<div class="pie-container">`;
    html+=`<div class="pie-chart" style="background:conic-gradient(${conicGradient.join(',')})"></div>`;
    html+=`<div class="pie-total">${formatCurrency(totalMonth)}<div class="pie-total-label">Total del mes</div></div>`;
    html+=`<div class="pie-legend">`;
    sortedCats.forEach(([name,amount],i)=>{
      const pct=((amount/totalMonth)*100).toFixed(1);
      html+=`<div class="pie-legend-item"><div class="pie-legend-color" style="background:${pieColors[i%pieColors.length]}"></div><div class="pie-legend-name">${name}</div><div class="pie-legend-value">${formatCurrency(amount)}</div><div class="pie-legend-pct">${pct}%</div></div>`;
    });
    html+=`</div></div>`;
  }
  html+=`</div>`;$('main-content').innerHTML=html;
}

/* ===== REPORT ===== */
function renderReport(){
  const now=new Date();now.setMonth(now.getMonth()-reportMonthOffset);const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]),categories=getData(STORAGE_KEYS.CATEGORIES,[]),catMap={};categories.forEach(c=>catMap[c.id]=c.name);
  const monthTx=transactions.filter(t=>getMonthKey(t.date)===monthKey),prevMonthDate=new Date(now.getFullYear(),now.getMonth()-1,1),prevMonthKey=`${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth()+1).padStart(2,'0')}`,prevMonthTx=transactions.filter(t=>getMonthKey(t.date)===prevMonthKey);
  let html=`<div class="report-view">`;
  html+=`<div class="report-month-selector"><button onclick="changeReportMonth(1)">\u25C0</button><h2>${getMonthName(monthKey)}</h2><button onclick="changeReportMonth(-1)">\u25B6</button></div>`;
  if(monthTx.length===0){html+=`<div class="empty-state"><span class="emoji">📊</span><p>No hay gastos en este mes.</p></div>`;$('main-content').innerHTML=html+`</div>`;return;}
  const catTotals={};monthTx.forEach(t=>{const name=catMap[t.categoryId]||'Otros';catTotals[name]=(catTotals[name]||0)+t.amount;});
  const sortedCats=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]),maxVal=sortedCats[0]?.[1]||1,totalMonth=monthTx.reduce((s,t)=>s+t.amount,0);
  html+=`<div class="chart-container"><div class="chart-title">Gastos por categoria - ${formatCurrency(totalMonth)}</div><div class="bar-chart">`;
  sortedCats.forEach(([name,amount],i)=>{const pct=(amount/maxVal)*100,color=BAR_COLORS[i%BAR_COLORS.length];html+=`<div class="bar-row"><div class="bar-label">${name}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div><div class="bar-value" style="${pct>50?'color:rgba(255,255,255,0.9);left:8px;right:auto;':''}">${formatCurrency(amount)}</div></div></div>`;});
  html+=`</div></div>`;
  const prevTotals={};prevMonthTx.forEach(t=>{const name=catMap[t.categoryId]||'Otros';prevTotals[name]=(prevTotals[name]||0)+t.amount;});
  html+=`<div class="comparison-section"><h3>Comparacion con mes anterior</h3>`;
  const allCats=new Set([...Object.keys(catTotals),...Object.keys(prevTotals)]);
  if(allCats.size===0){html+=`<p style="color:#9ca3af;font-size:0.9rem;">No hay datos para comparar.</p>`;}
  else{
    const categories=getData(STORAGE_KEYS.CATEGORIES,[]);
    allCats.forEach(catName=>{
      const curr=catTotals[catName]||0,prev=prevTotals[catName]||0;
      let changeHtml='';
      if(prev===0&&curr===0)return;
      if(prev===0){changeHtml=`<span class="comp-change up">Nuevo</span>`;}
      else{const diff=curr-prev,pct=Math.round((diff/prev)*100);if(diff>0)changeHtml=`<span class="comp-change up">+${formatCurrency(diff)} (+${pct}%)</span>`;else if(diff<0)changeHtml=`<span class="comp-change down">${formatCurrency(diff)} (${pct}%)</span>`;else changeHtml=`<span class="comp-change same">Sin cambios</span>`;}
      // Contexto enriquecido
      const catObj=categories.find(c=>c.name===catName);
      const classification=catObj?.classification;
      let contextHtml='';
      if(classification==='variable'){
        if(prev===0){contextHtml=`<span class="comp-context-variable">Variable</span> <span class="comp-context-tip">Primera vez que gastas aca, podés controlarlo desde el inicio</span>`;}
        else if(curr>prev){contextHtml=`<span class="comp-context-variable">Variable</span> <span class="comp-context-tip">Podés ajustar este gasto el mes que viene</span>`;}
        else if(curr<prev){contextHtml=`<span class="comp-context-variable">Variable</span> <span class="comp-context-tip">Bien, bajaste el gasto en una categoria ajustable</span>`;}
        else{contextHtml=`<span class="comp-context-variable">Variable</span>`;}
      }else if(classification==='fijo'){
        if(prev===0){contextHtml=`<span class="comp-context-fixed">Fijo</span> <span class="comp-context-tip">Nuevo gasto fijo, se va a repetir todos los meses</span>`;}
        else if(curr>prev){contextHtml=`<span class="comp-context-fixed">Fijo</span> <span class="comp-context-tip">Subio tu gasto fijo, revisa si hay algun ajuste de tarifa</span>`;}
        else if(curr<prev){contextHtml=`<span class="comp-context-fixed">Fijo</span> <span class="comp-context-tip">Bajo tu gasto fijo, revisa si hay algun descuento aplicado</span>`;}
        else{contextHtml=`<span class="comp-context-fixed">Fijo</span>`;}
      }else{
        contextHtml=`<span class="comp-context-tip">Sin clasificar</span>`;
      }
      html+=`<div class="comp-row"><span class="comp-cat">${catName}</span>${changeHtml}${contextHtml?`<div class="comp-context">${contextHtml}</div>`:''}</div>`;
    });
  }
  html+=`</div></div>`;$('main-content').innerHTML=html;
}
function changeReportMonth(delta){reportMonthOffset+=delta;if(reportMonthOffset<0)reportMonthOffset=0;renderReport();}

/* ===== SETTINGS ===== */
function renderSettings(){
  const settings=getData(STORAGE_KEYS.SETTINGS,{}),assistance=settings.assistanceEnabled!==false;
  let html=`<div class="settings-view"><h2 class="mb-2">Configuracion</h2>`;
  html+=`<div class="settings-section"><div class="setting-row"><div><div class="setting-label">Asistencia para categorizar</div><div class="setting-desc">Preguntar chips de precision al cargar gastos</div></div><div class="toggle ${assistance?'active':''}" onclick="toggleAssistance()"></div></div></div>`;
  html+=`<div class="settings-section"><h3>Nivel 2</h3><button class="btn btn-secondary btn-full" onclick="showView('level2')">Entrar a Nivel 2</button></div>`;
  html+=`<div class="settings-section"><h3>Objetivo de ahorro</h3><button class="btn btn-secondary btn-full" onclick="showView('goal')">Gestionar objetivo</button></div>`;
  html+=`<div class="settings-section"><h3>Ingresos</h3><button class="btn btn-secondary btn-full" onclick="showView('incomes')">Gestionar ingresos</button></div>`;
  html+=`<div class="settings-section"><h3>Contacto</h3><button class="btn btn-secondary btn-full" onclick="showView('contact')">Escribinos</button></div>`;
  html+=`<div class="settings-section"><h3>Backup</h3>`;
  html+=`<div class="settings-section"><h3>Categorias</h3><button class="btn btn-secondary btn-full" onclick="showView('categories')">Gestionar categorias</button></div>`;
  $('main-content').innerHTML=html;
}
function toggleAssistance(){const settings=getData(STORAGE_KEYS.SETTINGS,{});settings.assistanceEnabled=!settings.assistanceEnabled;setData(STORAGE_KEYS.SETTINGS,settings);renderSettings();}

/* ===== INCOMES ===== */
let incomeBudgetSelected=null,incomeTypeSelected=null;
function renderIncomes(){
  const incomes=getData(STORAGE_KEYS.INCOMES,[]);
  let html=`<div class="incomes-view"><h2 class="mb-2">Mis ingresos</h2>`;
  html+=`<div class="settings-section">`;
  html+=`<div class="form-group"><label class="form-label">Monto</label><input type="number" id="inc-amount" class="form-input" placeholder="0.00" step="0.01"></div>`;
  html+=`<div class="form-group"><label class="form-label">Descripcion (opcional)</label><input type="text" id="inc-desc" class="form-input" placeholder="Ej: Sueldo, changa, dividendo..."></div>`;
  html+=`<div class="form-group"><label class="form-label">Fecha</label><input type="date" id="inc-date" class="form-input" value="${todayStr()}"></div>`;
  html+=`<div class="form-group"><label class="form-label">Es parte de tu presupuesto habitual?</label><div class="radio-group"><div class="radio-option" id="inc-budget-yes" onclick="selectIncomeBudget(true)"><div class="radio-circle"></div><div><div class="radio-text">Si, es parte de mi presupuesto</div></div></div><div class="radio-option" id="inc-budget-no" onclick="selectIncomeBudget(false)"><div class="radio-circle"></div><div><div class="radio-text">No, es un ingreso extra</div><div class="radio-desc">No se usa en los calculos de disponible</div></div></div></div></div>`;
  html+=`<div id="inc-type-group" class="form-group hidden"><label class="form-label">Que tipo de ingreso es?</label><div class="radio-group"><div class="radio-option" id="inc-type-fixed" onclick="selectIncomeType('fijo')"><div class="radio-circle"></div><div><div class="radio-text">Fijo / previsible</div><div class="radio-desc">Ej: sueldo, jubilacion</div></div></div><div class="radio-option" id="inc-type-variable" onclick="selectIncomeType('variable')"><div class="radio-circle"></div><div><div class="radio-text">Variable</div><div class="radio-desc">Ej: changas, comisiones, ventas</div></div></div></div></div>`;
  html+=`<button class="btn btn-primary" onclick="onSaveIncome()">Guardar ingreso</button></div>`;
  if(incomes.length===0){html+=`<div class="empty-state"><span class="emoji">💵</span><p>Todavia no registraste ningun ingreso.</p></div>`;}
  else{html+=`<div class="income-list">`;const sorted=[...incomes].sort((a,b)=>b.date.localeCompare(a.date));sorted.forEach(inc=>{const meta=inc.isBudget?(inc.type==='fijo'?'Fijo - Presupuesto':'Variable - Presupuesto'):'Extra (fuera de presupuesto)';html+=`<div class="income-item"><div class="income-details"><div class="income-amount">${formatCurrency(inc.amount)}</div><div class="income-meta">${inc.description||'Sin descripcion'} - ${formatDate(inc.date)} - ${meta}</div></div><div class="income-actions"><button onclick="onEditIncome('${inc.id}')">✏️</button><button onclick="onDeleteIncome('${inc.id}')">🗑</button></div></div>`;});html+=`</div>`;}
  html+=`</div>`;$('main-content').innerHTML=html;
  if(editingIncomeId){const inc=incomes.find(i=>i.id===editingIncomeId);if(inc){document.getElementById('inc-amount').value=inc.amount;document.getElementById('inc-desc').value=inc.description||'';document.getElementById('inc-date').value=inc.date;selectIncomeBudget(inc.isBudget);if(inc.isBudget&&inc.type)selectIncomeType(inc.type);document.querySelector('.settings-section').scrollIntoView({behavior:'smooth'});}}
}
function selectIncomeBudget(value){incomeBudgetSelected=value;document.getElementById('inc-budget-yes').classList.toggle('selected',value===true);document.getElementById('inc-budget-no').classList.toggle('selected',value===false);const typeGroup=document.getElementById('inc-type-group');if(value===true){typeGroup.classList.remove('hidden');}else{typeGroup.classList.add('hidden');incomeTypeSelected=null;}}
function selectIncomeType(value){incomeTypeSelected=value;document.getElementById('inc-type-fixed').classList.toggle('selected',value==='fijo');document.getElementById('inc-type-variable').classList.toggle('selected',value==='variable');}
function onSaveIncome(){
  const amount=parseFloat(document.getElementById('inc-amount').value),description=document.getElementById('inc-desc').value.trim(),date=document.getElementById('inc-date').value;
  if(!amount||amount<=0){showToast('Ingresa un monto valido');return;}if(incomeBudgetSelected===null){showToast('Indica si es parte del presupuesto');return;}if(incomeBudgetSelected===true&&!incomeTypeSelected){showToast('Selecciona el tipo de ingreso');return;}
  const incomes=getData(STORAGE_KEYS.INCOMES,[]);
  if(editingIncomeId){const idx=incomes.findIndex(i=>i.id===editingIncomeId);if(idx!==-1){incomes[idx]={id:editingIncomeId,amount,description,date,isBudget:incomeBudgetSelected,type:incomeBudgetSelected?incomeTypeSelected:null};showToast('Ingreso actualizado');}editingIncomeId=null;}
  else{incomes.push({id:generateId(),amount,description,date,isBudget:incomeBudgetSelected,type:incomeBudgetSelected?incomeTypeSelected:null});showToast('Ingreso guardado');}
  setData(STORAGE_KEYS.INCOMES,incomes);incomeBudgetSelected=null;incomeTypeSelected=null;renderIncomes();
}
function onEditIncome(id){editingIncomeId=id;renderIncomes();}
function onDeleteIncome(id){
  const incomes=getData(STORAGE_KEYS.INCOMES,[]),inc=incomes.find(i=>i.id===id);if(!inc)return;
  showAlert('Eliminar ingreso?',`${formatCurrency(inc.amount)} - ${inc.description||'Sin descripcion'} - ${formatDate(inc.date)}`,()=>{const filtered=incomes.filter(i=>i.id!==id);setData(STORAGE_KEYS.INCOMES,filtered);showToast('Ingreso eliminado');renderIncomes();});
}

/* ===== LEVEL 2 ENTRY ===== */
function renderLevel2(){
  setData(STORAGE_KEYS.LEVEL2_ENTERED,true);
  let html=`<div class="level2-view"><h2>Nivel 2 - Analisis</h2><p class="level2-subtitle">Elegi que queres hacer con tus finanzas</p><div class="level2-grid">`;
  html+=`<div class="level2-card" onclick="showView('goal')"><span class="level2-card-icon">🏆</span><div class="level2-card-title">Setear un objetivo</div><div class="level2-card-desc">Defini un monto de ahorro y dale seguimiento a tu progreso</div></div>`;
  html+=`<div class="level2-card" onclick="showView('transactions')"><span class="level2-card-icon">🔍</span><div class="level2-card-title">Donde se me escapa la plata?</div><div class="level2-card-desc">Revisa todos tus gastos filtrados por categoria</div></div>`;
  html+=`<div class="level2-card" onclick="showView('report')"><span class="level2-card-icon">📈</span><div class="level2-card-title">Donde puedo ahorrar?</div><div class="level2-card-desc">Compara tus gastos mes a mes y encontra opportunidades</div></div>`;
  html+=`</div></div>`;
  $('main-content').innerHTML=html;
}

/* ===== GOAL ===== */
function renderGoal(){
  const goal=getData(STORAGE_KEYS.GOAL);
  let html=`<div class="goal-view"><h2 class="mb-2">Objetivo de ahorro</h2>`;
  if(goal&&!editingGoalId){
    // Calcular proyeccion
    const transactions=getData(STORAGE_KEYS.TRANSACTIONS,[]);
    const incomes=getData(STORAGE_KEYS.INCOMES,[]);
    const now=new Date();
    const currentMonthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    // Ahorro = ingresos presupuesto - gastos (solo meses completos)
    const monthKeys=[...new Set(transactions.map(t=>getMonthKey(t.date)).concat(incomes.filter(i=>i.isBudget).map(i=>getMonthKey(i.date))))].sort();
    let totalSaved=0,monthCount=0,monthlySavings=[];
    monthKeys.forEach(mk=>{
      const monthIncomes=incomes.filter(i=>i.isBudget&&getMonthKey(i.date)===mk).reduce((s,i)=>s+i.amount,0);
      const monthExpenses=transactions.filter(t=>getMonthKey(t.date)===mk).reduce((s,t)=>s+t.amount,0);
      const saved=monthIncomes-monthExpenses;
      if(mk!==currentMonthKey||monthIncomes>0){// Solo contar meses completos o con datos
        totalSaved+=saved;monthCount++;
        if(mk!==currentMonthKey)monthlySavings.push(saved);
      }
    });
    const avgMonthly=monthlySavings.length>0?monthlySavings.reduce((a,b)=>a+b,0)/monthlySavings.length:0;
    const remaining=goal.amount-totalSaved;
    const pct=Math.min(100,Math.max(0,(totalSaved/goal.amount)*100));
    // Proyeccion
    let projectionHtml='',projectionClass='nodata';
    if(goal.deadline&&avgMonthly>0){
      const deadlineDate=new Date(goal.deadline+'T00:00:00');
      const monthsLeft=(deadlineDate.getFullYear()-now.getFullYear())*12+(deadlineDate.getMonth()-now.getMonth());
      const projected=totalSaved+(avgMonthly*monthsLeft);
      if(projected>=goal.amount){projectionClass='ahead';projectionHtml=`🎉 Vas bien! A este ritmo llegas con ${formatCurrency(projected-goal.amount)} de sobra`;}
      else{projectionClass='behind';projectionHtml=`\u26A0 A este ritmo te faltan ${formatCurrency(goal.amount-projected)} para llegar a la meta`;}
    }else if(goal.deadline&&avgMonthly<=0){
      projectionClass='behind';projectionHtml=`\u26A0 Este ritmo aleja un poco la meta: los gastos vienen superando lo ahorrado. Achicar algun gasto variable ayuda a acercarte de nuevo`;
    }else if(!goal.deadline&&avgMonthly>0){
      const monthsNeeded=Math.ceil(remaining/avgMonthly);
      projectionClass='ontrack';projectionHtml=`📅 A este ritmo llegas en ${monthsNeeded} mes${monthsNeeded!==1?'es':''}`;
    }else if(!goal.deadline&&avgMonthly<=0){
      projectionClass='behind';projectionHtml=`\u26A0 Por ahora los gastos superan lo que se logra ahorrar. Achicar algun gasto variable es un buen primer paso para arrancar la meta`;
    }else{
      projectionHtml=`Carga mas datos para ver la proyeccion`;
    }
    html+=`<div class="goal-card"><span class="goal-card-icon">🏆</span><div class="goal-card-amount">${formatCurrency(goal.amount)}</div>${goal.name?`<div class="goal-card-name">${goal.name}</div>`:''}${goal.deadline?`<div class="goal-card-deadline">Meta: ${formatDate(goal.deadline)}</div>`:''}${goal.description?`<div class="goal-card-desc">${goal.description}</div>`:''}</div>`;
    html+=`<div class="goal-progress"><h3>Progreso</h3>`;
    html+=`<div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>`;
    html+=`<div class="goal-progress-stats"><div class="goal-stat"><div class="goal-stat-value">${formatCurrency(totalSaved)}</div><div class="goal-stat-label">Ahorrado</div></div><div class="goal-stat"><div class="goal-stat-value">${formatCurrency(remaining>0?remaining:0)}</div><div class="goal-stat-label">Falta</div></div></div>`;
    if(monthCount>0)html+=`<div class="goal-stat" style="margin-bottom:12px;text-align:center"><div class="goal-stat-value">${formatCurrency(avgMonthly)}</div><div class="goal-stat-label">Ritmo mensual promedio</div></div>`;
    html+=`<div class="goal-projection ${projectionClass}">${projectionHtml}</div></div>`;
    html+=`<div class="goal-actions"><button class="btn btn-secondary" onclick="onEditGoal()">✏️ Editar</button><button class="btn btn-danger" onclick="onDeleteGoal()">🗑 Borrar</button></div>`;
  }else{
    html+=`<div class="settings-section">`;
    html+=`<div class="form-group"><label class="form-label">Monto objetivo *</label><input type="number" id="goal-amount" class="form-input" placeholder="Ej: 50000" step="0.01" value="${editingGoalId&&goal?goal.amount:''}"></div>`;
    html+=`<div class="form-group"><label class="form-label">Nombre (opcional)</label><input type="text" id="goal-name" class="form-input" placeholder="Ej: Vacaciones, auto nuevo..." value="${editingGoalId&&goal?goal.name||'':''}"></div>`;
    html+=`<div class="form-group"><label class="form-label">Plazo / fecha meta (opcional)</label><input type="date" id="goal-deadline" class="form-input" value="${editingGoalId&&goal?goal.deadline||'':''}"></div>`;
    html+=`<div class="form-group"><label class="form-label">Descripcion (opcional)</label><input type="text" id="goal-desc" class="form-input" placeholder="Ej: Viaje a Bariloche" value="${editingGoalId&&goal?goal.description||'':''}"></div>`;
    html+=`<button class="btn btn-primary" onclick="onSaveGoal()">${editingGoalId?'Actualizar':'Guardar'} objetivo</button>`;
    if(editingGoalId)html+=`<button class="btn btn-secondary btn-full" onclick="editingGoalId=null;renderGoal();">Cancelar</button>`;
    html+=`</div>`;
  }
  html+=`</div>`;
  $('main-content').innerHTML=html;
}
function onSaveGoal(){
  const amount=parseFloat(document.getElementById('goal-amount').value),name=document.getElementById('goal-name').value.trim(),deadline=document.getElementById('goal-deadline').value,description=document.getElementById('goal-desc').value.trim();
  if(!amount||amount<=0){showToast('Ingresa un monto valido');return;}
  const goal={id:editingGoalId||generateId(),amount,name:name||null,deadline:deadline||null,description:description||null};
  setData(STORAGE_KEYS.GOAL,goal);editingGoalId=null;
  showToast('Objetivo guardado');showView('home');
}
function onEditGoal(){editingGoalId=getData(STORAGE_KEYS.GOAL)?.id;renderGoal();}
function onDeleteGoal(){
  const goal=getData(STORAGE_KEYS.GOAL);if(!goal)return;
  showAlert('Borrar objetivo?',`Se va a eliminar el objetivo${goal.name?' "'+goal.name+'"':''} de ${formatCurrency(goal.amount)}.`,()=>{setData(STORAGE_KEYS.GOAL,null);showToast('Objetivo eliminado');showView('home');});
}

/* ===== CONTACT ===== */
function renderContact(){
  let html=`<div class="contact-view"><h2>Contacto</h2><p class="contact-subtitle">Escribinos si tenes dudas, sugerencias o encontras algun problema</p>`;
  html+=`<div class="settings-section">`;
  html+=`<div class="form-group"><label class="form-label">Nombre (opcional)</label><input type="text" id="contact-name" class="form-input" placeholder="Tu nombre"></div>`;
  html+=`<div class="form-group"><label class="form-label">Email *</label><input type="email" id="contact-email" class="form-input" placeholder="tu@email.com"><div class="form-error" id="contact-email-error">El email es obligatorio y debe tener formato valido</div></div>`;
  html+=`<div class="form-group"><label class="form-label">Mensaje *</label><textarea id="contact-message" class="form-input form-textarea" rows="4" placeholder="Contanos en que te podemos ayudar..."></textarea><div class="form-error" id="contact-message-error">El mensaje es obligatorio</div></div>`;
  html+=`<button class="btn btn-primary" onclick="onSendContact()">Enviar mensaje</button>`;
  html+=`<div id="contact-success" class="contact-success hidden"><p><strong>📨 Se abrio tu app de correo</strong><br>Si no paso nada visible, copia este mensaje y envialo manualmente a <strong>${CONTACT_EMAIL}</strong></p></div>`;
  html+=`</div></div>`;
  $('main-content').innerHTML=html;
}
function onSendContact(){
  const name=document.getElementById('contact-name').value.trim(),email=document.getElementById('contact-email').value.trim(),message=document.getElementById('contact-message').value.trim();
  const emailError=document.getElementById('contact-email-error'),messageError=document.getElementById('contact-message-error');
  const emailInput=document.getElementById('contact-email'),messageInput=document.getElementById('contact-message');
  let hasError=false;
  if(!email||!validateEmail(email)){emailError.classList.add('visible');emailInput.classList.add('error');hasError=true;}else{emailError.classList.remove('visible');emailInput.classList.remove('error');}
  if(!message){messageError.classList.add('visible');messageInput.classList.add('error');hasError=true;}else{messageError.classList.remove('visible');messageInput.classList.remove('error');}
  if(hasError){showToast('Completa los campos obligatorios');return;}
  const subject='Contacto desde Finanzas App';
  const body=`Nombre: ${name||'(no proporcionado)'}%0AEmail: ${email}%0A%0AMensaje:%0A${message}`;
  window.location.href=`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${body}`;
  document.getElementById('contact-success').classList.remove('hidden');
  showToast('Mail preparado');
}

/* ===== MODALS ===== */
let alertCallback=null;
function showAlert(title,message,onConfirm){alertCallback=onConfirm;$('alert-title').textContent=title;$('alert-message').textContent=message;$('alert-modal').classList.remove('hidden');}
function hideAlert(){$('alert-modal').classList.add('hidden');alertCallback=null;}
function confirmAlert(){if(alertCallback)alertCallback();hideAlert();}

/* ===== BACKUP ===== */
function checkBackupReminder(){
  const backupState=getData(STORAGE_KEYS.BACKUP_STATE,{}),lastBackup=new Date(backupState.lastBackupDate||0),now=new Date();
  const daysSince=(now-lastBackup)/(1000*60*60*24),txCount=backupState.transactionsSinceBackup||0,dismissed=backupState.dismissedDate?new Date(backupState.dismissedDate):null;
  const banner=$('backup-banner');
  if(dismissed&&(now-dismissed)/(1000*60*60*24)<1){banner.classList.add('hidden');return;}
  if(daysSince>=3||txCount>=5){banner.classList.remove('hidden');}else{banner.classList.add('hidden');}
}
function dismissBackup(){
  const backupState=getData(STORAGE_KEYS.BACKUP_STATE,{});backupState.dismissedDate=new Date().toISOString();setData(STORAGE_KEYS.BACKUP_STATE,backupState);$('backup-banner').classList.add('hidden');
}
function exportBackup(){
  const data={transactions:getData(STORAGE_KEYS.TRANSACTIONS,[]),categories:getData(STORAGE_KEYS.CATEGORIES,[]),learning:getData(STORAGE_KEYS.LEARNING,{}),settings:getData(STORAGE_KEYS.SETTINGS,{}),incomes:getData(STORAGE_KEYS.INCOMES,[]),goal:getData(STORAGE_KEYS.GOAL),exportedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`finanzas-backup-${todayStr()}.json`;a.click();URL.revokeObjectURL(url);
  const backupState=getData(STORAGE_KEYS.BACKUP_STATE,{});backupState.lastBackupDate=new Date().toISOString();backupState.transactionsSinceBackup=0;backupState.dismissedDate=null;setData(STORAGE_KEYS.BACKUP_STATE,backupState);
  showToast('Backup exportado');checkBackupReminder();
}
function onImportFile(input){
  const file=input.files[0];if(!file)return;
  const currentTx=getData(STORAGE_KEYS.TRANSACTIONS,[]).length;
  showAlert('Restaurar backup?',`Se van a reemplazar todos los datos actuales. ${currentTx>0?`Vas a perder ${currentTx} gasto${currentTx!==1?'s':''} actual${currentTx!==1?'es':''}.`:''}`,()=>{
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const data=JSON.parse(e.target.result);
        if(!data.transactions||!data.categories){showToast('El archivo no es valido');return;}
        setData(STORAGE_KEYS.TRANSACTIONS,data.transactions);setData(STORAGE_KEYS.CATEGORIES,data.categories);
        if(data.learning)setData(STORAGE_KEYS.LEARNING,data.learning);if(data.settings)setData(STORAGE_KEYS.SETTINGS,data.settings);
        if(data.incomes)setData(STORAGE_KEYS.INCOMES,data.incomes);if(data.goal!==undefined)setData(STORAGE_KEYS.GOAL,data.goal);
        const backupState={lastBackupDate:new Date().toISOString(),transactionsSinceBackup:0,dismissedDate:null};setData(STORAGE_KEYS.BACKUP_STATE,backupState);
        showToast('Backup restaurado');showView('home');
      }catch(err){showToast('Error al leer el archivo');}
    };
    reader.readAsText(file);
  });
  input.value='';
}
/* ===== LEVEL 2 TRIGGER ===== */
function checkLevel2Trigger(){
  const dismissed=getData(STORAGE_KEYS.LEVEL2_OFFER_DISMISSED,false);
  if(dismissed)return;
  const firstUseStr=getData(STORAGE_KEYS.FIRST_USE_DATE);
  if(!firstUseStr)return;
  const firstUse=new Date(firstUseStr);
  const now=new Date();
  const monthsDiff=(now.getFullYear()-firstUse.getFullYear())*12+(now.getMonth()-firstUse.getMonth());
  if(monthsDiff>=2){showLevel2Offer();}
}
function showLevel2Offer(){$('level2-offer-modal').classList.remove('hidden');}
function hideLevel2Offer(){$('level2-offer-modal').classList.add('hidden');}
function acceptLevel2Offer(){hideLevel2Offer();showView('level2');}
function dismissLevel2Offer(){setData(STORAGE_KEYS.LEVEL2_OFFER_DISMISSED,true);hideLevel2Offer();showToast('Podes volver al Nivel 2 cuando quieras desde Configuracion');}
/* ===== TOAST ===== */
let toastTimeout;
function showToast(message){
  const toast=$('toast');toast.textContent=message;toast.classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>{toast.classList.add('hidden');},2500);
}

/* ===== EVENT LISTENERS ===== */
function setupEventListeners(){
  document.querySelectorAll('.nav-btn').forEach(btn=>{if(btn.id!=='nav-add-btn')btn.addEventListener('click',()=>showView(btn.dataset.view));});
  $('nav-add-btn').addEventListener('click',onCentralAddClick);
  $('alert-cancel').addEventListener('click',hideAlert);$('alert-confirm').addEventListener('click',confirmAlert);
  $('btn-backup-now').addEventListener('click',exportBackup);$('btn-dismiss-backup').addEventListener('click',dismissBackup);
}
function onCentralAddClick(){
  if(getData(STORAGE_KEYS.LEVEL2_ENTERED,false)){$('add-choice-modal').classList.remove('hidden');}
  else{showView('add');}
}
function chooseAddType(type){
  $('add-choice-modal').classList.add('hidden');
  showView(type==='ingreso'?'incomes':'add');
}

/* ===== BOOT ===== */
function init(){initData();setupEventListeners();showView('home');checkLevel2Trigger();}
init();
