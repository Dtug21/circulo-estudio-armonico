const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'practice.js'),'utf8').replace(/if\(document\.getElementById\('practiceSlots'\)\)initPractice\(\);\s*$/,'');

function practice(){
  const fields={practiceKey:{value:'C'},practiceMode:{value:'minor'},practiceType:{value:'cadence'},practiceSlots:{querySelectorAll:()=>[]}};
  const document={getElementById:id=>fields[id]??(fields[id]={})};
  const context=vm.createContext({document,URLSearchParams,location:{search:''}});
  vm.runInContext(source,context,{filename:'practice.js'});
  return{fields,run:expression=>vm.runInContext(expression,context)};
}

test('el selector menor nombra primero la tonalidad menor',()=>{
  const{fields,run}=practice();
  run('renderPractice()');
  assert.match(fields.practiceKey.innerHTML,/<option value="C">Am \(relativa de C\)<\/option>/);
  assert.match(fields.practiceKey.innerHTML,/<option value="G">Em \(relativa de G\)<\/option>/);
});

test('la cadencia menor explica la sensible y la tónica de la tonalidad elegida',()=>{
  const{fields,run}=practice();
  for(const[key,sensible,tonic]of[['C','G♯','A'],['G','D♯','E'],['D♭','A','B♭'],['B','F𝄪','G♯']]){
    fields.practiceKey.value=key;
    run('explain(true)');
    assert.ok(fields.practiceExplanation.innerHTML.includes(`Escucha cómo ${sensible} tiende a subir a ${tonic}.`));
  }
});
