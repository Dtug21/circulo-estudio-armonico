const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'studio.js'),'utf8').replace(/bindEvents\(\);render\(\);persist\(\);\s*$/,'');

function studio(){
  const context=vm.createContext({
    document:{querySelectorAll:()=>[]},
    localStorage:{getItem:()=>null,setItem:()=>{}},
    location:{search:'',href:'http://localhost/progresiones.html'},
    URLSearchParams,URL,console,setTimeout,clearTimeout
  });
  vm.runInContext(source,context,{filename:'studio.js'});
  return expression=>vm.runInContext(expression,context);
}

function tracks(bytes){
  const buffer=Buffer.from(bytes);
  assert.equal(buffer.toString('ascii',0,4),'MThd');
  assert.equal(buffer.readUInt32BE(4),6);
  const count=buffer.readUInt16BE(10),result=[];
  let offset=14;
  for(let i=0;i<count;i++){
    assert.equal(buffer.toString('ascii',offset,offset+4),'MTrk');
    const size=buffer.readUInt32BE(offset+4);
    const data=buffer.subarray(offset+8,offset+8+size);
    let cursor=0,tick=0,name='',noteOns=0,endTick=-1;
    const vlq=()=>{let value=0,byte;do{byte=data[cursor++];value=(value<<7)|(byte&127)}while(byte&128);return value};
    while(cursor<data.length){
      tick+=vlq();
      const status=data[cursor++];
      if(status===255){
        const type=data[cursor++],length=vlq();
        if(type===3)name=data.toString('ascii',cursor,cursor+length);
        if(type===47)endTick=tick;
        cursor+=length;
      }else{
        if((status&240)===144&&data[cursor+1]>0)noteOns++;
        cursor+=(status&240)===192||(status&240)===208?1:2;
      }
    }
    assert.equal(cursor,data.length);
    result.push({name,noteOns,endTick});
    offset+=8+size;
  }
  assert.equal(offset,buffer.length);
  return{format:buffer.readUInt16BE(8),count,tracks:result};
}

test('el modo cambia a la paralela y la relativa conserva la armadura',()=>{
  const run=studio();
  assert.equal(run('parallelKey("minor")'),'E♭');
  assert.equal(run('state.mode="minor"; root()'),'A');
  assert.equal(run('parallelKey("major")'),'A');
  assert.equal(run('state.key="E♭"; root()'),'C');
  assert.equal(run('describe({degree:4,kind:"dominant7",beats:4}).name'),'G7');
});

test('el loop de 14 pulsos se alinea a 16 o queda libre',()=>{
  const run=studio();
  run('state.progression=[4,2,4,4].map(beats=>({degree:0,kind:"triad",beats}))');
  assert.equal(run('paddingBeats()'),2);
  assert.equal(run('state.alignBars=false; paddingBeats()'),0);
});

test('MIDI combinado usa pistas independientes de tempo, acordes y bajo',()=>{
  const run=studio();
  run('state.bpm=120; state.progression=[4,2,4,4].map((beats,degree)=>({degree,kind:"triad",beats}))');
  const combined=tracks(run('midiBytes("all")'));
  assert.equal(combined.format,1);
  assert.equal(combined.count,3);
  assert.deepEqual(combined.tracks.map(track=>track.name),['Tempo','Acordes','Bajo']);
  assert.deepEqual(combined.tracks.map(track=>track.noteOns),[0,12,4]);
  assert.deepEqual(combined.tracks.map(track=>track.endTick),[7680,7680,7680]);
  const bass=tracks(run('midiBytes("bass")'));
  assert.equal(bass.count,2);
  assert.deepEqual(bass.tracks.map(track=>track.name),['Tempo','Bajo']);
  assert.equal(run('state.alignBars=false; midiBytes("all").length')>0,true);
  const free=tracks(run('midiBytes("all")'));
  assert.deepEqual(free.tracks.map(track=>track.endTick),[6720,6720,6720]);
});

test('restaurar proyecto recupera tonalidad, tempo y secuencia completos',()=>{
  const run=studio();
  run('state.key="C"; state.mode="minor"; state.bpm=95; state.progression=[{degree:0,kind:"triad",beats:4}]; checkpoint(); state.key="A"; state.mode="major"; state.bpm=130; state.progression=[]; restoreProject(undoStack.pop())');
  assert.equal(run('fullName()'),'A menor natural');
  assert.equal(run('state.bpm'),95);
  assert.equal(run('state.progression.length'),1);
});

test('los bocetos de estilo son opcionales y cierran compases completos',()=>{
  const run=studio();
  const recipes=run('Object.values(STYLE_RECIPES).map(item=>({mode:item.mode,bpm:item.bpm,beats:item.chords.reduce((sum,chord)=>sum+chord[2],0)}))');
  assert.equal(recipes.length,7);
  recipes.forEach(recipe=>{
    assert.ok(recipe.mode==='major'||recipe.mode==='minor');
    assert.ok(recipe.bpm>=40&&recipe.bpm<=240);
    assert.equal(recipe.beats%4,0);
  });
});

test('las ideas antiguas conservan bajo sostenido y batería apagada',()=>{
  const run=studio();
  run('restoreProject({key:"C",mode:"major",progression:[{degree:0,kind:"triad",beats:4}]})');
  assert.equal(run('state.drumsEnabled'),false);
  assert.equal(run('state.bassSteps'),false);
  assert.equal(run('grooveEvents().length'),0);
  assert.equal(tracks(run('midiBytes("all")')).count,3);
});

test('el bajo por pasos sigue cada acorde y el MIDI incluye batería GM',()=>{
  const run=studio();
  run('state.progression=[{degree:0,kind:"triad",beats:2},{degree:4,kind:"triad",beats:2}]; state.groove=presetGroove("house"); state.drumsEnabled=true; state.bassSteps=true');
  const events=run('grooveEvents()');
  assert.equal(events.filter(item=>item.row==='bass').length,4);
  assert.equal(events.find(item=>item.row==='bass'&&item.beat===.5).note,48);
  assert.equal(events.find(item=>item.row==='bass'&&item.beat===2.5).note,55);
  const combined=tracks(run('midiBytes("all")'));
  assert.deepEqual(combined.tracks.map(track=>track.name),['Tempo','Acordes','Bajo','Bateria']);
  assert.deepEqual(combined.tracks.map(track=>track.noteOns),[0,6,4,10]);
  assert.deepEqual(combined.tracks.map(track=>track.endTick),[1920,1920,1920,1920]);
  const drums=tracks(run('midiBytes("drums")'));
  assert.deepEqual(drums.tracks.map(track=>track.name),['Tempo','Bateria']);
});

test('deshacer conserva patrón y activación de pistas',()=>{
  const run=studio();
  run('state.groove=presetGroove("techno");state.drumsEnabled=true;state.bassSteps=true;checkpoint();state.groove=emptyGroove();state.drumsEnabled=false;state.bassSteps=false;restoreProject(undoStack.pop())');
  assert.equal(run('state.groove.kick[0]'),1);
  assert.equal(run('state.groove.bass[7]'),1);
  assert.equal(run('state.drumsEnabled&&state.bassSteps'),true);
});

test('el patrón no suena durante el silencio de alineación',()=>{
  const run=studio();
  run('state.progression=[{degree:0,kind:"triad",beats:2}];state.groove=presetGroove("house");state.drumsEnabled=true;state.bassSteps=true');
  assert.equal(run('paddingBeats()'),2);
  assert.equal(run('Math.max(...grooveEvents().map(item=>item.beat))'),1.5);
  const rendered=tracks(run('midiBytes("all")'));
  assert.deepEqual(rendered.tracks.map(track=>track.endTick),[1920,1920,1920,1920]);
});

test('cada base tiene un timbre por pista y el cambio de kit no altera el MIDI',()=>{
  const run=studio();
  const profiles=run('Object.values(SOUND_KITS).map(kit=>({kick:kit.kick.start,clap:kit.clap.cutoff,hat:kit.hat.cutoff,bass:kit.bass.wave}))');
  assert.equal(profiles.length,3);
  for(const row of ['kick','clap','hat','bass'])assert.equal(new Set(profiles.map(item=>item[row])).size,3);
  run('state.progression=[{degree:0,kind:"triad",beats:4}];state.groove=presetGroove("house");state.drumsEnabled=true;state.bassSteps=true');
  const house=Buffer.from(run('midiBytes("all")'));
  run('state.soundKit="techno"');
  assert.deepEqual(Buffer.from(run('midiBytes("all")')),house);
  run('checkpoint();state.soundKit="dembow";restoreProject(undoStack.pop())');
  assert.equal(run('state.soundKit'),'techno');
  assert.equal(run('kitName("unknown")'),'house');
});

test('el dembow marca el cuarto pulso y VII menor funciona como paso',()=>{
  const run=studio();
  assert.deepEqual(Array.from(run('GROOVE_PRESETS.dembow.kick')),[0,4,8,12]);
  run('state.mode="minor"');
  assert.equal(run('describe({degree:6,kind:"triad",beats:4}).role'),'Paso');
  run('state.mode="major"');
  assert.equal(run('describe({degree:6,kind:"triad",beats:4}).role'),'Tensión');
});
